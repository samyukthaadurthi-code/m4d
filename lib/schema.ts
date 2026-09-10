// Single source of truth: drives the form UI, the Google Sheet columns and the badge.
// Add a field here and it appears in the form and the sheet (re-run /api/setup for headers).

export type Option = { value: string; label: string; ta?: string };

export type Field = {
  key: string; // sheet header + form field name
  label: string;
  ta?: string; // Tamil sub-label — audience is Southern TN brokers, many first-timers
  type:
    | "text"
    | "tel"
    | "email"
    | "textarea"
    | "radio"
    | "checkbox"
    | "select"
    | "date"
    | "consent";
  options?: Option[];
  required?: boolean;
  placeholder?: string;
  placeholderTa?: string;
  // Conditional display, evaluated against current form values.
  showIf?: (v: Record<string, string>) => boolean;
};

export const REGISTRATION_FIELDS: Field[] = [
  {
    key: "full_name",
    label: "Full name",
    ta: "பெயர்",
    type: "text",
    required: true,
    placeholder: "As it should appear on your badge",
    placeholderTa: "அடையாள அட்டையில் வர வேண்டிய பெயர்",
  },
  {
    key: "mobile",
    label: "Mobile number",
    ta: "மொபைல் எண்",
    type: "tel",
    required: true,
    placeholder: "10-digit mobile number",
    placeholderTa: "10 இலக்க மொபைல் எண்",
  },
  {
    key: "whatsapp",
    label: "WhatsApp number",
    ta: "வாட்ஸ்அப் எண்",
    type: "tel",
    required: true,
    placeholder: "Tick below if same as mobile",
    placeholderTa: "மொபைல் எண்ணே எனில் கீழே தேர்ந்தெடுக்கவும்",
  },
  {
    key: "email",
    label: "Email address",
    ta: "மின்னஞ்சல்",
    type: "email",
    required: true,
    placeholder: "your@email.com",
  },
  {
    key: "partner_type",
    label: "You are registering as",
    ta: "நீங்கள் பதிவு செய்வது",
    type: "radio",
    required: true,
    options: [
      { value: "Individual", label: "Individual", ta: "தனிநபர்" },
      { value: "Company", label: "Company", ta: "நிறுவனம்" },
      { value: "Agency", label: "Agency", ta: "ஏஜென்சி" },
    ],
  },
  {
    key: "organisation_name",
    label: "Company / agency name",
    ta: "நிறுவனத்தின் பெயர்",
    type: "text",
    required: true,
    placeholder: "Printed on your badge",
    placeholderTa: "அடையாள அட்டையில் அச்சிடப்படும்",
    showIf: (v) => v.partner_type === "Company" || v.partner_type === "Agency",
  },
  {
    key: "operating_areas",
    label: "Areas you are strong in",
    ta: "நீங்கள் விற்பனை செய்யும் பகுதிகள்",
    type: "text",
    required: true,
    placeholder: "e.g. Madurai, Thoothukudi, Tirunelveli",
    placeholderTa: "எ.கா. மதுரை, தூத்துக்குடி, திருநெல்வேலி",
  },
  {
    key: "address",
    label: "Address",
    ta: "முகவரி",
    type: "textarea",
    placeholder: "Office or residence address",
    placeholderTa: "அலுவலகம் அல்லது வீட்டு முகவரி",
  },
  {
    key: "experience_years",
    label: "Years of experience",
    ta: "அனுபவம் (ஆண்டுகள்)",
    type: "select",
    required: true,
    options: [
      { value: "Less than 1 year", label: "Less than 1 year" },
      { value: "1-3 years", label: "1 – 3 years" },
      { value: "3-5 years", label: "3 – 5 years" },
      { value: "5-10 years", label: "5 – 10 years" },
      { value: "10+ years", label: "More than 10 years" },
    ],
  },
  {
    key: "primary_segment",
    label: "What do you primarily sell?",
    ta: "நீங்கள் முக்கியமாக விற்பது",
    type: "radio",
    required: true,
    options: [
      { value: "Plots", label: "Plots", ta: "மனைகள்" },
      { value: "Apartments", label: "Apartments", ta: "அடுக்குமாடி" },
      { value: "Villas", label: "Villas", ta: "வில்லா" },
      { value: "Land", label: "Land", ta: "நிலம்" },
      { value: "Multiple", label: "Multiple", ta: "பல வகைகள்" },
    ],
  },
  {
    key: "primary_audience",
    label: "Who are your usual buyers?",
    ta: "உங்கள் வாடிக்கையாளர்கள்",
    type: "checkbox",
    required: true,
    options: [
      { value: "Families", label: "Families", ta: "குடும்பம்" },
      { value: "Women buyers", label: "Women buyers", ta: "பெண்கள்" },
      { value: "IT professionals", label: "IT professionals", ta: "ஐடி ஊழியர்கள்" },
      { value: "Investors", label: "Investors", ta: "முதலீட்டாளர்கள்" },
      { value: "NRI", label: "NRI", ta: "வெளிநாட்டு இந்தியர்" },
      { value: "Business owners", label: "Business owners", ta: "வணிகர்கள்" },
      { value: "Retired / senior", label: "Retired / senior", ta: "ஓய்வு பெற்றவர்" },
    ],
  },
  {
    key: "cp_interested",
    label: "Interested in the MRC Channel Partner programme?",
    ta: "MRC சேனல் பார்ட்னர் திட்டத்தில் ஆர்வம் உள்ளதா?",
    type: "radio",
    required: true,
    options: [
      { value: "Yes", label: "Yes, send me the details", ta: "ஆம்" },
      { value: "No", label: "Not right now", ta: "இப்போது இல்லை" },
    ],
  },
  {
    key: "consent",
    label: "Consent",
    type: "consent",
    required: true,
  },
];

