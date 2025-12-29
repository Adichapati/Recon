import { ImageResponse } from "next/og"

export const size = {
  width: 180,
  height: 180,
}

export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
          color: "#ffffff",
          borderRadius: 40,
          fontSize: 104,
          fontWeight: 900,
          letterSpacing: "-3px",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* subtle film perforation */}
        <div
          style={{
            position: "absolute",
            left: 16,
            top: 18,
            bottom: 18,
            width: 14,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            opacity: 0.7,
          }}
        >
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 14,
                height: 12,
                borderRadius: 8,
                background: "rgba(255,255,255,0.18)",
              }}
            />
          ))}
        </div>

        <div
          style={{
            position: "absolute",
            right: 16,
            top: 18,
            bottom: 18,
            width: 14,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            opacity: 0.7,
          }}
        >
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 14,
                height: 12,
                borderRadius: 8,
                background: "rgba(255,255,255,0.18)",
              }}
            />
          ))}
        </div>

        <div style={{ transform: "translateY(2px)" }}>R</div>
      </div>
    ),
    size
  )
}
