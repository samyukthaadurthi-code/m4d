import { ImageResponse } from "next/og";
import { findById } from "@/lib/sheets";
import { SHEETS } from "@/lib/schema";
import { brand } from "@/lib/brand";
import { logoDataUri } from "@/lib/logo";

export const runtime = "nodejs";

const W = 1000;
const H = 640;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const row = await findById(SHEETS.registrations, id);
  if (!row) return new Response("Badge not found", { status: 404 });

  const name = row.full_name || "—";
  const org = row.organisation_name?.trim();
  const type = row.partner_type || "Individual";
  const areas = row.operating_areas || "—";

  // Long Tamil/English names still have to fit on one line.
  const nameSize = name.length > 26 ? 46 : name.length > 18 ? 58 : 70;

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          backgroundColor: brand.ink,
          backgroundImage: `linear-gradient(135deg, ${brand.ink} 0%, ${brand.tealDeep} 62%, ${brand.teal} 100%)`,
          color: "#FFFFFF",
          fontFamily: "sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            padding: "44px 56px 0 56px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {/* Logo is dark teal on transparent, so it needs a light ground to read. */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 110,
                height: 110,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoDataUri()} width={110} height={110} alt="" />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: 4 }}>
                {brand.name}
              </div>
              <div
                style={{
                  fontSize: 17,
                  color: brand.gold,
                  letterSpacing: 2,
                  marginTop: 6,
                }}
              >
                {brand.tagline}
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
            }}
          >
            <div
              style={{
                fontSize: 15,
                letterSpacing: 3,
                color: "rgba(255,255,255,0.75)",
              }}
            >
              CHANNEL PARTNER
            </div>
            <div
              style={{
                fontSize: 15,
                letterSpacing: 3,
                color: "rgba(255,255,255,0.55)",
                marginTop: 6,
              }}
            >
              LAUNCH EVENT
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            height: 2,
            backgroundColor: brand.gold,
            opacity: 0.55,
            margin: "28px 56px 0 56px",
          }}
        />

        {/* Identity */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            padding: "36px 56px 0 56px",
          }}
        >
          <div style={{ fontSize: nameSize, fontWeight: 700, lineHeight: 1.1 }}>
            {name}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 24,
              color: brand.gold,
              marginTop: 14,
            }}
          >
            {org ? `${org} · ${type}` : type}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: "auto",
              paddingBottom: 26,
            }}
          >
            <div
              style={{
                fontSize: 14,
                letterSpacing: 3,
                color: "rgba(255,255,255,0.5)",
              }}
            >
              UNIQUE ID
            </div>
            <div style={{ fontSize: 58, fontWeight: 700, letterSpacing: 7, marginTop: 6 }}>
              {id}
            </div>
          </div>
        </div>

        {/* ID strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: brand.gold,
            color: brand.ink,
            padding: "22px 56px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 13, letterSpacing: 3, opacity: 0.7 }}>
              OPERATING AREA
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>
              {areas.length > 52 ? `${areas.slice(0, 52)}…` : areas}
            </div>
          </div>
          <div style={{ fontSize: 16, letterSpacing: 2, opacity: 0.8 }}>
            VERIFY AT MRC DESK
          </div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      headers: {
        "Content-Disposition": `inline; filename="${id}.png"`,
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
