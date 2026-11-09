/* ============================================================
   Wedding invitation — behaviour
   Fills index.html from config.js, runs the curtain opening
   (#intro, length in data-duration), countdown, calendar
   buttons and scroll reveal. No libraries.
   ============================================================ */
(function () {
  "use strict";

  var W = window.WEDDING;
  if (!W) return;

  var TZ = "Asia/Riyadh";                 // all times shown in Saudi time
  var start = new Date(W.eventStart);
  var end = new Date(start.getTime() + (W.durationHours || 4) * 3600 * 1000);
  var validDate = !isNaN(start.getTime());

  /* ---------- helpers ---------- */
  // the design writes numbers with Latin digits (12.12.2026, 9:00 PM)
  function fmt(opts, calendar) {
    return new Intl.DateTimeFormat("ar-SA-u-ca-" + calendar + "-nu-latn",
      Object.assign({ timeZone: TZ }, opts)).format(start);
  }

  function partsLatn(opts) {
    var out = {};
    new Intl.DateTimeFormat("en-GB", Object.assign({ timeZone: TZ, hourCycle: "h23" }, opts))
      .formatToParts(start)
      .forEach(function (p) { out[p.type] = p.value; });
    return out;
  }

  function setField(name, value) {
    document.querySelectorAll('[data-field="' + name + '"]').forEach(function (el) {
      el.textContent = value;
    });
  }

  function setList(name, items, tag) {
    document.querySelectorAll('[data-field="' + name + '"]').forEach(function (el) {
      el.textContent = "";
      (items || []).forEach(function (text) {
        var node = document.createElement(tag);
        node.textContent = text;
        el.appendChild(node);
      });
    });
  }

  // Stretch a word with tatweel the way the design does («الأحـــد», «قاعـــة»):
  // between the last pair of letters that can be joined.
  var NON_JOINING = "اأإآدذرزوؤةىء";
  var ARABIC_LETTER = /[ء-ي]/;
  function stretch(word) {
    if (word.indexOf("ـ") !== -1) return word;      // already stretched
    for (var i = word.length - 1; i > 0; i--) {
      var prev = word.charAt(i - 1), cur = word.charAt(i);
      if (ARABIC_LETTER.test(prev) && ARABIC_LETTER.test(cur) && NON_JOINING.indexOf(prev) === -1) {
        return word.slice(0, i) + "ـــ" + word.slice(i);
      }
    }
    return word;
  }

  /* ---------- fill content ---------- */
  var groomShort = W.groom.shortName || W.groom.name;
  var brideShort = W.bride.shortName || W.bride.name;

  setField("groomTitle", W.groom.title || "");
  setField("groomName", groomShort);
  setField("groomFullName", W.groom.name);
  setField("brideTitle", W.bride.title || "");
  setField("brideName", brideShort);
  setField("brideFullName", W.bride.name);

  setField("verse", W.verse);
  setField("verseRef", W.verseRef);
  setList("intro", W.intro, "p");
  setField("hostsLabel", W.hostsLabel || "يتشـــرف");
  setField("cardInvite", W.cardInvite);
  setField("blessing", W.blessing);

  // families: the «آل …» lines on the card …
  var fams = W.families || [];
  setField("clansGroom", ((fams[0] && fams[0].clans) || []).join("\n"));
  setField("clansBride", ((fams[1] && fams[1].clans) || []).join("\n"));

  // … and the full names below the card
  document.querySelectorAll('[data-field="families"]').forEach(function (list) {
    list.textContent = "";
    fams.forEach(function (fam) {
      var li = document.createElement("li");
      li.className = "hosts__family";
      [["hosts__father", fam.father], ["hosts__and", fam.father && fam.mother ? "و" : ""], ["hosts__mother", fam.mother]]
        .forEach(function (part) {
          if (!part[1]) return;
          var span = document.createElement("span");
          span.className = part[0];
          span.textContent = part[1];
          li.appendChild(span);
        });
      list.appendChild(li);
    });
  });

  // invitation line: the last line (e.g. «العز بالأهل») is shown as a motto
  document.querySelectorAll('[data-field="invitationLine"]').forEach(function (el) {
    var lines = String(W.invitationLine || "").split("\n");
    el.textContent = "";
    lines.forEach(function (line, i) {
      var span = document.createElement("span");
      if (lines.length > 1 && i === lines.length - 1) span.className = "hosts__motto";
      else if (i > 0) el.appendChild(document.createElement("br"));
      span.textContent = line;
      el.appendChild(span);
    });
  });

  // venue: two lines on the card, split at the first space («قاعة / الأفراح»)
  var vName = W.venue.name || "";
  var cut = vName.indexOf(" ");
  setField("cardVenue1", stretch(cut > 0 ? vName.slice(0, cut) : vName));
  setField("cardVenue2", cut > 0 ? vName.slice(cut + 1) : "");
  setField("venueName", vName);
  setField("venueDescription", W.venue.description || "");
  setField("venuePlace", [W.venue.city, W.venue.address].filter(Boolean).join(" — "));

  if (W.notes && W.notes.length) {
    setList("notes", W.notes, "li");
  } else {
    document.getElementById("notesSection").hidden = true;
  }

  setField("closing", W.closing);
  setField("closingSub", W.closingSub);
  setField("cardTimeLabel", stretch(W.timeLabel || "الاستقبال"));

  document.title = "دعوة زفاف " + groomShort + " و" + brideShort;

  /* ---------- dates (Gregorian + Hijri, Saudi time) ---------- */
  if (validDate) {
    var weekday = fmt({ weekday: "long" }, "gregory");
    var dateLong = fmt({ day: "numeric", month: "long", year: "numeric" }, "gregory");
    var hijri = W.hijriOverride ||
      fmt({ day: "numeric", month: "long", year: "numeric" }, "islamic-umalqura");
    if (hijri.indexOf("هـ") === -1) hijri += " هـ";

    var p = partsLatn({ hour: "numeric", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
    var h = parseInt(p.hour, 10);
    var h12 = h % 12 === 0 ? 12 : h % 12;

    setField("cardWeekday", stretch(weekday));
    setField("cardDate", p.day + "." + p.month + "." + p.year);            // 11.12.2026
    setField("cardTime", h12 + ":" + p.minute + " " + (h < 12 ? "AM" : "PM"));
    setField("weekdayDate", weekday + "، " + dateLong);
    setField("dateHijri", hijri);
    setField("timeLong", (W.timeLabel || "الاستقبال") + " الساعة " + h12 + ":" + p.minute + " " + (h < 12 ? "صباحًا" : "مساءً"));
  }

  /* ---------- map ---------- */
  var mapBtn = document.getElementById("mapBtn");
  if (W.venue.mapUrl) mapBtn.href = W.venue.mapUrl; else mapBtn.hidden = true;

  /* ---------- calendar ---------- */
  var eventTitle = "حفل زفاف " + groomShort + " و" + brideShort;
  var location = [W.venue.name, W.venue.address, W.venue.city].filter(Boolean).join("، ");
  var details = String(W.invitationLine || "").replace(/\n/g, " — ") + (W.venue.mapUrl ? "\n" + W.venue.mapUrl : "");

  function utcStamp(d) {
    return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  }

  var gcalBtn = document.getElementById("gcalBtn");
  var icsBtn = document.getElementById("icsBtn");

  if (validDate) {
    gcalBtn.href = "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      "&text=" + encodeURIComponent(eventTitle) +
      "&dates=" + utcStamp(start) + "/" + utcStamp(end) +
      "&details=" + encodeURIComponent(details) +
      "&location=" + encodeURIComponent(location) +
      "&ctz=" + TZ;

    icsBtn.addEventListener("click", function () {
      function esc(s) { return String(s).replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n"); }
      var ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Wedding Invitation//AR",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        "UID:" + utcStamp(start) + "-wedding@invitation",
        "DTSTAMP:" + utcStamp(new Date()),
        "DTSTART:" + utcStamp(start),
        "DTEND:" + utcStamp(end),
        "SUMMARY:" + esc(eventTitle),
        "LOCATION:" + esc(location),
        "DESCRIPTION:" + esc(details),
        "BEGIN:VALARM",
        "TRIGGER:-P1D",
        "ACTION:DISPLAY",
        "DESCRIPTION:" + esc(eventTitle),
        "END:VALARM",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\r\n");

      var blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "wedding.ics";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    });
  } else {
    gcalBtn.hidden = true;
    icsBtn.hidden = true;
  }

  /* ---------- countdown ---------- */
  var grid = document.getElementById("countdown");
  var done = document.getElementById("countdownDone");
  var cells = {};
  grid.querySelectorAll("[data-cd]").forEach(function (el) { cells[el.dataset.cd] = el; });
  var timer;

  function tick() {
    var now = Date.now();
    var diff = start.getTime() - now;

    if (diff <= 0) {
      clearInterval(timer);
      grid.hidden = true;
      done.hidden = false;
      done.textContent = now < end.getTime() ? "الحفل الآن — حيّاكم الله" : W.afterEvent;
      return;
    }

    var s = Math.floor(diff / 1000);
    var vals = {
      days: Math.floor(s / 86400),
      hours: Math.floor((s % 86400) / 3600),
      minutes: Math.floor((s % 3600) / 60),
      seconds: s % 60
    };
    Object.keys(vals).forEach(function (k) {
      var txt = String(vals[k]);
      if (cells[k].textContent !== txt) cells[k].textContent = txt;
    });
  }

  if (validDate) {
    tick();
    timer = setInterval(tick, 1000);
  } else {
    document.querySelector(".countdown").hidden = true;
  }

  /* ---------- opening: the curtains draw open ---------- */
  var intro = document.getElementById("intro");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var opened = false;

  function showCard() { document.body.classList.add("is-open"); }

  function openInvite() {
    if (opened) return;
    opened = true;
    if (!intro) { showCard(); document.body.classList.remove("is-locked"); startReveal(); return; }
    var duration = reduced ? 400 : (parseInt(intro.getAttribute("data-duration"), 10) || 1900);
    intro.classList.add("is-playing");
    window.scrollTo(0, 0);
    // the card's text starts appearing while the curtains are still moving
    setTimeout(showCard, duration * 0.45);
    setTimeout(function () {
      intro.classList.add("is-gone");
      intro.setAttribute("aria-hidden", "true");
      document.body.classList.remove("is-locked");
      startReveal();
    }, duration);
  }
  if (intro) {
    intro.addEventListener("click", openInvite);
    intro.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openInvite(); }
    });
  } else {
    openInvite();
  }

  /* ---------- scroll reveal ---------- */
  function startReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    items.forEach(function (el) { io.observe(el); });
  }
})();