// Columns written to the sheet, in order. Column A is always the unique ID.
export const REGISTRATION_COLUMNS = [
  "unique_id",
  "registered_at",
  "source",
  ...REGISTRATION_FIELDS.map((f) => f.key),
];

// Channel Partner programme form. PAN, GST and RERA are collected here rather
// than at registration — asking for tax numbers at a busy event desk visibly
// slows people down. Remaining field spec still pending from MRC.
export const CP_FIELDS: Field[] = [
  {
    key: "pan",
    label: "PAN number",
    ta: "பான் எண்",
    type: "text",
    required: true,
    placeholder: "ABCDE1234F",
  },
  {
    key: "gst",
    label: "GST number (if registered)",
    ta: "ஜிஎஸ்டி எண்",
    type: "text",
    placeholder: "Leave blank if not registered",
    placeholderTa: "பதிவு இல்லையெனில் காலியாக விடவும்",
  },
  {
    key: "rera_id",
    label: "TNRERA agent registration number (if any)",
    ta: "TNRERA பதிவு எண்",
    type: "text",
    placeholder: "Leave blank if not registered",
    placeholderTa: "பதிவு இல்லையெனில் காலியாக விடவும்",
  },
  {
    key: "team_size",
    label: "How many people in your team?",
    type: "select",
    required: true,
    options: [
      { value: "Just me", label: "Just me" },
      { value: "2-5", label: "2 – 5" },
      { value: "6-15", label: "6 – 15" },
      { value: "15+", label: "More than 15" },
    ],
  },
  {
    key: "monthly_closures",
    label: "Roughly how many deals do you close a month?",
    type: "select",
    required: true,
    options: [
      { value: "0-1", label: "0 – 1" },
      { value: "2-4", label: "2 – 4" },
      { value: "5-10", label: "5 – 10" },
      { value: "10+", label: "More than 10" },
    ],
  },
  {
    key: "notes",
    label: "Anything else we should know?",
    type: "textarea",
  },
];

export const CP_COLUMNS = [
  "unique_id",
  "submitted_at",
  "full_name",
  "mobile",
  ...CP_FIELDS.map((f) => f.key),
];

