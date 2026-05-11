import type { Effect } from "effect";
import { Layer, ManagedRuntime } from "effect";
import { FileSystem } from "@core/fs/FileSystem";

/**
 * Layer requirement provided by the runtime. As we add services (metadata
 * cache, plugin host, etc.) extend this union.
 */
export type AppServices = FileSystem;

let layerProvider: () => Layer.Layer<AppServices, never, never> = () =>
  Layer.empty as unknown as Layer.Layer<AppServices, never, never>;

export function setAppLayer(builder: () => Layer.Layer<AppServices, never, never>): void {
  layerProvider = builder;
}

let cached: ManagedRuntime.ManagedRuntime<AppServices, never> | null = null;

export function getRuntime(): ManagedRuntime.ManagedRuntime<AppServices, never> {
  if (!cached) {
    cached = ManagedRuntime.make(layerProvider());
  }
  return cached;
}

/** Run an Effect to a Promise<A>. */
export function run<A, E>(effect: Effect.Effect<A, E, AppServices>): Promise<A> {
  return getRuntime().runPromise(effect);
}

/** Fire-and-forget. */
export function runFork<A, E>(effect: Effect.Effect<A, E, AppServices>): void {
  getRuntime().runFork(effect);
}

/** Tear down the runtime (tests / hot-reload / vault swap). */
export async function disposeRuntime(): Promise<void> {
  if (cached) {
    await cached.dispose();
    cached = null;
  }
}