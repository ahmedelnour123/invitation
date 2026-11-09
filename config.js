/* ============================================================
   بيانات الدعوة — عدّل هذا الملف فقط
   Wedding details — this is the only file you need to edit.
   ============================================================ */

window.WEDDING = {
  /* ---------- العروسان | The couple ---------- */
  // shortName = the big name on the card; name = full name (in the section below the card).
  // title = e.g. "م." or "د." shown before the full name — leave "" for none.
  groom: {
    title: "",
    shortName: "خضر",
    name: "خضر صديق خضر علي"
  },
  bride: {
    title: "",
    shortName: "أمل",
    name: "أمل جمعة حمدالسيد محمد"
  },

  /* ---------- الأسر الداعية | Host families ---------- */
  // father / mother = the parents' full names
  families: [
    { // أهل العريس
      father: "آل خضر علي",
      mother: "آل محمد أبوعشي"
    },
    { // أهل العروس
      father: "آل حمدالسيد محمد",
      mother: "آل علي محمد"
    }
  ],

  /* ---------- الموعد | Date & time ---------- */
  // ISO format with Saudi offset (+03:00). The weekday, dates, Hijri date,
  // countdown and calendar links are all generated from this one value.
  eventStart: "2026-12-11T20:00:00+03:00",   // الجمعة 11.12.2026 — 8:00 PM (عقد القران)
  durationHours: 4,
  // Optional: if the auto-calculated Hijri date is off by a day, write
  // the correct one here, e.g. "1 رجب 1448 هـ". Leave "" for automatic.
  hijriOverride: "",
  timeLine: "يُقدَّم العشاء في تمام الساعة العاشرة مساءً",   // under the date, in the date section

  /* ---------- المكان | Venue ---------- */
  // Empty fields are hidden; the map button and map box appear when mapUrl / mapEmbed are set.
  venue: {
    name: "قاعة سمر للمناسبات",
    description: "",
    city: "جدة",
    address: "حي الروابي، شارع عبدالملك الحربي",
    mapUrl: "https://maps.app.goo.gl/gh9WxNBmrcRrCzmE7",
    // the map shown in the venue box (a place search; no API key needed)
    mapEmbed: "https://maps.google.com/maps?q=Samar%20Hall%2C%209038%20Abdulmalik%20Al%20Harbi%2C%20Al%20Rawabi%2C%20Jeddah%2022348&hl=ar&z=15&output=embed"
  },

  /* ---------- النصوص | Text ---------- */
  // \n = new line. The «ـــ» stretches are part of the design.
  // The verse as in the design, with its brackets; each \n starts a new line on the first page.
  verse: "﴿وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُمْ\nمِنْ أَنفُسِكُمْ أَزْوَاجًا\nلِتَسْكُنُوا إِلَيْهَا\nوَجَعَلَ بَيْنَكُمْ مَوَدَّةً وَرَحْمَةً ﴾",
  verseRef: "سورة الروم: الآية ٢١",

  intro: [
    "في ليلةٍ باركها الرحمن",
    "وخطى فيها القلبان",
    "نحو غدٍ يملؤه الوئام والرحمة",
    "يحلو اللقاء بكم لتبدأ أجمل صفحات العمر",
  ],

  hostsLabel: "يتشـــــــــرف",
  invitationLine: "بدعوتكم لحضور حفل زفاف نجليهما وتناول طعام العشاء",  // full line below the card

  notes: [
    "يُعقَد القِران في تمام الساعة الثامنة مساءً في القاعة نفسها"
  ],

  closing: "حبابكم عشرة",               // Sudanese welcome
  closingSub: "وبحضوركم تكتمل فرحتنا",
  afterEvent: "تمّ الزفاف بحمد الله — بارك الله لهما وبارك عليهما وجمع بينهما في خير"
};