// Site visit form — filled by the CUSTOMER at a separate station, not the broker.
// Budget brackets are placeholders until MRC sets them against real plot pricing.
export const VISIT_FIELDS: Field[] = [
  {
    key: "visitor_name",
    label: "Your name",
    ta: "உங்கள் பெயர்",
    type: "text",
    required: true,
  },
  {
    key: "visitor_mobile",
    label: "Mobile number",
    ta: "மொபைல் எண்",
    type: "tel",
    required: true,
    placeholder: "10-digit mobile number",
    placeholderTa: "10 இலக்க மொபைல் எண்",
  },
  {
    key: "visitor_email",
    label: "Email address (optional)",
    ta: "மின்னஞ்சல் (விருப்பம்)",
    type: "email",
    placeholder: "We'll email your visit details",
    placeholderTa: "பார்வை விவரங்களை அனுப்புவோம்",
  },
  {
    key: "visitor_location",
    label: "Where do you live?",
    ta: "நீங்கள் வசிக்கும் இடம்",
    type: "text",
    required: true,
    placeholder: "City or town",
    placeholderTa: "நகரம் அல்லது ஊர்",
  },
  {
    key: "referred_by_cp",
    label: "Did an MRC partner bring you here?",
    ta: "MRC பார்ட்னர் மூலம் வந்தீர்களா?",
    type: "radio",
    required: true,
    options: [
      { value: "Yes", label: "Yes", ta: "ஆம்" },
      { value: "No", label: "No, I came directly", ta: "இல்லை" },
    ],
  },
  {
    key: "cp_id",
    label: "Partner ID",
    ta: "பார்ட்னர் ஐடி",
    type: "text",
    required: true,
    placeholder: "MRC-CP-001",
    showIf: (v) => v.referred_by_cp === "Yes",
  },
  {
    key: "plot_preference",
    label: "What kind of plot are you looking for?",
    ta: "எப்படிப்பட்ட மனை தேவை?",
    type: "textarea",
    required: true,
    placeholder: "Plot number, facing, corner or main road — whatever you know",
    placeholderTa: "மனை எண், திசை, மூலை அல்லது பிரதான சாலை — தெரிந்ததை எழுதவும்",
  },
  {
    key: "amenities_preference",
    label: "Anything you'd like to be near?",
    ta: "அருகில் இருக்க வேண்டியவை",
    type: "checkbox",
    options: [
      { value: "Entrance", label: "Main entrance", ta: "நுழைவாயில்" },
      { value: "Park", label: "Park / open space", ta: "பூங்கா" },
      { value: "Main road", label: "Main road", ta: "பிரதான சாலை" },
      { value: "Corner plot", label: "Corner plot", ta: "மூலை மனை" },
      { value: "East facing", label: "East facing", ta: "கிழக்கு பார்த்த" },
    ],
  },
  {
    key: "budget",
    label: "Your budget",
    ta: "உங்கள் பட்ஜெட்",
    type: "select",
    required: true,
    options: [
      { value: "Under 10 lakh", label: "Under ₹10 lakh" },
      { value: "10-20 lakh", label: "₹10 – 20 lakh" },
      { value: "20-35 lakh", label: "₹20 – 35 lakh" },
      { value: "35-50 lakh", label: "₹35 – 50 lakh" },
      { value: "Above 50 lakh", label: "Above ₹50 lakh" },
    ],
  },
  {
    key: "visit_date",
    label: "Preferred site visit date",
    ta: "விருப்பமான தேதி",
    type: "date",
    required: true,
  },
  {
    key: "visit_time",
    label: "Preferred time",
    ta: "விருப்பமான நேரம்",
    type: "radio",
    required: true,
    options: [
      { value: "Morning", label: "Morning", ta: "காலை" },
      { value: "Afternoon", label: "Afternoon", ta: "மதியம்" },
    ],
  },
  {
    key: "consent",
    label: "Consent",
    type: "consent",
    required: true,
  },
];

export const VISIT_COLUMNS = [
  "lead_id",
  "submitted_at",
  "source",
  "cp_name", // resolved from cp_id at submission, so the sheet is readable
  ...VISIT_FIELDS.map((f) => f.key),
];

export const SHEETS = {
  registrations: "Registrations",
  cp: "CP_Programme",
  visits: "Site_Visits",
} as const;
