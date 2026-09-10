import { notFound } from "next/navigation";
import { findById } from "@/lib/sheets";
import { SHEETS } from "@/lib/schema";
import { brand } from "@/lib/brand";
import { CpForm } from "@/components/CpForm";

export const dynamic = "force-dynamic";

export default async function CpPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await findById(SHEETS.registrations, id);
  if (!row) notFound();

  return (
    <main className="min-h-screen bg-[#F7F5EF] pb-16">
      <header className="bg-[#1A2A2D] px-5 py-7 text-white">
        <div className="mx-auto max-w-xl">
          <div className="text-xl font-bold tracking-[0.2em]">{brand.name}</div>
          <div className="mt-1 text-sm tracking-widest text-[#C4A97D]">
            {brand.tagline}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-5">
        <div className="mt-7">
          <h1 className="text-2xl font-bold text-[#1A2A2D]">
            Channel Partner Application
          </h1>
          <p className="mt-1 text-sm text-[#4A5450]">
            {row.full_name} · {id}
          </p>
          <p className="mt-3 text-sm text-[#4A5450]">
            We already have your contact details from registration — just a few
            more questions.
          </p>
        </div>

        <CpForm id={id} />
      </div>
    </main>
  );
}
