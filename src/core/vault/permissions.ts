export type PermissionCapableDirectoryHandle = FileSystemDirectoryHandle & {
  queryPermission?: (descriptor: { mode: "readwrite" }) => Promise<PermissionState>;
  requestPermission?: (descriptor: { mode: "readwrite" }) => Promise<PermissionState>;
};

export async function ensureReadwritePermission(
  handle: PermissionCapableDirectoryHandle,
): Promise<boolean> {
  let state = (await handle.queryPermission?.({ mode: "readwrite" })) ?? "granted";
  if (state !== "granted") {
    state = (await handle.requestPermission?.({ mode: "readwrite" })) ?? "denied";
  }
  return state === "granted";
}
