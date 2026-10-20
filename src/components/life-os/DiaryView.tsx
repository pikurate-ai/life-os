'use client';

import { useMemo, useRef, useState } from 'react';
import {
  BookHeart,
  CalendarDays,
  Check,
  Heart,
  Import,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { useLife } from '@/lib/life-os/store';
import { localDate, numberData, type LifeRecord, type NewRecord } from '@/lib/life-os/types';
import { importDiary, uniqueDiary, validDate } from '@/lib/life-os/imports';
import { preserveRecordData } from '@/lib/life-os/editing';
import { Badge, Button, EmptyState, Field, Modal, ModalCloseButton, SectionHeader } from './ui';
import './health-diary-vault.css';

const moods = [
  { value: 1, icon: '😔', label: '힘든 하루' },
  { value: 2, icon: '😕', label: '조금 아쉬워요' },
  { value: 3, icon: '🙂', label: '평온해요' },
  { value: 4, icon: '😊', label: '좋았어요' },
  { value: 5, icon: '🤗', label: '참 행복해요' },
];
type DiaryDraft = {
  id?: string;
  date: string;
  title: string;
  body: string;
  mood: number;
  gratitude: string;
};
const blank = (date = localDate()): DiaryDraft => ({
  date,
  title: '',
  body: '',
  mood: 3,
  gratitude: '',
});
function displayDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}
export function DiaryView({ initialDate }: { initialDate?: string } = {}) {
  const { records, addRecord, updateRecord, deleteRecord, notify } = useLife();
  const recordingDate = initialDate && validDate(initialDate) ? initialDate : localDate();
  const recordingToday = recordingDate === localDate();
  const [draft, setDraft] = useState<DiaryDraft | null>(null);
  const initialDraft = useRef<DiaryDraft | null>(null);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<LifeRecord | null>(null);
  const [remove, setRemove] = useState<LifeRecord | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importDate, setImportDate] = useState(recordingDate);
  const [imported, setImported] = useState<NewRecord[]>([]);
  const [importFiles, setImportFiles] = useState('');
  const [importError, setImportError] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const entries = useMemo(
    () =>
      records
        .filter((record) => record.type === 'diary')
        .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt)),
    [records],
  );
  const filtered = entries.filter((record) =>
    `${record.title} ${record.body} ${record.data.gratitude || ''}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const selectedEntry = entries.find((record) => record.date === recordingDate);
  const uniqueImports = useMemo(() => uniqueDiary(imported, records), [imported, records]);
  const selectedMonth = recordingDate.slice(0, 7);
  const monthLabel = recordingToday
    ? '이번 달'
    : `${recordingDate.slice(0, 4)}년 ${Number(recordingDate.slice(5, 7))}월`;
  const monthCount = new Set(
    entries.filter((record) => record.date.startsWith(selectedMonth)).map((record) => record.date),
  ).size;
  const dirtyDraft = Boolean(
    draft && initialDraft.current && JSON.stringify(draft) !== JSON.stringify(initialDraft.current),
  );
  const openNewDraft = () => {
    const value = blank(recordingDate);
    initialDraft.current = value;
    setFormError('');
    setDraft(value);
  };
  const edit = (record: LifeRecord) => {
    setFormError('');
    const value = {
      id: record.id,
      date: record.date,
      title: record.title,
      body: record.body,
      mood: numberData(record, 'mood') || 3,
      gratitude: String(record.data.gratitude ?? ''),
    };
    initialDraft.current = value;
    setDraft(value);
    setDetail(null);
  };
  const set = (key: keyof DiaryDraft, value: string | number) =>
    setDraft((current) => (current ? { ...current, [key]: value } : null));
  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    if (!validDate(draft.date)) {
      setFormError('기록할 날짜를 선택해 주세요.');
      return;
    }
    if (!draft.body.trim()) {
      setFormError('오늘의 이야기를 한 줄 이상 남겨 주세요.');
      return;
    }
    const value: NewRecord = {
      type: 'diary',
      date: draft.date,
      title: draft.title.trim() || '오늘의 기록',
      body: draft.body.trim(),
      data: preserveRecordData(
        records.filter((record) => record.type === 'diary'),
        draft.id,
        { mood: draft.mood, gratitude: draft.gratitude.trim() },
      ),
    };
    try {
      if (draft.id) updateRecord(draft.id, value);
      else addRecord(value);
      notify('하루의 이야기를 기록했어요.');
      setSearch('');
      initialDraft.current = null;
      setDraft(null);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : '일기를 저장하지 못했습니다. 저장 공간을 확인해 주세요.',
      );
    }
  }
  async function readFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    setImported([]);
    setImportError('');
    setBusy(true);
    try {
      if (!files.length) return;
      if (files.some((file) => file.size > 5 * 1024 * 1024))
        throw new Error('파일당 5 MB 이하의 문서를 선택해 주세요.');
      const all: NewRecord[] = [];
      for (const file of files) {
        if (!/\.(txt|md|json)$/i.test(file.name))
          throw new Error(
            'TXT, Markdown, JSON 파일을 선택해 주세요. Google Docs에서는 일반 텍스트로 다운로드할 수 있습니다.',
          );
        all.push(...importDiary(await file.text(), file.name, importDate));
      }
      if (all.length > 500) throw new Error('한 번에 최대 500편까지 가져올 수 있습니다.');
      setImported(all);
      setImportFiles(files.map((file) => file.name).join(', '));
    } catch (error) {
      setImportError(error instanceof Error ? error.message : '파일을 읽지 못했습니다.');
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  }
  function commitImport() {
    let saved = 0;
    try {
      for (const record of uniqueImports) {
        addRecord(record);
        saved++;
      }
      setImported([]);
      setImportOpen(false);
      notify(`${saved}편의 일기를 가져왔어요.`);
    } catch (error) {
      setImportError(
        `${saved}편 저장 후 중단되었습니다. 저장된 일기는 중복으로 제외됩니다. ${error instanceof Error ? error.message : '저장 공간을 확인해 주세요.'}`,
      );
    }
  }
  function deleteEntry() {
    if (!remove) return;
    try {
      deleteRecord(remove.id);
      setRemove(null);
      notify('일기를 삭제했어요.');
    } catch (error) {
      notify(error instanceof Error ? error.message : '일기를 삭제하지 못했습니다.');
    }
  }
  return (
    <div className="page-stack hdv-diary">
      <SectionHeader
        eyebrow="나를 이해하는 작은 습관"
        title={recordingToday ? '오늘의 마음을 남겨요' : '그날의 마음을 남겨요'}
        description="완벽한 하루가 아니어도 괜찮아요. 기록할 이야기는 늘 있으니까요."
        action={
          <div className="hdv-header-actions">
            <Button
              variant="secondary"
              onClick={() => {
                setImported([]);
                setImportError('');
                setImportOpen(true);
              }}
            >
              <Import size={16} />
              일기 가져오기
            </Button>
            <Button onClick={openNewDraft}>
              <Pencil size={16} />새 일기 쓰기
            </Button>
          </div>
        }
      />
      <section className="hdv-diary-intro card card-pad">
        <div className="hdv-grow">
          <Badge tone="green">
            {displayDate(recordingDate)} · {recordingToday ? '오늘' : '선택한 날짜'}
          </Badge>
          <h3>{recordingToday ? '오늘' : '그날'}, 마음에 남은 순간은 무엇인가요?</h3>
          <p className="muted">
            작은 성취 하나, 고마웠던 사람 한 명.
            <br />
            지나가기 쉬운 순간을 오래 기억해 보세요.
          </p>
          <Button
            variant="secondary"
            onClick={() => (selectedEntry ? edit(selectedEntry) : openNewDraft())}
          >
            {recordingToday ? '오늘' : '선택한 날짜'} 일기 {selectedEntry ? '이어쓰기' : '쓰기'}{' '}
            <Pencil size={15} />
          </Button>
        </div>
        <div className="hdv-diary-count">
          <BookHeart size={30} />
          <strong>
            {monthCount}
            <span>일</span>
          </strong>
          <span className="text-small muted">{monthLabel} 나에게 보낸 편지</span>
        </div>
      </section>
      <section className="card card-pad">
        <div className="hdv-list-heading">
          <div>
            <h3>나의 일기장</h3>
            <p className="muted text-small">지나온 {entries.length}개의 이야기</p>
          </div>
          <label className="hdv-search">
            <Search size={17} />
            <span className="hdv-sr-only">일기 검색</span>
            <input
              type="search"
              placeholder="기억하고 싶은 이야기 검색"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>
        {!filtered.length ? (
          <EmptyState
            icon={<BookHeart size={28} />}
            title={search ? '찾는 이야기가 없어요' : '첫 번째 이야기를 기다리고 있어요'}
            description={
              search ? '다른 단어로 검색해 보세요.' : '그날 느낀 마음을 한 줄부터 시작해 보세요.'
            }
            action={!search && <Button onClick={openNewDraft}>첫 일기 쓰기</Button>}
          />
        ) : (
          <div className="hdv-diary-grid">
            {filtered.map((record) => {
              const mood =
                moods.find((value) => value.value === numberData(record, 'mood')) || moods[2];
              return (
                <article className="hdv-diary-entry" key={record.id}>
                  <div className="hdv-inline hdv-between">
                    <span className="text-small muted">{displayDate(record.date)}</span>
                    <span className="hdv-mood-tag" title={mood.label}>
                      {mood.icon}
                      <span className="hdv-sr-only">{mood.label}</span>
                    </span>
                  </div>
                  <button className="hdv-entry-open" onClick={() => setDetail(record)}>
                    <h4>{record.title}</h4>
                    <p>{record.body}</p>
                  </button>
                  {record.data.gratitude && (
                    <div className="hdv-gratitude">
                      <Heart size={13} />
                      <span>{String(record.data.gratitude)}</span>
                    </div>
                  )}
                  <div className="hdv-entry-footer">
                    <span className="text-small muted">
                      {record.body.length.toLocaleString()}자
                    </span>
                    <div className="hdv-row-actions">
                      <button
                        className="icon-button"
                        aria-label={`${record.title} 수정`}
                        onClick={() => edit(record)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`${record.title} 삭제`}
                        onClick={() => setRemove(record)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      {draft && (
        <Modal
          title={draft.id ? '이야기 이어쓰기' : '새 일기 쓰기'}
          onClose={() => {
            initialDraft.current = null;
            setDraft(null);
          }}
          dirty={dirtyDraft}
          wide
        >
          <form className="page-stack" onSubmit={save}>
            <Field
              label="기록 날짜"
              hint={`기본 날짜는 ${displayDate(recordingDate)}입니다. 다른 날짜로 바꿀 수도 있어요.`}
            >
              <input
                required
                className="input"
                type="date"
                value={draft.date}
                onChange={(event) => set('date', event.target.value)}
              />
            </Field>
            <fieldset className="hdv-fieldset">
              <legend>{draft.date === localDate() ? '오늘의 마음' : '그날의 마음'}</legend>
              <div className="hdv-mood-picker">
                {moods.map((mood) => (
                  <button
                    type="button"
                    key={mood.value}
                    aria-pressed={draft.mood === mood.value}
                    className={draft.mood === mood.value ? 'hdv-mood active' : 'hdv-mood'}
                    onClick={() => set('mood', mood.value)}
                  >
                    <span>{mood.icon}</span>
                    <small>{mood.label}</small>
                  </button>
                ))}
              </div>
            </fieldset>
            <Field label="제목 (선택)">
              <input
                className="input"
                placeholder="이날을 한 문장으로 표현한다면"
                maxLength={200}
                value={draft.title}
                onChange={(event) => set('title', event.target.value)}
              />
            </Field>
            <Field label="이날의 이야기" hint="한 줄만 적어도 좋아요.">
              <textarea
                required
                className="textarea hdv-diary-editor"
                rows={6}
                maxLength={120000}
                placeholder="이날 어떤 일이 있었나요? 잘한 일, 아쉬웠던 일, 떠오른 생각을 편하게 적어 보세요."
                value={draft.body}
                onChange={(event) => set('body', event.target.value)}
              />
            </Field>
            <Field
              label={draft.date === localDate() ? '오늘 감사한 일 (선택)' : '그날 감사한 일 (선택)'}
            >
              <input
                className="input"
                maxLength={2000}
                placeholder="작은 것 하나만 떠올려도 좋아요."
                value={draft.gratitude}
                onChange={(event) => set('gratitude', event.target.value)}
              />
            </Field>
            {formError && (
              <p role="alert" className="hdv-error">
                {formError}
              </p>
            )}
            <div className="form-actions">
              <ModalCloseButton>취소</ModalCloseButton>
              <Button type="submit">
                <Check size={16} />
                일기 저장
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {detail && (
        <Modal title={detail.title} onClose={() => setDetail(null)} wide>
          <div className="page-stack">
            <p className="muted">
              {displayDate(detail.date)} ·{' '}
              {moods.find((mood) => mood.value === numberData(detail, 'mood'))?.label || '평온해요'}
            </p>
            <div className="hdv-full-text">{detail.body}</div>
            {detail.data.gratitude && (
              <div className="hdv-info">
                <Heart size={17} />
                <div>
                  감사한 일<br />
                  {String(detail.data.gratitude)}
                </div>
              </div>
            )}
            <div className="form-actions">
              <Button variant="secondary" onClick={() => setDetail(null)}>
                닫기
              </Button>
              <Button onClick={() => edit(detail)}>수정하기</Button>
            </div>
          </div>
        </Modal>
      )}
      {remove && (
        <Modal title="일기를 삭제할까요?" onClose={() => setRemove(null)}>
          <p>
            {displayDate(remove.date)}의 ‘{remove.title}’ 이야기가 삭제됩니다.
          </p>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setRemove(null)}>
              취소
            </Button>
            <Button variant="danger" onClick={deleteEntry}>
              삭제
            </Button>
          </div>
        </Modal>
      )}
      {importOpen && (
        <Modal
          title="소중한 일기 모아오기"
          onClose={() => {
            if (!busy) {
              setImportOpen(false);
              setImported([]);
            }
          }}
          dirty={!busy && uniqueImports.length > 0}
          wide
        >
          <div className="page-stack">
            <p className="muted">
              Google Docs의 <strong>파일 → 다운로드 → 일반 텍스트 (.txt)</strong>로 저장한 문서를
              가져오세요. TXT, Markdown, JSON을 지원합니다. 계정 자동 연결은 제공하지 않습니다.
            </p>
            <div className="hdv-info">
              <BookHeart size={19} />
              <span>
                일기마다 <strong>2026-10-16</strong> 같은 날짜 제목이 있으면 날짜별로 나눕니다.
                날짜가 없는 문서는 아래 날짜의 일기 한 편으로 가져옵니다. 같은 날짜와 내용은
                중복으로 저장하지 않습니다.
              </span>
            </div>
            <Field label="날짜 없는 문서의 기록 날짜">
              <input
                type="date"
                required
                className="input"
                value={importDate}
                disabled={busy}
                onChange={(event) => {
                  setImportDate(event.target.value);
                  setImported([]);
                }}
              />
            </Field>
            <label className="hdv-upload">
              <Upload size={22} />
              <strong>{busy ? '문서를 읽고 있어요…' : '일기 파일 선택'}</strong>
              <span className="muted text-small">
                TXT · MD · JSON / 파일당 최대 5 MB / 한 번에 500편
              </span>
              <input
                type="file"
                accept=".txt,.md,.json,text/plain,text/markdown,application/json"
                multiple
                disabled={busy || !importDate}
                onChange={readFiles}
              />
            </label>
            {importError && (
              <p className="hdv-error" role="alert">
                {importError}
              </p>
            )}
            {imported.length > 0 && (
              <>
                <p className="text-small muted hdv-break">{importFiles}</p>
                <div className="hdv-inline">
                  <Badge tone="green">새 일기 {uniqueImports.length}편</Badge>
                  <Badge>중복 {imported.length - uniqueImports.length}편 제외</Badge>
                </div>
                {uniqueImports.length === 0 && (
                  <p className="muted text-small" role="status">
                    모두 이미 일기장에 있는 기록이에요. 같은 날짜와 내용은 다시 추가하지 않습니다.
                  </p>
                )}
                <div className="hdv-import-preview">
                  {uniqueImports.slice(0, 20).map((record, index) => (
                    <div key={`${record.date}-${index}`}>
                      <span className="text-small muted">{record.date}</span>
                      <strong>{record.title}</strong>
                      <p className="muted text-small">{record.body.slice(0, 100)}</p>
                    </div>
                  ))}
                  {uniqueImports.length > 20 && (
                    <p className="muted">외 {uniqueImports.length - 20}편</p>
                  )}
                </div>
              </>
            )}
            <p className="text-small muted">
              JSON 형식: [{'{ "date": "2026-10-16", "title": "제목", "body": "내용", "mood": 3 }'}]
            </p>
            <div className="form-actions">
              <ModalCloseButton disabled={busy}>닫기</ModalCloseButton>
              <Button disabled={busy || !uniqueImports.length} onClick={commitImport}>
                <Import size={16} />
                {uniqueImports.length}편 가져오기
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
