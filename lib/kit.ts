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
    title: "Project brochure",
    ta: "திட்ட விவரக் கையேடு",
    blurb: "The full brochure, cleared for you to send to buyers.",
    ready: false,
    items: [],
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
    ready: false,
    items: [],
    pending: "Published once every distance has been verified on the ground.",
  },
  {
    key: "pricing",
    title: "Plot sizes & pricing",
    ta: "மனை அளவு மற்றும் விலை",
    blurb: "Available sizes, dimensions, facing and price range.",
    ready: false,
    items: [],
    pending: "Published once the approvals it depends on are in hand.",
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
