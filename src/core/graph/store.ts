import { readConfigJson, writeConfigJson } from "@core/vault/granite-config";
import type { GraphGroupSpec } from "./groups";

const STORAGE_KEY = "granite.graph.config.v1";
const DISK_CONFIG_NAME = "graph";

export type GraphColorMode = "none" | "tag" | "folder" | "groups";

export interface GraphDisplaySettings {
  /** Node circle radius (px at scale 1). */
  readonly nodeSize: number;
  /** Edge stroke width (px at scale 1). */
  readonly linkThickness: number;
  /** Zoom scale above which all labels become visible. */
  readonly textFadeThreshold: number;
  /** Label font size (px at scale 1). */
  readonly textSize: number;
}

export interface GraphForceSettings {
  /** Pairwise repulsion magnitude. */
  readonly repulsion: number;
  /** Edge attraction strength. */
  readonly attraction: number;
  /** Gentle pull toward (0,0). */
  readonly centerForce: number;
  /** Ideal edge length (reserved for future improvements). */
  readonly linkDistance: number;
}

export interface GraphConfig {
  readonly filter: string;
  readonly groups: ReadonlyArray<GraphGroupSpec>;
  readonly colorMode: GraphColorMode;
  readonly display: GraphDisplaySettings;
  readonly forces: GraphForceSettings;
  /** Restrict the graph to the active file's neighborhood. */
  readonly localGraph: boolean;
  /** Hop radius when localGraph is true (1 = direct neighbors). */
  readonly localHops: number;
}

export const DEFAULT_GRAPH_CONFIG: GraphConfig = {
  filter: "",
  groups: [],
  colorMode: "none",
  display: {
    nodeSize: 4,
    linkThickness: 0.7,
    textFadeThreshold: 1.3,
    textSize: 11,
  },
  forces: {
    repulsion: 6000,
    attraction: 0.005,
    centerForce: 0.0008,
    linkDistance: 80,
  },
  localGraph: false,
  localHops: 1,
};

function numOrDefault(v: unknown, fallback: number): number {
  if (typeof v !== "number" && typeof v !== "string") return fallback;
  const n = typeof v === "number" ? v : Number.parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

function sanitizeDisplay(input: unknown, defaults: GraphDisplaySettings): GraphDisplaySettings {
  const obj = (input && typeof input === "object" ? input : {}) as Partial<GraphDisplaySettings>;
  return {
    nodeSize: numOrDefault(obj.nodeSize, defaults.nodeSize),
    linkThickness: numOrDefault(obj.linkThickness, defaults.linkThickness),
    textFadeThreshold: numOrDefault(obj.textFadeThreshold, defaults.textFadeThreshold),
    textSize: numOrDefault(obj.textSize, defaults.textSize),
  };
}

function sanitizeForces(input: unknown, defaults: GraphForceSettings): GraphForceSettings {
  const obj = (input && typeof input === "object" ? input : {}) as Partial<GraphForceSettings>;
  return {
    repulsion: numOrDefault(obj.repulsion, defaults.repulsion),
    attraction: numOrDefault(obj.attraction, defaults.attraction),
    centerForce: numOrDefault(obj.centerForce, defaults.centerForce),
    linkDistance: numOrDefault(obj.linkDistance, defaults.linkDistance),
  };
}

function mergeWithDefaults(input: unknown): GraphConfig {
  if (!input || typeof input !== "object") return DEFAULT_GRAPH_CONFIG;
  const obj = input as Partial<GraphConfig>;
  return {
    filter: typeof obj.filter === "string" ? obj.filter : DEFAULT_GRAPH_CONFIG.filter,
    groups: Array.isArray(obj.groups)
      ? obj.groups.filter(
          (g): g is GraphGroupSpec =>
            !!g &&
            typeof (g as GraphGroupSpec).id === "string" &&
            typeof (g as GraphGroupSpec).name === "string" &&
            typeof (g as GraphGroupSpec).query === "string" &&
            typeof (g as GraphGroupSpec).color === "string",
        )
      : DEFAULT_GRAPH_CONFIG.groups,
    colorMode:
      obj.colorMode === "tag" ||
      obj.colorMode === "folder" ||
      obj.colorMode === "groups" ||
      obj.colorMode === "none"
        ? obj.colorMode
        : DEFAULT_GRAPH_CONFIG.colorMode,
    display: sanitizeDisplay(obj.display, DEFAULT_GRAPH_CONFIG.display),
    forces: sanitizeForces(obj.forces, DEFAULT_GRAPH_CONFIG.forces),
    localGraph: typeof obj.localGraph === "boolean" ? obj.localGraph : false,
    localHops: numOrDefault(obj.localHops, 1),
  };
}

function loadFromStorage(): GraphConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_GRAPH_CONFIG;
    return mergeWithDefaults(JSON.parse(raw));
  } catch {
    return DEFAULT_GRAPH_CONFIG;
  }
}

function saveToStorage(s: GraphConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

let state: GraphConfig = loadFromStorage();
let stateVersion = 0;
const subscribers = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function emit(): void {
  stateVersion += 1;
  for (const cb of subscribers) cb();
}

function scheduleDiskSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void writeConfigJson(DISK_CONFIG_NAME, state).catch(() => {});
  }, 400);
}

/** Reload graph config from disk if available. Falls back to localStorage. */
export async function hydrateGraphConfig(): Promise<void> {
  const onDisk = await readConfigJson<GraphConfig>(DISK_CONFIG_NAME);
  if (onDisk) {
    state = mergeWithDefaults(onDisk);
    saveToStorage(state);
    emit();
  }
}

/** Reset state — useful for tests and vault swaps. */
export function _resetGraphConfigForTesting(): void {
  state = DEFAULT_GRAPH_CONFIG;
  stateVersion = 0;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
}

export function getGraphConfig(): GraphConfig {
  return state;
}

export function getGraphVersion(): number {
  return stateVersion;
}

export function subscribeGraph(listener: () => void): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

export function updateGraphConfig(patch: Partial<GraphConfig>): void {
  state = { ...state, ...patch };
  saveToStorage(state);
  scheduleDiskSave();
  emit();
}

export function updateGraphDisplay(patch: Partial<GraphDisplaySettings>): void {
  updateGraphConfig({ display: { ...state.display, ...patch } });
}

export function updateGraphForces(patch: Partial<GraphForceSettings>): void {
  updateGraphConfig({ forces: { ...state.forces, ...patch } });
}

export function addGraphGroup(spec: Omit<GraphGroupSpec, "id">): void {
  const id = `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  updateGraphConfig({
    groups: [...state.groups, { ...spec, id }],
  });
}

export function updateGraphGroup(id: string, patch: Partial<Omit<GraphGroupSpec, "id">>): void {
  updateGraphConfig({
    groups: state.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)),
  });
}

export function removeGraphGroup(id: string): void {
  updateGraphConfig({
    groups: state.groups.filter((g) => g.id !== id),
  });
}
