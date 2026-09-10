"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormShell } from "@/components/FormShell";
import { t, type Lang } from "@/lib/i18n";

export default function PartnerLoginPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");
  const [cpId, setCpId] = useState("");
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const s = t(lang);

  const field =
    "w-full rounded-xl border bg-white px-4 py-3.5 text-base text-[#1A2A2D] outline-none transition focus:border-[#176A70] focus:ring-2 focus:ring-[#176A70]/20";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/partners/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cp_id: cpId, mobile, lang }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? s.badCreds);
        setBusy(false);
        return;
      }
      router.push("/partners/kit");
    } catch {
      setError(s.network);
      setBusy(false);
    }
  }

  return (
    <FormShell
      lang={lang}
      setLang={setLang}
      title={s.partnerTitle}
      note={s.partnerNote}
    >
      <form onSubmit={submit} className="space-y-6">
        <div>
          <label className="mb-2 block" htmlFor="cp_id">
            <span className="block text-sm font-semibold text-[#1A2A2D]">
              {s.partnerId}
            </span>
          </label>
          <input
            id="cp_id"
            className={`${field} ${error ? "border-red-400" : "border-[#E4E2DA]"}`}
            placeholder={s.partnerIdHint}
            value={cpId}
            autoCapitalize="characters"
            onChange={(e) => {
              setCpId(e.target.value);
              setError("");
            }}
          />
        </div>

        <div>
          <label className="mb-2 block" htmlFor="mobile">
            <span className="block text-sm font-semibold text-[#1A2A2D]">
              {s.partnerMobile}
            </span>
          </label>
          <input
            id="mobile"
            type="tel"
            inputMode="numeric"
            className={`${field} ${error ? "border-red-400" : "border-[#E4E2DA]"}`}
            value={mobile}
            onChange={(e) => {
              setMobile(e.target.value);
              setError("");
            }}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-[#176A70] px-6 py-4 text-base font-semibold text-white transition active:scale-[0.99] disabled:opacity-60"
        >
          {busy ? s.signingIn : s.signIn}
        </button>
      </form>
    </FormShell>
  );
}
