import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const cwd = process.cwd();

async function getOpenPort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  if (!address || typeof address === "string") throw new Error("Could not allocate a local port");
  return address.port;
}

function spawnWithOutput(command, args) {
  const output = { text: "", exitCode: null };
  const child = spawn(command, args, {
    cwd,
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

async function waitForServer(url, processOutput) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Vite is still booting.
    }
    if (processOutput.exitCode !== null) {
      throw new Error(`Vite exited before becoming ready:\n${processOutput.text}`);
    }
    await delay(100);
  }
  throw new Error(`Timed out waiting for Vite at ${url}\n${processOutput.text}`);
}

async function waitForExit(child, output, label) {
  if (output.exitCode !== null) return output.exitCode;
  const code = await new Promise((resolve) => child.once("exit", resolve));
  output.exitCode = code;
  if (code !== 0) throw new Error(`${label} exited with ${code}:\n${output.text}`);
  return code;
}

async function main() {
  const port = await getOpenPort();
  const url = `http://127.0.0.1:${port}`;
  const reportPath = join(tmpdir(), `granite-lighthouse-a11y-${process.pid}.json`);
  const vite = spawnWithOutput("bunx", [
    "vite",
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--strictPort",
  ]);

  try {
    await waitForServer(url, vite.output);
    const lighthouse = spawnWithOutput("bunx", [
      "lighthouse",
      url,
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
  } finally {
    vite.child.kill("SIGTERM");
    await delay(100);
    if (vite.child.exitCode === null) vite.child.kill("SIGKILL");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
