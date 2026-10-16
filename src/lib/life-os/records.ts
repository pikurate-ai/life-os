import type { LifeRecord, NewRecord, RecordData, RecordKind } from './types';

export const RECORD_KINDS: RecordKind[] = [
  'task',
  'routine',
  'diary',
  'memory',
  'transaction',
  'asset',
  'workout',
  'weight',
  'bookmark',
  'photo',
  'goal',
  'vault',
];
export const BACKUP_LIMIT = 25 * 1024 * 1024;
export const RECORD_LIMIT = 650_000;
export const MAX_RECORDS = 10_000;

export interface WorkspaceEnvelope {
  version: 2;
  scope: string;
  records: LifeRecord[];
  pending: string[];
  acknowledged: Record<string, string>;
}
export interface LifeBackup {
  format: 'life-os';
  version: 2;
  exportedAt: string;
  workspace: 'demo' | 'guest' | 'account';
  records: LifeRecord[];
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
function validTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value))
    return false;
  const timestamp = Date.parse(value);
  // Reject impossible calendar dates and poisoned clocks that would make every
  // subsequent legitimate edit appear older (or overflow the four-digit year).
  return (
    Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString() === value &&
    timestamp <= Date.now() + 86_400_000
  );
}
function validData(value: unknown): value is RecordData {
  if (!object(value) || Object.keys(value).length > 50) return false;
  return Object.entries(value).every(([key, item]) => {
    if (
      !/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(key) ||
      ['__proto__', 'constructor', 'prototype'].includes(key)
    )
      return false;
    if (item === null || typeof item === 'boolean') return true;
    if (typeof item === 'number') return Number.isFinite(item);
    if (typeof item === 'string') return item.length <= 620_000;
    return (
      Array.isArray(item) &&
      item.length <= 10_000 &&
      (item.every((i) => typeof i === 'string' && i.length <= 2000) ||
        item.every((i) => typeof i === 'number' && Number.isFinite(i)))
    );
  });
}

/** Trust boundary shared by local cache, imports, and remote snapshots. */
export function validateRecord(value: unknown): LifeRecord {
  if (
    !object(value) ||
    typeof value.id !== 'string' ||
    !/^[A-Za-z0-9_-]{1,160}$/.test(value.id) ||
    ['__proto__', 'constructor', 'prototype'].includes(value.id) ||
    !RECORD_KINDS.includes(value.type as RecordKind) ||
    typeof value.title !== 'string' ||
    value.title.length > 300 ||
    typeof value.body !== 'string' ||
    value.body.length > 120_000 ||
    !validDate(value.date) ||
    !validTimestamp(value.updatedAt) ||
    (value.deletedAt !== undefined &&
      (!validTimestamp(value.deletedAt) || value.deletedAt !== value.updatedAt)) ||
    !validData(value.data)
  ) {
    throw new Error('기록 형식이 올바르지 않습니다. 파일의 날짜, 종류, 필수 항목을 확인해 주세요.');
  }
  const clean: LifeRecord = {
    id: value.id,
    type: value.type as RecordKind,
    title: value.title,
    body: value.body,
    date: value.date,
    updatedAt: value.updatedAt,
    data: { ...value.data },
    ...(value.deletedAt ? { deletedAt: value.deletedAt as string } : {}),
  };
  if (clean.deletedAt) {
    clean.title = '';
    clean.body = '';
    clean.data = {};
  }
  if (new TextEncoder().encode(JSON.stringify(clean)).byteLength > RECORD_LIMIT) {
    throw new Error('기록 하나의 용량은 650KB 이하여야 합니다. 사진 크기를 줄여 주세요.');
  }
  if (clean.type === 'vault' && !clean.deletedAt) {
    // Never let plaintext secrets accidentally enter cloud storage or backups.
    const allowed = clean.data.legacy
      ? ['encrypted', 'legacy', 'legacyFormat', 'source']
      : ['role', 'version', 'iv', 'ciphertext', 'salt', 'iterations', 'keyId'];
    if (clean.body || Object.keys(clean.data).some((key) => !allowed.includes(key))) {
      throw new Error('암호금고에는 암호화된 데이터만 저장할 수 있습니다.');
    }
    const encrypted = clean.data.encrypted ?? clean.data.payload ?? clean.data.ciphertext;
    if (typeof encrypted !== 'string' || encrypted.length < 16)
      throw new Error('금고의 암호화된 데이터가 없습니다.');
    // Imported display labels must not leak private service names into plaintext storage.
    clean.title = clean.data.legacy
      ? '이전 암호금고 항목'
      : clean.data.role === 'config'
        ? '암호화된 금고 설정'
        : '암호화된 항목';
  }
  return clean;
}

