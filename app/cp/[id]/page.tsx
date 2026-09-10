import { notFound } from "next/navigation";
import { findById } from "@/lib/sheets";
import { SHEETS } from "@/lib/schema";
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

  return <CpForm id={id} fullName={row.full_name ?? ""} />;
}
