import { readFileSync } from "fs";
import { join } from "path";
import { ImageResponse } from "next/og";

export const alt = "Mass Fitness — Train at home, coached like you're in the room";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Satori has no CSS-variable support, so the palette is repeated here by hand.
// Keep in step with :root in globals.css if these move.
const PAPER = "#f7f6f4";
const INK = "#121212";
const MUTED = "#6b6b6b";
const LINE = "rgba(18,18,18,0.12)";

export default async function OpengraphImage() {
  // Satori (what ImageResponse renders with) can't resolve a same-origin
  // "/logo/..." URL at build/request time the way a browser would, so the
  // mark is inlined as a data URI read straight off disk instead.
  const logoBase64 = readFileSync(
    join(process.cwd(), "public/logo/mf-mark-light.png"),
  ).toString("base64");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: PAPER,
          padding: "72px 80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img
            src={`data:image/png;base64,${logoBase64}`}
            width={40}
            height={23}
            alt=""
          />
          <div style={{ display: "flex", color: MUTED, fontSize: 24, letterSpacing: 3 }}>
            MASS FITNESS
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            color: INK,
            fontSize: 82,
            lineHeight: 1.06,
            letterSpacing: -2,
          }}
        >
          <span>Train at home.</span>
          <span>Coached like you&rsquo;re in the room.</span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 48,
            paddingTop: 32,
            borderTop: `1px solid ${LINE}`,
            color: MUTED,
            fontSize: 22,
          }}
        >
          <span>Live coach-led classes</span>
          <span>Personalised plans</span>
          <span>No gym required</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
