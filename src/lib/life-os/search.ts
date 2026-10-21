import type { LifeRecord } from './types';

export function searchableBody(record: LifeRecord): string {
  if (
    record.type === 'vault' ||
    (record.type === 'memory' && (record.data.sensitive || record.data.legacyMasked))
  )
    return '';
  return record.body;
}

export function searchRecords(records: LifeRecord[], query: string): LifeRecord[] {
  const term = query.trim().normalize('NFKC').toLocaleLowerCase();
  if (!term) return [];
  return records
    .filter(
      (record) =>
        !record.deletedAt &&
        record.type !== 'vault' &&
        `${record.title} ${searchableBody(record)}`
          .normalize('NFKC')
          .toLocaleLowerCase()
          .includes(term),
    )
    .slice(0, 25);
}
