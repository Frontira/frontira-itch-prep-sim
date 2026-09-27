export type LayerRequirement = {
  selector: string;
  minOpacity: number;
  minZIndex?: number;
};

export type VisualContract = {
  contractVersion: 1;
  profileId: string;
  route: string;
  expectedRootClass: string | null;
  registers: { ink: string[]; paper: string[]; accent: string[] };
  criticalLandmarks: string[];
  layers: LayerRequirement[];
  reducedMotionSelectors: string[];
};

export type SelectorState = {
  exists: boolean;
  visible: boolean;
  opacity: number;
  zIndex: number;
  left: number;
  right: number;
  width: number;
  height: number;
  animationDurationMs: number;
  transitionDurationMs: number;
};

export type VisualStructureSnapshot = {
  marker: string | null;
  rootClasses: string[];
  viewportWidth: number;
  scrollWidth: number;
  selectors: Record<string, SelectorState>;
};

export function inspectVisualStructure(
  contract: VisualContract,
  snapshot: VisualStructureSnapshot,
  reducedMotion = false,
): string[] {
  const errors: string[] = [];
  if (snapshot.marker !== contract.profileId) {
    errors.push(
      `expected design profile marker ${contract.profileId}, got ${snapshot.marker ?? "none"}`,
    );
  }
  if (
    contract.expectedRootClass !== null &&
    !snapshot.rootClasses.includes(contract.expectedRootClass)
  ) {
    errors.push(`expected root class ${contract.expectedRootClass}`);
  }
  if (snapshot.scrollWidth > snapshot.viewportWidth + 1) {
    errors.push(`horizontal overflow: ${snapshot.scrollWidth}px > ${snapshot.viewportWidth}px`);
  }

  const required = [
    ...contract.registers.ink,
    ...contract.registers.paper,
    ...contract.registers.accent,
    ...contract.criticalLandmarks,
  ];
  for (const selector of required) {
    const state = snapshot.selectors[selector];
    if (!state?.exists || !state.visible || state.width <= 0 || state.height <= 0) {
      errors.push(`required selector is not visibly exercised: ${selector}`);
      continue;
    }
    if (state.left < -1 || state.right > snapshot.viewportWidth + 1) {
      errors.push(`critical selector is clipped horizontally: ${selector}`);
    }
  }

  for (const layer of contract.layers) {
    const state = snapshot.selectors[layer.selector];
    if (!state?.exists || !state.visible || state.width <= 0 || state.height <= 0) {
      errors.push(`declared atmospheric layer is invisible: ${layer.selector}`);
      continue;
    }
    if (state.opacity < layer.minOpacity) {
      errors.push(
        `declared atmospheric layer opacity ${state.opacity} is below ${layer.minOpacity}: ${layer.selector}`,
      );
    }
    if (layer.minZIndex !== undefined && state.zIndex < layer.minZIndex) {
      errors.push(
        `declared atmospheric layer z-index ${state.zIndex} is below ${layer.minZIndex}: ${layer.selector}`,
      );
    }
  }

  if (reducedMotion) {
    for (const selector of contract.reducedMotionSelectors) {
      const state = snapshot.selectors[selector];
      if (!state?.exists || !state.visible) {
        errors.push(`reduced-motion final state is hidden: ${selector}`);
      } else if (state.animationDurationMs > 0 || state.transitionDurationMs > 0) {
        errors.push(`reduced-motion animation remains active: ${selector}`);
      }
    }
  }
  return errors;
}
