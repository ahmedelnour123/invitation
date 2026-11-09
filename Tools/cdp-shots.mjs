// Takes screenshots of pages with headless Edge/Chrome, following a "plan" file.
// Used to render og-image.jpg, the QR card images, and to check the site on a phone-sized screen.
//
// usage:  node Tools/cdp-shots.mjs <outDir> <plan.json>
//
// Plan = JSON array of steps, run in order:
//   {"viewport": [w, h, scale]}   set page size (default 390×844, phone; scale = pixel ratio, default 1)
//   {"transparent": true}         transparent page background (for PNGs)
//   {"goto": url, "wait": ms}     open a page and wait
//   {"goto": url, "wait": ms, "shot": "name"}   open, wait, then screenshot
//   {"eval": "js", "wait": ms, "shot": "name"}  run JS in the page, wait, screenshot
//   "shot": "name"     → name.jpg (JPEG; optional "quality": 1-100)
//   "shot": "name.png" → PNG (keeps transparency)
// In URLs, {TOOLS} and {PROJECT} become file:// links to this folder and the project folder,
// and {SITE} becomes the local preview server (default http://localhost:5173, or env SITE).
import { spawn } from "node:child_process";
import { writeFileSync, readFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

const [outArg, planArg] = process.argv.slice(2);
if (!outArg || !planArg) {
  console.error("usage: node Tools/cdp-shots.mjs <outDir> <plan.json>");
  process.exit(1);
}
const outDir = resolve(outArg);
mkdirSync(outDir, { recursive: true });

const TOOLS = dirname(fileURLToPath(import.meta.url));
const PROJECT = resolve(TOOLS, "..");
const fileUrl = (p) => pathToFileURL(p).href.replace(/\/$/, "");
const SITE = (process.env.SITE || "http://localhost:5173").replace(/\/$/, "");
const fill = (s) => s
  .replaceAll("{TOOLS}", fileUrl(TOOLS))
  .replaceAll("{PROJECT}", fileUrl(PROJECT))
  .replaceAll("{SITE}", SITE);

const plan = JSON.parse(fill(readFileSync(planArg, "utf8")));

const BROWSERS = [
  process.env.BROWSER,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
const BROWSER = BROWSERS.find((p) => existsSync(p));
if (!BROWSER) { console.error("No Edge/Chrome found. Set BROWSER=<path to browser>."); process.exit(1); }

const PORT = 9337;
const PROFILE = join(tmpdir(), "cdp-shots-profile");   // kept out of the project
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = spawn(BROWSER, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
  "about:blank",
], { stdio: "ignore" });

let targets;
for (let i = 0; i < 40; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); break; } catch { await sleep(250); }
}
if (!targets) { console.error("Browser did not start."); browser.kill(); process.exit(1); }
const page = targets.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;

await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await send("Page.enable");

const shot = async (name, quality = 70) => {
  const png = name.endsWith(".png");
  const r = await send("Page.captureScreenshot", png ? { format: "png" } : { format: "jpeg", quality });
  const file = join(outDir, png ? name : name + ".jpg");
  writeFileSync(file, Buffer.from(r.result.data, "base64"));
  console.log("saved", file);
};

for (const step of plan) {
  if (step.transparent !== undefined) {
    await send("Emulation.setDefaultBackgroundColorOverride", step.transparent ? { color: { r: 0, g: 0, b: 0, a: 0 } } : {});
    continue;
  }
  if (step.viewport) {
    await send("Emulation.setDeviceMetricsOverride", { width: step.viewport[0], height: step.viewport[1], deviceScaleFactor: step.viewport[2] || 1, mobile: step.viewport[0] < 600 });
    continue;
  }
  if (step.goto) {
    await send("Page.navigate", { url: step.goto });
    await sleep(step.wait ?? 1500);
    if (step.shot) await shot(step.shot, step.quality);
    continue;
  }
  if (step.eval) await evaluate(step.eval);
  if (step.wait) await sleep(step.wait);
  if (step.shot) await shot(step.shot, step.quality);
}

ws.close();
browser.kill();
await sleep(300);
try { rmSync(PROFILE, { recursive: true, force: true }); } catch {}
process.exit(0);
