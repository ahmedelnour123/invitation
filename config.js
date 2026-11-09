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
      father: "صديق خضر علي حمد",
      mother: "حرم محمد أبوعشي ميدم"
    },
    { // أهل العروس
      father: "جمعة حمدالسيد محمد جماعة",
      mother: "فطيمة علي محمد جماعة"
    }
  ],

  /* ---------- الموعد | Date & time ---------- */
  // ISO format with Saudi offset (+03:00). The weekday, dates, Hijri date,
  // countdown and calendar links are all generated from this one value.
  eventStart: "2026-12-11T21:00:00+03:00",   // الجمعة 11.12.2026 — 9:00 PM
  durationHours: 4,
  // Optional: if the auto-calculated Hijri date is off by a day, write
  // the correct one here, e.g. "1 رجب 1448 هـ". Leave "" for automatic.
  hijriOverride: "",
  timeLabel: "الاستقبال",                     // «الاستقبال الساعة 9:00 مساءً»

  /* ---------- المكان | Venue ---------- */
  // Empty fields are hidden; the map button appears once mapUrl is filled in.
  venue: {
    name: "قاعة الأفراح",
    description: "",
    city: "",
    address: "",
    mapUrl: ""          // e.g. "https://maps.app.goo.gl/…"
  },

  /* ---------- النصوص | Text ---------- */
  // \n = new line. The «ـــ» stretches are part of the design.
  // The verse is written as in the design, with its brackets; \n is where the card breaks the line.
  verse: "﴿وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُمْ مِنْ أَنفُسِكُمْ أَزْوَاجًا لِتَسْكُنُوا إِلَيْهَا\nوَجَعَلَ بَيْنَكُمْ مَوَدَّةً وَرَحْمَةً ﴾",
  verseRef: "سورة الروم: الآية ٢١",

  intro: [
    "على بركة الله، وفي ليلةٍ نرجو أن تكون",
    "أولَ صفحةٍ في حكايــــــةٍ طيّبـــــة،",
    "يجمع الله قلبين على المودّة والرحمة،",
    "ويسعدنا أن تكونوا معنا",
    "ونحن نحتفل بهذه البداية."
  ],

  hostsLabel: "يتشـــــــــرف",
  invitationLine: "بدعوتكم لحضور حفل زفاف نجليهما وتناول طعام العشاء",  // full line below the card

  notes: [
    "[ملاحظة ١ — مثال: الحفل للبالغين فقط]",
    "[ملاحظة ٢ — مثال: يُرجى إبراز الدعوة عند الدخول]"
  ],

  closing: "حبابكم عشرة",               // Sudanese welcome
  closingSub: "وبحضوركم تكتمل فرحتنا",
  afterEvent: "تمّ الزفاف بحمد الله — بارك الله لهما وبارك عليهما وجمع بينهما في خير"
};
