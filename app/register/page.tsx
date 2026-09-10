"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { REGISTRATION_FIELDS } from "@/lib/schema";
import { FieldInput } from "@/components/FieldInput";
import { FormShell } from "@/components/FormShell";
import { t, type Lang } from "@/lib/i18n";

export default function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const { source } = use(searchParams);
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sameAsMobile, setSameAsMobile] = useState(false);
  const s = t(lang);

  const set = (key: string, value: string) => {
    setValues((v) => ({
      ...v,
      [key]: value,
      ...(key === "mobile" && sameAsMobile ? { whatsapp: value } : {}),
    }));
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
      const res = await fetch("/api/register", {
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
      router.push(`/badge/${data.unique_id}?new=1&lang=${lang}`);
    } catch {
      setErrors({ _: s.network });
      setBusy(false);
    }
  }

  const visible = REGISTRATION_FIELDS.filter(
    (f) => !f.showIf || f.showIf(values),
  );

  return (
    <FormShell
      lang={lang}
      setLang={setLang}
      title={s.registerTitle}
      note={s.registerNote}
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
              field.key === "whatsapp" ? (
                <label className="mt-2 flex items-center gap-2 text-sm text-[#4A5450]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#176A70]"
                    checked={sameAsMobile}
                    onChange={(e) => {
                      setSameAsMobile(e.target.checked);
                      if (e.target.checked) set("whatsapp", values.mobile ?? "");
                    }}
                  />
                  {s.sameAsMobile}
                </label>
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
          {busy ? s.submitting : s.submit}
        </button>
      </form>
    </FormShell>
  );
}
