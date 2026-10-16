export type RecordKind =
  | 'task'
  | 'routine'
  | 'diary'
  | 'memory'
  | 'transaction'
  | 'asset'
  | 'workout'
  | 'weight'
  | 'bookmark'
  | 'photo'
  | 'goal'
  | 'vault';
export type RecordData = Record<string, string | number | boolean | string[] | number[] | null>;
export interface LifeRecord {
  id: string;
  type: RecordKind;
  title: string;
  body: string;
  date: string;
  updatedAt: string;
  deletedAt?: string;
  data: RecordData;
}
export type NewRecord = Omit<LifeRecord, 'id' | 'updatedAt'>;
export type PageId =
  | 'today'
  | 'memory'
  | 'diary'
  | 'health'
  | 'finance'
  | 'library'
  | 'gallery'
  | 'goals'
  | 'vault'
  | 'settings';
export function localDate(value = new Date()): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}
export function numberData(record: LifeRecord, key: string): number {
  return Number(record.data[key]) || 0;
}
export const pageTitles: Record<PageId, string> = {
  today: '오늘',
  memory: '기억과 메모',
  diary: '하루 일기',
  health: '건강과 운동',
  finance: '가계와 자산',
  library: '나중에 읽기',
  gallery: '소중한 순간',
  goals: '목표와 성장',
  vault: '암호금고',
  settings: '설정과 데이터',
};
