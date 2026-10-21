import type { LifeRecord, NewRecord, RecordData } from './types';
import { localDate } from './types';
import { createRecord, legacyRecordId } from './records';
import { imageBytes, isLegacyRaster, prepareLegacyPhoto } from './legacy-photo';

export interface LegacyResult {
  records: LifeRecord[];
  unsupported: number;
  duplicates: number;
  warnings: string[];
}
interface LegacyOptions {
  now?: Date;
  preparePhoto?: (source: string) => Promise<string>;
}
const KEYS = [
  'life_os_essential_items_v2',
  'life_os_general_memos_v1',
  'life_os_archived_diaries_v1',
  'life_os_daily_routines_v2',
  'life_os_financial_logs_v2',
  'life_os_assets_v2',
  'life_os_body_metrics_v1',
  'life_os_body_metrics_v2',
  'life_os_pullup_records_v1',
  'life_os_workout_1rm_v1',
  'life_os_encrypted_vault_v2',
  'life_os_photos_v1',
  'life_os_photos_v2',
];
function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}
function firstText(...values: unknown[]): string {
  return (values.find((value) => typeof value === 'string' && value.trim()) as string) || '';
}
function finite(value: unknown): number {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}
function plainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function stable(value: Record<string, unknown>): string {
  return JSON.stringify(
    Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))),
  );
}
export function legacyDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  const match =
    raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:$|[T\s])/) ??
    raw.match(/^(\d{4})\s*[.년]\s*(\d{1,2})\s*[.월]\s*(\d{1,2})(?:\s*[.일])?\s*$/);
  if (!match) return null;
  const date = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  const parsed = new Date(`${date}T12:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
    ? date
    : null;
}
function recordDate(item: Record<string, unknown>): string | null {
  for (const value of [
    item.date,
    item.entry_date,
    item.logged_date,
    item.measuredAt,
    item.createdAt,
    item.created_at,
    item.updatedAt,
    item.updated_at,
  ]) {
    const date = legacyDate(value);
    if (date) return date;
  }
  const clicked = item.last_clicked_at ?? item.lastClickedAt;
  return typeof clicked === 'number' &&
    Number.isFinite(clicked) &&
    clicked >= 946684800000 &&
    clicked <= Date.now() + 86400000 &&
    !Number.isNaN(new Date(clicked).getTime())
    ? localDate(new Date(clicked))
    : null;
}
function memoryCategory(value: unknown): string {
  const category = text(value);
  if (['work', 'business'].includes(category) || /업무|사업|커리어/.test(category)) return 'work';
  if (category === 'family' || /가족/.test(category)) return 'family';
  if (category === 'study' || /공부|학습|배움/.test(category)) return 'study';
  return 'daily';
}
function photoCategory(folder: string): string {
  if (/가족/.test(folder) || folder === 'family') return 'family';
  if (/여행/.test(folder) || folder === 'travel') return 'travel';
  return /운동|바디|성취|성장|사업/.test(folder) || folder === 'growth' ? 'growth' : 'daily';
}
function mood(value: unknown): number {
  const number = finite(value);
  if (Number.isInteger(number) && number >= 1 && number <= 5) return number;
  return (
    ({ great: 5, good: 4, neutral: 3, bad: 2, terrible: 1 } as Record<string, number>)[
      text(value)
    ] ?? 3
  );
}
function remoteImage(value: string): boolean {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

/** Explicit migration of stored values only. No defaults, source mutation, or remote image requests. */
export async function readLegacy(
  storage: Pick<Storage, 'getItem' | 'key' | 'length'>,
  options: LegacyOptions = {},
): Promise<LegacyResult> {
  const result: LegacyResult = { records: [], unsupported: 0, duplicates: 0, warnings: [] };
  const now = options.now ?? new Date();
  const timestamp = now.toISOString();
  const today = localDate(now);
  const preparePhoto = options.preparePhoto ?? prepareLegacyPhoto;
  const problems = new Map<string, number>();
  const info = new Set<string>();
  const diaryCopies = new Map<string, number>();
  const ids = new Map<string, string>();
  const keys = [...KEYS];
  const problem = (message: string) => {
    result.unsupported++;
    problems.set(message, (problems.get(message) ?? 0) + 1);
  };
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (key && /^life_os_diary_\d{4}-\d{2}-\d{2}$/.test(key)) keys.push(key);
  }
  for (const key of keys) {
    const raw = storage.getItem(key);
    if (!raw) continue;
    let source: unknown;
    try {
      source = JSON.parse(raw);
    } catch {
      problem(`${key}: JSON 형식을 읽지 못해 건너뜀`);
      continue;
    }
    const list = Array.isArray(source)
      ? source
      : key.startsWith('life_os_diary_')
        ? [source]
        : null;
    if (!list) {
      problem(`${key}: 예상한 배열 형식이 아니어서 건너뜀`);
      continue;
    }
    if (list.length > 10_000) {
      problem(`${key}: 10,000개 제한을 초과하여 건너뜀`);
      continue;
    }
    const occurrences = new Map<string, number>();
    for (const value of list) {
      if (!plainObject(value)) {
        problem(`${key}: 기록 객체가 아니어서 건너뜀`);
        continue;
      }
      const item = value;
      const content = stable(item);
      const occurrence = occurrences.get(content) ?? 0;
      occurrences.set(content, occurrence + 1);
      const foundDate = recordDate(item);
      const base: NewRecord = {
        type: 'memory',
        title: firstText(item.title, item.name) || '이전 기록',
        body: '',
        date: foundDate ?? today,
        data: { source: 'legacy', legacySourceKey: key },
      };
      if (key.includes('essential_items')) {
        base.body = [text(item.value), text(item.memo)].filter(Boolean).join('\n');
        base.data = {
          ...base.data,
          category: memoryCategory(item.category),
          pinned: false,
          legacyCategory: text(item.category),
          legacyMasked: Boolean(item.is_masked),
        };
        if (item.is_masked)
          info.add(
            '이전 필수정보의 가림 상태를 메타데이터로 보존했습니다. 메모의 원문은 평문 기록입니다.',
          );
      } else if (key.includes('general_memos')) {
        base.title =
          firstText(item.title) ||
          text(item.content).trim().split('\n')[0].slice(0, 80) ||
          '이전 메모';
        base.body = text(item.content);
        base.data = {
          ...base.data,
          category: memoryCategory(item.category),
          pinned: Boolean(item.isPinned),
          legacyCategory: text(item.category),
          legacyColor: text(item.color),
        };
      } else if (key.includes('daily_routines')) {
        base.type = 'routine';
        base.title = firstText(item.title) || '이전 루틴';
        base.body = '이전 앱에는 완료 날짜가 없어 날짜별 완료 이력은 만들지 않았습니다.';
        base.data = {
          ...base.data,
          completedDates: [],
          icon: /수영/.test(base.title)
            ? 'swim'
            : /일기/.test(base.title)
              ? 'diary'
              : /달리|운동|턱걸이/.test(base.title)
                ? 'run'
                : 'book',
          target: 7,
          legacyCompleted: Boolean(item.completed ?? item.is_completed_today),
          legacyStreak: finite(item.streak ?? item.streak_count),
        };
        info.add(
          '루틴 정의와 이전 완료/스트릭 값은 보존했지만 날짜를 알 수 없어 completedDates는 비워 두었습니다.',
        );
      } else if (key.includes('archived_diaries') || key.startsWith('life_os_diary_')) {
        base.type = 'diary';
        base.date = key.startsWith('life_os_diary_')
          ? (legacyDate(key.slice(-10)) ?? '')
          : (foundDate ?? '');
        if (!base.date) {
          problem('일기: 유효한 기록 날짜가 없어 건너뜀');
          continue;
        }
        base.title = firstText(item.title) || `${base.date}의 기록`;
        base.body = firstText(item.content, item.text, item.body);
        if (!base.body.trim()) {
          problem('일기: 본문이 비어 있어 건너뜀');
          continue;
        }
        base.data = {
          ...base.data,
          mood: mood(item.mood),
          gratitude: text(item.gratitude),
          originalMood:
            typeof item.mood === 'string' || typeof item.mood === 'number' ? String(item.mood) : '',
          source: firstText(item.source, item.source_type) || 'legacy',
          legacySources: [key],
          tags: ['이전 기록'],
        };
        const signature = `${base.date}\u0000${base.body.normalize('NFC').trim()}`;
        const duplicate = diaryCopies.get(signature);
        if (duplicate !== undefined) {
          const previous = result.records[duplicate];
          const sources = [...new Set([...((previous.data.legacySources as string[]) || []), key])];
          try {
            result.records[duplicate] = createRecord(
              {
                ...previous,
                title:
                  !previous.title || previous.title === `${base.date}의 기록`
                    ? base.title
                    : previous.title,
                data: {
                  ...previous.data,
                  legacySources: sources,
                  ...(item.mood !== undefined
                    ? { mood: mood(item.mood), originalMood: String(item.mood) }
                    : {}),
                },
              },
              previous.id,
              previous.updatedAt,
            );
          } catch {
            problem('일기: 중복본의 잘못된 메타데이터는 제외하고 기존 기록을 보존');
          }
          result.duplicates++;
          continue;
        }
      } else if (key.includes('financial_logs')) {
        if (!foundDate) {
          problem('거래: 유효한 날짜가 없어 건너뜀');
          continue;
        }
        base.type = 'transaction';
        base.title = firstText(item.merchant, item.title, item.description) || '이전 거래';
        base.body = [text(item.rawText), text(item.memo), text(item.notes)]
          .filter(Boolean)
          .join('\n');
        base.data = {
          ...base.data,
          direction: item.type === 'income' || item.direction === 'income' ? 'income' : 'expense',
          amount: Math.abs(finite(item.amount)),
          category: text(item.category, '기타'),
          time: text(item.time),
          paymentMethod: firstText(item.paymentMethod, item.payment_method),
          legacyAmount: finite(item.amount),
        };
      } else if (key.includes('assets_')) {
        base.type = 'asset';
        base.title = firstText(item.name, item.title) || '이전 자산';
        const amount = finite(item.amount);
        const liability = item.type === 'debt' || item.direction === 'liability';
        base.data = {
          ...base.data,
          direction:
            amount < 0 ? (liability ? 'asset' : 'liability') : liability ? 'liability' : 'asset',
          amount: Math.abs(amount),
          category: '이전 자산',
          legacyAmount: amount,
          legacyType: text(item.type),
          legacyColor: text(item.color),
        };
        if (amount < 0)
          info.add(
            '음수 자산/부채는 순자산 합계를 보존하도록 반대 방향의 양수로 변환하고 원래 부호와 종류도 보관했습니다.',
          );
      } else if (key.includes('body_metrics')) {
        if (!foundDate || finite(item.weight ?? item.kg) <= 0) {
          problem('체중: 날짜나 양수 체중이 없어 건너뜀');
          continue;
        }
        base.type = 'weight';
        base.title = '이전 체중 기록';
        base.body = text(item.notes);
        const extra: RecordData = {};
        for (const field of ['muscleMass', 'fatRatio', 'systolicBp', 'diastolicBp'])
          if (typeof item[field] === 'number' && Number.isFinite(item[field]))
            extra[field] = item[field] as number;
        base.data = {
          ...base.data,
          kg: finite(item.weight ?? item.kg),
          measuredAt: text(item.measuredAt),
          ...extra,
        };
      } else if (key.includes('pullup_records')) {
        if (!foundDate) {
          problem('턱걸이: 유효한 날짜가 없어 건너뜀');
          continue;
        }
        base.type = 'workout';
        base.title = '이전 턱걸이';
        base.body = text(item.notes);
        const sets = Array.isArray(item.sets)
          ? item.sets.filter(
              (v): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0,
            )
          : [];
        base.data = {
          ...base.data,
          activity: 'pullups',
          distance: 0,
          duration: 0,
          sets,
          exercise: '',
          load: 0,
          reps: 0,
          legacyTotalReps: finite(item.totalReps),
          legacyMaxReps: finite(item.maxReps),
        };
        if (!sets.length)
          info.add(
            '세트 구성이 없는 턱걸이는 원래 총 횟수를 메타데이터에 보존했습니다. 운동 시간은 생성하지 않았습니다.',
          );
      } else if (key.includes('workout_1rm')) {
        if (!foundDate) {
          problem('근력 운동: 유효한 날짜가 없어 건너뜀');
          continue;
        }
        base.type = 'workout';
        base.title = firstText(item.exercise, item.exercise_name) || '이전 근력 운동';
        base.body = text(item.notes);
        base.data = {
          ...base.data,
          activity: 'strength',
          load: finite(item.weight),
          reps: finite(item.reps),
          exercise: base.title,
          sets: [finite(item.reps)],
          duration: 0,
          distance: 0,
          legacyCalculated1RM: finite(item.calculated1RM ?? item.calculated_1rm),
        };
      } else if (key.includes('encrypted_vault')) {
        const encrypted = item.encrypted;
        if (
          !plainObject(encrypted) ||
          !['ciphertext', 'iv', 'salt'].every((field) => typeof encrypted[field] === 'string')
        ) {
          problem('암호금고: 지원하는 암호화 형식이 아니어서 건너뜀');
          continue;
        }
        base.type = 'vault';
        base.title = '이전 암호금고 항목';
        base.data = {
          encrypted: JSON.stringify({
            ciphertext: encrypted.ciphertext,
            iv: encrypted.iv,
            salt: encrypted.salt,
          }),
          legacy: true,
          legacyFormat: 'aes-gcm-pbkdf2-100000',
          source: 'legacy',
        };
      } else if (key.includes('photos_')) {
        const original = firstText(item.url, item.dataUrl, item.dataURL, item.image);
        const folder = firstText(item.folder, item.category) || '일상/기억';
        base.type = 'photo';
        base.body = [text(item.notes), text(item.tag)].filter(Boolean).join('\n');
        if (!foundDate)
          info.add(
            '날짜가 없는 사진은 가져온 날짜를 사용했습니다. 원본에 유효한 날짜가 있는 사진은 원래 날짜를 유지했습니다.',
          );
        base.data = {
          ...base.data,
          category: photoCategory(folder),
          legacyFolder: folder,
          legacyTag: text(item.tag),
        };
        if (isLegacyRaster(original)) {
          try {
            const image = await preparePhoto(original);
            if (!isLegacyRaster(image)) throw new Error('변환 결과가 지원 이미지가 아님');
            base.data = { ...base.data, image, bytes: imageBytes(image) };
          } catch {
            problem('사진: JPEG·PNG·WebP 변환/압축 실패로 건너뜀 (원본은 이전 저장 공간에 보존)');
            continue;
          }
        } else if (remoteImage(original)) {
          base.data = { ...base.data, image: '', bytes: 0, legacyUrl: original };
          base.body = [base.body, `이전 사진 링크: ${original}`].filter(Boolean).join('\n');
          info.add(
            '원격 사진은 자동 요청하지 않고 링크와 설명으로 보존했습니다. 사진을 저장한 뒤 새 앨범에서 직접 선택해 주세요.',
          );
        } else {
          problem('사진: 지원하지 않는 이미지 형식 또는 주소여서 건너뜀');
          continue;
        }
      } else {
        problem(`${key}: 지원하지 않는 기록 종류`);
        continue;
      }
      if (!foundDate && !['diary', 'photo', 'routine'].includes(base.type))
        info.add('생성 날짜가 없는 메모·자산은 가져온 날짜로 표시하며 기록 내용을 보존했습니다.');
      if (typeof item.updatedAt === 'string' || typeof item.updated_at === 'string')
        base.data.legacyUpdatedAt = text(item.updatedAt, text(item.updated_at));
      if (base.type === 'vault') delete base.data.legacyUpdatedAt;
      try {
        const identity =
          base.type === 'diary'
            ? { date: base.date, body: base.body.normalize('NFC').trim() }
            : item;
        const namespace = base.type === 'diary' ? 'life_os_diary' : key;
        let id = legacyRecordId(namespace, identity, base.type === 'diary' ? 0 : occurrence);
        const payload = JSON.stringify(base);
        if (ids.has(id) && ids.get(id) !== payload) id = `${id}-conflict-${result.records.length}`;
        if (ids.get(id) === payload) {
          result.duplicates++;
          continue;
        }
        const record = createRecord(base, id, timestamp);
        if (base.type === 'diary')
          diaryCopies.set(
            `${base.date}\u0000${base.body.normalize('NFC').trim()}`,
            result.records.length,
          );
        result.records.push(record);
        ids.set(id, payload);
      } catch {
        problem(`${key}: 기록 크기/구조 제한을 초과하여 건너뜀 (원본 보존)`);
      }
    }
  }
  for (const [key, message] of [
    [
      'life_os_categories_v2',
      '사용자 분류 목록 자체는 이전하지 않으며 개별 메모의 원래 분류명을 메타데이터에 보존했습니다.',
    ],
    [
      'life_os_photo_folders_v2',
      '빈 사진 폴더는 이전하지 않으며 개별 사진의 원래 폴더명을 보존했습니다.',
    ],
    [
      'life_os_monthly_budget_v2',
      '이전 월 예산 설정은 현재 예산 기능이 없어 이전하지 않았습니다. 원본 설정은 보존되었습니다.',
    ],
    ['life_os_alarm_config', '이전 강제 알람 설정은 이전하지 않았습니다.'],
    [
      'life_os_healthkit_data',
      '이전 HealthKit 요약은 실제 측정 이력을 확인할 수 없어 건강 기록으로 가져오지 않았습니다.',
    ],
    [
      'life_os_healthkit_data_v2',
      '이전 HealthKit 요약은 실제 측정 이력을 확인할 수 없어 건강 기록으로 가져오지 않았습니다.',
    ],
  ])
    if (storage.getItem(key) !== null) info.add(message);
  if (result.records.some((record) => record.type === 'vault'))
    info.add(
      '이전 금고는 암호문만 보존했습니다. 사이트/아이디 등 평문 메타데이터는 자동 이전하지 않았으며, 이전 앱의 CSV 내보내기와 새 금고 가져오기가 필요합니다.',
    );
  if (result.duplicates)
    info.add(
      `날짜와 본문이 같은 일기의 중복 저장본 등 ${result.duplicates}개를 한 기록으로 합쳤습니다. 본문이 다른 같은 날짜 일기는 각각 유지했습니다.`,
    );
  result.warnings = [
    ...info,
    ...[...problems].map(([message, count]) => `${message} · ${count}건`),
  ];
  return result;
}
