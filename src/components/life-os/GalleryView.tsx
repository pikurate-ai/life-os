'use client';

import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Camera, ImagePlus, Plus, ShieldCheck } from 'lucide-react';
import { useLife } from '@/lib/life-os/store';
import { localDate, type LifeRecord } from '@/lib/life-os/types';
import { Badge, Button, EmptyState, Field, Modal, SectionHeader } from './ui';
import { attempt, DeleteControl, shortDate, validDate } from './domain-utils';
import styles from './domain.module.css';

const categories = { family: '가족', daily: '일상', travel: '여행', growth: '나의 성장' };
type Category = keyof typeof categories;
type Draft = { title: string; body: string; date: string; category: Category; image: string };
const blank = (): Draft => ({
  title: '',
  body: '',
  date: localDate(),
  category: 'family',
  image: '',
});
const MAX_GALLERY_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_BYTES = 120 * 1024;
const isSafeImage = (value: unknown): value is string =>
  typeof value === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value);

async function compressPhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error(
      'JPEG, PNG, WebP 사진을 선택해 주세요. 아이폰 HEIC 사진은 JPEG로 변환해 주세요.',
    );
  if (file.size > 10 * 1024 * 1024) throw new Error('10MB 이하의 사진을 선택해 주세요.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('사진을 읽을 수 없어요. 다른 파일을 선택해 주세요.'));
      image.src = url;
    });
    if (!image.naturalWidth || !image.naturalHeight)
      throw new Error('올바른 이미지 파일이 아니에요.');
    const canvas = document.createElement('canvas');
    let size = 1200;
    for (let attempt = 0; attempt < 5; attempt++) {
      const ratio = Math.min(1, size / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('이 브라우저에서 사진을 처리할 수 없어요.');
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (let quality = 0.85; quality >= 0.4; quality -= 0.15) {
        const data = canvas.toDataURL('image/jpeg', quality);
        if (
          data.startsWith('data:image/jpeg') &&
          Math.ceil(((data.length - data.indexOf(',') - 1) * 3) / 4) <= MAX_IMAGE_BYTES
        )
          return data;
      }
      size = Math.round(size * 0.7);
    }
    throw new Error('사진을 충분히 압축하지 못했어요. 더 작은 사진을 선택해 주세요.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function GalleryView() {
  const { records, addRecord, updateRecord, deleteRecord, notify } = useLife();
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState<LifeRecord | null | undefined>(undefined);
  const [draft, setDraft] = useState<Draft>(blank);
  const [view, setView] = useState<LifeRecord | null>(null);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const photoRequest = useRef(0);
  const photos = useMemo(
    () =>
      records
        .filter((record) => record.type === 'photo')
        .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt)),
    [records],
  );
  const filtered = photos.filter((record) => filter === 'all' || record.data.category === filter);
  const storageUsed = photos.reduce((sum, photo) => sum + String(photo.data.image || '').length, 0);
  const closeEditor = () => {
    photoRequest.current++;
    setEditing(undefined);
    setProcessing(false);
  };
  const openEditor = (photo: LifeRecord | null) => {
    photoRequest.current++;
    setView(null);
    setEditing(photo);
    setError('');
    setProcessing(false);
    setDraft(
      photo
        ? {
            title: photo.title,
            body: photo.body,
            date: photo.date,
            category:
              typeof photo.data.category === 'string' && photo.data.category in categories
                ? (photo.data.category as Category)
                : 'daily',
            image: isSafeImage(photo.data.image) ? photo.data.image : '',
          }
        : blank(),
    );
  };
  const selectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const requestId = ++photoRequest.current;
    setProcessing(true);
    setError('');
    try {
      const image = await compressPhoto(file);
      if (photoRequest.current === requestId) setDraft((current) => ({ ...current, image }));
    } catch (issue) {
      if (photoRequest.current === requestId)
        setError(issue instanceof Error ? issue.message : '사진을 처리하지 못했어요.');
    } finally {
      if (photoRequest.current === requestId) setProcessing(false);
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim() || !validDate(draft.date) || !isSafeImage(draft.image)) {
      setError('사진, 제목, 올바른 날짜를 모두 입력해 주세요.');
      return;
    }
    const newTotal = storageUsed - String(editing?.data.image || '').length + draft.image.length;
    if (newTotal > MAX_GALLERY_BYTES) {
      setError('현재 사진 보관 한도에 도달했어요. 설정에서 백업한 뒤 기존 사진을 정리해 주세요.');
      return;
    }
    const value = {
      type: 'photo' as const,
      title: draft.title.trim(),
      body: draft.body.trim(),
      date: draft.date,
      data: { category: draft.category, image: draft.image, bytes: draft.image.length },
    };
    if (
      !attempt(() => {
        if (editing) updateRecord(editing.id, value);
        else addRecord(value);
      }, setError)
    )
      return;
    closeEditor();
    notify('소중한 순간을 보관했어요.');
  };
  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="THE DAYS WE WANT TO REMEMBER"
        title="소중한 순간"
        description="흘러가는 날들 속에서, 오래 기억하고 싶은 장면만 모아요."
        action={
          <Button onClick={() => openEditor(null)}>
            <Plus size={16} />
            순간 담기
          </Button>
        }
      />
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          {[['all', '모든 순간'], ...Object.entries(categories)].map(([key, label]) => (
            <button
              key={key}
              className={`${styles.filter} ${filter === key ? styles.selected : ''}`}
              onClick={() => setFilter(key)}
            >
              {label}
              <span className={styles.count}>
                {photos.filter((photo) => key === 'all' || photo.data.category === key).length}
              </span>
            </button>
          ))}
        </div>
        <span className={styles.help}>{photos.length}개의 소중한 장면</span>
      </div>
      {filtered.length ? (
        <div className={styles.galleryGrid}>
          {filtered.map((photo) => (
            <article key={photo.id} className={styles.photo}>
              <button
                className={styles.photoButton}
                onClick={() => setView(photo)}
                aria-label={`${photo.title} 사진 보기`}
              >
                {isSafeImage(photo.data.image) ? (
                  <img src={photo.data.image} alt={photo.title} loading="lazy" />
                ) : (
                  <span className={styles.galleryPlaceholder}>
                    <Camera />
                  </span>
                )}
              </button>
              <div className={styles.photoCaption}>
                <div className={styles.categoryGroup}>
                  <Badge>{categories[photo.data.category as Category] || '일상'}</Badge>
                </div>
                <h3 style={{ marginTop: 9 }}>{photo.title}</h3>
                <p>
                  <time dateTime={photo.date}>{shortDate(photo.date)}</time>
                  {photo.body &&
                    ` · ${photo.body.slice(0, 70)}${photo.body.length > 70 ? '…' : ''}`}
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Camera size={30} />}
          title="다시 꺼내 보고 싶은 날이 있나요?"
          description="가족의 웃음, 처음 달린 날, 나를 응원하는 한 장. 앨범에서 직접 골라 담아 보세요."
          action={<Button onClick={() => openEditor(null)}>첫 순간 담기</Button>}
        />
      )}
      <div className={styles.dataNote}>
        <ShieldCheck />
        <span>
          현재는 기기에서 선택한 사진의 압축 사본을 저장해요. 원본은 기존 앨범에 보관해 주세요. 계정
          연결 시 동기화되며, 기기 저장 공간 보호를 위해 전체 사진을 2MB까지 보관해요 (
          {Math.round(storageUsed / 1024)}KB 사용). 아이폰 앨범을 자동으로 가져오지는 않아요.
        </span>
      </div>
      {view && (
        <Modal title={view.title} onClose={() => setView(null)} wide>
          <div className={styles.modalImageWrap}>
            {isSafeImage(view.data.image) ? (
              <img className={styles.photoPreview} src={view.data.image} alt={view.title} />
            ) : (
              <div className={styles.photoEmpty}>사진 파일을 확인해 주세요.</div>
            )}
          </div>
          <div className={styles.categoryGroup}>
            <Badge>{categories[view.data.category as Category] || '일상'}</Badge>
            <time className={styles.smallDate} dateTime={view.date}>
              {shortDate(view.date)}
            </time>
          </div>
          {view.body && <p className={styles.wideText}>{view.body}</p>}
          <div className={styles.galleryActions}>
            <Button variant="secondary" onClick={() => setView(null)}>
              닫기
            </Button>
            <Button onClick={() => openEditor(view)}>사진 정보 편집</Button>
          </div>
          <DeleteControl
            onDelete={() => {
              deleteRecord(view.id);
              setView(null);
              notify('사진을 삭제했어요.');
            }}
          />
        </Modal>
      )}
      {editing !== undefined && (
        <Modal title={editing ? '순간의 이야기 편집' : '기억하고 싶은 순간'} onClose={closeEditor}>
          <form onSubmit={submit} className={styles.formStack}>
            {draft.image && (
              <img className={styles.photoPreview} src={draft.image} alt="선택한 사진 미리보기" />
            )}
            <label className={styles.upload}>
              <ImagePlus />
              <span>
                {processing
                  ? '사진을 작게 다듬고 있어요…'
                  : draft.image
                    ? '다른 사진 선택'
                    : '앨범에서 사진 선택'}
              </span>
              <input
                className={styles.hiddenInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={selectFile}
                disabled={processing}
                aria-label="추억 사진 업로드"
              />
              <span className={styles.uploadHint}>
                JPEG · PNG · WebP / 10MB 이하
                <br />
                최대 120KB의 JPEG 사본으로 저장해요.
              </span>
            </label>
            <Field label="순간의 제목">
              <input
                className="input"
                required
                maxLength={100}
                value={draft.title}
                placeholder="오래 기억하고 싶은 한 장면"
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              />
            </Field>
            <div className="form-grid">
              <Field label="날짜">
                <input
                  className="input"
                  type="date"
                  required
                  value={draft.date}
                  onChange={(event) => setDraft({ ...draft, date: event.target.value })}
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
                    <option value={key} key={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="이날의 이야기 (선택)">
              <textarea
                className="textarea"
                rows={3}
                maxLength={3000}
                value={draft.body}
                placeholder="누구와, 어떤 마음이었나요?"
                onChange={(event) => setDraft({ ...draft, body: event.target.value })}
              />
            </Field>
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <Button variant="secondary" onClick={closeEditor}>
                취소
              </Button>
              <Button type="submit" disabled={processing || !draft.image}>
                {processing ? '사진 처리 중' : '순간 저장하기'}
              </Button>
            </div>
          </form>
          {editing && (
            <DeleteControl
              onDelete={() => {
                deleteRecord(editing.id);
                closeEditor();
                notify('사진을 삭제했어요.');
              }}
            />
          )}
        </Modal>
      )}
    </div>
  );
}
