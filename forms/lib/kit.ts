/**
 * Partner Resource Centre contents.
 *
 * Everything here is pending until MRC delivers it. Each section renders either
 * its items or an honest empty state — never a fake preview, because partners
 * forward whatever they find here to real buyers.
 *
 * To publish a section: fill `items` and set `ready: true`.
 */

export type KitItem = {
  label: string;
  href: string;
  meta?: string;
};

export type KitSection = {
  key: string;
  title: string;
  ta: string;
  blurb: string;
  ready: boolean;
  items: KitItem[];
  pending: string; // shown while ready is false
};

export const KIT: KitSection[] = [
  {
    key: "brochure",
    title: "Brochure & master plan",
    ta: "திட்ட விவரக் கையேடு",
    blurb: "Cleared for you to send to buyers as they are.",
    ready: true,
    items: [
      {
        label: "MRC ANANTAA brochure",
        href: "/kit/MRC-ANANTAA-Brochure.pdf",
        meta: "PDF · 12 pages · 3.4 MB",
      },
      {
        label: "Master plan with plot schedule",
        href: "/kit/MRC-ANANTAA-Master-Plan.pdf",
        meta: "PDF · all 50 plots, sq.ft and cent · 0.5 MB",
      },
      {
        label: "Master plan — layout only",
        href: "/kit/MRC-ANANTAA-Layout-Plan.pdf",
        meta: "PDF · no plot table, for printing · 0.4 MB",
      },
    ],
    pending: "Published once the brochure is approved for release.",
  },
  {
    key: "images",
    title: "Photographs",
    ta: "புகைப்படங்கள்",
    blurb: "Site photos, drone shots and the master plan image.",
    ready: false,
    items: [],
    pending: "Photography is scheduled after the launch event.",
  },
  {
    key: "videos",
    title: "Videos",
    ta: "வீடியோக்கள்",
    blurb: "Project film, location film and the site walkthrough.",
    ready: false,
    items: [],
    pending: "Filming is scheduled after the launch event.",
  },
  {
    key: "creatives",
    title: "Shareable creatives",
    ta: "பகிரக்கூடிய படங்கள்",
    blurb: "Ready-made posts you can send on WhatsApp and social media.",
    ready: false,
    items: [],
    pending: "Released alongside the photography.",
  },
  {
    key: "location",
    title: "Location & connectivity",
    ta: "இருப்பிடம்",
    blurb: "Where the site is, and verified distances to nearby landmarks.",
    ready: true,
    items: [
      {
        label: "ANANTAA on Google Maps",
        href: "https://www.google.com/maps?q=9.964539,78.193672",
        meta: "Othakadai, beside Yanaimalai, Madurai East",
      },
      {
        label: "Distances & connectivity",
        href: "/kit/MRC-ANANTAA-Brochure.pdf",
        meta: "Brochure page 10 — bus stand 4.2 km, airport ring road 3.5 km, hospitals 4.6 km, TNAU 1.0 km",
      },
    ],
    pending: "Published once every distance has been verified on the ground.",
  },
  {
    key: "pricing",
    title: "Plot sizes & pricing",
    ta: "மனை அளவு மற்றும் விலை",
    blurb: "Available sizes, dimensions, facing and price range.",
    ready: false,
    items: [],
    // Sizes are published; prices are not. Say so plainly rather than leaving a
    // partner to assume the whole thing is missing.
    pending:
      "Plot sizes are in the master plan above — every plot with its sq.ft and cent. " +
      "The price list is published here once MRC releases it.",
  },
  {
    key: "approvals",
    title: "Approvals & documents",
    ta: "அனுமதி ஆவணங்கள்",
    blurb: "DTCP approval, RERA registration and the documents cleared for display.",
    ready: false,
    items: [],
    pending: "Published once MRC confirms which documents may be shown publicly.",
  },
  {
    key: "faq",
    title: "Buyer FAQ",
    ta: "வாடிக்கையாளர் கேள்விகள்",
    blurb: "Common buyer questions, with answers MRC stands behind.",
    ready: false,
    items: [],
    pending: "Being written and verified.",
  },
];

/** ISO datetime. While it is in the future, partners see a countdown. */
export function releaseAt(): Date | null {
  const raw = process.env.KIT_RELEASE_AT;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

export const contact = {
  name: process.env.NEXT_PUBLIC_PARTNER_CONTACT_NAME ?? "",
  phone: process.env.NEXT_PUBLIC_PARTNER_CONTACT_PHONE ?? "",
};
