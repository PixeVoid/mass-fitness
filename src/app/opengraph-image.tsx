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
        <div style={{ display: "flex", color: MUTED, fontSize: 24, letterSpacing: 3 }}>
          MASS FITNESS
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
