"use client";

import type { Field } from "@/lib/schema";

export function FieldInput({
  field,
  value,
  error,
  onChange,
  onToggle,
  extra,
}: {
  field: Field;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  onToggle: (option: string) => void;
  extra?: React.ReactNode;
}) {
  const base =
    "w-full rounded-xl border bg-white px-4 py-3.5 text-base text-[#1A2A2D] outline-none transition focus:border-[#176A70] focus:ring-2 focus:ring-[#176A70]/20";
  const border = error ? "border-red-400" : "border-[#E4E2DA]";
  const selected = value ? value.split(", ") : [];

  return (
    <div>
      <label className="mb-2 block">
        <span className="block text-sm font-semibold text-[#1A2A2D]">
          {field.label}
          {field.required && <span className="text-[#C4A97D]"> *</span>}
        </span>
        {field.ta && (
          <span className="mt-0.5 block text-xs text-[#8A8D82]">{field.ta}</span>
        )}
      </label>

      {field.type === "textarea" ? (
        <textarea
          rows={3}
          className={`${base} ${border}`}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : field.type === "select" ? (
        <select
          className={`${base} ${border}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select…</option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : field.type === "radio" || field.type === "checkbox" ? (
        <div className="grid grid-cols-2 gap-2">
          {field.options?.map((o) => {
            const on =
              field.type === "radio"
                ? value === o.value
                : selected.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() =>
                  field.type === "radio" ? onChange(o.value) : onToggle(o.value)
                }
                className={`rounded-xl border px-3 py-3 text-left transition ${
                  on
                    ? "border-[#176A70] bg-[#176A70]/10 ring-2 ring-[#176A70]/25"
                    : "border-[#E4E2DA] bg-white"
                }`}
              >
                <span className="block text-sm font-medium text-[#1A2A2D]">
                  {o.label}
                </span>
                {o.ta && (
                  <span className="block text-xs text-[#8A8D82]">{o.ta}</span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <input
          type={field.type}
          inputMode={field.type === "tel" ? "numeric" : undefined}
          className={`${base} ${border}`}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {extra}
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
}
