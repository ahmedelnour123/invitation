/* ============================================================
   Video storyboard — runs inside the invitation page while
   Tools/make-video.mjs records it.

   Scenes come from the page itself: every element with
   data-video-scene is shown alone, in page order, for
   data-video-hold milliseconds. Elements with data-video-hide
   are hidden. A QR scene is added at the end.

   Edit the timings below (milliseconds) to change pacing.
   ============================================================ */
window.__video = (() => {
  const OPENING_MS = 3500;     // smoke opening on screen before it "opens"
  const SMOKE_IN_MS = 900;     // smoke fills the screen …
  const SMOKE_OVERLAP_MS = 250;//   … and the clearing starts this long before it's full (no pause)
  const SMOKE_CLEAR_MS = 1100; // smoke clears to reveal the first scene
  const FADE_OUT_MS = 650;     // content fades out (background stays)
  const FADE_IN_MS = 650;      // next content fades in
  const DEFAULT_HOLD = 4000;   // for scenes without data-video-hold
  const QR_HOLD = 5500;        // final QR scene

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const easeInOut = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  const easeOut = (k) => 1 - (1 - k) * (1 - k);

  // Animate an element's opacity frame by frame (instead of CSS transitions,
  // so every frame follows the recorder's clock exactly).
  function tween(el, from, to, ms, ease = easeInOut) {
    el.style.transition = "none";
    el.style.opacity = String(from);
    const t0 = performance.now();
    return new Promise((done) => {
      (function step() {
        // read the page clock directly (the recorder controls it); the timestamp
        // passed to requestAnimationFrame can run on a different clock
        const k = Math.min(1, (performance.now() - t0) / ms);
        el.style.opacity = String(from + (to - from) * ease(k));
        if (k < 1) requestAnimationFrame(step); else done();
      })();
    });
  }

  // Fade a scene in (to = 1) or out (to = 0)
  async function fade(el, to, ms) {
    if (to) el.classList.add("is-video-active");
    await tween(el, to ? 0 : 1, to, ms);
    if (!to) el.classList.remove("is-video-active");
  }

  // Line up words written in different scripts/shapes by the middle of their
  // actual ink, not their text baseline (e.g. Ruqaa "خضر" sits low, "أمل" sits high).
  function alignInk(container) {
    const g = document.createElement("canvas").getContext("2d");
    const items = [...container.children].map((el) => {
      const cs = getComputedStyle(el);
      g.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const m = g.measureText(el.textContent);
      return { el, mid: (m.actualBoundingBoxDescent - m.actualBoundingBoxAscent) / 2 };
    });
    const names = items.filter((x) => x.el.tagName !== "I");          // the two names decide the line
    const target = names.reduce((s, x) => s + x.mid, 0) / (names.length || 1);
    for (const x of items) x.el.style.transform = `translateY(${(target - x.mid).toFixed(1)}px)`;
  }
  const scenes = () => [...document.querySelectorAll("[data-video-scene]")]
    .filter((el) => !el.closest("[hidden]"));

  // ---------- before recording (normal time) ----------
  async function setup(css) {
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    document.documentElement.classList.add("video-mode");

    await buildQrScene();

    // lay out every scene once (still invisible) so all fonts load before recording
    document.documentElement.classList.add("video-preload");
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await document.fonts.ready;
    await sleep(800);
    await document.fonts.ready;
    document.documentElement.classList.remove("video-preload");

    const names = document.querySelector(".vqr__names");
    if (names) alignInk(names);

    // shrink any scene that is taller than the space between the strips
    const room = innerHeight - 2 * 22 - 36;
    for (const el of scenes()) {
      const h = el.offsetHeight;
      el.style.setProperty("--fit", h > room ? (room / h).toFixed(3) : "1");
    }
    // first scene sits under the opening, ready to be revealed
    const first = scenes()[0];
    if (first) { first.classList.add("is-video-active"); first.style.opacity = "1"; }
  }

  async function buildQrScene() {
    let svg = "";
    try {
      const res = await fetch("qr/qr-code.svg", { cache: "no-cache" });
      if (res.ok) svg = await res.text();
    } catch {}
    if (!svg.includes("<svg")) return;                      // no QR on this site → no QR scene

    const W = window.WEDDING || {};
    const groom = (W.groom && (W.groom.shortName || W.groom.name)) || "";
    const bride = (W.bride && (W.bride.shortName || W.bride.name)) || "";
    const canonical = document.querySelector('link[rel="canonical"]');
    const url = canonical ? canonical.href.replace(/^https?:\/\//, "").replace(/\/$/, "") : location.host;

    const scene = document.createElement("section");
    scene.className = "section vqr";
    scene.setAttribute("data-video-scene", "qr");
    scene.setAttribute("data-video-hold", String(QR_HOLD));
    scene.innerHTML =
      `<p class="vqr__names"><span></span><i>&amp;</i><span></span></p>` +
      `<div class="vqr__panel">${svg}</div>` +
      `<p class="vqr__scan">امسح الرمز لفتح الدعوة</p>` +
      `<p class="vqr__url"></p>`;
    const [g, b] = scene.querySelectorAll(".vqr__names span");
    g.textContent = groom; b.textContent = bride;
    scene.querySelector(".vqr__url").textContent = url;
    const bottomBand = document.querySelector(".paper .band--bottom");
    bottomBand.parentNode.insertBefore(scene, bottomBand);
  }

  // ---------- the recording ----------
  async function play() {
    // 1. the smoke opening (tap hint hidden), then it opens by itself:
    //    smoke fills the screen and, before it's even full, starts clearing — no pause.
    await sleep(OPENING_MS);
    const intro = document.getElementById("intro");
    if (intro) {
      const fog = intro.querySelector(".smk-fog");
      intro.style.transition = "none";
      if (fog) tween(fog, 0, 1, SMOKE_IN_MS);
      await sleep(fog ? SMOKE_IN_MS - SMOKE_OVERLAP_MS : 0);
      await tween(intro, 1, 0, SMOKE_CLEAR_MS, easeOut);
      intro.style.visibility = "hidden";
    }

    // 2. one scene at a time; content fades, background & strips stay
    const list = scenes();
    for (let i = 0; i < list.length; i++) {
      const el = list[i];
      if (i > 0) {
        await fade(list[i - 1], 0, FADE_OUT_MS);
        await fade(el, 1, FADE_IN_MS);
      }
      await sleep(Number(el.getAttribute("data-video-hold")) || DEFAULT_HOLD);
    }
  }

  return { setup, play };
})();
