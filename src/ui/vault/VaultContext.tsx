import { type AppServices, disposeRuntime, setAppLayer } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import {
  fsaSupported,
  handleAdapter,
  isFileSystemCapabilityError,
  openOPFS,
  opfsSupported,
  pickDirectoryFSA,
} from "@core/fs/handle-adapter";
import { scanOrphanAtomicWriteTemps } from "@core/fs/orphan-temp";
import { t } from "@core/i18n";
import { bindTypeRegistry, unbindTypeRegistry } from "@core/metadata/type-registry";
import { noticeManager } from "@core/notices/notice";
import { maybeShowSlowStartupNotice } from "@core/perf/startup";
import { bindPlugins, unbindPlugins } from "@core/plugins/loader";
import { bindSettings, settingsStore, unbindSettings } from "@core/settings/store";
import { bindSnippets, unbindSnippets } from "@core/snippets/loader";
import { bindThemes, unbindThemes } from "@core/themes/loader";
import {
  type VaultEntry,
  freshVaultId,
  listVaults,
  loadHandle,
  persistVault,
  removeVault as removeVaultEntry,
} from "@core/vault/registry";
import { buildVaultWindowUrl, parseVaultWindowRequest } from "@core/vault/window-url";
import { bindPersistence, restoreFor, restoreForAsync } from "@core/workspace/persist";
import { workspaceStore } from "@core/workspace/store";
import { Layer } from "effect";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface ActiveVault {
  readonly entry: VaultEntry;
  readonly handle: FileSystemDirectoryHandle;
}

interface VaultContextValue {
  readonly activeVault: ActiveVault | null;
  readonly vaults: ReadonlyArray<VaultEntry>;
  readonly canPickFolder: boolean;
  readonly canUseOpfs: boolean;
  pickFolder: () => Promise<void>;
  openOpfs: (name: string) => Promise<void>;
  reopen: (id: string) => Promise<void>;
  openInNewWindow: (id: string) => void;
  closeVault: () => Promise<void>;
  removeVault: (id: string) => Promise<void>;
  refreshList: () => Promise<void>;
}

const VaultContext = createContext<VaultContextValue | null>(null);

function vaultErrorMessage(err: unknown): string {
  if (isFileSystemCapabilityError(err)) {
    if (err.code === "fsa-unavailable") return t("vaultContext.error.fsaUnavailable");
    if (err.code === "fsa-permission-denied") return t("vaultContext.error.permissionDenied");
    return t("vaultContext.error.opfsUnavailable");
  }
  return err instanceof Error ? err.message : String(err);
}

