/* ============================================================
   Video storyboard — runs inside the invitation page while
   Tools/make-video.mjs records it.

   Paced like a classic animated invitation: the decorations draw
   themselves in, the text appears one line at a time, the page
   holds, then the decorations change and the next page builds up
   line by line.

   1. Cover  — on plain paper the flowers bleed in from the top
               corners like watercolour, the curtains slide in, the
               chandelier lowers and swings to rest, the pillars draw
               down. Then the first page's text appears line by line
               (verse, opening words, names, date) and holds.
   2. Change — the text fades, the chandelier lifts away, the curtains
               slide out, the flowers fade like wet paint; the pillars
               run the full height and the grass and cloth bleed in
               at the bottom.
   3. Details — built from the page's own text (config.js), on two
               pages that each build up line by line and hold:
               the host families, the invitation and the couple;
               then the date, time and venue with their icons and
               the closing words.
   4. QR     — the names and the site's QR code (if qr/qr-code.svg exists).

   Edit the timings below (milliseconds) to change the pacing.
   ============================================================ */
window.__video = (() => {
  const T = {
    // 1. cover
    PAPER: 300,              // plain paper before anything appears
    FLOWERS_MS: 2600,        // watercolour bleed of the flowers
    CURTAINS_AT: 700, CURTAINS_MS: 1700,
    CHANDELIER_AT: 1300, CHANDELIER_MS: 1500, SWING_MS: 3200,
    PILLARS_AT: 1700, PILLARS_MS: 1500,
    TEXT_AT: 2900,           // first line of text (from the start of the cover)
    LINE_MS: 750,            // each line's fade-in
    LINE_GAP: 480,           // between lines of the verse / opening words
    NAME_GAP: 220,           // between the pieces of the names
    COVER_HOLD: 3000,        // the finished cover stays this long
    // 2. change of page
    TEXT_OUT_MS: 600,
    DECOR_OUT_MS: 1300,
    GROUND_MS: 1900,
    // 3. details
    DETAIL_GAP: 720,         // between lines
    DETAILS_HOLD: [3800, 4500],   // each details page stays this long once complete
    // 4. QR
    FADE_MS: 700,
    QR_HOLD: 5000,
  };

  /* ---------- small animation kit (follows the recorder's clock) ---------- */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const easeInOut = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  const easeOut = (k) => 1 - Math.pow(1 - k, 3);
  const easeIn = (k) => k * k * k;
  const easeOutBack = (k) => 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);

  // calls fn(easedProgress, rawProgress, elapsedMs) every frame for `ms`
  function animate(ms, fn, ease = easeInOut) {
    const t0 = performance.now();
    return new Promise((done) => {
      (function step() {
        const el = performance.now() - t0;
        const k = Math.min(1, el / ms);
        fn(ease(k), k, el);
        if (k < 1) requestAnimationFrame(step); else done();
      })();
    });
  }
  const later = (ms, fn) => sleep(ms).then(fn);
  const fadeTo = (el, from, to, ms, ease) => animate(ms, (e) => { el.style.opacity = from + (to - from) * e; }, ease);

  // a line of text appears: fades in, rises a little, comes into focus
  function showLine(el, ms = T.LINE_MS) {
    return animate(ms, (e) => {
      el.style.opacity = e;
      el.style.transform = `translateY(${((1 - e) * 0.6).toFixed(3)}em)`;
      el.style.filter = e < 1 ? `blur(${((1 - e) * 5).toFixed(2)}px)` : "none";
    }, easeOut);
  }
  const hideLine = (el) => { el.style.opacity = 0; };

  /* ---------- watercolour bleed: a picture spreads in with ragged, blotchy edges ---------- */
  function rng(seed) {                          // small seeded random, so every render is the same
    return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  // "when does each pixel appear" (0…1): a base shape plus fractal noise
  function timeMap(w, h, base, noise, seed) {
    const rand = rng(seed);
    const octave = (cells) => {
      const gw = cells + 2, gh = Math.ceil(cells * h / w) + 2, g = new Float32Array(gw * gh).map(() => rand());
      return (x, y) => {
        const fx = x / w * cells, fy = y / w * cells, ix = fx | 0, iy = fy | 0, tx = fx - ix, ty = fy - iy;
        const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty), i = iy * gw + ix;
        const a = g[i] + (g[i + 1] - g[i]) * sx, b = g[i + gw] + (g[i + gw + 1] - g[i + gw]) * sx;
        return a + (b - a) * sy;
      };
    };
    const oct = [[octave(3), 0.5], [octave(7), 0.28], [octave(16), 0.14], [octave(40), 0.08]];
    // computed on a coarse grid, then smoothed up to full size
    const step = 4, cw = Math.ceil(w / step) + 1, ch = Math.ceil(h / step) + 1, c = new Float32Array(cw * ch);
    let lo = Infinity, hi = -Infinity;
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
      const x = i * step, y = j * step;
      let n = 0; for (const [f, a] of oct) n += f(x, y) * a;
      const v = base(x / w, y / h) + (n - 0.5) * noise;
      c[j * cw + i] = v; if (v < lo) lo = v; if (v > hi) hi = v;
    }
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      const fy = y / step, j = Math.min(ch - 2, fy | 0), ty = fy - j;
      for (let x = 0; x < w; x++) {
        const fx = x / step, i = Math.min(cw - 2, fx | 0), tx = fx - i, k = j * cw + i;
        const a = c[k] + (c[k + 1] - c[k]) * tx, b = c[k + cw] + (c[k + cw + 1] - c[k + cw]) * tx;
        out[y * w + x] = ((a + (b - a) * ty) - lo) / (hi - lo);
      }
    }
    return out;
  }
  // a canvas showing `draw`'s picture; set(p) reveals it up to p (0…1)
  function bleedCanvas(cls, cssW, cssH, draw, base, noise, seed) {
    const cv = document.createElement("canvas");
    const dpr = devicePixelRatio || 1;
    cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
    cv.className = cls;
    const ctx = cv.getContext("2d");
    draw(ctx, cv.width, cv.height);
    const src = ctx.getImageData(0, 0, cv.width, cv.height);
    const alpha = new Uint8ClampedArray(src.data.length / 4);
    for (let i = 0; i < alpha.length; i++) alpha[i] = src.data[i * 4 + 3];
    const tm = timeMap(cv.width, cv.height, base, noise, seed);
    const soft = 0.1;
    cv.set = (p) => {
      const d = src.data, pp = p * (1 + soft);
      for (let i = 0, j = 3; i < tm.length; i++, j += 4) {
        let a = (pp - tm[i]) / soft;
        d[j] = a <= 0 ? 0 : a >= 1 ? alpha[i] : alpha[i] * a;
      }
      ctx.putImageData(src, 0, 0);
    };
    cv.set(0);
    return cv;
  }

  /* ---------- helpers to read the page ---------- */
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const text = (s) => (($(s) || {}).textContent || "").trim();
  const loadImg = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  let S = {};                                   // everything the recording needs, prepared in setup()

  // ---------- before recording (normal time) ----------
  async function setup(css, layers) {
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    document.documentElement.classList.add("video-mode");
    document.body.classList.remove("is-locked");
    document.body.classList.add("is-open");
    const intro = document.getElementById("intro");
    if (intro) intro.remove();

    const page = $(".page"), card = $(".card");
    const cu = innerWidth / 1080;
    const box = (b) => `left:${b[0] * cu}px;top:${b[1] * cu}px;width:${b[2] * cu}px;height:${b[3] * cu}px`;

    // --- 1. the cover's decorations, one piece each (Tools/video/layers, made by build_from_canva.py)
    const L = layers.boxes;
    const deco = el("div", "vdeco");
    const white = el("div", "vdeco__paper"); white.style.cssText = box(L.flowers);
    const [flowersImg, curtainR, curtainL, chand, texture] = await Promise.all(
      ["flowers", "curtain-r", "curtain-l", "chandelier", "texture"].map((k) => loadImg(layers.src[k])));
    const flowers = bleedCanvas("vdeco__flowers", L.flowers[2] * cu, L.flowers[3] * cu,
      (ctx, w, h) => ctx.drawImage(flowersImg, 0, 0, w, h),
      // from both top corners, the arch's centre last
      (x, y) => Math.min(Math.hypot(x, y * 1.07), Math.hypot(1 - x, y * 1.07)), 0.55, 7);
    flowers.style.cssText = box(L.flowers);
    const piece = (img, b, cls) => { img.className = cls; img.style.cssText = box(b); return img; };
    const cR = piece(curtainR, L["curtain-r"], "vdeco__curtain vdeco__curtain--r");
    const cL = piece(curtainL, L["curtain-l"], "vdeco__curtain vdeco__curtain--l");
    const ch = piece(chand, L.chandelier, "vdeco__chandelier");
    const tx = piece(texture, L.texture, "vdeco__texture");
    deco.append(white, flowers, cR, cL, ch, tx);
    card.insertBefore(deco, card.firstChild);

    // --- the cover's text, split into the lines that appear one by one
    const verse = $(".card__verse-text");
    if (verse) {
      const lines = verse.textContent.split("\n");
      verse.textContent = "";
      lines.forEach((l) => verse.appendChild(el("span", "vline")).textContent = l);
    }
    const coverLines = [
      ...$$(".card__verse-text .vline"), $(".card__verse-ref"),
      ...$$(".t-intro > *"),
    ].filter(Boolean).map((e) => ({ e, gap: T.LINE_GAP }));
    $$(".card__names > *").forEach((e) => coverLines.push({ e, gap: T.NAME_GAP }));
    coverLines.push({ e: $(".card__date"), gap: T.LINE_GAP + 200 });
    coverLines.forEach(({ e }) => { e.classList.add("vl"); hideLine(e); });

    // --- 2. the second page's frame: full-height pillars and the ground (grass, leaves, cloth)
    const frame2 = el("div", "vframe2");
    const pl = el("div", "vframe2__pillar vframe2__pillar--l"), pr = el("div", "vframe2__pillar vframe2__pillar--r");
    const [groundImg, clothImg] = await Promise.all([loadImg("assets/bottom.webp"), loadImg("assets/cloth.webp")]);
    const gH = 1080 * groundImg.naturalHeight / groundImg.naturalWidth;          // in Canva units (≈770)
    const ground = bleedCanvas("vframe2__ground", innerWidth, gH * cu, (ctx, w, h) => {
      ctx.drawImage(groundImg, 0, 0, w, h);
      const k = w / 1080;
      ctx.globalAlpha = 0.82;                                                       // as on the site
      ctx.drawImage(clothImg, -8.77 * k, 174.45 * k, 1097.53 * k, 572.44 * k);
      ctx.globalAlpha = 1;
    }, (x, y) => 1 - y + 0.25 * Math.abs(x - 0.5), 0.6, 11);                       // rising from the bottom
    frame2.append(pl, pr, ground);
    page.appendChild(frame2);

    // --- 3. the details pages, from the page's own text
    const details = buildDetails();
    details.forEach((d) => page.appendChild(d));

    // --- 4. QR
    const qr = await buildQr();
    if (qr) page.appendChild(qr);

    // load every font and image before recording
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
    await sleep(600);
    await document.fonts.ready;

    // shrink a details / QR page if it is taller than its space
    for (const s of [...details, qr].filter(Boolean)) {
      const inner = s.firstElementChild, room = s.clientHeight, h = inner.offsetHeight;
      inner.style.setProperty("--fit", h > room ? (room / h).toFixed(3) : "1");
    }
    details.forEach((d) => $$(".vl", d).forEach(hideLine));
    if (qr) alignNames(qr.querySelector(".vqr__names"));

    S = { card, deco, flowers, cR, cL, ch, tx, white, coverLines, frame2, pl, pr, ground, details, qr };
    card.style.setProperty("--pr", 0);
    [cR, cL, ch, tx].forEach((e) => { e.style.opacity = 0; });
    return ["cover", "change", "details", qr ? "qr" : null].filter(Boolean);
  }

  function buildDetails() {
    const fams = $$("#hosts .hosts__family").map((f) => f.cloneNode(true));
    const line = $("#hosts .hosts__line");
    const groom = text('#hosts [data-field="groomFullName"]');
    const bride = text('#hosts [data-field="brideFullName"]');
    const notes = $$("#notesSection li").map((li) => li.textContent.trim()).filter(Boolean);

    const pages = [];
    let col;
    const newPage = (kind) => { const sec = el("section", `vpage vdetails vdetails--${kind}`); col = sec.appendChild(el("div", "vd")); pages.push(sec); };
    const add = (node) => { node.classList.add("vl"); col.appendChild(node); return node; };

    // first page: who invites, and whom to
    newPage("hosts");

    if (text('#hosts [data-field="hostsLabel"]')) add(el("p", "vd__label")).textContent = text('#hosts [data-field="hostsLabel"]');
    fams.forEach((f, i) => {
      const p = add(el("p", "vd__family"));
      if (i) p.appendChild(el("span", "vd__and", "و"));
      // on the site the two names and their «و» sit on separate lines; here they share
      // one, so put real spaces between them (else «علي» joins onto the «و»)
      [...f.children].slice(1).forEach((c) => f.insertBefore(document.createTextNode(" "), c));
      p.appendChild(f);
    });
    if (line && line.textContent.trim()) add(el("p", "vd__line")).append(...[...line.cloneNode(true).childNodes]);
    add(el("img", "vd__flourish")).src = "assets/flourish.svg";
    if (groom || bride) {
      const c = add(el("div", "vd__couple"));
      c.appendChild(el("p")).textContent = groom;
      const w = c.appendChild(el("img")); w.src = "assets/waw.webp"; w.alt = "و";
      c.appendChild(el("p")).textContent = bride;
    }
    add(el("img", "vd__flourish vd__flourish--flip")).src = "assets/flourish.svg";

    // second page: when and where, and the welcome
    newPage("info");
    const row = (icon, main, metas) => {
      metas = metas.filter(Boolean);
      if (!main && !metas.length) return;
      const r = add(el("div", "vd__row"));
      const i = r.appendChild(el("img", "vd__icon")); i.src = icon; i.alt = "";
      const t = r.appendChild(el("div", "vd__text"));
      if (main) t.appendChild(el("p", "vd__main")).textContent = main;
      metas.forEach((m) => { t.appendChild(el("p", "vd__meta")).textContent = m; });
    };
    row("assets/icon-calendar.svg", text('[data-field="weekdayDate"]'), [text('[data-field="dateHijri"]')]);
    row("assets/icon-clock.svg", "", [...notes, text('[data-field="timeLong"]')]);
    row("assets/icon-pin.svg", text('[data-field="venueName"]'), [text('[data-field="venuePlace"]')]);

    if (text('.closing [data-field="closing"]')) add(el("p", "vd__closing")).textContent = text('.closing [data-field="closing"]');
    if (text('.closing [data-field="closingSub"]')) add(el("p", "vd__sub")).textContent = text('.closing [data-field="closingSub"]');
    return pages.filter((p) => p.querySelector(".vl"));
  }

  // Lines the two names up by their ink, not their boxes («خضر» has its dots up high,
  // «أمل» reaches lower), and centres the «و» on them.
  function alignNames(row) {
    const [a, waw, b] = row.children;
    const ctx = document.createElement("canvas").getContext("2d");
    const st = getComputedStyle(a);
    ctx.font = `${st.fontWeight} ${st.fontSize} ${st.fontFamily}`;
    const ink = (s) => { const m = ctx.measureText(s); return { mid: (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2, m }; };
    const ia = ink(a.textContent), ib = ink(b.textContent), mid = (ia.mid + ib.mid) / 2;
    a.style.transform = `translateY(${(ia.mid - mid).toFixed(1)}px)`;
    b.style.transform = `translateY(${(ib.mid - mid).toFixed(1)}px)`;
    // where that shared ink centre sits, measured from the top of the name's box
    const fm = ia.m, lh = parseFloat(st.lineHeight) || a.offsetHeight;
    const base = (lh - (fm.fontBoundingBoxAscent + fm.fontBoundingBoxDescent)) / 2 + fm.fontBoundingBoxAscent;
    const inkY = a.offsetTop + base - mid, wawY = waw.offsetTop + waw.offsetHeight / 2;
    waw.style.transform = `translateY(${(inkY - wawY).toFixed(1)}px)`;
  }

  async function buildQr() {
    let svg = "";
    try {
      const res = await fetch("qr/qr-code.svg", { cache: "no-cache" });
      if (res.ok) svg = await res.text();
    } catch {}
    if (!svg.includes("<svg")) return null;                // no QR on this site → no QR page

    const W = window.WEDDING || {};
    const groom = (W.groom && (W.groom.shortName || W.groom.name)) || "";
    const bride = (W.bride && (W.bride.shortName || W.bride.name)) || "";
    const canonical = $('link[rel="canonical"]');
    const url = canonical ? canonical.href.replace(/^https?:\/\//, "").replace(/\/$/, "") : location.host;

    const sec = el("section", "vpage vqr");
    sec.innerHTML =
      `<div class="vqr__in"><p class="vqr__names"><span></span><img src="assets/waw.webp" alt=""><span></span></p>` +
      `<div class="vqr__panel">${svg}</div>` +
      `<p class="vqr__scan">امسح الرمز لفتح الدعوة</p>` +
      `<p class="vqr__url"></p></div>`;
    const [g, b] = sec.querySelectorAll(".vqr__names span");
    g.textContent = groom; b.textContent = bride;
    sec.querySelector(".vqr__url").textContent = url;
    sec.style.opacity = 0;
    return sec;
  }

  // ---------- the recording ----------
  async function play() {
    const { card, flowers, cR, cL, ch, tx, white, coverLines, pl, pr, ground, details, qr } = S;

    // 1. cover: the decorations draw themselves in …
    await sleep(T.PAPER);
    const decor = Promise.all([
      animate(T.FLOWERS_MS, (e) => flowers.set(e), (k) => k),
      fadeTo(tx, 0, 1, T.FLOWERS_MS),
      later(T.CURTAINS_AT, () => animate(T.CURTAINS_MS, (e) => {
        cR.style.opacity = cL.style.opacity = Math.min(1, e * 3);
        cR.style.transform = `translateX(${(1 - e) * 70}%)`;
        cL.style.transform = `translateX(${-(1 - e) * 70}%)`;
      }, easeOut)),
      later(T.CHANDELIER_AT, () => animate(T.SWING_MS, (_, k, ms) => {
        const drop = easeOutBack(Math.min(1, ms / T.CHANDELIER_MS));
        const swing = 4 * Math.exp(-ms / 1000) * Math.sin(ms / 1400 * 2 * Math.PI);
        ch.style.opacity = Math.min(1, ms / 250);
        ch.style.transform = `translateY(${(1 - drop) * -110}%) rotate(${swing.toFixed(3)}deg)`;
      }, (k) => k)),
      later(T.PILLARS_AT, () => animate(T.PILLARS_MS, (e) => card.style.setProperty("--pr", e.toFixed(4)), easeInOut)),
    ]);

    // … and the text appears line by line
    await sleep(T.TEXT_AT - T.PAPER);
    let last;
    for (const { e, gap } of coverLines) { last = showLine(e); await sleep(gap); }
    await last; await decor;
    await sleep(T.COVER_HOLD);

    // 2. change of page
    const text1 = $(".card__text");
    await fadeTo(text1, 1, 0, T.TEXT_OUT_MS);
    await Promise.all([
      animate(T.DECOR_OUT_MS, (e) => {
        ch.style.transform = `translateY(${-110 * e}%)`;
        cR.style.transform = `translateX(${70 * e}%)`;
        cL.style.transform = `translateX(${-70 * e}%)`;
        flowers.style.opacity = tx.style.opacity = white.style.opacity = 1 - e;
      }, easeIn),
      later(T.DECOR_OUT_MS * 0.3, () => Promise.all([fadeTo(pl, 0, 1, 900), fadeTo(pr, 0, 1, 900)])),
      later(T.DECOR_OUT_MS * 0.5, () => animate(T.GROUND_MS, (e) => ground.set(e), (k) => k)),
    ]);
    card.style.visibility = "hidden";

    // 3. details, line by line, one page after the other
    const holds = [].concat(T.DETAILS_HOLD);
    for (let i = 0; i < details.length; i++) {
      if (i) await fadeTo(details[i - 1], 1, 0, T.FADE_MS);
      for (const e of $$(".vl", details[i])) { last = showLine(e); await sleep(T.DETAIL_GAP); }
      await last;
      await sleep(holds[Math.min(i, holds.length - 1)]);
    }

    // 4. QR
    if (qr) {
      await fadeTo(details[details.length - 1], 1, 0, T.FADE_MS);
      await fadeTo(qr, 0, 1, T.FADE_MS);
      await sleep(T.QR_HOLD);
    }
  }

  return { setup, play };
})();
