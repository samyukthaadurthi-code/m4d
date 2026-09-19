"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FormShell } from "@/components/FormShell";
import { t, type Lang } from "@/lib/i18n";
import type { KitSection } from "@/lib/kit";

function useCountdown(target: number | null) {
  const [left, setLeft] = useState<number | null>(
    target ? Math.max(0, target - Date.now()) : null,
  );
  useEffect(() => {
    if (!target) return;
    const id = setInterval(
      () => setLeft(Math.max(0, target - Date.now())),
      1000,
    );
    return () => clearInterval(id);
  }, [target]);
  return left;
}

function Countdown({ target, lang }: { target: number; lang: Lang }) {
  const s = t(lang);
  const left = useCountdown(target);
  // Server render and first client paint must agree, so hold until mounted.
  if (left === null) return null;

  const d = Math.floor(left / 86400000);
  const h = Math.floor((left % 86400000) / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const sec = Math.floor((left % 60000) / 1000);
  const cells: [number, string][] = [
    [d, s.days], [h, s.hours], [m, s.mins], [sec, s.secs],
  ];

  return (
    <div className="rounded-2xl bg-[#1A2A2D] p-7 text-white">
      <p className="text-xs tracking-[0.2em] text-[#C4A97D] uppercase">
        {s.countdownTitle}
      </p>
      <div className="mt-5 flex flex-wrap gap-6 tabular-nums">
        {cells.map(([v, label]) => (
          <div key={label}>
            <div className="text-4xl font-bold text-[#C4A97D]">
              {String(v).padStart(2, "0")}
            </div>
            <div className="mt-1 text-[0.68rem] tracking-[0.16em] text-white/55 uppercase">
              {label}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-5 text-sm leading-relaxed text-white/70">
        {s.countdownNote}
      </p>
    </div>
  );
}

export function PartnerKit({
  cpId,
  fullName,
  sections,
  releaseAt,
}: {
  cpId: string;
  fullName: string;
  sections: KitSection[];
  releaseAt: number | null;
}) {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");
  const s = t(lang);
  const pending = releaseAt !== null && releaseAt > Date.now();

  async function signOut() {
    await fetch("/api/partners/logout", { method: "POST" });
    router.push("/partners");
  }

  return (
    <FormShell
      lang={lang}
      setLang={setLang}
      title={s.kitTitle}
      note={`${fullName} · ${cpId} — ${s.kitNote}`}
    >
      {pending && (
        <div className="mb-8">
          <Countdown target={releaseAt} lang={lang} />
        </div>
      )}

      <div className="space-y-3">
        {sections.map((sec) => (
          <div
            key={sec.key}
            className={`rounded-2xl border p-5 ${
              sec.ready
                ? "border-[#176A70]/30 bg-white"
                : "border-[#E4E2DA] bg-white/60"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-[#1A2A2D]">
                  {lang === "ta" ? sec.ta : sec.title}
                </h3>
                <p className="mt-1 text-sm text-[#4A5450]">{sec.blurb}</p>
              </div>
              {!sec.ready && (
                <span className="shrink-0 rounded-full border border-[#E4E2DA] px-3 py-1 text-[0.68rem] tracking-wider text-[#8A8D82] uppercase">
                  {s.kitLocked}
                </span>
              )}
            </div>

            {sec.ready ? (
              <ul className="mt-4 space-y-2">
                {sec.items.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      download
                      className="flex items-center justify-between rounded-lg bg-[#F7F5EF] px-4 py-3 text-sm font-medium text-[#12474C] transition hover:bg-[#176A70]/10"
                    >
                      <span>{item.label}</span>
                      {item.meta && (
                        <span className="text-xs text-[#8A8D82]">{item.meta}</span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 border-l-2 border-[#E4E2DA] pl-3 text-sm text-[#8A8D82]">
                {sec.pending}
              </p>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={signOut}
        className="mt-8 w-full rounded-xl border border-[#E4E2DA] px-6 py-3.5 text-sm font-medium text-[#4A5450] transition hover:border-[#176A70] hover:text-[#176A70]"
      >
        {s.signOut}
      </button>
    </FormShell>
  );
}
