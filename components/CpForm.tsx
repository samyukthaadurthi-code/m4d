"use client";

import { useState } from "react";
import { CP_FIELDS } from "@/lib/schema";
import { FieldInput } from "@/components/FieldInput";

export function CpForm({ id }: { id: string }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

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
        body: JSON.stringify({ ...values, unique_id: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.errors ?? { _: data.error ?? "Something went wrong." });
        setBusy(false);
        return;
      }
      setDone(true);
    } catch {
      setErrors({ _: "Network problem. Check your connection and try again." });
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mt-8 rounded-2xl border border-[#176A70]/25 bg-[#176A70]/8 p-6">
        <h2 className="text-lg font-bold text-[#12474C]">Application received</h2>
        <p className="mt-1 text-sm text-[#4A5450]">
          The MRC partnerships team will reach out on your WhatsApp number.
          Quote <strong className="text-[#1A2A2D]">{id}</strong> in any
          follow-up.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-6">
      {CP_FIELDS.map((field) => (
        <FieldInput
          key={field.key}
          field={field}
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
        {busy ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}
