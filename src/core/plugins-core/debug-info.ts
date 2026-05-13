import { APP_VERSION } from "@core/app/version";
import { type Command, commandRegistry } from "@core/commands/CommandRegistry";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { t } from "@core/i18n";
import { metadataCache } from "@core/metadata/cache";
import { noticeManager } from "@core/notices/notice";
import { listPlugins } from "@core/plugins/loader";
import { workspaceStore } from "@core/workspace/store";
import { Effect } from "effect";

export interface DebugInfo {
  readonly version: string;
  readonly platform: string;
  readonly userAgent: string;
  readonly vaultRoot: string;
  readonly totalFiles: number;
  readonly markdownFiles: number;
  readonly totalBytes: number;
  readonly workspaceGroups: number;
  readonly workspaceLeaves: number;
  readonly commands: number;
  readonly plugins: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly version: string;
    readonly enabled: boolean;
  }>;
  readonly tagCount: number;
  readonly propertyCount: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  for (const unit of units) {
    if (value < 1024 || unit === units[units.length - 1]) {
      return `${value.toFixed(value >= 10 ? 0 : 1)} ${unit}`;
    }
    value /= 1024;
  }
  return `${bytes} B`;
}

export async function collectDebugInfo(): Promise<DebugInfo> {
  const fsInfo = await run(
    Effect.gen(function* () {
      const fs = yield* FileSystem;
      const files = yield* fs.listAll();
      return { rootName: fs.rootName, files };
    }),
  );
  const workspace = workspaceStore.getState();
  const plugins = listPlugins().map((plugin) => ({
    id: plugin.manifest.id,
    name: plugin.manifest.name,
    version: plugin.manifest.version,
    enabled: plugin.enabled,
  }));
  return {
    version: APP_VERSION,
    platform: globalThis.navigator?.platform || "unknown",
    userAgent: globalThis.navigator?.userAgent || "unknown",
    vaultRoot: fsInfo.rootName,
    totalFiles: fsInfo.files.length,
    markdownFiles: fsInfo.files.filter((file) => file.extension === "md").length,
    totalBytes: fsInfo.files.reduce((sum, file) => sum + file.size, 0),
    workspaceGroups: workspace.groups.size,
    workspaceLeaves: workspace.leaves.size,
    commands: commandRegistry.list().length,
    plugins,
    tagCount: metadataCache.getAllTags().length,
    propertyCount: metadataCache.getAllProperties().length,
  };
}

export function formatDebugInfo(info: DebugInfo): string {
  const pluginLines =
    info.plugins.length === 0
      ? [`  ${t("debugInfo.plugins.none")}`]
      : info.plugins.map(
          (plugin) =>
            `  ${plugin.enabled ? "[x]" : "[ ]"} ${plugin.id} (${plugin.name}) ${plugin.version}`,
        );
  return [
    t("debugInfo.title"),
    `${t("debugInfo.version")}: ${info.version}`,
    `${t("debugInfo.platform")}: ${info.platform}`,
    `${t("debugInfo.userAgent")}: ${info.userAgent}`,
    `${t("debugInfo.vaultRoot")}: ${info.vaultRoot}`,
    `${t("debugInfo.totalFiles")}: ${info.totalFiles.toLocaleString()}`,
    `${t("debugInfo.markdownFiles")}: ${info.markdownFiles.toLocaleString()}`,
    `${t("debugInfo.vaultSize")}: ${formatBytes(info.totalBytes)}`,
    `${t("debugInfo.workspace")}: ${t("debugInfo.workspaceCounts", {
      groups: info.workspaceGroups.toLocaleString(),
      leaves: info.workspaceLeaves.toLocaleString(),
    })}`,
    `${t("debugInfo.commands")}: ${info.commands.toLocaleString()}`,
    `${t("debugInfo.tags")}: ${info.tagCount.toLocaleString()}`,
    `${t("debugInfo.properties")}: ${info.propertyCount.toLocaleString()}`,
    `${t("debugInfo.plugins")}:`,
    ...pluginLines,
  ].join("\n");
}

export function registerDebugInfoPlugin(): () => void {
  const registrations: Array<() => void> = [];
  const register = (cmd: Command) => {
    registrations.push(commandRegistry.register(cmd));
  };

  register({
    id: "granite:show-debug-info",
    category: t("command.category.help"),
    name: t("command.showDebugInfo"),
    callback: async () => {
      try {
        const text = formatDebugInfo(await collectDebugInfo());
        await globalThis.navigator?.clipboard?.writeText(text).catch(() => undefined);
        noticeManager.show(text, { kind: "info", timeoutMs: 0 });
      } catch (err) {
        noticeManager.show(err instanceof Error ? err.message : t("debugInfo.error.collect"), {
          kind: "error",
        });
      }
    },
  });

  return () => {
    for (const fn of registrations) fn();
  };
}
