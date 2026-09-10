// Single source of truth: drives the form UI, the Google Sheet columns and the badge.
// Add a field here and it appears in the form and the sheet (re-run /api/setup for headers).

export type Option = { value: string; label: string; ta?: string };

export type Field = {
  key: string; // sheet header + form field name
  label: string;
  ta?: string; // Tamil sub-label — audience is Southern TN brokers, many first-timers
  type: "text" | "tel" | "email" | "textarea" | "radio" | "checkbox" | "select";
  options?: Option[];
  required?: boolean;
  placeholder?: string;
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
  },
  {
    key: "mobile",
    label: "Mobile number",
    ta: "மொபைல் எண்",
    type: "tel",
    required: true,
    placeholder: "10-digit mobile number",
  },
  {
    key: "whatsapp",
    label: "WhatsApp number",
    ta: "வாட்ஸ்அப் எண்",
    type: "tel",
    required: true,
    placeholder: "Tick below if same as mobile",
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
    showIf: (v) => v.partner_type === "Company" || v.partner_type === "Agency",
  },
  {
    key: "operating_areas",
    label: "Areas you are strong in",
    ta: "நீங்கள் விற்பனை செய்யும் பகுதிகள்",
    type: "text",
    required: true,
    placeholder: "e.g. Madurai, Thoothukudi, Tirunelveli",
  },
  {
    key: "address",
    label: "Address",
    ta: "முகவரி",
    type: "textarea",
    placeholder: "Office or residence address",
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
];

// Columns written to the sheet, in order. Column A is always the unique ID.
export const REGISTRATION_COLUMNS = [
  "unique_id",
  "registered_at",
  "source",
  ...REGISTRATION_FIELDS.map((f) => f.key),
];

// Channel Partner programme form. Field spec is still pending from MRC —
// these are placeholders; replace the array and re-run /api/setup.
export const CP_FIELDS: Field[] = [
  {
    key: "firm_registration",
    label: "Firm / RERA registration number (if any)",
    type: "text",
    placeholder: "Leave blank if not registered",
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

export const SHEETS = {
  registrations: "Registrations",
  cp: "CP_Programme",
} as const;
