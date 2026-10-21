import { localDate, type LifeRecord, type NewRecord } from './types';

export function parseCSV(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, '');
  const first = source.split(/\r?\n/, 1)[0];
  const delimiter = [',', ';', '\t'].sort(
    (a, b) => first.split(b).length - first.split(a).length,
  )[0];
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"') {
      if (quoted && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (quoted || !cell) quoted = !quoted;
      else cell += char;
    } else if (char === delimiter && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && source[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = '';
    } else cell += char;
  }
  if (quoted) throw new Error('닫히지 않은 따옴표가 있습니다. CSV 파일을 다시 확인해 주세요.');
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

export interface Credential {
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
}
export function importCredentials(text: string): Credential[] {
  const rows = parseCSV(text);
  if (rows.length < 2) throw new Error('헤더와 데이터가 있는 CSV 파일이 필요합니다.');
  const header = rows[0].map((value) => value.trim().toLowerCase().replace(/\s+/g, '_'));
  const column = (names: string[]) =>
    names.map((name) => header.indexOf(name)).find((index) => index >= 0) ?? -1;
  const title = column(['name', 'title', '이름', '제목']),
    username = column(['username', 'user_name', 'login', '사용자_이름', '아이디']);
  const password = column(['password', '비밀번호', '암호']),
    url = column(['url', 'website', '사이트']),
    notes = column(['extra', 'notes', 'note', '메모']);
  if (password < 0 || (title < 0 && url < 0))
    throw new Error(
      'name 또는 url 열과 password 열이 필요합니다. Chrome·LastPass 내보내기 형식을 지원합니다.',
    );
  const get = (row: string[], index: number) => (index < 0 ? '' : (row[index] ?? '').trim());
  const entries = rows
    .slice(1)
    .map((row) => ({
      title: get(row, title) || get(row, url) || '제목 없음',
      username: get(row, username),
      password: password < 0 ? '' : (row[password] ?? ''),
      url: get(row, url),
      notes: get(row, notes),
    }))
    .filter((item) => item.password || item.username);
  if (!entries.length) throw new Error('가져올 로그인 정보가 없습니다.');
  if (entries.length > 1000) throw new Error('한 번에 최대 1,000개까지 가져올 수 있습니다.');
  if (entries.some((entry) => new TextEncoder().encode(JSON.stringify(entry)).byteLength > 400_000))
    throw new Error('로그인 항목 하나의 내용이 너무 큽니다. 항목당 400 KB 이하로 줄여 주세요.');
  return entries;
}

export function validDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T12:00:00`)) &&
    localDate(new Date(`${value}T12:00:00`)) === value
  );
}
export function diaryFingerprint(value: Pick<NewRecord, 'date' | 'body'>): string {
  return `${value.date}|${value.body.trim().replace(/\s+/g, ' ')}`;
}
export function importDiary(text: string, filename: string, fallbackDate: string): NewRecord[] {
  const make = (date: string, title: string, body: string, mood = 3, gratitude = ''): NewRecord => {
    if (!validDate(date)) throw new Error(`유효하지 않은 날짜입니다: ${date}`);
    if (!body.trim()) throw new Error('내용이 비어 있는 일기가 있습니다.');
    if (body.length > 120_000 || title.length > 300)
      throw new Error(
        '일기 제목은 300자, 내용은 120,000자까지 가져올 수 있습니다. 긴 문서를 나눠 주세요.',
      );
    return {
      type: 'diary',
      date,
      title: title.trim() || '오늘의 기록',
      body: body.trim(),
      data: { mood: Math.min(5, Math.max(1, Number(mood) || 3)), gratitude },
    };
  };
  let entries: NewRecord[];
  if (/\.json$/i.test(filename)) {
    const parsed: unknown = JSON.parse(text);
    const list = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && 'records' in parsed
        ? (parsed as { records: unknown }).records
        : [parsed];
    if (!Array.isArray(list)) throw new Error('JSON 배열 또는 records 배열을 사용해 주세요.');
    entries = list
      .filter(
        (value) =>
          value && typeof value === 'object' && (!('type' in value) || value.type === 'diary'),
      )
      .map((value) => {
        const item = value as Record<string, unknown>;
        const data =
          item.data && typeof item.data === 'object' ? (item.data as Record<string, unknown>) : {};
        return make(
          String(item.date || fallbackDate).slice(0, 10),
          String(item.title || ''),
          String(item.body ?? item.content ?? item.text ?? ''),
          Number(item.mood ?? data.mood ?? 3),
          String(item.gratitude ?? data.gratitude ?? ''),
        );
      });
  } else {
    // Date headings split exported Google Docs text or Markdown into daily entries.
    const heading =
      /^(?:#{1,6}[ \t]*)?(\d{4})[-./년][ \t]*(\d{1,2})[-./월][ \t]*(\d{1,2})(?:일)?(?:[ \t]*[-:|]?[ \t]*([^\r\n]*))?\r?$/gm;
    const matches = [...text.matchAll(heading)];
    entries = matches.length
      ? matches.map((match, index) => {
          const date = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
          return make(
            date,
            match[4] || '가져온 일기',
            text.slice(
              (match.index ?? 0) + match[0].length,
              matches[index + 1]?.index ?? text.length,
            ),
          );
        })
      : [make(fallbackDate, filename.replace(/\.(txt|md)$/i, ''), text)];
    const preamble = matches.length ? text.slice(0, matches[0].index).trim() : '';
    if (preamble)
      entries.unshift(
        make(fallbackDate, `${filename.replace(/\.(txt|md)$/i, '')} · 날짜 앞의 기록`, preamble),
      );
  }
  if (!entries.length) throw new Error('가져올 일기가 없습니다.');
  if (entries.length > 500) throw new Error('한 번에 최대 500편까지 가져올 수 있습니다.');
  return entries;
}
export function uniqueDiary(incoming: NewRecord[], existing: LifeRecord[]): NewRecord[] {
  const known = new Set(existing.filter((record) => record.type === 'diary').map(diaryFingerprint));
  return incoming.filter((record) => {
    const key = diaryFingerprint(record);
    if (known.has(key)) return false;
    known.add(key);
    return true;
  });
}
