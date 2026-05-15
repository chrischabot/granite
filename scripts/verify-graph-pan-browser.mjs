import { runResultFixture, runMain } from "./_lib/dev-server.mjs";

runMain(() =>
  runResultFixture({
    fixture: "scripts/graph-pan-browser-fixture.html",
    resultKey: "__graniteGraphPanResult",
    successLabel: "Graph pan browser verification",
    viewport: { width: 1200, height: 800 },
    successDetail: (result) => {
      const lines = [
        `Nodes: ${result.nodeCount}; edges: ${result.edgeCount ?? "?"}; frames: ${result.frames}; fps: ${result.fps.toFixed(1)}; p95 frame: ${result.p95FrameMs.toFixed(1)} ms; p95 render cost: ${(result.p95RenderCostMs ?? 0).toFixed(1)} ms; Barnes-Hut step: ${(result.simStepMs ?? 0).toFixed(1)} ms; long frames: ${result.longFrames}`,
        `Final transform: ${result.finalTransform}`,
      ];
      return lines.join("\n");
    },
  }),
);
