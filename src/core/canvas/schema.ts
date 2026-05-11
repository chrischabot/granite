import { Effect } from "effect";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";

export type CanvasColor = "1" | "2" | "3" | "4" | "5" | "6" | string;

export interface BaseNode {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly color?: CanvasColor;
}

export interface TextNode extends BaseNode {
  readonly type: "text";
  readonly text: string;
}

export interface FileNode extends BaseNode {
  readonly type: "file";
  readonly file: string;
  readonly subpath?: string;
}

export interface LinkNode extends BaseNode {
  readonly type: "link";
  readonly url: string;
}

export interface GroupNode extends BaseNode {
  readonly type: "group";
  readonly label?: string;
  readonly background?: string;
  readonly backgroundStyle?: "cover" | "ratio" | "repeat";
}

export type CanvasNode = TextNode | FileNode | LinkNode | GroupNode;

export type EdgeSide = "top" | "right" | "bottom" | "left";
export type EdgeEnd = "none" | "arrow";

export interface CanvasEdge {
  readonly id: string;
  readonly fromNode: string;
  readonly toNode: string;
  readonly fromSide?: EdgeSide;
  readonly toSide?: EdgeSide;
  readonly fromEnd?: EdgeEnd;
  readonly toEnd?: EdgeEnd;
  readonly color?: CanvasColor;
  readonly label?: string;
}

export interface Canvas {
  readonly nodes: ReadonlyArray<CanvasNode>;
  readonly edges: ReadonlyArray<CanvasEdge>;
}

export const EMPTY_CANVAS: Canvas = { nodes: [], edges: [] };

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}
function asNumber(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function asSide(v: unknown): EdgeSide | undefined {
  if (v === "top" || v === "right" || v === "bottom" || v === "left") return v;
  return undefined;
}
function asEnd(v: unknown): EdgeEnd | undefined {
  if (v === "none" || v === "arrow") return v;
  return undefined;
}

/** Parse a JSON canvas string into a Canvas. Malformed entries are dropped. */
export function parseCanvas(raw: string): Canvas {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return EMPTY_CANVAS;
  }
  if (!json || typeof json !== "object") return EMPTY_CANVAS;
  const root = json as Record<string, unknown>;
  const nodesIn = Array.isArray(root["nodes"]) ? root["nodes"] : [];
  const edgesIn = Array.isArray(root["edges"]) ? root["edges"] : [];

  const nodes: CanvasNode[] = [];
  for (const item of nodesIn) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = asString(o["id"]);
    const type = asString(o["type"]);
    if (!id || !type) continue;
    const base: BaseNode = {
      id,
      x: asNumber(o["x"], 0),
      y: asNumber(o["y"], 0),
      width: asNumber(o["width"], 200),
      height: asNumber(o["height"], 80),
      ...(typeof o["color"] === "string" ? { color: o["color"] as string } : {}),
    };
    switch (type) {
      case "text":
        nodes.push({ ...base, type: "text", text: asString(o["text"]) ?? "" });
        break;
      case "file":
        nodes.push({
          ...base,
          type: "file",
          file: asString(o["file"]) ?? "",
          ...(asString(o["subpath"]) ? { subpath: asString(o["subpath"])! } : {}),
        });
        break;
      case "link":
        nodes.push({ ...base, type: "link", url: asString(o["url"]) ?? "" });
        break;
      case "group":
        nodes.push({
          ...base,
          type: "group",
          ...(asString(o["label"]) ? { label: asString(o["label"])! } : {}),
          ...(asString(o["background"])
            ? { background: asString(o["background"])! }
            : {}),
          ...(o["backgroundStyle"] === "cover" ||
          o["backgroundStyle"] === "ratio" ||
          o["backgroundStyle"] === "repeat"
            ? { backgroundStyle: o["backgroundStyle"] as "cover" | "ratio" | "repeat" }
            : {}),
        });
        break;
    }
  }

  const edges: CanvasEdge[] = [];
  for (const item of edgesIn) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = asString(o["id"]);
    const from = asString(o["fromNode"]);
    const to = asString(o["toNode"]);
    if (!id || !from || !to) continue;
    const fromSide = asSide(o["fromSide"]);
    const toSide = asSide(o["toSide"]);
    const fromEnd = asEnd(o["fromEnd"]);
    const toEnd = asEnd(o["toEnd"]);
    edges.push({
      id,
      fromNode: from,
      toNode: to,
      ...(fromSide ? { fromSide } : {}),
      ...(toSide ? { toSide } : {}),
      ...(fromEnd ? { fromEnd } : {}),
      ...(toEnd ? { toEnd } : {}),
      ...(typeof o["color"] === "string" ? { color: o["color"] as string } : {}),
      ...(typeof o["label"] === "string" ? { label: o["label"] as string } : {}),
    });
  }

  return { nodes, edges };
}

/** Serialize a Canvas back to a pretty-printed JSON string. */
export function serializeCanvas(canvas: Canvas): string {
  return `${JSON.stringify(canvas, null, 2)}\n`;
}

/** Read a `.canvas` file from the vault and parse it. */
export async function readCanvasFile(path: string): Promise<Canvas> {
  const raw = await run(
    Effect.gen(function* () {
      const fs = yield* FileSystem;
      return yield* fs.readText(path);
    }),
  ).catch(() => "");
  return raw ? parseCanvas(raw) : EMPTY_CANVAS;
}

/** Write a Canvas back to a `.canvas` file in the vault. */
export async function writeCanvasFile(path: string, canvas: Canvas): Promise<void> {
  await run(
    Effect.gen(function* () {
      const fs = yield* FileSystem;
      yield* fs.writeText(path, serializeCanvas(canvas));
    }),
  );
}

/** Generate a short random node id. Stable across browser environments. */
export function newCanvasId(): string {
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  return [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
}