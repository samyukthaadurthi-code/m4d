import { headers } from "next/headers";
import { BackAnchor, BackLink } from "@/components/BackLink";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findById } from "@/lib/sheets";
import { SHEETS } from "@/lib/schema";
import { brand } from "@/lib/brand";

export const dynamic = "force-dynamic";

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export default async function BadgePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const row = await findById(SHEETS.registrations, id);
  if (!row) notFound();

  const base = await origin();
  const badgeUrl = `${base}/api/badge/${id}`;
  const pageUrl = `${base}/badge/${id}`;
  const wantsCp = row.cp_interested === "Yes";

  // Opens the visitor's own WhatsApp with their badge link — no API, no approval.
  const share = `https://wa.me/?text=${encodeURIComponent(
    `My MRC Landmarks Channel Partner badge\nID: ${id}\n${pageUrl}`,
  )}`;

  return (
    <main className="min-h-screen bg-[#F7F5EF] pb-16">
      <header className="bg-[#1A2A2D] px-5 py-7 text-white print:hidden">
        <div className="mx-auto max-w-2xl">
          <BackAnchor className="block">
            <div className="text-xl font-bold tracking-[0.2em]">{brand.name}</div>
            <div className="mt-1 text-sm tracking-widest text-[#C4A97D]">
              {brand.tagline}
            </div>
          </BackAnchor>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5">
        <BackLink label="Back to the website" className="mt-5 font-semibold text-[#176A70] hover:underline print:hidden" />
        {isNew && (
          <div className="mt-7 rounded-xl border border-[#176A70]/25 bg-[#176A70]/8 px-5 py-4">
            <p className="font-semibold text-[#12474C]">
              You&apos;re registered, {row.full_name?.split(" ")[0]}.
            </p>
            <p className="mt-1 text-sm text-[#4A5450]">
              Save this badge to your phone and show it at the MRC desk.
            </p>
          </div>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={badgeUrl}
          alt={`MRC Landmarks channel partner badge ${id}`}
          className="mt-6 w-full rounded-2xl shadow-lg"
        />

        <div className="mt-5 grid gap-3 sm:grid-cols-2 print:hidden">
          <a
            href={badgeUrl}
            download={`${id}.png`}
            className="rounded-xl bg-[#176A70] px-5 py-4 text-center font-semibold text-white"
          >
            Download badge
          </a>
          <a
            href={share}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-[#176A70] px-5 py-4 text-center font-semibold text-[#176A70]"
          >
            Send to my WhatsApp
          </a>
        </div>

        {wantsCp && (
          <div className="mt-8 rounded-2xl border border-[#C4A97D]/40 bg-white p-6 print:hidden">
            <h2 className="text-lg font-bold text-[#1A2A2D]">
              One more step for the Channel Partner programme
            </h2>
            <p className="mt-1 text-sm text-[#4A5450]">
              You told us you&apos;re interested. This takes under a minute.
            </p>
            <Link
              href={`/cp/${id}`}
              className="mt-4 inline-block rounded-xl bg-[#1A2A2D] px-6 py-3.5 font-semibold text-white"
            >
              Continue to CP application
            </Link>
          </div>
        )}

        <p className="mt-8 text-center text-sm text-[#8A8D82] print:hidden">
          Your ID is <strong className="text-[#1A2A2D]">{id}</strong>. Bookmark
          this page — quote the ID for any MRC follow-up.
        </p>
      </div>
    </main>
  );
}
