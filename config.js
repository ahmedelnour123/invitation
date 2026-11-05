/* ============================================================
   بيانات الدعوة — عدّل هذا الملف فقط
   Wedding details — this is the only file you need to edit.
   Everything in [square brackets] is a placeholder.
   ============================================================ */

window.WEDDING = {
  /* ---------- العروسان | The couple ---------- */
  // shortName = the big name on the opening and hero; name = full name under it.
  // title = e.g. "م." or "د." shown above the name — leave "" for none.
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
  // ISO format with Saudi offset (+03:00). Countdown, Hijri date and
  // calendar links are all generated from this one value.
  eventStart: "2027-01-14T20:00:00+03:00",   // [PLACEHOLDER DATE]
  durationHours: 4,
  // Optional: if the auto-calculated Hijri date is off by a day, write
  // the correct one here, e.g. "٥ شعبان ١٤٤٨ هـ". Leave "" for automatic.
  hijriOverride: "",

  /* ---------- المكان | Venue ---------- */
  venue: {
    name: "[اسم القاعة]",
    description: "[وصف قصير للقاعة — اختياري]",
    city: "[المدينة]",
    address: "[الحي — الشارع]",
    mapUrl: "https://maps.google.com/?q=[ضع رابط الموقع هنا]"
  },

  /* ---------- النصوص | Text ---------- */
  verse: "وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا لِّتَسْكُنُوا إِلَيْهَا وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً",
  verseRef: "سورة الروم — ٢١",

  intro: [
    "على بركة الله، وفي ليلةٍ نرجو أن تكون أولَ صفحةٍ في حكايةٍ طيّبة،",
    "يجمع الله قلبين على المودّة والرحمة، ويسعدنا أن تكونوا معنا ونحن نحتفل بهذه البداية."
  ],

  invitationLine: "بدعوتكم لحضور حفل زفاف نجليهما وتناول طعام العشاء\nالعز بالأهل",

  notes: [
    "[ملاحظة ١ — مثال: الحفل للبالغين فقط]",
    "[ملاحظة ٢ — مثال: يُرجى إبراز الدعوة عند الدخول]"
  ],

  closing: "حبابكم عشرة",               // Sudanese welcome
  closingSub: "وبحضوركم تكتمل فرحتنا",
  afterEvent: "تمّ الزفاف بحمد الله — بارك الله لهما وبارك عليهما وجمع بينهما في خير"
};
