import type { ReactNode } from "react";

export interface Hotkey {
  /** Modifiers in normalized order: "Mod" (Ctrl on Win/Linux, Cmd on macOS), "Alt", "Shift". */
  readonly modifiers: ReadonlyArray<"Mod" | "Ctrl" | "Cmd" | "Alt" | "Shift">;
  /** Single-character key, e.g. "P", "ArrowDown", "Enter". */
  readonly key: string;
}

export interface Command {
  readonly id: string;
  readonly name: string;
  /** Optional plugin/category prefix shown faintly before the name in the palette. */
  readonly category?: string;
  readonly icon?: ReactNode;
  /** Default hotkeys (user can override). */
  readonly hotkeys?: ReadonlyArray<Hotkey>;
  /** Returns true if the command should be available right now (focus-gated, etc.). */
  readonly checkCallback?: (checking: boolean) => boolean;
  /** The action to run. */
  readonly callback: () => void | Promise<void>;
  /** True for commands that should be hidden from the palette (e.g. toolbar-only). */
  readonly hidden?: boolean;
}

class CommandRegistryImpl {
  private commands = new Map<string, Command>();
  private listeners = new Set<() => void>();
  private listCache: Command[] | null = null;

  register(command: Command): () => void {
    if (this.commands.has(command.id)) {
      console.warn(`[granite] Command "${command.id}" already registered; overwriting.`);
    }
    this.commands.set(command.id, command);
    this.emit();
    return () => {
      if (this.commands.get(command.id) === command) {
        this.commands.delete(command.id);
        this.emit();
      }
    };
  }

  unregister(id: string): void {
    if (this.commands.delete(id)) this.emit();
  }

  get(id: string): Command | undefined {
    return this.commands.get(id);
  }

  /** All commands currently visible in the palette. Result is referentially
   *  stable until the registry changes — required by `useSyncExternalStore`. */
  list(): ReadonlyArray<Command> {
    if (this.listCache === null) {
      this.listCache = [...this.commands.values()].filter((c) => {
        if (c.hidden) return false;
        if (c.checkCallback) return c.checkCallback(true);
        return true;
      });
    }
    return this.listCache;
  }

  /** Run a command by id. */
  async run(id: string): Promise<void> {
    const cmd = this.commands.get(id);
    if (!cmd) throw new Error(`Unknown command: ${id}`);
    if (cmd.checkCallback && !cmd.checkCallback(false)) return;
    await cmd.callback();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    this.listCache = null;
    for (const cb of this.listeners) cb();
  }
}

export const commandRegistry = new CommandRegistryImpl();
