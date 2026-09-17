"use client";

import Image from "next/image";
import { t, type Lang } from "@/lib/i18n";
import { brand } from "@/lib/brand";

export function FormShell({
  lang,
  setLang,
  title,
  note,
  children,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  const s = t(lang);

  return (
    <main className="min-h-screen bg-[#F7F5EF] pb-16">
      <header className="bg-[#1A2A2D] px-5 py-6 text-white">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <Image
            src="/mrc-logo-white.svg"
            alt="MRC Landmarks"
            width={64}
            height={64}
            priority
            className="h-16 w-auto flex-shrink-0"
          />
          <div className="flex-1">
            <div className="text-base font-bold tracking-[0.18em]">
              {brand.name}
            </div>
            <div className="text-xs tracking-widest text-[#C4A97D]">
              {brand.tagline}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLang(lang === "en" ? "ta" : "en")}
            className="rounded-lg border border-white/30 px-3 py-2 text-sm transition hover:bg-white/10"
          >
            {s.langName}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-5">
        <div className="mt-7 mb-7">
          <h1 className="text-2xl font-bold text-[#1A2A2D]">{title}</h1>
          {note && <p className="mt-1.5 text-sm text-[#4A5450]">{note}</p>}
        </div>
        {children}
      </div>
    </main>
  );
}
