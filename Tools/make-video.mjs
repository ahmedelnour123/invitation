// Records a portrait 1080×1920 video of the invitation website.
// It opens the site in headless Edge/Chrome at phone size and switches it to
// "video mode" (Tools/video/video-mode.css): one fixed frame (the first page's
// art and pillars), and each part of the page marked data-video-scene shown
// alone inside the arch, fading from one to the next (Tools/video/storyboard.js). It starts
// with the curtains opening and ends with a QR scene, then encodes an MP4 with ffmpeg.
//
// The page's clock is controlled: time is paused, moved forward exactly one
// frame (1/fps s), a full-resolution screenshot is taken, and so on. Every
// frame is sharp and evenly spaced no matter how fast the computer is
// (a 60 s video takes ~3 minutes to render).
//
// usage:  node Tools/make-video.mjs [--site URL] [--out FILE] [--fps 30]
//   --site  page to record (default: env SITE, else http://localhost:5173)
//           e.g. --site https://khidir-amal.ahmedelnour.com
//   --out   output file (default: the next free video/invitation-vN.mp4,
//           so earlier versions are never overwritten)
//   --fps   frames per second (default 30)
//
// Needs: Node 22+, Edge or Chrome, ffmpeg on PATH (or env FFMPEG=<path>).
import { spawn, spawnSync } from "node:child_process";
import { writeFileSync, readFileSync, mkdirSync, existsSync, rmSync, mkdtempSync, statSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

/* ---------- options ---------- */
const argv = process.argv.slice(2);
const opt = (name) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : undefined; };
const TOOLS = dirname(fileURLToPath(import.meta.url));
const PROJECT = resolve(TOOLS, "..");
const SITE = (opt("site") || process.env.SITE || "http://localhost:5173").replace(/\/$/, "");
// default output: next version number after the existing video/invitation-vN.mp4 files
function nextVersionFile() {
  const dir = join(PROJECT, "video");
  const taken = existsSync(dir)
    ? readdirSync(dir).map((f) => /^invitation-v(\d+)\.mp4$/i.exec(f)).filter(Boolean).map((m) => Number(m[1]))
    : [];
  return join(dir, `invitation-v${Math.max(0, ...taken) + 1}.mp4`);
}
const OUT = resolve(opt("out") || nextVersionFile());
const FPS = Number(opt("fps") || 30);
const MAX_SECONDS = 180;                 // safety stop if the storyboard never finishes

// 432×768 CSS px (a typical phone) rendered at 2.5× = 1080×1920
const VIEW = { width: 432, height: 768, scale: 2.5 };
const W = Math.round(VIEW.width * VIEW.scale), H = Math.round(VIEW.height * VIEW.scale);

const FFMPEG = process.env.FFMPEG || "ffmpeg";
if (spawnSync(FFMPEG, ["-version"], { stdio: "ignore" }).status !== 0) {
  console.error("ffmpeg not found. Install it or set FFMPEG=<path to ffmpeg>.");
  process.exit(1);
}

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const work = mkdtempSync(join(tmpdir(), "invitation-video-"));
const framesDir = join(work, "frames");
mkdirSync(framesDir);

