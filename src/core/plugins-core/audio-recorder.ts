import { createCommandRegistrar } from "@core/commands/CommandRegistry";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { join, normalize } from "@core/fs/path";
import { t } from "@core/i18n";
import { noticeManager } from "@core/notices/notice";
import { workspaceStore } from "@core/workspace/store";
import { Effect } from "effect";

const SETTINGS_KEY = "granite.audio-recorder.v1";

interface AudioRecorderSettings {
  attachmentsFolder: string;
}

const DEFAULT: AudioRecorderSettings = {
  attachmentsFolder: "attachments",
};

function loadSettings(): AudioRecorderSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...(JSON.parse(raw) as Partial<AudioRecorderSettings>) };
  } catch {
    return DEFAULT;
  }
}

let active: {
  recorder: MediaRecorder;
  stream: MediaStream;
  chunks: Blob[];
  noticeId: string | null;
} | null = null;

async function startRecording(): Promise<void> {
  if (active) {
    noticeManager.show(t("plugin.audioRecorder.alreadyRecording"), { kind: "warning" });
    return;
  }
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    noticeManager.show(
      err instanceof Error ? err.message : t("plugin.audioRecorder.error.microphone"),
      { kind: "error" },
    );
    return;
  }
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };
  const noticeId = noticeManager.show(t("plugin.audioRecorder.recording"), {
    kind: "warning",
    timeoutMs: 0,
  });
  active = { recorder, stream, chunks, noticeId };

  recorder.onstop = async () => {
    const a = active;
    active = null;
    if (a?.noticeId) noticeManager.dismiss(a.noticeId);
    for (const track of a?.stream.getTracks() ?? []) track.stop();
    if (!a) return;
    const blob = new Blob(a.chunks, { type: "audio/webm" });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const folder = normalize(loadSettings().attachmentsFolder);
    const filename = `recording-${new Date().toISOString().replace(/[:.]/g, "-")}.webm`;
    const path = folder ? join(folder, filename) : filename;
    try {
      await run(
        Effect.gen(function* () {
          const fs = yield* FileSystem;
          if (folder) yield* fs.mkdir(folder);
          yield* fs.writeBytes(path, bytes);
        }),
      );
      // Insert embed link in active editor.
      const state = workspaceStore.getState();
      const group = state.activeGroupId ? state.groups.get(state.activeGroupId) : null;
      const leaf = group?.activeLeafId ? state.leaves.get(group.activeLeafId) : null;
      if (leaf && leaf.state.type === "markdown") {
        window.dispatchEvent(
          new CustomEvent("granite:insert-text", {
            detail: { path: leaf.state.path, text: `\n![[${path}]]\n` },
          }),
        );
      }
      noticeManager.show(t("plugin.audioRecorder.saved", { path }), { kind: "success" });
    } catch (err) {
      noticeManager.show(
        err instanceof Error ? err.message : t("plugin.audioRecorder.error.save"),
        { kind: "error" },
      );
    }
  };

  recorder.start();
}

function stopRecording(): void {
  if (!active) {
    noticeManager.show(t("plugin.audioRecorder.noneRecording"), { kind: "warning" });
    return;
  }
  active.recorder.stop();
}

export function registerAudioRecorderPlugin(): () => void {
  const { register, disposer } = createCommandRegistrar();

  register({
    id: "audio-recorder:toggle",
    category: t("plugin.audioRecorder.category"),
    name: t("plugin.audioRecorder.toggle"),
    callback: () => {
      if (active) stopRecording();
      else void startRecording();
    },
  });

  return () => {
    if (active) stopRecording();
    disposer();
  };
}
