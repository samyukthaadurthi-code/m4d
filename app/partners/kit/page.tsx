import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findById } from "@/lib/sheets";
import { SHEETS } from "@/lib/schema";
import { verify, SESSION_COOKIE, sessionConfigured } from "@/lib/session";
import { KIT, releaseAt } from "@/lib/kit";
import { PartnerKit } from "@/components/PartnerKit";

export const dynamic = "force-dynamic";

export default async function KitPage() {
  if (!sessionConfigured()) redirect("/partners");

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const cpId = verify(token);
  if (!cpId) redirect("/partners");

  // Re-check against the sheet on every load, so access can be revoked simply
  // by removing the row — no session store to purge.
  const row = await findById(SHEETS.registrations, cpId);
  if (!row) redirect("/partners");

  const release = releaseAt();

  return (
    <PartnerKit
      cpId={cpId}
      fullName={row.full_name ?? ""}
      sections={KIT}
      releaseAt={release ? release.getTime() : null}
    />
  );
}