/* ---------- browser ---------- */
const PORT = 9338;
const browser = spawn(BROWSER, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--mute-audio",
  // draw every frame completely on the main thread, in step with the frozen clock
  "--run-all-compositor-stages-before-draw", "--disable-threaded-animation",
  "--disable-threaded-scrolling", "--disable-checker-imaging",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(work, "profile")}`,
  "about:blank",
], { stdio: "ignore" });

const cleanup = () => { try { browser.kill(); } catch {} };
// on any exit (success or failure) stop the browser and delete the temporary frames
process.on("exit", () => { cleanup(); try { rmSync(work, { recursive: true, force: true }); } catch {} });

let targets;
for (let i = 0; i < 40; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); break; } catch { await sleep(250); }
}
if (!targets) { console.error("Browser did not start."); process.exit(1); }
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));

let msgId = 0;
const pending = new Map();
const budgetWaiters = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === "Emulation.virtualTimeBudgetExpired") budgetWaiters.splice(0).forEach((f) => f());
});
// every browser command fails loudly after 30 s instead of hanging forever
const send = (method, params = {}) => new Promise((r, reject) => {
  const i = ++msgId;
  const timer = setTimeout(() => { pending.delete(i); reject(new Error(`Browser did not answer "${method}" within 30 s.`)); }, 30000);
  pending.set(i, (m) => { clearTimeout(timer); r(m); });
  ws.send(JSON.stringify({ id: i, method, params }));
});
const evaluate = async (expr, awaitPromise = true) => {
  const r = await send("Runtime.evaluate", { expression: expr, awaitPromise, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || "page script failed");
  return r.result?.result?.value;
};
// move the page clock forward by `ms` and wait until it has got there.
// ("advance" never waits on downloads — everything is preloaded during setup,
//  and waiting on a download while time is frozen can stall forever.)
const advance = (ms) => new Promise(async (r, reject) => {
  const watchdog = setTimeout(() => reject(new Error("The page stopped responding while rendering (frame stuck for 20 s).")), 20000);
  budgetWaiters.push(() => { clearTimeout(watchdog); r(); });
  await send("Emulation.setVirtualTimePolicy", { policy: "advance", budget: ms });
});

/* ---------- load the page (normal time) ---------- */
console.log(`Opening ${SITE} at ${W}×${H} …`);
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: VIEW.width, height: VIEW.height, deviceScaleFactor: VIEW.scale, mobile: true });
await send("Page.navigate", { url: `${SITE}/index.html?video=${Date.now()}` });
await sleep(1500);
await evaluate("document.fonts.ready");

// switch the page to video mode and prepare the scenes (QR scene, sizing)
const storyboard = readFileSync(join(TOOLS, "video", "storyboard.js"), "utf8");
const css = readFileSync(join(TOOLS, "video", "video-mode.css"), "utf8");
await evaluate(storyboard);
const sceneNames = await evaluate(`window.__video.setup(${JSON.stringify(css)}).then(() =>
  [...document.querySelectorAll("[data-video-scene]")].filter(el => !el.closest("[hidden]")).map(el => el.dataset.videoScene))`);
console.log("Scenes:", ["opening", ...sceneNames].join(" → "));
await sleep(600);

/* ---------- play the storyboard frame by frame ---------- */
await send("Emulation.setVirtualTimePolicy", { policy: "pause" });
await send("Page.captureScreenshot", { format: "jpeg", quality: 50 });   // warm-up: the first draw can be incomplete
await evaluate(`window.__storyDone = false; window.__video.play().then(() => { window.__storyDone = true; }); 1`, false);

const frameMs = 1000 / FPS;
let n = 0, tail = Math.round(0.3 * FPS);
const started = Date.now();
while (n < MAX_SECONDS * FPS) {
  await advance(frameMs);
  const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 92 });
  writeFileSync(join(framesDir, `f${String(n).padStart(5, "0")}.jpg`), Buffer.from(shot.result.data, "base64"));
  n++;
  if (n % (FPS * 5) === 0) process.stdout.write(`  ${n / FPS} s of video rendered\n`);
  if (await evaluate("window.__storyDone", false)) { if (--tail <= 0) break; }
}
ws.close();
cleanup();
console.log(`Rendered ${n} frames (${(n / FPS).toFixed(1)} s) in ${((Date.now() - started) / 1000).toFixed(0)} s`);

/* ---------- encode ---------- */
mkdirSync(dirname(OUT), { recursive: true });
console.log("Encoding with ffmpeg …");
const enc = spawnSync(FFMPEG, [
  "-y", "-loglevel", "error",
  "-framerate", String(FPS), "-i", join(framesDir, "f%05d.jpg"),
  // JPEG frames are full-range colour; convert to the standard TV range so phones play it correctly
  "-vf", "scale=in_range=pc:out_range=tv,format=yuv420p",
  "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-profile:v", "high",
  "-pix_fmt", "yuv420p", "-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
  "-movflags", "+faststart",
  OUT,
], { stdio: "inherit" });
if (enc.status !== 0) { console.error("ffmpeg failed."); process.exit(1); }

await sleep(300);
console.log(`Saved ${OUT} (${(statSync(OUT).size / 1e6).toFixed(1)} MB, ${W}×${H}, ${FPS} fps)`);
process.exit(0);
