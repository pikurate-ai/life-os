'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { ArrowUpRight, Bookmark, Check, Globe, Pencil, Plus, Search, Star } from 'lucide-react';
import { useLife } from '@/lib/life-os/store';
import { preserveRecordData } from '@/lib/life-os/editing';
import { localDate, type LifeRecord } from '@/lib/life-os/types';
import { Badge, Button, EmptyState, Field, Modal, SectionHeader } from './ui';
import { attempt, DeleteControl, shortDate, validUrl } from './domain-utils';
import styles from './domain.module.css';

type Draft = {
  title: string;
  url: string;
  body: string;
  tags: string;
  read: boolean;
  favorite: boolean;
};
const blank = (): Draft => ({
  title: '',
  url: '',
  body: '',
  tags: '',
  read: false,
  favorite: false,
});
function domain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '링크를 확인해 주세요';
  }
}

export function LibraryView() {
  const { records, addRecord, updateRecord, deleteRecord, notify } = useLife();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<LifeRecord | null | undefined>(undefined);
  const [draft, setDraft] = useState<Draft>(blank);
  const [error, setError] = useState('');
  const bookmarks = useMemo(
    () => records.filter((record) => record.type === 'bookmark'),
    [records],
  );
  const filtered = useMemo(
    () =>
      bookmarks
        .filter(
          (record) =>
            (filter === 'all' ||
              (filter === 'unread'
                ? !record.data.read
                : filter === 'read'
                  ? record.data.read
                  : record.data.favorite)) &&
            `${record.title} ${record.body} ${record.data.url} ${Array.isArray(record.data.tags) ? record.data.tags.join(' ') : ''}`
              .toLowerCase()
              .includes(search.toLowerCase()),
        )
        .sort(
          (a, b) =>
            Number(Boolean(b.data.favorite)) - Number(Boolean(a.data.favorite)) ||
            b.updatedAt.localeCompare(a.updatedAt),
        ),
    [bookmarks, filter, search],
  );
  const openEditor = (record: LifeRecord | null) => {
    setEditing(record);
    setError('');
    setDraft(
      record
        ? {
            title: record.title,
            url: String(record.data.url || ''),
            body: record.body,
            tags: Array.isArray(record.data.tags) ? record.data.tags.join(', ') : '',
            read: Boolean(record.data.read),
            favorite: Boolean(record.data.favorite),
          }
        : blank(),
    );
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const url = validUrl(draft.url.trim());
    if (!url) {
      setError('http:// 또는 https://로 시작하는 올바른 웹 주소를 입력해 주세요.');
      return;
    }
    if (!draft.title.trim()) {
      setError('나중에 찾을 수 있도록 제목을 적어 주세요.');
      return;
    }
    const tags = Array.from(
      new Set(
        draft.tags
          .split(/[,，]/)
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    );
    if (tags.length > 10 || tags.some((tag) => tag.length > 30)) {
      setError('태그는 최대 10개, 각 30자까지 입력할 수 있어요.');
      return;
    }
    const value = {
      type: 'bookmark' as const,
      title: draft.title.trim(),
      body: draft.body.trim(),
      date: editing?.date || localDate(),
      data: preserveRecordData(
        records.filter((record) => record.type === 'bookmark'),
        editing?.id,
        { url, tags, read: draft.read, favorite: draft.favorite },
      ),
    };
    if (
      !attempt(() => {
        if (editing) updateRecord(editing.id, value);
        else addRecord(value);
      }, setError)
    )
      return;
    setEditing(undefined);
    notify(editing ? '읽을거리를 수정했어요.' : '다음에 읽을 자료를 담았어요.');
  };
  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="A LITTLE CURIOSITY, EVERY DAY"
        title="나중에 읽기"
        description="지금은 시간이 없어도, 좋은 발견을 놓치지 않도록. 나만의 읽을거리를 모아 두세요."
        action={
          <Button onClick={() => openEditor(null)}>
            <Plus size={16} />
            링크 저장
          </Button>
        }
      />
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          {[
            ['all', '전체', bookmarks.length],
            ['unread', '읽을 자료', bookmarks.filter((record) => !record.data.read).length],
            ['read', '읽은 자료', bookmarks.filter((record) => record.data.read).length],
            ['favorite', '즐겨찾기', bookmarks.filter((record) => record.data.favorite).length],
          ].map(([key, label, count]) => (
            <button
              key={key}
              className={`${styles.filter} ${filter === key ? styles.selected : ''}`}
              onClick={() => setFilter(String(key))}
            >
              {key === 'favorite' && <Star size={12} />}
              {label}
              <span className={styles.count}>{count}</span>
            </button>
          ))}
        </div>
        <div className={styles.search}>
          <Search />
          <input
            className="input"
            placeholder="제목, 태그, 주소 검색"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="저장한 링크 검색"
          />
        </div>
      </div>
      {filtered.length ? (
        <div className={styles.grid}>
          {filtered.map((record) => {
            const url = validUrl(String(record.data.url || ''));
            return (
              <article key={record.id} className={`${styles.note} ${styles.linkCard}`}>
                <div className={styles.bookmarkIcon}>
                  <Bookmark />
                </div>
                <div className={styles.bookmarkTools}>
                  <button
                    className={`${styles.icon} ${record.data.favorite ? styles.visibleIcon : ''}`}
                    aria-label={
                      record.data.favorite
                        ? `${record.title} 즐겨찾기 해제`
                        : `${record.title} 즐겨찾기`
                    }
                    aria-pressed={Boolean(record.data.favorite)}
                    onClick={() =>
                      attempt(
                        () =>
                          updateRecord(record.id, {
                            data: { ...record.data, favorite: !record.data.favorite },
                          }),
                        notify,
                      )
                    }
                  >
                    <Star fill={record.data.favorite ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    className={styles.icon}
                    aria-label={`${record.title} 편집`}
                    onClick={() => openEditor(record)}
                  >
                    <Pencil />
                  </button>
                </div>
                {url ? (
                  <a
                    className={styles.linkTitle}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {record.title}
                  </a>
                ) : (
                  <h3 className={styles.noteTitle}>{record.title}</h3>
                )}
                <div className={styles.host}>
                  <Globe />
                  {domain(String(record.data.url || ''))}
                  {url && <ArrowUpRight size={12} />}
                </div>
                {record.body && <p className={styles.bookmarkExcerpt}>{record.body}</p>}
                <div className={styles.tags}>
                  {Array.isArray(record.data.tags) &&
                    record.data.tags.map((tag) => (
                      <span className={styles.tag} key={String(tag)}>
                        #{tag}
                      </span>
                    ))}
                </div>
                <div className={styles.bookmarkBottom}>
                  <time className={styles.cardDate} dateTime={record.date}>
                    {shortDate(record.date)} 저장
                  </time>
                  <button
                    className={`${styles.readButton} ${record.data.read ? styles.readActive : ''}`}
                    aria-pressed={Boolean(record.data.read)}
                    onClick={() => {
                      if (
                        !attempt(
                          () =>
                            updateRecord(record.id, {
                              data: { ...record.data, read: !record.data.read },
                            }),
                          notify,
                        )
                      )
                        return;
                      notify(
                        record.data.read ? '다시 읽을 자료로 옮겼어요.' : '읽은 자료로 표시했어요.',
                      );
                    }}
                  >
                    {record.data.read && (
                      <Check
                        size={10}
                        style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }}
                      />
                    )}
                    {record.data.read ? '읽었어요' : '읽음으로 표시'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Bookmark size={30} />}
          title={
            search || filter !== 'all'
              ? '이곳에 담긴 자료가 없어요'
              : '호기심을 이어 가는 작은 서재'
          }
          description={
            search
              ? '다른 검색어로 찾아보세요.'
              : 'AI 아티클, 배우고 싶은 기술, 마음에 남은 글의 링크를 저장해 보세요.'
          }
          action={<Button onClick={() => openEditor(null)}>첫 읽을거리 저장</Button>}
        />
      )}
      {bookmarks.length > 0 && (
        <p className={styles.help}>
          링크 원문은 해당 사이트에서 열려요. 저장한 제목과 메모는 계정 데이터에 보관되며, 원문을
          오프라인으로 내려받지는 않아요.
        </p>
      )}
      {editing !== undefined && (
        <Modal
          title={editing ? '읽을거리 편집' : '다음에 읽을 자료'}
          onClose={() => setEditing(undefined)}
        >
          <form onSubmit={submit} className={styles.formStack}>
            <Field label="웹 주소">
              <input
                className="input"
                type="url"
                required
                autoFocus
                maxLength={4000}
                value={draft.url}
                placeholder="https://"
                onChange={(event) => setDraft({ ...draft, url: event.target.value })}
              />
            </Field>
            <Field label="제목">
              <input
                className="input"
                required
                maxLength={160}
                value={draft.title}
                placeholder="나중에 찾기 좋은 제목"
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              />
            </Field>
            <Field label="메모 (선택)">
              <textarea
                className="textarea"
                rows={3}
                maxLength={3000}
                value={draft.body}
                placeholder="왜 읽고 싶었나요? 기억할 맥락을 남겨 주세요."
                onChange={(event) => setDraft({ ...draft, body: event.target.value })}
              />
            </Field>
            <Field label="태그 (선택)" hint="쉼표로 구분해 주세요. 최대 10개까지 저장해요.">
              <input
                className="input"
                value={draft.tags}
                maxLength={400}
                placeholder="AI, 커리어, 읽고 싶은 글"
                onChange={(event) => setDraft({ ...draft, tags: event.target.value })}
              />
            </Field>
            <div className={styles.radioRow}>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={draft.favorite}
                  onChange={(event) => setDraft({ ...draft, favorite: event.target.checked })}
                />
                즐겨찾기
              </label>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={draft.read}
                  onChange={(event) => setDraft({ ...draft, read: event.target.checked })}
                />
                이미 읽은 자료
              </label>
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
              <Button type="submit">자료 저장하기</Button>
            </div>
          </form>
          {editing && (
            <DeleteControl
              onDelete={() => {
                deleteRecord(editing.id);
                setEditing(undefined);
                notify('읽을거리를 삭제했어요.');
              }}
            />
          )}
        </Modal>
      )}
    </div>
  );
}
