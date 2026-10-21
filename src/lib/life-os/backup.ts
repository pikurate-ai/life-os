import type { LifeRecord } from './types';
import {
  BACKUP_LIMIT,
  MAX_RECORDS,
  legacyRecordId,
  nextTimestamp,
  parseBackup,
  recordVersion,
  validateRecord,
} from './records';
import { readLegacy } from './legacy';

export interface BackupCandidate {
  source: 'v1' | 'v2';
  sourceWorkspace: 'legacy' | 'demo' | 'guest' | 'account';
  records: LifeRecord[];
  skipped: number;
  duplicates: number;
  warnings: string[];
}
export interface BackupImportPreview {
  token: string;
  source: 'v1' | 'v2';
  sourceWorkspace: BackupCandidate['sourceWorkspace'];
  total: number;
  active: number;
  deleted: number;
  skipped: number;
  duplicates: number;
  conflicts: number;
  targetKind: 'demo' | 'guest' | 'account';
  targetLabel: string;
  warnings: string[];
}
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
const v1Datasets = {
  essentialInfo: 'life_os_essential_items_v2',
  financialLogs: 'life_os_financial_logs_v2',
  assets: 'life_os_assets_v2',
  encryptedVault: 'life_os_encrypted_vault_v2',
  workout1RM: 'life_os_workout_1rm_v1',
  healthMetrics: 'life_os_body_metrics_v1',
  archivedDiaries: 'life_os_archived_diaries_v1',
} as const;

/** Exact v1 universalBackup format only; no unknown objects are treated as data. */
export async function inspectBackupText(text: string): Promise<BackupCandidate> {
  if (new TextEncoder().encode(text).byteLength > BACKUP_LIMIT)
    throw new Error('백업 파일은 25MB 이하여야 합니다.');
  let value: unknown;
  const content = text.replace(/^\uFEFF/, '');
  try {
    value = JSON.parse(content);
  } catch {
    throw new Error('JSON 백업 파일을 읽을 수 없습니다.');
  }
  if (object(value) && value.format === 'life-os') {
    const backup = parseBackup(content);
    return {
      source: 'v2',
      sourceWorkspace: backup.workspace,
      records: backup.records,
      skipped: 0,
      duplicates: 0,
      warnings: [],
    };
  }
  if (
    !object(value) ||
    value.app !== 'Life-OS' ||
    value.version !== '1.0.0' ||
    !object(value.data) ||
    typeof value.exportedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.exportedAt)) ||
    new Date(value.exportedAt).toISOString() !== value.exportedAt
  ) {
    throw new Error(
      '지원하는 Life OS v1 또는 v2 JSON 백업 파일이 아닙니다. 원본 파일은 변경하지 않았습니다.',
    );
  }
  const data = value.data;
  let inputCount = 0;
  const storage = new Map<string, string>();
  for (const [dataset, key] of Object.entries(v1Datasets)) {
    if (!Array.isArray(data[dataset]))
      throw new Error(
        'v1 백업에 필요한 기록 배열이 없습니다. 이전 앱의 전체 JSON 백업을 선택해 주세요.',
      );
    inputCount += data[dataset].length;
    if (inputCount > MAX_RECORDS)
      throw new Error('한 번에 최대 10,000개의 이전 기록을 가져올 수 있습니다.');
    storage.set(key, JSON.stringify(data[dataset]));
  }
  if (data.alarmConfig !== undefined && data.alarmConfig !== null)
    storage.set('life_os_alarm_config', JSON.stringify(data.alarmConfig));
  if (data.healthKitData !== undefined && data.healthKitData !== null)
    storage.set('life_os_healthkit_data', JSON.stringify(data.healthKitData));
  const converted = await readLegacy({
    get length() {
      return storage.size;
    },
    key: (index) => [...storage.keys()][index] ?? null,
    getItem: (key) => storage.get(key) ?? null,
  });
  const records = converted.records.map(validateRecord);
  return {
    source: 'v1',
    sourceWorkspace: 'legacy',
    records,
    skipped: converted.unsupported,
    duplicates: converted.duplicates,
    warnings: [
      'v1 전체 백업 형식은 원래 사진·일반 메모·턱걸이 세트·루틴을 포함하지 않았습니다. 이 자료는 원본 브라우저의 이전 기록 가져오기로 따로 보존해 주세요.',
      ...converted.warnings,
    ],
  };
}

