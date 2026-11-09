// Turns any audio or video file into the site's background music, in the two
// formats that are smallest for phones while playing everywhere:
//
//   <name>.webm   Opus  — the most efficient music codec on the web
//                         (Android, Chrome, Firefox, Edge, recent Safari)
//   <name>.m4a    AAC   — the fallback every iPhone/iPad and Mac plays
//
// The page lists both; each phone downloads only the first one it can play.
//
// Along the way it:
//   • drops any video track and metadata
//   • trims silence at the start and end (so the loop has no dead gap)
//   • evens out the loudness to a gentle background level (two-pass EBU R128),
//     which matters on iPhones, where a page cannot turn the volume down
//   • fades in and out briefly so the loop point is smooth
//
// usage:  node Tools/make-audio.mjs <input> [options]
//   --name NAME     output name (default: the input's file name)
//   --out DIR       output folder (default: assets/audio)
//   --start S       start at S seconds        --end S   stop at S seconds
//   --loudness L    target loudness in LUFS (default -18; lower = quieter)
//   --opus K        Opus bitrate in kbps (default 64)
//   --aac K         AAC bitrate in kbps (default 112)
//   --mono          mix down to mono (about half the size; fine for phone speakers)
//   --fade S        fade in/out length in seconds (default 1.5; 0 = none)
//   --keep-silence  don't trim silence
//
// Then put the path, without the extension, in config.js → music.src,
// e.g. "assets/audio/safeer-albulbul".
//
// Needs: Node 18+, ffmpeg + ffprobe on PATH (or env FFMPEG / FFPROBE).
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, statSync, existsSync } from "node:fs";
import { join, resolve, basename, extname, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const argv = process.argv.slice(2);
const input = argv.find((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--") && !["--mono", "--keep-silence"].includes(argv[i - 1])));
const opt = (name, def) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : def; };
const flag = (name) => argv.includes(`--${name}`);
if (!input || !existsSync(input)) {
  console.error("usage: node Tools/make-audio.mjs <input file> [--name NAME] [--out DIR] [--mono] …");
  process.exit(1);
}

const PROJECT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const FFPROBE = process.env.FFPROBE || "ffprobe";
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9؀-ۿ]+/gi, "-").replace(/^-+|-+$/g, "") || "music";
const NAME = opt("name", slug(basename(input, extname(input))));
const OUT = resolve(PROJECT, opt("out", "assets/audio"));
const LUFS = Number(opt("loudness", -18));
const OPUS_K = Number(opt("opus", 64));
const AAC_K = Number(opt("aac", 112));
const FADE = Number(opt("fade", 1.5));
const MONO = flag("mono");
const start = opt("start"), end = opt("end");

function run(cmd, args, { quiet = true } = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.error) { console.error(`${cmd} not found. Install ffmpeg or set FFMPEG/FFPROBE.`); process.exit(1); }
  if (r.status !== 0) { console.error(r.stderr.split("\n").slice(-15).join("\n")); process.exit(1); }
  if (!quiet) process.stdout.write(r.stdout);
  return r;
}
const duration = (file) => Number(run(FFPROBE, ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file]).stdout.trim());

mkdirSync(OUT, { recursive: true });
const work = mkdtempSync(join(tmpdir(), "invitation-audio-"));
process.on("exit", () => { try { rmSync(work, { recursive: true, force: true }); } catch {} });

// 1. decode → trimmed, clean PCM (no video, no metadata)
const trim = [];
if (!flag("keep-silence")) {
  const cut = "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05";
  trim.push(cut, "areverse", cut, "areverse");
}
if (MONO) trim.push("pan=mono|c0=0.5*c0+0.5*c1");
const clean = join(work, "clean.wav");
run(FFMPEG, [
  "-y", "-hide_banner",
  ...(start ? ["-ss", start] : []), ...(end ? ["-to", end] : []),
  "-i", input, "-vn", "-sn", "-dn", "-map_metadata", "-1",
  ...(trim.length ? ["-af", trim.join(",")] : []),
  "-c:a", "pcm_s16le", clean,
]);
const len = duration(clean);
console.log(`Source: ${basename(input)} → ${len.toFixed(1)} s of audio${MONO ? " (mono)" : ""}`);

// 2. measure loudness (first pass)
const target = `I=${LUFS}:TP=-1.5:LRA=11`;
const measure = run(FFMPEG, ["-hide_banner", "-i", clean, "-af", `loudnorm=${target}:print_format=json`, "-f", "null", "-"]).stderr;
const m = JSON.parse(measure.slice(measure.lastIndexOf("{"), measure.lastIndexOf("}") + 1));
console.log(`Loudness: ${m.input_i} LUFS → ${LUFS} LUFS`);

// 3. normalise (second pass, linear so the music isn't squashed) + fades
const filters = [
  `loudnorm=${target}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`,
];
if (FADE > 0) filters.push(`afade=t=in:d=${FADE}`, `afade=t=out:st=${Math.max(0, len - FADE).toFixed(3)}:d=${FADE}`);
const af = filters.join(",");

const webm = join(OUT, `${NAME}.webm`);
const m4a = join(OUT, `${NAME}.m4a`);
run(FFMPEG, ["-y", "-hide_banner", "-i", clean, "-af", `${af},aresample=48000`,
  "-c:a", "libopus", "-b:a", `${OPUS_K}k`, "-vbr", "on", "-application", "audio", webm]);
run(FFMPEG, ["-y", "-hide_banner", "-i", clean, "-af", `${af},aresample=44100`,
  "-c:a", "aac", "-b:a", `${AAC_K}k`, "-movflags", "+faststart", m4a]);

const kb = (f) => `${Math.round(statSync(f).size / 1024)} KB`;
console.log(`Saved ${webm} (${kb(webm)}, Opus ${OPUS_K} kbps)`);
console.log(`Saved ${m4a} (${kb(m4a)}, AAC ${AAC_K} kbps)`);
console.log(`In config.js set: music: { src: "${(OUT.startsWith(PROJECT) ? OUT.slice(PROJECT.length + 1) : OUT).replace(/\\/g, "/")}/${NAME}" }`);
