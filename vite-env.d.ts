/// <reference types="vite/client" />

interface ImportMeta {
  /** Directory name of the current module (Node 20.11+, Bun). */
  readonly dirname: string;
  /** File name of the current module. */
  readonly filename: string;
}