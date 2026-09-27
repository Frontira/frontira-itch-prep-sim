import type { CSSProperties, SVGProps } from "react";
import { getControlGlyph } from "./control-glyphs.js";
import type { ControlGlyphName, ControlGlyphSize } from "./control-glyphs.js";
import { getPictogram } from "./pictograms.js";
import type { PictogramName } from "./pictograms.js";

type SemanticSvgProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  label?: string;
};

export type PictogramProps = SemanticSvgProps & {
  name: PictogramName;
  size?: number;
};

export type ControlGlyphProps = SemanticSvgProps & {
  name: ControlGlyphName;
  size?: ControlGlyphSize;
};

function accessibility(label?: string) {
  return label ? { role: "img", "aria-label": label } : { "aria-hidden": true as const };
}

export function Pictogram({
  name,
  label,
  size = 24,
  className,
  style,
  ...props
}: PictogramProps) {
  const pictogram = getPictogram(name);
  return (
    <svg
      {...props}
      {...accessibility(label)}
      data-pictogram={name}
      viewBox={pictogram.viewBox}
      className={["fr-pictogram", className].filter(Boolean).join(" ")}
      style={{ ...style, "--fr-pictogram-size": `${size}px` } as CSSProperties}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: reviewed integrity-pinned Frontira SVG
      dangerouslySetInnerHTML={{ __html: pictogram.body }}
    />
  );
}

export function ControlGlyph({
  name,
  label,
  size = 16,
  className,
  style,
  ...props
}: ControlGlyphProps) {
  const glyph = getControlGlyph(name);
  return (
    <svg
      {...props}
      {...accessibility(label)}
      data-control-glyph={name}
      viewBox={glyph.viewBox}
      className={["fr-control-glyph", className].filter(Boolean).join(" ")}
      style={{ ...style, "--fr-control-glyph-size": `${size}px` } as CSSProperties}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: reviewed integrity-pinned Frontira SVG
      dangerouslySetInnerHTML={{ __html: glyph.body }}
    />
  );
}
