"use client";

import type { Field } from "@/lib/schema";
import { t, type Lang } from "@/lib/i18n";

export function FieldInput({
  field,
  value,
  error,
  lang = "en",
  onChange,
  onToggle,
  extra,
}: {
  field: Field;
  value: string;
  error?: string;
  lang?: Lang;
  onChange: (v: string) => void;
  onToggle: (option: string) => void;
  extra?: React.ReactNode;
}) {
  const s = t(lang);
  const base =
    "w-full rounded-xl border bg-white px-4 py-3.5 text-base text-[#1A2A2D] outline-none transition focus:border-[#176A70] focus:ring-2 focus:ring-[#176A70]/20";
  const border = error ? "border-red-400" : "border-[#E4E2DA]";
  const selected = value ? value.split(", ") : [];

  // In Tamil the Tamil label leads and English becomes the hint, and vice versa.
  const primary = lang === "ta" && field.ta ? field.ta : field.label;
  const secondary = lang === "ta" ? field.label : field.ta;
  const optionText = (o: { label: string; ta?: string }) => ({
    main: lang === "ta" && o.ta ? o.ta : o.label,
    sub: lang === "ta" ? o.label : o.ta,
  });
  const hint =
    lang === "ta" && field.placeholderTa ? field.placeholderTa : field.placeholder;

  if (field.type === "consent") {
    return (
      <div>
        <label
          className={`flex gap-3 rounded-xl border p-4 ${
            error ? "border-red-400 bg-red-50/40" : "border-[#E4E2DA] bg-white"
          }`}
        >
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 flex-shrink-0 accent-[#176A70]"
            checked={value === "Yes"}
            onChange={(e) => onChange(e.target.checked ? "Yes" : "")}
          />
          <span className="text-sm leading-relaxed text-[#4A5450]">
            {s.consent}{" "}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-[#176A70] underline-offset-2 hover:text-[#176A70]"
            >
              {s.privacy}
            </a>
          </span>
        </label>
        {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <label className="mb-2 block">
        <span className="block text-sm font-semibold text-[#1A2A2D]">
          {primary}
          {field.required && <span className="text-[#C4A97D]"> *</span>}
        </span>
        {secondary && (
          <span className="mt-0.5 block text-xs text-[#8A8D82]">{secondary}</span>
        )}
      </label>

      {field.type === "textarea" ? (
        <textarea
          rows={3}
          className={`${base} ${border}`}
          placeholder={hint}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : field.type === "select" ? (
        <select
          className={`${base} ${border}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{s.select}</option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {optionText(o).main}
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
            const text = optionText(o);
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={on}
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
                  {text.main}
                </span>
                {text.sub && (
                  <span className="block text-xs text-[#8A8D82]">{text.sub}</span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <input
          type={field.type}
          inputMode={field.type === "tel" ? "numeric" : undefined}
          min={field.type === "date" ? new Date().toISOString().slice(0, 10) : undefined}
          className={`${base} ${border}`}
          placeholder={hint}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {extra}
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
}
