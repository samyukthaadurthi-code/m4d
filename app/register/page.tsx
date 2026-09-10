"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { REGISTRATION_FIELDS } from "@/lib/schema";
import { FieldInput } from "@/components/FieldInput";
import { brand } from "@/lib/brand";

export default function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const { source } = use(searchParams);
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sameAsMobile, setSameAsMobile] = useState(false);

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
    const next = current.includes(option)
      ? current.filter((o) => o !== option)
      : [...current, option];
    set(key, next.join(", "));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, source }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.errors ?? { _: data.error ?? "Something went wrong." });
        setBusy(false);
        return;
      }
      router.push(`/badge/${data.unique_id}?new=1`);
    } catch {
      setErrors({ _: "Network problem. Check your connection and try again." });
      setBusy(false);
    }
  }

  const visible = REGISTRATION_FIELDS.filter(
    (f) => !f.showIf || f.showIf(values),
  );

  return (
    <main className="min-h-screen bg-[#F7F5EF] pb-16">
      <header className="bg-[#1A2A2D] px-5 py-7 text-white">
        <div className="mx-auto max-w-xl">
          <div className="text-xl font-bold tracking-[0.2em]">
            {brand.name}
          </div>
          <div className="mt-1 text-sm tracking-widest text-[#C4A97D]">
            {brand.tagline}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-5">
        <div className="mt-7 mb-8">
          <h1 className="text-2xl font-bold text-[#1A2A2D]">
            Channel Partner Registration
          </h1>
          <p className="mt-1 text-sm text-[#4A5450]">
            சேனல் பார்ட்னர் பதிவு · Fill this once. Your badge is generated
            instantly.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-6">
          {visible.map((field) => (
            <FieldInput
              key={field.key}
              field={field}
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
                    Same as my mobile number
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
            {busy ? "Generating your badge…" : "Register & get my badge"}
          </button>
        </form>
      </div>
    </main>
  );
}
