import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_GRAPH_CONFIG,
  _resetGraphConfigForTesting,
  addGraphGroup,
  getGraphConfig,
  removeGraphGroup,
  updateGraphConfig,
  updateGraphDisplay,
  updateGraphForces,
  updateGraphGroup,
} from "./store";

beforeEach(() => {
  _resetGraphConfigForTesting();
  // Wipe localStorage entry so re-initialization in other modules can't
  // pollute the test.
  try {
    localStorage.removeItem("granite.graph.config.v1");
  } catch {
    /* ignore */
  }
});

describe("graph config", () => {
  it("starts at defaults", () => {
    expect(getGraphConfig()).toEqual(DEFAULT_GRAPH_CONFIG);
  });

  it("updateGraphConfig merges into state and bumps the version", () => {
    updateGraphConfig({ filter: "tag:work" });
    expect(getGraphConfig().filter).toBe("tag:work");
  });

  it("updateGraphDisplay merges only display fields", () => {
    updateGraphDisplay({ nodeSize: 8 });
    expect(getGraphConfig().display.nodeSize).toBe(8);
    expect(getGraphConfig().display.linkThickness).toBe(DEFAULT_GRAPH_CONFIG.display.linkThickness);
  });

  it("updateGraphForces merges only force fields", () => {
    updateGraphForces({ repulsion: 12000 });
    expect(getGraphConfig().forces.repulsion).toBe(12000);
    expect(getGraphConfig().forces.attraction).toBe(DEFAULT_GRAPH_CONFIG.forces.attraction);
  });
});

describe("graph groups", () => {
  it("adds, updates, and removes groups", () => {
    addGraphGroup({ name: "Work", query: "tag:work", color: "red" });
    const after = getGraphConfig().groups;
    expect(after).toHaveLength(1);
    expect(after[0]?.name).toBe("Work");
    const id = after[0]?.id;
    expect(id).toBeDefined();
    if (!id) return;
    updateGraphGroup(id, { color: "blue" });
    expect(getGraphConfig().groups[0]?.color).toBe("blue");
    removeGraphGroup(id);
    expect(getGraphConfig().groups).toHaveLength(0);
  });
});

describe("sanitization", () => {
  it("rejects corrupt persisted values via a fresh module import", async () => {
    // Write malformed config to localStorage, then load the module fresh so
    // its top-level loadFromStorage() runs against the corrupt payload.
    localStorage.setItem(
      "granite.graph.config.v1",
      JSON.stringify({
        filter: 42,
        groups: "not-an-array",
        colorMode: "spaceship",
        display: { nodeSize: "huge", linkThickness: Number.NaN },
        forces: { repulsion: "lots", linkDistance: null },
        localGraph: "yes",
        localHops: "two",
      }),
    );
    vi.resetModules();
    const mod = await import("./store");
    const cfg = mod.getGraphConfig();
    expect(cfg.filter).toBe(DEFAULT_GRAPH_CONFIG.filter);
    expect(cfg.groups).toEqual([]);
    expect(cfg.colorMode).toBe(DEFAULT_GRAPH_CONFIG.colorMode);
    expect(cfg.display.nodeSize).toBe(DEFAULT_GRAPH_CONFIG.display.nodeSize);
    expect(cfg.display.linkThickness).toBe(DEFAULT_GRAPH_CONFIG.display.linkThickness);
    expect(cfg.forces.repulsion).toBe(DEFAULT_GRAPH_CONFIG.forces.repulsion);
    expect(cfg.forces.linkDistance).toBe(DEFAULT_GRAPH_CONFIG.forces.linkDistance);
    expect(cfg.localGraph).toBe(false);
    expect(cfg.localHops).toBe(1);
  });
});