export function recordFingerprint(record: LifeRecord): string {
  return JSON.stringify({
    ...record,
    data: Object.fromEntries(
      Object.entries(record.data).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    ),
  });
}
/** Compact, durable acknowledgement token; this is a version tag, not a security hash. */
export function recordVersion(record: LifeRecord): string {
  const raw = recordFingerprint(record);
  let hash = 2166136261;
  for (let index = 0; index < raw.length; index++)
    hash = Math.imul(hash ^ raw.charCodeAt(index), 16777619);
  return `${record.updatedAt}:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

/** LWW per record; tombstones win ties, then canonical content breaks equal-clock ties. */
export function mergeRecords(...groups: LifeRecord[][]): LifeRecord[] {
  const merged = new Map<string, LifeRecord>();
  for (const group of groups) {
    for (const record of group) {
      const previous = merged.get(record.id);
      if (
        !previous ||
        record.updatedAt > previous.updatedAt ||
        (record.updatedAt === previous.updatedAt &&
          (Boolean(record.deletedAt) > Boolean(previous.deletedAt) ||
            (Boolean(record.deletedAt) === Boolean(previous.deletedAt) &&
              recordFingerprint(record) > recordFingerprint(previous))))
      ) {
        merged.set(record.id, record);
      }
    }
  }
  return [...merged.values()].sort(
    (a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id),
  );
}

export function workspaceKey(scope: string): string {
  if (scope !== 'demo' && scope !== 'guest' && !/^uid:[^\s/]{1,128}$/.test(scope))
    throw new Error('잘못된 작업 공간입니다.');
  return `life-os:v2:workspace:${encodeURIComponent(scope)}`;
}
export function emptyWorkspace(scope: string): WorkspaceEnvelope {
  workspaceKey(scope);
  return { version: 2, scope, records: [], pending: [], acknowledged: {} };
}
export function parseWorkspace(raw: string, expectedScope: string): WorkspaceEnvelope {
  const parsed: unknown = JSON.parse(raw);
  if (
    !object(parsed) ||
    parsed.version !== 2 ||
    parsed.scope !== expectedScope ||
    !Array.isArray(parsed.records) ||
    parsed.records.length > MAX_RECORDS ||
    !Array.isArray(parsed.pending) ||
    !parsed.pending.every((id) => typeof id === 'string')
  ) {
    throw new Error('저장된 데이터 형식이 올바르지 않습니다. 기존 데이터는 보존했습니다.');
  }
  const records = mergeRecords(parsed.records.map(validateRecord));
  const ids = new Set(records.map((record) => record.id));
  const acknowledged: Record<string, string> = {};
  if (object(parsed.acknowledged)) {
    for (const [id, version] of Object.entries(parsed.acknowledged)) {
      if (ids.has(id) && typeof version === 'string' && version.length < 100)
        acknowledged[id] = version;
    }
  }
  return {
    version: 2,
    scope: expectedScope,
    records,
    pending: [...new Set(parsed.pending as string[])].filter((id) => ids.has(id)),
    acknowledged,
  };
}

export function mergeWorkspaces(
  left: WorkspaceEnvelope,
  right: WorkspaceEnvelope,
): WorkspaceEnvelope {
  if (left.scope !== right.scope) throw new Error('다른 계정의 데이터는 병합할 수 없습니다.');
  const records = mergeRecords(left.records, right.records);
  const byId = new Map(records.map((record) => [record.id, record]));
  const acknowledged = { ...left.acknowledged };
  for (const [id, version] of Object.entries(right.acknowledged)) {
    if (!acknowledged[id] || version > acknowledged[id]) acknowledged[id] = version;
  }
  const pending = [...new Set([...left.pending, ...right.pending])].filter((id) => {
    const record = byId.get(id);
    return record && acknowledged[id] !== recordVersion(record);
  });
  return { version: 2, scope: left.scope, records, pending, acknowledged };
}

export function makeBackup(records: LifeRecord[], scope: string): LifeBackup {
  return {
    format: 'life-os',
    version: 2,
    exportedAt: new Date().toISOString(),
    workspace: scope === 'demo' ? 'demo' : scope === 'guest' ? 'guest' : 'account',
    records: records.map(validateRecord),
  };
}
export function parseBackup(text: string): LifeBackup {
  if (new TextEncoder().encode(text).byteLength > BACKUP_LIMIT)
    throw new Error('백업 파일은 25MB 이하여야 합니다.');
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('JSON 백업 파일을 읽을 수 없습니다.');
  }
  if (
    !object(value) ||
    value.format !== 'life-os' ||
    value.version !== 2 ||
    !validTimestamp(value.exportedAt) ||
    !['demo', 'guest', 'account'].includes(String(value.workspace)) ||
    !Array.isArray(value.records) ||
    value.records.length > MAX_RECORDS
  ) {
    throw new Error(
      'Life OS v2 백업 파일이 아닙니다. 기존 앱의 데이터는 이전 데이터 가져오기를 이용해 주세요.',
    );
  }
  const records = value.records.map(validateRecord);
  if (new Set(records.map((record) => record.id)).size !== records.length)
    throw new Error('백업에 중복된 기록 ID가 있습니다.');
  return {
    format: 'life-os',
    version: 2,
    exportedAt: value.exportedAt,
    workspace: value.workspace as LifeBackup['workspace'],
    records,
  };
}

/** A monotonically increasing local clock prevents same-millisecond lost updates. */
export function nextTimestamp(records: LifeRecord[], now = Date.now()): string {
  const latest = records.reduce(
    (maximum, record) => Math.max(maximum, Date.parse(record.updatedAt)),
    0,
  );
  return new Date(Math.max(now, latest + 1)).toISOString();
}
export function createRecord(input: NewRecord, id: string, updatedAt: string): LifeRecord {
  return validateRecord({ ...input, id, updatedAt });
}

/** Stable, non-identifying migration ID; 128-bit version tag, not a security primitive. */
export function legacyRecordId(
  key: string,
  item: Record<string, unknown>,
  occurrence: number,
): string {
  const explicit =
    (typeof item.id === 'string' && item.id) ||
    (typeof item.id === 'number' && Number.isFinite(item.id) ? String(item.id) : null);
  const raw = `${key}:${explicit || `${JSON.stringify(Object.fromEntries(Object.entries(item).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))))}:${occurrence}`}`;
  const parts = [2166136261, 2246822519, 3266489917, 668265263].map((seed) => {
    let hash = seed;
    for (let index = 0; index < raw.length; index++)
      hash = Math.imul(hash ^ raw.charCodeAt(index), 16777619);
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 2246822507);
    hash ^= hash >>> 13;
    return (hash >>> 0).toString(16).padStart(8, '0');
  });
  return `legacy-${key.replace('life_os_', '').slice(0, 40)}-${parts.join('')}`;
}
