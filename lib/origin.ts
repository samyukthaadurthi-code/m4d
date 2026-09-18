/** Public origin of this deployment, honouring Vercel's forwarded headers. */
export function origin(req: Request) {
  const h = req.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}
