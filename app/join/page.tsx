"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormShell } from "@/components/FormShell";
import { t, type Lang } from "@/lib/i18n";

type Outcome = "" | "no_badge" | "need_badge_id" | "already";

/** Website → Channel Partner programme. Verifies the event badge, then opens the partner form for it. */
export default function JoinPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");
  const [mobile, setMobile] = useState("");
  const [badgeId, setBadgeId] = useState("");
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState<Outcome>("");
  const [busy, setBusy] = useState(false);
  const s = t(lang);

  const field =
    "w-full rounded-xl border bg-white px-4 py-3.5 text-base text-[#1A2A2D] outline-none transition focus:border-[#176A70] focus:ring-2 focus:ring-[#176A70]/20";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setOutcome("");
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, badge_id: badgeId, lang }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? s.generic);
        setBusy(false);
        return;
      }
      if (data.status === "ok") {
        router.push(`/cp/${data.id}?lang=${lang}`);
        return;
      }
      setOutcome(data.status as Outcome);
      setBusy(false);
    } catch {
      setError(s.network);
      setBusy(false);
    }
  }

  return (
    <FormShell lang={lang} setLang={setLang} title={s.joinTitle} note={s.joinNote}>
      <form onSubmit={submit} className="space-y-6">
        <div>
          <label className="mb-2 block" htmlFor="mobile">
            <span className="block text-sm font-semibold text-[#1A2A2D]">{s.joinMobile}</span>
          </label>
          <input
            id="mobile"
            type="tel"
            inputMode="numeric"
            className={`${field} ${error ? "border-red-400" : "border-[#E4E2DA]"}`}
            placeholder={s.joinMobileHint}
            value={mobile}
            onChange={(e) => { setMobile(e.target.value); setError(""); setOutcome(""); }}
          />
        </div>

        <div>
          <label className="mb-2 block" htmlFor="badge_id">
            <span className="block text-sm font-semibold text-[#1A2A2D]">{s.joinBadgeId}</span>
            <span className="mt-1 block text-xs text-[#5c6b6d]">{s.joinBadgeIdHint}</span>
          </label>
          <input
            id="badge_id"
            className={`${field} ${error ? "border-red-400" : "border-[#E4E2DA]"}`}
            placeholder="MRC-CP-001"
            autoCapitalize="characters"
            value={badgeId}
            onChange={(e) => { setBadgeId(e.target.value); setError(""); setOutcome(""); }}
          />
        </div>

        {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        {outcome === "no_badge" && (
          <div className="rounded-xl border border-[#C4A97D] bg-[#FBF7EF] px-4 py-4 text-sm text-[#1A2A2D]">
            <p className="font-semibold">{s.joinNoBadge}</p>
            <p className="mt-1 text-[#5c6b6d]">{s.joinNoBadgeNote}</p>
            <a href={`/register?lang=${lang}`} className="mt-3 inline-block rounded-lg bg-[#176A70] px-4 py-2.5 font-semibold text-white">
              {s.joinRegisterCta}
            </a>
          </div>
        )}
        {outcome === "need_badge_id" && (
          <p className="rounded-lg bg-[#EEF1EC] px-4 py-3 text-sm text-[#1A2A2D]">{s.joinNeedBadgeId}</p>
        )}
        {outcome === "already" && (
          <div className="rounded-xl border border-[#C4A97D] bg-[#FBF7EF] px-4 py-4 text-sm text-[#1A2A2D]">
            <p className="font-semibold">{s.joinAlready}</p>
            <a href={`/partners?lang=${lang}`} className="mt-3 inline-block rounded-lg bg-[#176A70] px-4 py-2.5 font-semibold text-white">
              {s.joinSignIn}
            </a>
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-[#176A70] px-6 py-4 text-base font-semibold text-white transition active:scale-[0.99] disabled:opacity-60"
        >
          {busy ? s.joinChecking : s.joinContinue}
        </button>

        {/* The badge only comes from the event form — say so up front, not just after a failed lookup. */}
        <div className="rounded-xl border border-[#C4A97D] bg-[#FBF7EF] px-4 py-4 text-sm text-[#1A2A2D]">
          <p className="font-semibold">{s.joinNoBadgeYet}</p>
          <p className="mt-1 text-[#5c6b6d]">{s.joinNoBadgeYetNote}</p>
          <a href={`/register?lang=${lang}`} className="mt-3 inline-block rounded-lg border border-[#176A70] px-4 py-2.5 font-semibold text-[#176A70]">
            {s.joinRegisterCta} &rarr;
          </a>
        </div>
      </form>
    </FormShell>
  );
}
