export interface StorageNamespaceOptions {
  preview?: boolean;
  basePath?: string;
}

/** Preview builds share a browser origin with the existing app, but never its
 * storage namespace. Explicit options keep the namespace contract unit-testable. */
export function storageKey(suffix: string, options: StorageNamespaceOptions = {}): string {
  const preview = options.preview ?? process.env.NEXT_PUBLIC_LIFE_OS_PREVIEW === 'true';
  const basePath = options.basePath ?? process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  const prefix = preview ? `life-os:preview:${encodeURIComponent(basePath)}:v2:` : 'life-os:v2:';
  return `${prefix}${suffix}`;
}
