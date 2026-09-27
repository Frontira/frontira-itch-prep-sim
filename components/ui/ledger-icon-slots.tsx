import { ControlGlyph } from "@/app/design-system/iconography";
import type { ControlGlyphProps } from "@/app/design-system/iconography";

type SlotProps = Omit<ControlGlyphProps, "name">;

export function SelectDisclosureGlyph(props: SlotProps) {
  return <ControlGlyph {...props} name="control.disclosure" data-ledger-slot="disclosure-glyph" />;
}

export function SelectIndicatorGlyph(props: SlotProps) {
  return <ControlGlyph {...props} name="control.confirm" data-ledger-slot="indicator-glyph" />;
}

export function DialogCloseGlyph(props: SlotProps) {
  return <ControlGlyph {...props} name="control.close" data-ledger-slot="close-glyph" />;
}

export function SheetCloseGlyph(props: SlotProps) {
  return <ControlGlyph {...props} name="control.close" data-ledger-slot="close-glyph" />;
}

export function LoadingGlyph(props: SlotProps) {
  return <ControlGlyph {...props} name="control.loading" data-ledger-slot="loading-glyph" />;
}
