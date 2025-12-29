import { ImageResponse } from "next/og"

export const size = {
  width: 32,
  height: 32,
}

export const contentType = "image/png"

export default function Icon() {
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
          borderRadius: 8,
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: "-0.5px",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* film perforation dots */}
        <div
          style={{
            position: "absolute",
            left: 3,
            top: 3,
            bottom: 3,
            width: 3,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 3,
                height: 3,
                borderRadius: 2,
                background: "rgba(255,255,255,0.65)",
              }}
            />
          ))}
        </div>

        <div
          style={{
            position: "absolute",
            right: 3,
            top: 3,
            bottom: 3,
            width: 3,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 3,
                height: 3,
                borderRadius: 2,
                background: "rgba(255,255,255,0.65)",
              }}
            />
          ))}
        </div>

        <div style={{ transform: "translateY(0.5px)" }}>R</div>
      </div>
    ),
    size
  )
}
