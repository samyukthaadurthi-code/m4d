"use client";

import { useState, useEffect, use } from "react";
import { VISIT_FIELDS } from "@/lib/schema";
import { FieldInput } from "@/components/FieldInput";
import { FormShell } from "@/components/FormShell";
import { t, type Lang } from "@/lib/i18n";

export default function VisitPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const { source } = use(searchParams);
  const [lang, setLang] = useState<Lang>("en");
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [cp, setCp] = useState<{ name: string; organisation: string } | null>(null);
  const s = t(lang);

  const set = (key: string, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const toggleMulti = (key: string, option: string) => {
    const current = values[key] ? values[key].split(", ") : [];
    set(
      key,
      (current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option]
      ).join(", "),
    );
  };

  // Confirm the partner ID as it is typed, so the customer sees who they credit.
  const typedCpId = values.cp_id ?? "";
  useEffect(() => {
    const id = typedCpId.toUpperCase().trim();
    if (id.length < 8) {
      setCp(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cp-lookup/${encodeURIComponent(id)}`);
        const data = await res.json();
        if (!cancelled) setCp(data.found ? data : null);
      } catch {
        if (!cancelled) setCp(null);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [typedCpId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const res = await fetch("/api/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, source, lang }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.errors ?? { _: data.error ?? s.generic });
        setBusy(false);
        return;
      }
      setLeadId(data.lead_id);
    } catch {
      setErrors({ _: s.network });
      setBusy(false);
    }
  }

  if (leadId) {
    return (
      <FormShell lang={lang} setLang={setLang} title={s.visitDone}>
        <div className="rounded-2xl border border-[#176A70]/25 bg-[#176A70]/8 p-6">
          <p className="text-[#4A5450]">{s.visitDoneNote}</p>
          <p className="mt-3 text-sm text-[#8A8D82]">
            {s.yourId}{" "}
            <strong className="text-[#1A2A2D]">{leadId}</strong>
          </p>
        </div>
      </FormShell>
    );
  }

  const visible = VISIT_FIELDS.filter((f) => !f.showIf || f.showIf(values));

  return (
    <FormShell
      lang={lang}
      setLang={setLang}
      title={s.visitTitle}
      note={s.visitNote}
    >
      <form onSubmit={submit} className="space-y-6">
        {visible.map((field) => (
          <FieldInput
            key={field.key}
            field={field}
            lang={lang}
            value={values[field.key] ?? ""}
            error={errors[field.key]}
            onChange={(v) => set(field.key, v)}
            onToggle={(o) => toggleMulti(field.key, o)}
            extra={
              field.key === "cp_id" && cp ? (
                <p className="mt-2 rounded-lg bg-[#176A70]/10 px-3 py-2 text-sm text-[#12474C]">
                  {s.cpFound}{" "}
                  <strong>
                    {cp.name}
                    {cp.organisation ? `, ${cp.organisation}` : ""}
                  </strong>
                </p>
              ) : null
            }
          />
        ))}

        {errors._ && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {errors._}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-[#176A70] px-6 py-4 text-base font-semibold text-white transition active:scale-[0.99] disabled:opacity-60"
        >
          {busy ? s.submitting : s.visitSubmit}
        </button>
      </form>
    </FormShell>
  );
}
