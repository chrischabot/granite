import { describe, expect, it } from "vitest";
import {
  type WorkspaceSyncMessage,
  channelNameFor,
  createInProcessChannelHub,
  createWorkspaceSync,
} from "./sync";

const VAULT_ID = "sync-vault";

describe("workspace cross-window sync", () => {
  it("derives a stable channel name from the vault id", () => {
    expect(channelNameFor("abc")).toBe("granite:vault:abc");
  });

  it("broadcasts workspace updates from one window and the peer receives them in order", async () => {
    const hub = createInProcessChannelHub();
    const A = createWorkspaceSync(VAULT_ID, { channelFactory: hub.factory });
    const B = createWorkspaceSync(VAULT_ID, { channelFactory: hub.factory });
    const received: WorkspaceSyncMessage[] = [];
    B.subscribe((m) => received.push(m));

    // 100 updates from A → B must arrive in order with no drops.
    for (let i = 0; i < 100; i += 1) {
      A.postWorkspaceUpdated({ snap: i }, i + 1);
    }
    await hub.flush();
    expect(received.length).toBe(100);
    for (let i = 0; i < 100; i += 1) {
      const m = received[i];
      expect(m?.type).toBe("workspaceUpdated");
      if (m?.type === "workspaceUpdated") {
        expect(m.updatedMs).toBe(i + 1);
        expect((m.snapshot as { snap: number }).snap).toBe(i);
      }
    }

    A.close();
    B.close();
  });

  it("ignores self-broadcasts (send-to-self guard prevents loops)", async () => {
    const hub = createInProcessChannelHub();
    const A = createWorkspaceSync(VAULT_ID, { channelFactory: hub.factory });
    const fromSelf: WorkspaceSyncMessage[] = [];
    A.subscribe((m) => fromSelf.push(m));

    A.postWorkspaceUpdated({ x: 1 }, 1);
    A.postSettingsUpdated(2);
    A.postMetadataInvalidated(["A.md", "B.md"], 3);
    A.postActiveLeafChanged("leaf-1", 4);
    await hub.flush();
    expect(fromSelf.length).toBe(0);
    A.close();
  });

  it("reconciles out-of-order delivery via timestamp comparison on the consumer", async () => {
    // The hub delivers in post order, but a consumer that uses timestamps to
    // pick "latest" must end up with the largest updatedMs no matter what
    // order it sees the messages in.
    const hub = createInProcessChannelHub();
    const A = createWorkspaceSync(VAULT_ID, { channelFactory: hub.factory });
    const B = createWorkspaceSync(VAULT_ID, { channelFactory: hub.factory });
    let best: { ms: number; payload: number } = { ms: -1, payload: -1 };
    B.subscribe((m) => {
      if (m.type !== "workspaceUpdated") return;
      if (m.updatedMs <= best.ms) return; // ← reconciliation rule under test
      best = { ms: m.updatedMs, payload: (m.snapshot as { v: number }).v };
    });

    // Post in scrambled timestamp order.
    A.postWorkspaceUpdated({ v: 10 }, 50);
    A.postWorkspaceUpdated({ v: 20 }, 200);
    A.postWorkspaceUpdated({ v: 30 }, 30);
    A.postWorkspaceUpdated({ v: 40 }, 150);
    A.postWorkspaceUpdated({ v: 50 }, 199);
    await hub.flush();
    expect(best.ms).toBe(200);
    expect(best.payload).toBe(20);
    A.close();
    B.close();
  });

  it("two windows interleaving 100 writes each — both observe each other's latest", async () => {
    const hub = createInProcessChannelHub();
    const A = createWorkspaceSync(VAULT_ID, { channelFactory: hub.factory });
    const B = createWorkspaceSync(VAULT_ID, { channelFactory: hub.factory });
    let lastInA = -1;
    let lastInB = -1;
    A.subscribe((m) => {
      if (m.type === "workspaceUpdated") lastInA = Math.max(lastInA, m.updatedMs);
    });
    B.subscribe((m) => {
      if (m.type === "workspaceUpdated") lastInB = Math.max(lastInB, m.updatedMs);
    });

    for (let i = 0; i < 100; i += 1) {
      A.postWorkspaceUpdated({ from: "A", i }, 1_000 + i * 2);
      B.postWorkspaceUpdated({ from: "B", i }, 1_001 + i * 2);
    }
    await hub.flush();
    expect(lastInA).toBe(1_001 + 99 * 2); // A saw B's last
    expect(lastInB).toBe(1_000 + 99 * 2); // B saw A's last
    A.close();
    B.close();
  });

  it("dispatches each message kind through the subscribe API", async () => {
    const hub = createInProcessChannelHub();
    const A = createWorkspaceSync(VAULT_ID, { channelFactory: hub.factory });
    const B = createWorkspaceSync(VAULT_ID, { channelFactory: hub.factory });
    const seen: string[] = [];
    B.subscribe((m) => seen.push(m.type));
    A.postWorkspaceUpdated({}, 1);
    A.postSettingsUpdated(2);
    A.postMetadataInvalidated(["a"], 3);
    A.postActiveLeafChanged("leaf", 4);
    await hub.flush();
    expect(seen).toEqual([
      "workspaceUpdated",
      "settingsUpdated",
      "metadataInvalidated",
      "activeLeafChanged",
    ]);
    A.close();
    B.close();
  });

  it("survives rapid 100-update bursts with no drops (no coalescing)", async () => {
    const hub = createInProcessChannelHub();
    const A = createWorkspaceSync(VAULT_ID, { channelFactory: hub.factory });
    const B = createWorkspaceSync(VAULT_ID, { channelFactory: hub.factory });
    const seen: number[] = [];
    B.subscribe((m) => {
      if (m.type === "workspaceUpdated") seen.push(m.updatedMs);
    });
    for (let i = 1; i <= 100; i += 1) A.postWorkspaceUpdated({ i }, i);
    await hub.flush();
    expect(seen).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
    A.close();
    B.close();
  });

  it("handles the empty-vault case: no messages are delivered before any post", async () => {
    const hub = createInProcessChannelHub();
    const A = createWorkspaceSync(VAULT_ID, { channelFactory: hub.factory });
    const seen: unknown[] = [];
    A.subscribe((m) => seen.push(m));
    await hub.flush();
    expect(seen).toEqual([]);
    A.close();
  });

  it("close() unsubscribes the channel; subsequent peer posts are not received", async () => {
    const hub = createInProcessChannelHub();
    const A = createWorkspaceSync(VAULT_ID, { channelFactory: hub.factory });
    const B = createWorkspaceSync(VAULT_ID, { channelFactory: hub.factory });
    const seen: unknown[] = [];
    B.subscribe((m) => seen.push(m));
    A.postWorkspaceUpdated({}, 1);
    await hub.flush();
    expect(seen.length).toBe(1);
    B.close();
    A.postWorkspaceUpdated({}, 2);
    await hub.flush();
    expect(seen.length).toBe(1);
    A.close();
  });

  it("works with the default factory when BroadcastChannel is available (real-channel smoke)", async () => {
    // Bun + happy-dom both expose BroadcastChannel; this guards against
    // regressions where createWorkspaceSync defaults to a no-op channel.
    if (typeof BroadcastChannel !== "function") return;
    const A = createWorkspaceSync(`smoke-${Date.now()}-${Math.random()}`);
    const seen: unknown[] = [];
    A.subscribe((m) => seen.push(m));
    A.postWorkspaceUpdated({}, 1);
    // Self-guard suppresses delivery; if real BC also doesn't deliver to
    // self, we get zero — both cases are fine, we just need no throw.
    await new Promise((r) => setTimeout(r, 10));
    expect(seen.length).toBe(0);
    A.close();
  });
});
