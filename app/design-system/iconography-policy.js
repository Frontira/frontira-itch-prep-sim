/**
 * Frontira iconography import policy.
 *
 * Consumer code uses semantic adapters. Provider packages are implementation
 * details and may only be referenced inside the reviewed adapter boundary.
 */

'use strict';

const providerPatterns = Object.freeze([
  /^lucide(?:-react)?(?:\/.*)?$/,
  /^@phosphor-icons\//,
  /^@tabler\/icons(?:-|\/)/,
  /^@mui\/icons-material(?:\/|$)/,
  /^material-symbols(?:\/|$)/,
  /^react-icons(?:\/|$)/,
]);

const importPatterns = [
  /\b(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
];

function isIconProviderSpecifier(specifier) {
  return typeof specifier === 'string' && providerPatterns.some(pattern => pattern.test(specifier));
}

function lineAndColumn(source, index) {
  const before = source.slice(0, index);
  const lines = before.split('\n');
  return { line: lines.length, column: lines.at(-1).length + 1 };
}

function findDirectIconProviderImports(source) {
  if (typeof source !== 'string') throw new TypeError('Source must be a string');
  const seen = new Set();
  const violations = [];
  for (const pattern of importPatterns) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1];
      const key = `${match.index}:${specifier}`;
      if (!seen.has(key) && isIconProviderSpecifier(specifier)) {
        seen.add(key);
        violations.push({ specifier, ...lineAndColumn(source, match.index) });
      }
    }
  }
  return violations.sort((left, right) => left.line - right.line || left.column - right.column);
}

function assertNoDirectIconProviderImports(source, options = {}) {
  const violations = findDirectIconProviderImports(source);
  if (violations.length === 0) return;
  const file = options.filePath || 'source';
  const detail = violations
    .map(item => `${file}:${item.line}:${item.column} imports ${item.specifier}`)
    .join('\n');
  throw new Error(
    `Direct icon-provider imports are forbidden outside the Frontira adapter:\n${detail}`,
  );
}

module.exports = {
  providerPatterns,
  isIconProviderSpecifier,
  findDirectIconProviderImports,
  assertNoDirectIconProviderImports,
};
