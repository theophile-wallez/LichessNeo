// Third-party code bundled into the scripts ships with its license: the
// build fails on a bundled package that isn't listed here. Bundled files keep
// theirs in public/licenses.

interface License {
  /** The package, as it's named under node_modules. */
  readonly name: string;
  /** Its license file, from the repository's root. */
  readonly from: string;
  /** Where the build puts it. */
  readonly to: string;
}

export const LICENSES: readonly License[] = [
  { name: 'three', from: 'node_modules/three/LICENSE', to: 'licenses/three.md' },
  { name: 'zod', from: 'node_modules/zod/LICENSE', to: 'licenses/zod.md' },
];

/** The package a bundled module comes from, or null for our code and the bundler's. */
export function packageOf(moduleId: string): string | null {
  // pnpm nests packages (node_modules/.pnpm/zod@4/node_modules/zod/…): the last one counts.
  const inPackage = moduleId.replaceAll('\\', '/').split('/node_modules/').slice(1).at(-1);
  if (inPackage === undefined) return null;
  const [first = '', second = ''] = inPackage.split('/');
  return first.startsWith('@') ? `${first}/${second}` : first;
}

/** Throws if the bundled modules come from a package with no license listed. */
export function assertLicensed(moduleIds: Iterable<string>): void {
  const listed = new Set(LICENSES.map(license => license.name));
  const unlisted = new Set<string>();
  for (const moduleId of moduleIds) {
    const name = packageOf(moduleId);
    if (name !== null && !listed.has(name)) unlisted.add(name);
  }
  if (unlisted.size > 0) {
    const names = [...unlisted].toSorted().join(', ');
    throw new Error(`bundled without its license (add it to scripts/lib/licenses.ts): ${names}`);
  }
}
