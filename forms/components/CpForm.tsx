"use client";

import { useState } from "react";
import { CP_FIELDS } from "@/lib/schema";
import { FieldInput } from "@/components/FieldInput";
import { FormShell } from "@/components/FormShell";
import { t, type Lang } from "@/lib/i18n";

export function CpForm({ id, fullName }: { id: string; fullName: string }) {
  const [lang, setLang] = useState<Lang>("en");
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const res = await fetch("/api/cp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, unique_id: id, lang }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.errors ?? { _: data.error ?? s.generic });
        setBusy(false);
        return;
      }
      setDone(true);
    } catch {
      setErrors({ _: s.network });
      setBusy(false);
    }
  }

  if (done) {
    return (
      <FormShell lang={lang} setLang={setLang} title={s.cpDone}>
        <div className="rounded-2xl border border-[#176A70]/25 bg-[#176A70]/8 p-6">
          <p className="text-[#4A5450]">{s.cpDoneNote}</p>
          <p className="mt-3 text-sm text-[#8A8D82]">
            {s.yourId} <strong className="text-[#1A2A2D]">{id}</strong>
          </p>
        </div>
      </FormShell>
    );
  }

  return (
    <FormShell
      lang={lang}
      setLang={setLang}
      title={s.cpTitle}
      note={`${fullName} · ${id} — ${s.cpNote}`}
    >
      <form onSubmit={submit} className="space-y-6">
        {CP_FIELDS.map((field) => (
          <FieldInput
            key={field.key}
            field={field}
            lang={lang}
            value={values[field.key] ?? ""}
            error={errors[field.key]}
            onChange={(v) => set(field.key, v)}
            onToggle={(o) => toggleMulti(field.key, o)}
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
          className="w-full rounded-xl bg-[#176A70] px-6 py-4 font-semibold text-white transition active:scale-[0.99] disabled:opacity-60"
        >
          {busy ? s.submitting : s.cpSubmit}
        </button>
      </form>
    </FormShell>
  );
}