/** Compare meaningful source content, not the time at which migration was run. */
function legacyContent(record: LifeRecord): string {
  const data = Object.fromEntries(
    Object.entries(record.data)
      .filter(([key]) => !['legacyUpdatedAt', 'legacySourceKey', 'legacySources'].includes(key))
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
  const undated = data.source === 'legacy' && ['memory', 'asset', 'routine'].includes(record.type);
  return JSON.stringify({
    type: record.type,
    title: record.title,
    body: record.body,
    date: undated ? '' : record.date,
    data,
  });
}
function matchingReview(record: LifeRecord, sourceContent: string): boolean {
  if (typeof record.data.importSnapshot !== 'string') return false;
  try {
    return legacyContent(validateRecord(JSON.parse(record.data.importSnapshot))) === sourceContent;
  } catch {
    return false;
  }
}
export interface PreservedLegacyImport {
  additions: LifeRecord[];
  unchanged: number;
  conflicts: number;
  deletedSkipped: number;
}
/** Source and current records stay unchanged. Changed versions become review
 * memories, so they cannot silently double-count money or health summaries. */
export function preserveLegacyImport(
  current: LifeRecord[],
  incoming: LifeRecord[],
): PreservedLegacyImport {
  const result: PreservedLegacyImport = {
    additions: [],
    unchanged: 0,
    conflicts: 0,
    deletedSkipped: 0,
  };
  const byId = new Map(current.map((record) => [record.id, record]));
  let clock = Date.parse(nextTimestamp(current));
  for (const source of incoming) {
    const existing = byId.get(source.id);
    if (!existing) {
      result.additions.push(source);
      byId.set(source.id, source);
      continue;
    }
    if (existing.deletedAt) {
      result.deletedSkipped++;
      continue;
    }
    const content = legacyContent(source);
    if (legacyContent(existing) === content) {
      result.unchanged++;
      continue;
    }
    let seed = `${source.id}:${content}`;
    let id = legacyRecordId('life_os_change', { id: seed }, 0);
    let duplicate = false;
    for (let attempts = 0; byId.has(id); attempts++) {
      if (attempts >= MAX_RECORDS)
        throw new Error('이전 기록 변경분이 너무 많습니다. 백업을 나누어 가져와 주세요.');
      const collision = byId.get(id)!;
      if (collision.deletedAt) {
        result.deletedSkipped++;
        duplicate = true;
        break;
      }
      if (
        matchingReview(collision, content) ||
        (source.type === 'vault' && legacyContent(collision) === content)
      ) {
        result.unchanged++;
        duplicate = true;
        break;
      }
      seed += `:${recordVersion(collision)}`;
      id = legacyRecordId('life_os_change', { id: seed }, 0);
    }
    if (duplicate) continue;
    const updatedAt = new Date(clock++).toISOString();
    const readableData = Object.fromEntries(
      Object.entries(source.data).filter(
        ([key]) =>
          !['image', 'ciphertext', 'encrypted', 'iv', 'salt', 'importSnapshot'].includes(key),
      ),
    );
    const copy =
      source.type === 'vault'
        ? validateRecord({ ...source, id, updatedAt })
        : validateRecord({
            id,
            type: 'memory',
            title: `[이전 변경분] ${source.title}`.slice(0, 300),
            date: source.date,
            updatedAt,
            body: `이전 기록의 변경분을 보관했습니다. 원래 기록은 그대로이며 아래 변경분은 가계·자산·운동 집계에 반영하지 않았습니다.\n\n종류: ${source.type}\n날짜: ${source.date}\n\n${source.body.slice(0, 6000)}\n\n기록 값:\n${JSON.stringify(readableData, null, 2).slice(0, 6000)}\n\n원문 전체는 전체 JSON 백업에 보존됩니다. 검토 후 반영할 내용은 현재 기록에서 직접 수정해 주세요.`,
            data: {
              category: 'daily',
              pinned: true,
              legacyMasked: Boolean(source.data.legacyMasked || source.data.masked),
              importConflict: true,
              importSourceId: source.id,
              importRecordType: source.type,
              importSnapshot: JSON.stringify(source),
            },
          });
    result.additions.push(copy);
    byId.set(id, copy);
    result.conflicts++;
  }
  return result;
}

export function backupTargetVersion(records: LifeRecord[]): string {
  return JSON.stringify(records.map((record) => `${record.id}:${recordVersion(record)}`).sort());
}
interface PreparedImport {
  token: string;
  scope: string;
  file: File;
  targetVersion: string;
  candidate: BackupCandidate;
  preview: BackupImportPreview;
}
/** In-memory confirmation capability. It is never written to browser storage. */
export class BackupImportSession {
  private generation = 0;
  private prepared: PreparedImport | null = null;
  begin(): number {
    this.discard();
    return this.generation;
  }
  discard(): void {
    this.generation++;
    this.prepared = null;
  }
  stage(
    request: number,
    prepared: Omit<PreparedImport, 'token' | 'preview'>,
    summary: Omit<BackupImportPreview, 'token'>,
  ): BackupImportPreview {
    if (request !== this.generation)
      throw new Error('선택한 파일이나 대상 공간이 바뀌었습니다. 파일을 다시 확인해 주세요.');
    const token = crypto.randomUUID();
    const preview = { ...summary, token };
    this.prepared = { ...prepared, token, preview };
    return preview;
  }
  confirm(
    token: string | undefined,
    file: File,
    scope: string,
    targetVersion: string,
  ): PreparedImport {
    const prepared = this.prepared;
    if (!token || !prepared || prepared.token !== token || prepared.file !== file)
      throw new Error('백업 미리보기를 다시 확인한 뒤 가져오기를 눌러 주세요.');
    if (prepared.scope !== scope)
      throw new Error('대상 계정이나 공간이 바뀌었습니다. 파일을 다시 선택해 확인해 주세요.');
    if (prepared.targetVersion !== targetVersion)
      throw new Error(
        '확인하는 동안 현재 기록이 변경되었습니다. 파일을 다시 선택해 미리보기를 갱신해 주세요.',
      );
    return prepared;
  }
}
