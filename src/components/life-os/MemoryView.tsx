'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Copy, Eye, EyeOff, Search, Plus, Pin, Pencil, StickyNote } from 'lucide-react';
import { useLife } from '@/lib/life-os/store';
import { localDate, type LifeRecord } from '@/lib/life-os/types';
import { Badge, Button, EmptyState, Field, Modal, SectionHeader } from './ui';
import { attempt, DeleteControl, shortDate } from './domain-utils';
import styles from './domain.module.css';

const categories = { daily: '일상', family: '가족', work: '일', study: '배움' };
type Category = keyof typeof categories;
type Draft = {
  title: string;
  body: string;
  category: Category;
  pinned: boolean;
  sensitive: boolean;
};
const emptyDraft = (): Draft => ({
  title: '',
  body: '',
  category: 'daily',
  pinned: false,
  sensitive: false,
});
const isSensitive = (record: LifeRecord) =>
  Boolean(record.data.sensitive || record.data.legacyMasked);

export function MemoryView() {
  const { records, addRecord, updateRecord, deleteRecord, notify } = useLife();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState<LifeRecord | null | undefined>(undefined);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [revealed, setRevealed] = useState<string[]>([]);
  useEffect(() => {
    const hide = () => setRevealed([]);
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);
  const memories = useMemo(() => records.filter((record) => record.type === 'memory'), [records]);
  const filtered = useMemo(
    () =>
      memories
        .filter(
          (record) =>
            (filter === 'all' ||
              (filter === 'pinned' ? record.data.pinned : record.data.category === filter)) &&
            `${record.title} ${isSensitive(record) ? '' : record.body}`
              .toLowerCase()
              .includes(search.toLowerCase()),
        )
        .sort(
          (a, b) =>
            Number(Boolean(b.data.pinned)) - Number(Boolean(a.data.pinned)) ||
            b.updatedAt.localeCompare(a.updatedAt),
        ),
    [memories, filter, search],
  );
  const openEditor = (record: LifeRecord | null) => {
    setEditing(record);
    setError('');
    setDraft(
      record
        ? {
            title: record.title,
            body: record.body,
            category:
              typeof record.data.category === 'string' && record.data.category in categories
                ? (record.data.category as Category)
                : 'daily',
            pinned: Boolean(record.data.pinned),
            sensitive: isSensitive(record),
          }
        : emptyDraft(),
    );
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim() || !draft.body.trim()) {
      setError('제목과 기억할 내용을 입력해 주세요.');
      return;
    }
    const value = {
      type: 'memory' as const,
      title: draft.title.trim(),
      body: draft.body.trim(),
      date: editing?.date || localDate(),
      data: {
        ...editing?.data,
        category: draft.category,
        pinned: draft.pinned,
        sensitive: draft.sensitive,
        legacyMasked: draft.sensitive ? Boolean(editing?.data.legacyMasked) : false,
      },
    };
    if (
      !attempt(() => {
        if (editing) updateRecord(editing.id, value);
        else addRecord(value);
      }, setError)
    )
      return;
    setRevealed([]);
    setEditing(undefined);
    notify(editing ? '메모를 수정했어요.' : '새로운 기억을 담았어요.');
  };
  const copy = async (record: LifeRecord) => {
    try {
      await navigator.clipboard.writeText(record.body);
      setCopied(record.id);
      notify('기억의 내용을 복사했어요.');
      window.setTimeout(() => setCopied((current) => (current === record.id ? '' : current)), 2000);
    } catch {
      notify('클립보드에 접근할 수 없어요. 메모를 열어 내용을 직접 복사해 주세요.');
    }
  };
  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="A PLACE FOR EVERYTHING"
        title="기억과 메모"
        description="자주 찾는 정보부터 문득 떠오른 생각까지. 머릿속 여백을 만들어 보세요."
        action={
          <Button onClick={() => openEditor(null)}>
            <Plus size={16} />새 메모
          </Button>
        }
      />
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          {[['all', '전체'], ['pinned', '고정한 메모'], ...Object.entries(categories)].map(
            ([key, label]) => (
              <button
                key={key}
                className={`${styles.filter} ${filter === key ? styles.selected : ''}`}
                onClick={() => setFilter(key)}
              >
                {key === 'pinned' && <Pin size={12} />}
                {label}
                <span className={styles.count}>
                  {key === 'all'
                    ? memories.length
                    : memories.filter((record) =>
                        key === 'pinned' ? record.data.pinned : record.data.category === key,
                      ).length}
                </span>
              </button>
            ),
          )}
        </div>
        <div className={styles.search}>
          <Search />
          <input
            className="input"
            aria-label="메모 검색"
            placeholder="제목이나 내용 검색"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>
      {filtered.length ? (
        <div className={styles.grid}>
          {filtered.map((record) => (
            <article
              key={record.id}
              className={`${styles.note} ${record.data.pinned ? styles.notePinned : ''}`}
            >
              <div className={styles.noteTop}>
                <Badge>{categories[record.data.category as Category] || '일상'}</Badge>
                <div className={styles.actions}>
                  <button
                    className={`${styles.icon} ${record.data.pinned ? styles.pin : ''}`}
                    aria-label={
                      record.data.pinned ? `${record.title} 고정 해제` : `${record.title} 상단 고정`
                    }
                    aria-pressed={Boolean(record.data.pinned)}
                    onClick={() =>
                      attempt(
                        () =>
                          updateRecord(record.id, {
                            data: { ...record.data, pinned: !record.data.pinned },
                          }),
                        notify,
                      )
                    }
                  >
                    <Pin />
                  </button>
                  <button
                    className={styles.icon}
                    aria-label={`${record.title} 편집`}
                    onClick={() => openEditor(record)}
                  >
                    <Pencil />
                  </button>
                </div>
              </div>
              <h3 className={styles.noteTitle}>{record.title}</h3>
              <div className={styles.memoryContent}>
                {isSensitive(record) && !revealed.includes(record.id) ? (
                  <p className={styles.maskedMemory}>
                    <EyeOff size={17} />
                    민감한 내용은 가려져 있어요.
                  </p>
                ) : (
                  <p className={styles.noteBody} style={{ marginTop: 12 }}>
                    {record.body}
                  </p>
                )}
                {isSensitive(record) && (
                  <button
                    className={styles.memoryReveal}
                    aria-pressed={revealed.includes(record.id)}
                    aria-label={`${record.title} ${revealed.includes(record.id) ? '다시 가리기' : '내용 보기'}`}
                    onClick={() =>
                      setRevealed((current) =>
                        current.includes(record.id)
                          ? current.filter((id) => id !== record.id)
                          : [...current, record.id],
                      )
                    }
                  >
                    {revealed.includes(record.id) ? <EyeOff size={13} /> : <Eye size={13} />}
                    {revealed.includes(record.id) ? '다시 가리기' : '내용 보기'}
                  </button>
                )}
              </div>
              <div className={styles.noteFooter}>
                <time dateTime={record.date}>{shortDate(record.date)}</time>
                <button
                  className={styles.quietButton}
                  onClick={() => copy(record)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <Copy size={12} />
                  {copied === record.id ? '복사했어요' : '내용 복사'}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<StickyNote size={30} />}
          title={
            search || filter !== 'all'
              ? '찾고 있는 메모가 없어요'
              : '기억의 첫 페이지를 채워 볼까요?'
          }
          description={
            search
              ? '다른 검색어나 카테고리로 찾아보세요.'
              : '집중하고 싶은 생각, 가족의 취향, 자주 찾는 정보를 담아 두세요.'
          }
          action={!search && <Button onClick={() => openEditor(null)}>메모 작성하기</Button>}
        />
      )}
      {editing !== undefined && (
        <Modal
          title={editing ? '기억 다듬기' : '새로운 기억'}
          onClose={() => setEditing(undefined)}
        >
          <form onSubmit={submit} className={styles.formStack}>
            <Field label="제목">
              <input
                className="input"
                autoFocus
                value={draft.title}
                maxLength={120}
                required
                placeholder="어떤 기억을 담아 둘까요?"
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              />
            </Field>
            <Field label="기억할 내용">
              <textarea
                className="textarea"
                rows={7}
                maxLength={20000}
                required
                value={draft.body}
                placeholder="자주 꺼내 볼 정보를 자유롭게 적어 주세요."
                onChange={(event) => setDraft({ ...draft, body: event.target.value })}
              />
            </Field>
            <Field label="카테고리">
              <select
                className="select"
                value={draft.category}
                onChange={(event) =>
                  setDraft({ ...draft, category: event.target.value as Category })
                }
              >
                {Object.entries(categories).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={draft.pinned}
                onChange={(event) => setDraft({ ...draft, pinned: event.target.checked })}
              />
              자주 찾는 메모로 상단에 고정
            </label>
            <div>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={draft.sensitive}
                  onChange={(event) => setDraft({ ...draft, sensitive: event.target.checked })}
                />
                민감한 정보로 화면에서 가리기
              </label>
              <p className={styles.memoryPrivacyNote}>
                화면에서만 가립니다. 비밀번호는 암호금고에 보관하세요.
              </p>
            </div>
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <Button variant="secondary" onClick={() => setEditing(undefined)}>
                취소
              </Button>
              <Button type="submit">기억 저장하기</Button>
            </div>
          </form>
          {editing && (
            <DeleteControl
              onDelete={() => {
                deleteRecord(editing.id);
                setEditing(undefined);
                notify('메모를 삭제했어요.');
              }}
            />
          )}
        </Modal>
      )}
    </div>
  );
}
