export interface IconProviderImportViolation {
  readonly specifier: string;
  readonly line: number;
  readonly column: number;
}

export const providerPatterns: readonly RegExp[];
export function isIconProviderSpecifier(specifier: unknown): specifier is string;
export function findDirectIconProviderImports(source: string): IconProviderImportViolation[];
export function assertNoDirectIconProviderImports(
  source: string,
  options?: { readonly filePath?: string },
): void;
