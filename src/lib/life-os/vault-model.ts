import type { LifeRecord } from './types';

/** Selection is explicit and remains stable when another device synchronizes an older vault. */
export function vaultConfigs(records: LifeRecord[]): LifeRecord[] {
  return records
    .filter(
      (record) => !record.deletedAt && record.type === 'vault' && record.data.role === 'config',
    )
    .sort((a, b) =>
      a.updatedAt < b.updatedAt
        ? -1
        : a.updatedAt > b.updatedAt
          ? 1
          : a.id < b.id
            ? -1
            : a.id > b.id
              ? 1
              : 0,
    );
}
export function resolveVaultConfig(
  configs: LifeRecord[],
  selectedId: string | null,
): LifeRecord | undefined {
  return configs.find((record) => record.id === selectedId) ?? configs[0];
}
export function vaultEntriesForConfig(
  records: LifeRecord[],
  configId: string | undefined,
  configCount: number,
): LifeRecord[] {
  if (!configId) return [];
  return records.filter(
    (record) =>
      !record.deletedAt &&
      record.type === 'vault' &&
      record.data.role === 'entry' &&
      (record.data.keyId === configId || (!record.data.keyId && configCount === 1)),
  );
}
