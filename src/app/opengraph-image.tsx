import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Mass Fitness — Fitness From Home";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          backgroundColor: "#101012",
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              backgroundColor: "#ff4d2e",
              display: "flex",
            }}
          />
          <div style={{ color: "#c9cfc6", fontSize: 28, letterSpacing: 4 }}>
            MASS FITNESS
          </div>
        </div>
        <div
          style={{
            color: "#f5f3ef",
            fontSize: 96,
            fontWeight: 900,
            lineHeight: 1.02,
            letterSpacing: -2,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span>FITNESS</span>
          <span style={{ color: "#ff4d2e" }}>FROM HOME.</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
