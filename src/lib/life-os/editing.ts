import type { LifeRecord, RecordData } from './types';

/** Keep stored fields that the current form does not expose, including migrated measurements. */
export function preserveRecordData(
  records: LifeRecord[],
  id: string | null | undefined,
  edited: RecordData,
): RecordData {
  const current = id ? records.find((record) => record.id === id && !record.deletedAt) : undefined;
  return { ...current?.data, ...edited };
}
