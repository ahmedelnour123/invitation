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
  // clans  = the two lines on the card («آل …»)
  // father / mother = the full names in the section below the card
  families: [
    { // أهل العريس (right column on the card)
      clans: ["آل خضر", "آل محمد"],
      father: "صديق خضر علي حمد",
      mother: "حرم محمد أبوعشي ميدم"
    },
    { // أهل العروس (left column on the card)
      clans: ["آل حمد السيد", "آل علي"],
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
  timeLabel: "الاستقبال",                     // the word above the time on the card

  /* ---------- المكان | Venue ---------- */
  // On the card the name is split over two lines at the first space («قاعة / الأفراح»).
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
  verse: "وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا لِّتَسْكُنُوا إِلَيْهَا\nوَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً",
  verseRef: "سورة الروم: الآية ٢١",

  intro: [
    "على بركة الله، وفي ليلةٍ نرجو أن تكون",
    "أولَ صفحةٍ في حكايـــةٍ طيّبـــة،",
    "يجمع الله قلبين على المودّة والرحمة،",
    "ويسعدنا أن تكونوا معنا ونحن نحتفل بهذه البداية."
  ],

  hostsLabel: "يتشـــرف",
  cardInvite: "بدعوتكـم لحضـور زفـاف",       // short line on the card
  invitationLine: "بدعوتكم لحضور حفل زفاف نجليهما وتناول طعام العشاء\nالعز بالأهل",  // full line below the card
  blessing: "وذلك بمشيئة الله تعالى",

  notes: [
    "[ملاحظة ١ — مثال: الحفل للبالغين فقط]",
    "[ملاحظة ٢ — مثال: يُرجى إبراز الدعوة عند الدخول]"
  ],

  closing: "حبابكم عشرة",               // Sudanese welcome
  closingSub: "وبحضوركم تكتمل فرحتنا",
  afterEvent: "تمّ الزفاف بحمد الله — بارك الله لهما وبارك عليهما وجمع بينهما في خير"
};