async function rebuildLayer(handle: FileSystemDirectoryHandle | null): Promise<void> {
  // Tear down old runtime first to avoid races where in-flight Effects see a
  // mixed-state runtime.
  await disposeRuntime();
  setAppLayer(() => {
    if (!handle) {
      // Empty layer typed as AppServices via cast — when no vault is open,
      // the FileSystem service is unavailable and any Effect requiring it
      // will fail at runtime. This is the desired behavior (the UI guards
      // against running such Effects via `activeVault` checks).
      return Layer.empty as unknown as Layer.Layer<AppServices, never, never>;
    }
    return Layer.succeed(FileSystem, handleAdapter(handle));
  });
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const [activeVault, setActiveVault] = useState<ActiveVault | null>(null);
  const [vaults, setVaults] = useState<ReadonlyArray<VaultEntry>>([]);
  const initialized = useRef(false);
  const persistUnbindRef = useRef<(() => void) | null>(null);
  const slowStartupCheckedRef = useRef(false);

  const refreshList = useCallback(async () => {
    setVaults(await listVaults());
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    void (async () => {
      const list = await listVaults();
      setVaults(list);

      // Pop-out window: ?popout=1&vaultId=<id>&leaf=<urlencoded JSON>.
      // Vault window: ?vaultWindow=1&vaultId=<id>.
      const windowRequest = parseVaultWindowRequest(window.location.search);
      if (windowRequest) {
        const target = list.find((v) => v.id === windowRequest.vaultId);
        if (target) {
          try {
            if (target.kind === "opfs" && opfsSupported()) {
              const root = await openOPFS();
              const handle = await root.getDirectoryHandle(target.name, { create: true });
              await setActive(target, handle);
            } else if (target.kind === "fsa") {
              const handle = await loadHandle(target.id);
              if (handle) {
                const h = handle as FileSystemDirectoryHandle & {
                  queryPermission?: (d: { mode: "readwrite" }) => Promise<PermissionState>;
                  requestPermission?: (d: { mode: "readwrite" }) => Promise<PermissionState>;
                };
                let state = (await h.queryPermission?.({ mode: "readwrite" })) ?? "granted";
                if (state !== "granted") {
                  state = (await h.requestPermission?.({ mode: "readwrite" })) ?? "denied";
                }
                if (state === "granted") {
                  await setActive(target, handle);
                }
              }
            }
            const leafEncoded = windowRequest.leaf;
            if (windowRequest.mode === "popout" && leafEncoded) {
              try {
                const leafState = JSON.parse(decodeURIComponent(leafEncoded));
                if (leafState && typeof leafState.type === "string") {
                  if (leafState.type === "markdown" && typeof leafState.path === "string") {
                    workspaceStore.openFile(leafState.path, {
                      ...(leafState.fragment ? { fragment: leafState.fragment } : {}),
                      mode: leafState.mode ?? "source",
                    });
                  } else if (leafState.type === "webviewer" && typeof leafState.url === "string") {
                    workspaceStore.openWebviewer(leafState.url);
                  } else if (leafState.type === "graph") {
                    workspaceStore.openGraph();
                  }
                }
              } catch {
                /* ignore malformed leaf params */
              }
            }
          } catch (err) {
            noticeManager.show(
              t("vaultContext.error.bootstrapPopout", {
                message: vaultErrorMessage(err),
              }),
              { kind: "error" },
            );
          }
          return;
        }
      }

      // Default flow: auto-restore the most-recent vault.
      const recent = list[0];
      if (!recent) return;
      const RECENT_MS = 24 * 60 * 60 * 1000;
      if (Date.now() - recent.lastOpenedMs > RECENT_MS) return;
      if (recent.kind === "opfs" && opfsSupported()) {
        try {
          const root = await openOPFS();
          const handle = await root.getDirectoryHandle(recent.name, { create: true });
          await setActive(recent, handle);
        } catch {
          /* ignore */
        }
      } else if (recent.kind === "fsa") {
        const noticeId = noticeManager.show(t("vaultContext.reopenGrant", { name: recent.name }), {
          kind: "info",
          timeoutMs: 0,
          onActivate: () => {
            noticeManager.dismiss(noticeId);
            void reopen(recent.id).catch((err) => {
              noticeManager.show(vaultErrorMessage(err) || t("vaultContext.error.reopen"), {
                kind: "error",
              });
            });
          },
        });
      }
    })();
  }, []);

  const setActive = useCallback(
    async (entry: VaultEntry, handle: FileSystemDirectoryHandle) => {
      if (persistUnbindRef.current) {
        persistUnbindRef.current();
        persistUnbindRef.current = null;
      }
      await rebuildLayer(handle);
      setActiveVault({ entry, handle });
      (window as unknown as { __graniteActiveVaultId?: string }).__graniteActiveVaultId = entry.id;
      await persistVault({ ...entry, lastOpenedMs: Date.now() }, handle);
      await refreshList();
      void scanOrphanAtomicWriteTemps()
        .then((paths) => {
          if (paths.length === 0) return;
          noticeManager.show(
            t("vaultContext.warning.orphanTemps", {
              count: paths.length.toLocaleString(),
              paths: paths.slice(0, 5).join("\n"),
            }),
            { kind: "warning", timeoutMs: 0 },
          );
        })
        .catch(() => {
          /* startup warning stays best-effort */
        });
      await bindSettings();
      if (!slowStartupCheckedRef.current) {
        slowStartupCheckedRef.current = true;
        maybeShowSlowStartupNotice({
          enabled: settingsStore.getState().notifySlowStartup,
        });
      }
      workspaceStore.reset();
      // Local snapshot first because beforeunload can flush it synchronously;
      // disk remains the fallback for migrated or cross-browser restores.
      const restoredFromSnapshot = await restoreForAsync(entry.id).catch(() => false);
      if (!restoredFromSnapshot) restoreFor(entry.id);
      persistUnbindRef.current = bindPersistence(entry.id);
      bindSnippets(entry.id);
      bindThemes(entry.id);
      void bindTypeRegistry(entry.id).catch(() => {
        /* registry stays empty if the disk read fails */
      });
      void bindPlugins(entry.id, {
        id: entry.id,
        name: entry.name,
        kind: entry.kind,
      }).catch((err) => {
        noticeManager.show(
          t("vaultContext.error.pluginLoader", {
            message: err instanceof Error ? err.message : String(err),
          }),
          { kind: "error" },
        );
      });
    },
    [refreshList],
  );

  const pickFolder = useCallback(async () => {
    try {
      const handle = await pickDirectoryFSA();
      const entry: VaultEntry = {
        id: freshVaultId(),
        name: handle.name,
        kind: "fsa",
        lastOpenedMs: Date.now(),
        addedMs: Date.now(),
      };
      await setActive(entry, handle);
    } catch (err) {
      throw new Error(vaultErrorMessage(err));
    }
  }, [setActive]);

  const openOpfs = useCallback(
    async (name: string) => {
      try {
        // De-duplicate by name: reuse existing OPFS entry if present.
        const existing = (await listVaults()).find((v) => v.kind === "opfs" && v.name === name);
        const root = await openOPFS();
        const handle = await root.getDirectoryHandle(name, { create: true });
        const entry: VaultEntry = existing
          ? { ...existing, lastOpenedMs: Date.now() }
          : {
              id: freshVaultId(),
              name,
              kind: "opfs",
              lastOpenedMs: Date.now(),
              addedMs: Date.now(),
            };
        await setActive(entry, handle);
      } catch (err) {
        throw new Error(vaultErrorMessage(err));
      }
    },
    [setActive],
  );

  const reopen = useCallback(
    async (id: string) => {
      const meta = vaults.find((v) => v.id === id);
      if (!meta) throw new Error(t("vaultContext.error.notInRegistry", { id }));
      try {
        if (meta.kind === "fsa") {
          const handle = await loadHandle(id);
          if (!handle) throw new Error(t("vaultContext.error.lostHandle"));
          const h = handle as FileSystemDirectoryHandle & {
            queryPermission?: (d: { mode: "readwrite" }) => Promise<PermissionState>;
            requestPermission?: (d: { mode: "readwrite" }) => Promise<PermissionState>;
          };
          let state = (await h.queryPermission?.({ mode: "readwrite" })) ?? "granted";
          if (state !== "granted") {
            state = (await h.requestPermission?.({ mode: "readwrite" })) ?? "denied";
          }
          if (state !== "granted") {
            throw new Error(t("vaultContext.error.permissionDenied"));
          }
          await setActive(meta, handle);
        } else {
          const root = await openOPFS();
          const handle = await root.getDirectoryHandle(meta.name, { create: true });
          await setActive(meta, handle);
        }
      } catch (err) {
        throw new Error(vaultErrorMessage(err));
      }
    },
    [vaults, setActive],
  );

  const openInNewWindow = useCallback((id: string) => {
    const url = buildVaultWindowUrl(window.location.href, id);
    window.open(url, "_blank", "width=1200,height=800,popup");
  }, []);

  const closeVault = useCallback(async () => {
    if (persistUnbindRef.current) {
      persistUnbindRef.current();
      persistUnbindRef.current = null;
    }
    unbindSnippets();
    unbindThemes();
    unbindTypeRegistry();
    unbindSettings();
    await unbindPlugins();
    await rebuildLayer(null);
    setActiveVault(null);
    (window as unknown as { __graniteActiveVaultId: string | undefined }).__graniteActiveVaultId =
      undefined;
    workspaceStore.reset();
  }, []);

  const removeVault = useCallback(
    async (id: string) => {
      if (activeVault?.entry.id === id) await closeVault();
      await removeVaultEntry(id);
      await refreshList();
    },
    [activeVault, closeVault, refreshList],
  );

  const value = useMemo<VaultContextValue>(
    () => ({
      activeVault,
      vaults,
      canPickFolder: fsaSupported(),
      canUseOpfs: opfsSupported(),
      pickFolder,
      openOpfs,
      reopen,
      openInNewWindow,
      closeVault,
      removeVault,
      refreshList,
    }),
    [
      activeVault,
      vaults,
      pickFolder,
      openOpfs,
      reopen,
      openInNewWindow,
      closeVault,
      removeVault,
      refreshList,
    ],
  );

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within <VaultProvider>");
  return ctx;
}
