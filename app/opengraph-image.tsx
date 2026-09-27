import { ImageResponse } from "next/og";

// Open Graph cover following the design-system OG contract (v1): official
// brand lettermark when the design profile carries one (never a typeset
// approximation), lowercase brand pairing, kicker → title → descriptor
// hierarchy inside the 72/60px safe areas, one gradient carrier, and a
// single composition reused for the Twitter card.

const title = "itch-prep-sim";
const descriptor = "ITCHATHON Challenge 4 restaurant prep forecasting and Jev simulation prototype";

// Composed from the JSON-safe title/descriptor above, never from the raw
// PROJECT_NAME / PROJECT_PURPOSE tokens. Interpolating a raw token into a
// string literal lets a single quote or backslash in project copy close the
// literal early, and the provisioned project then fails its first build with a
// parse error naming this line. Note the token names are spelled without their
// braces here on purpose: the renderer substitutes anything it recognises,
// comments included.
export const alt = `${title} — ${descriptor} Brand lettermark with a system signal on the profile register.`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const theme = {
  brand: "frontira",
  brandMark: {
    path: "M0 68.2895V21.2791C0 9.57794 9.53405 0 21.1816 0H38.8023C39.669 0 40.4375 0.772069 40.4375 1.64279V8.9946C40.4375 9.86533 39.669 10.6374 38.8023 10.6374H21.1816C15.3066 10.6374 10.5886 15.377 10.5886 21.2791V34.6273C10.5886 36.1757 11.4554 36.5618 12.5142 35.498L25.9934 21.9568C26.4759 21.4721 27.1505 21.2791 27.6287 21.2791H38.9901C40.1472 21.2791 40.5315 22.3428 39.8569 23.0205L11.2675 51.7501C10.8833 52.1361 10.5929 52.8138 10.5929 53.3929V68.2895C10.5929 69.1602 9.82439 69.9323 8.95765 69.9323H1.63526C0.768531 69.9323 0 69.1602 0 68.2895Z",
    viewBox: "-0.40 -0.40 41.20 70.70",
  } as { path: string; viewBox: string } | null,
  kicker: "Agentic delivery environment",
  background: "#0A0A0F",
  surface: "#14121F",
  foreground: "#F2F2F2",
  muted: "#8A8F98",
  accent: "#A080ED",
  signal: "#8BDDD3",
  action: "#EAFF95",
};

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        background: theme.background,
        color: theme.foreground,
        padding: "60px 72px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {theme.brandMark ? (
            <svg
              width={30}
              height={48}
              viewBox={theme.brandMark.viewBox}
              role="img"
              aria-label={`${theme.brand} lettermark`}
            >
              <path d={theme.brandMark.path} fill={theme.foreground} />
            </svg>
          ) : (
            <div
              style={{
                display: "flex",
                width: 34,
                height: 34,
                border: `2px solid ${theme.accent}`,
                borderRadius: 8,
              }}
            />
          )}
          <div style={{ display: "flex", fontSize: 28, letterSpacing: 1 }}>{theme.brand}</div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 20,
            letterSpacing: 4,
            color: theme.muted,
            textTransform: "uppercase",
          }}
        >
          {theme.kicker}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 640 }}>
          <div
            style={{
              display: "flex",
              fontSize: 88,
              fontWeight: 700,
              letterSpacing: -2,
              backgroundImage: `linear-gradient(90deg, ${theme.accent}, ${theme.signal})`,
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 20,
              fontSize: 30,
              lineHeight: 1.4,
              maxWidth: 620,
            }}
          >
            {descriptor}
          </div>
        </div>
        <svg width={280} height={140} viewBox="0 0 280 140" aria-hidden="true">
          <rect
            x="6"
            y="50"
            width="52"
            height="40"
            rx="6"
            fill="none"
            stroke={theme.accent}
            strokeWidth="2"
          />
          <line x1="58" y1="70" x2="128" y2="70" stroke={theme.muted} strokeWidth="2" />
          <circle cx="156" cy="70" r="24" fill="none" stroke={theme.signal} strokeWidth="2" />
          <line x1="180" y1="70" x2="238" y2="70" stroke={theme.muted} strokeWidth="2" />
          <rect x="238" y="55" width="32" height="30" rx="15" fill={theme.signal} opacity="0.9" />
        </svg>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 16,
          color: theme.muted,
          borderTop: `1px solid ${theme.surface}`,
          paddingTop: 20,
          letterSpacing: 2,
        }}
      >
        <div style={{ display: "flex", textTransform: "uppercase" }}>
          {"1200 × 630 · social preview"}
        </div>
        <div style={{ display: "flex", textTransform: "uppercase" }}>{theme.kicker}</div>
      </div>
    </div>,
    size,
  );
}
