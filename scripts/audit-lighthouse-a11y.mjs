import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { runMain, withDevServer } from "./_lib/dev-server.mjs";

function spawnWithOutput(command, args) {
  const output = { text: "", exitCode: null };
  const child = spawn(command, args, {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
  });
  const append = (chunk) => {
    output.text += chunk.toString();
    if (output.text.length > 30_000) output.text = output.text.slice(-30_000);
  };
  child.stdout.on("data", append);
  child.stderr.on("data", append);
  child.on("exit", (code) => {
    output.exitCode = code;
  });
  return { child, output };
}

async function waitForExit(child, output, label) {
  if (output.exitCode !== null) return output.exitCode;
  const code = await new Promise((resolve) => child.once("exit", resolve));
  output.exitCode = code;
  if (code !== 0) throw new Error(`${label} exited with ${code}:\n${output.text}`);
  return code;
}

runMain(() =>
  withDevServer(async ({ baseUrl }) => {
    const reportPath = join(tmpdir(), `granite-lighthouse-a11y-${process.pid}.json`);
    const lighthouse = spawnWithOutput("bunx", [
      "lighthouse",
      baseUrl,
      "--only-categories=accessibility",
      "--chrome-flags=--headless=new --no-sandbox",
      "--output=json",
      `--output-path=${reportPath}`,
      "--quiet",
    ]);
    await waitForExit(lighthouse.child, lighthouse.output, "Lighthouse");

    const report = JSON.parse(await readFile(reportPath, "utf8"));
    const score = report.categories?.accessibility?.score;
    const failed = Object.values(report.audits ?? {})
      .filter((audit) => audit.score === 0 && audit.scoreDisplayMode !== "notApplicable")
      .map((audit) => audit.id);
    if (score !== 1 || failed.length > 0) {
      throw new Error(
        `Lighthouse accessibility audit failed: score=${score}; failed=${failed.join(", ")}`,
      );
    }
    console.log("Lighthouse accessibility audit passed.");
    console.log(`Report: ${reportPath}`);

    // Give Lighthouse a moment to release the Chrome process before
    // withDevServer tears down Vite.
    await delay(100);
  }),
);
