"use client";

import { useState } from "react";
import { FormShell } from "@/components/FormShell";
import { t, type Lang } from "@/lib/i18n";

/**
 * The call-back form as its own page.
 *
 * The same thing exists as a pop-up on the website, but a pop-up is triggered
 * by behaviour — time on the page, or the mouse heading for the close button —
 * so it has no address you can hand to someone. The desk needs a link it can
 * leave open and fill in over and over, so here it is. Posts to the same
 * /api/enquiry as the pop-up: Enquiries tab, alert to sales, WhatsApp
 * acknowledgement to the visitor.
 */
const INTERESTS = [
  "ANANTAA, Othakadai",
  "Upcoming projects",
  "Channel partnership",
  "Something else",
];

export default function EnquirePage() {
  const [lang, setLang] = useState<Lang>("en");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [interest, setInterest] = useState(INTERESTS[0]);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");

  const field =
    "w-full rounded-xl border bg-white px-4 py-3.5 text-base text-[#1A2A2D] outline-none transition focus:border-[#176A70] focus:ring-2 focus:ring-[#176A70]/20";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setErrors({});
    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, mobile, email, interest, page: "/enquire", consent: consent ? "yes" : "" }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        else setError(data.error ?? "Something went wrong. Please try again.");
        setBusy(false);
        return;
      }
      setDone(data.id);
      // Cleared ready for the next person at the desk, rather than leaving the
      // last visitor's details on screen.
      setName(""); setMobile(""); setEmail(""); setConsent(false);
    } catch {
      setError("Could not reach the server. Check the connection and try again.");
    }
    setBusy(false);
  }

  if (done) {
    return (
      <FormShell lang={lang} setLang={setLang} title="Thank you." note="">
        <div className="rounded-xl border border-[#176A70]/25 bg-[#176A70]/8 px-5 py-5">
          <p className="font-semibold text-[#12474C]">We have your number.</p>
          <p className="mt-1 text-sm text-[#4A5450]">
            Someone from the MRC team will call within one working day. Reference {done}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDone("")}
          className="mt-5 w-full rounded-xl bg-[#176A70] px-5 py-4 text-center font-semibold text-white"
        >
          Add another person
        </button>
      </FormShell>
    );
  }

  return (
    <FormShell
      lang={lang}
      setLang={setLang}
      title="Want us to call you?"
      note="Leave your number and someone from the MRC team — not a call centre — will call you to fix a time."
    >
      <form onSubmit={submit} className="grid gap-5" noValidate>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#1A2A2D]" htmlFor="name">Name</label>
          <input id="name" className={`${field} ${errors.name ? "border-red-400" : "border-[#E4E2DA]"}`}
            autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          {errors.name && <p className="mt-1.5 text-sm text-red-600">{errors.name}</p>}
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#1A2A2D]" htmlFor="mobile">Mobile number</label>
          <input id="mobile" className={`${field} ${errors.mobile ? "border-red-400" : "border-[#E4E2DA]"}`}
            type="tel" inputMode="numeric" autoComplete="tel" placeholder="10-digit number"
            value={mobile} onChange={(e) => setMobile(e.target.value)} />
          {errors.mobile && <p className="mt-1.5 text-sm text-red-600">{errors.mobile}</p>}
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#1A2A2D]" htmlFor="email">Email</label>
          <input id="email" className={`${field} ${errors.email ? "border-red-400" : "border-[#E4E2DA]"}`}
            type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          {errors.email && <p className="mt-1.5 text-sm text-red-600">{errors.email}</p>}
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#1A2A2D]" htmlFor="interest">Interested in</label>
          <select id="interest" className={`${field} border-[#E4E2DA]`} value={interest}
            onChange={(e) => setInterest(e.target.value)}>
            {INTERESTS.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>

        <label className="flex items-start gap-3 text-sm text-[#4A5450]">
          <input type="checkbox" className="mt-1 h-5 w-5 flex-shrink-0 accent-[#176A70]"
            checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>I agree that MRC Landmarks may call or message me about this enquiry.</span>
        </label>
        {errors.consent && <p className="-mt-3 text-sm text-red-600">{errors.consent}</p>}

        {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <button type="submit" disabled={busy}
          className="w-full rounded-xl bg-[#176A70] px-5 py-4 text-center font-semibold text-white disabled:opacity-60">
          {busy ? "Sending…" : "Request a call back"}
        </button>
      </form>
    </FormShell>
  );
}
