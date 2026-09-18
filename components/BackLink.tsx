"use client";

import { useEffect, useState } from "react";

const SITE = "https://mrclandmarks.com";
const KEY = "mrc_back";

/**
 * Where "back" goes: the website page the visitor came from. Remembered for the
 * session, so join → partner form → badge still returns to that original page.
 * Direct visits fall back to the site home.
 */
export function useBackHref() {
  const [href, setHref] = useState(SITE);
  useEffect(() => {
    try {
      const ref = document.referrer;
      if (ref && new URL(ref).origin !== location.origin) sessionStorage.setItem(KEY, ref);
      setHref(sessionStorage.getItem(KEY) || SITE);
    } catch {
      /* private mode: stay on the fallback */
    }
  }, []);
  return href;
}

export function BackLink({ label, className = "" }: { label: string; className?: string }) {
  const href = useBackHref();
  return (
    <a href={href} className={`inline-flex items-center gap-1.5 text-sm ${className}`}>
      <span aria-hidden="true">&larr;</span>
      {label}
    </a>
  );
}

/** Wraps the logo so it also returns to the page the visitor came from. */
export function BackAnchor({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const href = useBackHref();
  return (
    <a href={href} className={className} aria-label="Back to MRC Landmarks">
      {children}
    </a>
  );
}
