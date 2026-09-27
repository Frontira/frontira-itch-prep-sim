import { ImageResponse } from "next/og";

// Browser tab icon (#81). Same source of truth as the OG cover: the design
// profile's official brand mark, never a typeset letter. Drawn at render time
// so no binary asset has to travel with the scaffold.

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

const theme = {
  brandMark: {"path":"M0 68.2895V21.2791C0 9.57794 9.53405 0 21.1816 0H38.8023C39.669 0 40.4375 0.772069 40.4375 1.64279V8.9946C40.4375 9.86533 39.669 10.6374 38.8023 10.6374H21.1816C15.3066 10.6374 10.5886 15.377 10.5886 21.2791V34.6273C10.5886 36.1757 11.4554 36.5618 12.5142 35.498L25.9934 21.9568C26.4759 21.4721 27.1505 21.2791 27.6287 21.2791H38.9901C40.1472 21.2791 40.5315 22.3428 39.8569 23.0205L11.2675 51.7501C10.8833 52.1361 10.5929 52.8138 10.5929 53.3929V68.2895C10.5929 69.1602 9.82439 69.9323 8.95765 69.9323H1.63526C0.768531 69.9323 0 69.1602 0 68.2895Z","viewBox":"-0.40 -0.40 41.20 70.70"} as { path: string; viewBox: string } | null,
  background: "#0A0A0F",
  foreground: "#F2F2F2",
  accent: "#A080ED",
};

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: theme.background,
      }}
    >
      {theme.brandMark ? (
        <svg width={13} height={22} viewBox={theme.brandMark.viewBox} aria-hidden="true">
          <path d={theme.brandMark.path} fill={theme.foreground} />
        </svg>
      ) : (
        <div
          style={{
            display: "flex",
            width: 16,
            height: 16,
            border: `2px solid ${theme.accent}`,
            borderRadius: 4,
          }}
        />
      )}
    </div>,
    size,
  );
}
