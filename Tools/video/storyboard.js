/* ============================================================
   Video storyboard — runs inside the invitation page while
   Tools/make-video.mjs records it.

   1. The curtains (with the names) sway for a moment, then draw open
      and the first page's text fades in over the frame.
   2. Every other element with data-video-scene is shown alone, in
      page order, for data-video-hold milliseconds (content fades,
      the frame stays). Elements with data-video-hide are hidden.
   3. The ground (grass, cloth, leaves) rises in for the closing scene,
      and a QR scene is added at the end.

   Edit the timings below (milliseconds) to change pacing.
   ============================================================ */
window.__video = (() => {
  const OPENING_MS = 3000;     // curtains closed, swaying, before they open
  const CURTAIN_MS = 2100;     // the curtains' opening (matches the site's data-duration)
  const FIRST_IN_AT = 700;     // the first page's text starts fading in this long after they start opening
  const FADE_OUT_MS = 650;     // content fades out (frame stays)
  const FADE_IN_MS = 650;      // next content fades in
  const GROUND_MS = 1200;      // grass and cloth rising in for the closing
  const DEFAULT_HOLD = 4000;   // for scenes without data-video-hold
  const QR_HOLD = 5500;        // final QR scene

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const easeInOut = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

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

  async function fade(el, to, ms) {
    if (to) el.classList.add("is-video-active");
    await tween(el, to ? 0 : 1, to, ms);
    if (!to) el.classList.remove("is-video-active");
  }

  const scenes = () => [...document.querySelectorAll("[data-video-scene]")]
    .filter((el) => !el.closest("[hidden]"));
  const needsGround = (el) => ["closing", "qr"].includes(el.dataset.videoScene);

  // ---------- before recording (normal time) ----------
  async function setup(css) {
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    document.documentElement.classList.add("video-mode");
    document.body.classList.remove("is-locked");

    // the ground becomes part of the frame (it fades in for the closing)
    const ground = document.querySelector(".ground");
    if (ground) {
      ground.querySelectorAll("img").forEach((img) => { img.loading = "eager"; });
      document.querySelector(".page").appendChild(ground);
    }

    await buildQrScene();

    // lay out every scene once (still invisible) so all fonts and images load before recording
    document.documentElement.classList.add("video-preload");
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
    await sleep(800);
    await document.fonts.ready;
    document.documentElement.classList.remove("video-preload");

    // shrink any scene that is taller than its open space in the arch
    const cu = innerWidth / 1080;
    for (const el of scenes()) {
      if (el.dataset.videoScene === "first") continue;
      const room = (needsGround(el) ? 860 : 1460) * cu;
      const h = el.offsetHeight;
      el.style.setProperty("--fit", h > room ? (room / h).toFixed(3) : "1");
    }

    // the first page's text waits behind the curtains
    const first = scenes()[0];
    if (first) { first.classList.add("is-video-active"); first.style.opacity = "0"; }
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
      `<p class="vqr__names"><span></span><img src="assets/waw.webp" alt=""><span></span></p>` +
      `<div class="vqr__panel">${svg}</div>` +
      `<p class="vqr__scan">امسح الرمز لفتح الدعوة</p>` +
      `<p class="vqr__url"></p>`;
    const [g, b] = scene.querySelectorAll(".vqr__names span");
    g.textContent = groom; b.textContent = bride;
    scene.querySelector(".vqr__url").textContent = url;
    document.querySelector(".more").appendChild(scene);
  }

  // ---------- the recording ----------
  async function play() {
    const list = scenes();
    const ground = document.querySelector(".page > .ground");

    // 1. curtains sway, then open; the first page's text appears behind them
    await sleep(OPENING_MS);
    const intro = document.getElementById("intro");
    if (intro) {
      intro.classList.add("is-playing");
      await sleep(FIRST_IN_AT);
      if (list[0]) tween(list[0], 0, 1, 1200);
      await sleep(CURTAIN_MS - FIRST_IN_AT);
      intro.style.visibility = "hidden";
    } else if (list[0]) {
      await tween(list[0], 0, 1, FADE_IN_MS);
    }
    await sleep(Number(list[0] && list[0].getAttribute("data-video-hold")) || DEFAULT_HOLD);

    // 2. one scene at a time; content fades, the frame stays
    for (let i = 1; i < list.length; i++) {
      const el = list[i];
      await fade(list[i - 1], 0, FADE_OUT_MS);
      if (ground && needsGround(el) && !needsGround(list[i - 1])) {
        tween(ground, 0, 1, GROUND_MS);                      // grass and cloth rise in
        await sleep(GROUND_MS / 2);
      }
      await fade(el, 1, FADE_IN_MS);
      await sleep(Number(el.getAttribute("data-video-hold")) || DEFAULT_HOLD);
    }
  }

  return { setup, play };
})();
