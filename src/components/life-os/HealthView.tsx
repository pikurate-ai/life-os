'use client';

import { useMemo, useState } from 'react';
import { Activity, Dumbbell, Footprints, Plus, Scale, Waves, Trash2, Pencil } from 'lucide-react';
import { useLife } from '@/lib/life-os/store';
import { localDate, numberData, type LifeRecord, type NewRecord } from '@/lib/life-os/types';
import { preserveRecordData } from '@/lib/life-os/editing';
import { Badge, Button, EmptyState, Field, Modal, SectionHeader } from './ui';
import './health-diary-vault.css';

const activities = {
  running: { label: '달리기', icon: Footprints },
  swimming: { label: '수영', icon: Waves },
  pullups: { label: '턱걸이', icon: Activity },
  strength: { label: '근력 운동', icon: Dumbbell },
};
type ActivityKind = keyof typeof activities;
type HealthDraft = {
  id?: string;
  type: 'workout' | 'weight';
  activity: ActivityKind;
  date: string;
  distance: string;
  duration: string;
  sets: string;
  exercise: string;
  load: string;
  reps: string;
  kg: string;
  notes: string;
};
const blank = (type: 'workout' | 'weight' = 'workout'): HealthDraft => ({
  type,
  activity: 'running',
  date: localDate(),
  distance: '',
  duration: '',
  sets: '',
  exercise: '',
  load: '',
  reps: '',
  kg: '',
  notes: '',
});
const prettyDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
const pace = (distance: number, duration: number) => {
  if (!distance || !duration) return '—';
  const seconds = Math.round((duration / distance) * 60);
  return `${Math.floor(seconds / 60)}′${String(seconds % 60).padStart(2, '0')}″`;
};
function detail(record: LifeRecord): string {
  const activity = String(record.data.activity);
  if (record.type === 'weight') return `${numberData(record, 'kg')} kg`;
  if (activity === 'running')
    return `${numberData(record, 'distance')} km · ${numberData(record, 'duration')}분 · ${pace(numberData(record, 'distance'), numberData(record, 'duration'))}/km`;
  if (activity === 'swimming')
    return `${numberData(record, 'distance').toLocaleString()} m · ${numberData(record, 'duration')}분`;
  if (activity === 'pullups') {
    const sets = Array.isArray(record.data.sets) ? record.data.sets.map(Number) : [];
    return `${sets.join(' / ')}회 · 총 ${sets.reduce((a, b) => a + b, 0)}회`;
  }
  return `${record.data.exercise || '근력 운동'} · ${numberData(record, 'load')} kg × ${numberData(record, 'reps')}회`;
}
export function HealthView() {
  const { records, addRecord, updateRecord, deleteRecord, notify } = useLife();
  const [draft, setDraft] = useState<HealthDraft | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState<LifeRecord | null>(null);
  const health = useMemo(
    () =>
      records
        .filter((record) => record.type === 'workout' || record.type === 'weight')
        .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt)),
    [records],
  );
  const weights = health.filter((record) => record.type === 'weight');
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 6);
  const week = health.filter(
    (record) =>
      record.date >= localDate(cutoff) && record.date <= localDate() && record.type === 'workout',
  );
  const runningKm = week
    .filter((record) => record.data.activity === 'running')
    .reduce((sum, record) => sum + numberData(record, 'distance'), 0);
  const swimMeters = week
    .filter((record) => record.data.activity === 'swimming')
    .reduce((sum, record) => sum + numberData(record, 'distance'), 0);
  const visible = health.filter(
    (record) =>
      filter === 'all' ||
      (filter === 'weight' ? record.type === 'weight' : record.data.activity === filter),
  );
  const set = (key: keyof HealthDraft, value: string) =>
    setDraft((current) => (current ? { ...current, [key]: value } : null));
  function edit(record: LifeRecord) {
    setError('');
    setDraft({
      ...blank(record.type === 'weight' ? 'weight' : 'workout'),
      id: record.id,
      date: record.date,
      activity:
        typeof record.data.activity === 'string' && record.data.activity in activities
          ? (record.data.activity as ActivityKind)
          : 'running',
      distance: String(record.data.distance ?? ''),
      duration: String(record.data.duration ?? ''),
      sets: Array.isArray(record.data.sets) ? record.data.sets.join(', ') : '',
      exercise: String(record.data.exercise ?? ''),
      load: String(record.data.load ?? ''),
      reps: String(record.data.reps ?? ''),
      kg: String(record.data.kg ?? ''),
      notes: record.body,
    });
  }
  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    const positive = (value: string) => Number.isFinite(Number(value)) && Number(value) > 0;
    let data: NewRecord['data'], title: string;
    if (draft.type === 'weight') {
      if (!positive(draft.kg) || Number(draft.kg) > 500) {
        setError('몸무게를 0보다 크고 500 kg 이하로 입력해 주세요.');
        return;
      }
      data = { kg: Number(draft.kg) };
      title = '몸무게';
    } else {
      title = activities[draft.activity].label;
      data = { activity: draft.activity };
      if (draft.activity === 'running' || draft.activity === 'swimming') {
        if (!positive(draft.distance) || !positive(draft.duration)) {
          setError('거리와 시간을 0보다 크게 입력해 주세요.');
          return;
        }
        data = { ...data, distance: Number(draft.distance), duration: Number(draft.duration) };
      } else if (draft.activity === 'pullups') {
        const sets = draft.sets
          .split(/[,\s]+/)
          .filter(Boolean)
          .map(Number);
        if (
          !sets.length ||
          sets.length > 30 ||
          sets.some((value) => !Number.isInteger(value) || value < 0 || value > 1000) ||
          sets.every((value) => value === 0)
        ) {
          setError('세트별 횟수를 쉼표로 구분해 주세요. 예: 8, 6, 5 (최대 30세트)');
          return;
        }
        data = { ...data, sets };
      } else {
        if (
          !draft.exercise.trim() ||
          !positive(draft.load) ||
          !positive(draft.reps) ||
          !Number.isInteger(Number(draft.reps))
        ) {
          setError('운동 이름, 중량, 정수 반복 횟수를 입력해 주세요.');
          return;
        }
        data = {
          ...data,
          exercise: draft.exercise.trim(),
          load: Number(draft.load),
          reps: Number(draft.reps),
        };
      }
    }
    const value: NewRecord = {
      type: draft.type,
      title,
      date: draft.date,
      body: draft.notes.trim(),
      data: preserveRecordData(
        records.filter((record) => record.type === draft.type),
        draft.id,
        data,
      ),
    };
    try {
      if (draft.id) updateRecord(draft.id, value);
      else addRecord(value);
      notify(draft.id ? '운동 기록을 수정했어요.' : '오늘의 건강 기록을 남겼어요.');
      setDraft(null);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : '저장하지 못했습니다. 저장 공간을 확인해 주세요.',
      );
    }
  }
  function deleteEntry() {
    if (!confirmDelete) return;
    try {
      deleteRecord(confirmDelete.id);
      setConfirmDelete(null);
      notify('기록을 삭제했어요.');
    } catch (error) {
      notify(error instanceof Error ? error.message : '기록을 삭제하지 못했습니다.');
    }
  }
  return (
    <div className="page-stack hdv-health">
      <SectionHeader
        eyebrow="몸을 돌보는 시간"
        title="꾸준함이 만드는 변화"
        description="수영, 턱걸이, 달리기. 어제보다 나아진 나를 기록하세요."
        action={
          <div className="hdv-header-actions">
            <Button
              variant="secondary"
              onClick={() => {
                setError('');
                setDraft(blank('weight'));
              }}
            >
              <Scale size={16} />
              몸무게
            </Button>
            <Button
              onClick={() => {
                setError('');
                setDraft(blank());
              }}
            >
              <Plus size={17} />
              운동 기록
            </Button>
          </div>
        }
      />
      <div className="metric-grid">
        <div className="metric-card">
          <span className="metric-label">최근 7일 운동</span>
          <div className="metric-value">
            {week.length}
            <span className="metric-unit">회</span>
          </div>
          <span className="muted text-small">움직인 하루를 모으는 중</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">최근 7일 달리기</span>
          <div className="metric-value">
            {runningKm.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            <span className="metric-unit">km</span>
          </div>
          <span className="muted text-small">나만의 속도로 한 걸음씩</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">최근 7일 수영</span>
          <div className="metric-value">
            {swimMeters.toLocaleString()}
            <span className="metric-unit">m</span>
          </div>
          <span className="muted text-small">물속에서 쌓은 거리</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">최근 몸무게</span>
          <div className="metric-value">
            {weights[0] ? numberData(weights[0], 'kg') : '—'}
            <span className="metric-unit">kg</span>
          </div>
          <span className="muted text-small">
            {weights[0] ? prettyDate(weights[0].date) : '첫 기록을 남겨 보세요'}
          </span>
        </div>
      </div>
      <div className="card card-pad hdv-health-banner">
        <span className="hdv-symbol">
          <Activity size={23} />
        </span>
        <div>
          <h3>작게 시작해도, 꾸준히 가면 돼요.</h3>
          <p className="muted">빠른 기록으로 운동을 마무리하고, 다시 일상에 집중하세요.</p>
        </div>
        <Badge tone="green">나를 위한 루틴</Badge>
      </div>
      <section className="card card-pad">
        <div className="hdv-list-heading">
          <div>
            <h3>운동과 몸무게 기록</h3>
            <p className="muted text-small">{health.length}개의 기록 · 날짜별로 모아 봅니다</p>
          </div>
          <label className="hdv-filter">
            <span className="hdv-sr-only">운동 종류 필터</span>
            <select
              className="select"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">전체 기록</option>
              {Object.entries(activities).map(([key, value]) => (
                <option value={key} key={key}>
                  {value.label}
                </option>
              ))}
              <option value="weight">몸무게</option>
            </select>
          </label>
        </div>
        {!visible.length ? (
          <EmptyState
            icon={<Footprints size={28} />}
            title="오늘의 움직임을 기록해 보세요"
            description="달린 거리부터 턱걸이 한 세트까지, 작은 기록이 변화를 만듭니다."
            action={
              <Button
                onClick={() => {
                  setError('');
                  setDraft(blank());
                }}
              >
                첫 운동 기록하기
              </Button>
            }
          />
        ) : (
          <div className="record-list">
            {visible.map((record) => {
              const activity = String(record.data.activity) as ActivityKind;
              const Icon =
                record.type === 'weight' ? Scale : activities[activity]?.icon || Activity;
              return (
                <article className="record-row hdv-record" key={record.id}>
                  <span className={`hdv-record-icon ${activity === 'swimming' ? 'hdv-blue' : ''}`}>
                    <Icon size={20} />
                  </span>
                  <div className="hdv-grow">
                    <div className="hdv-inline">
                      <strong>
                        {record.type === 'weight'
                          ? '몸무게'
                          : activities[activity]?.label || record.title}
                      </strong>
                      <span className="muted text-small">{prettyDate(record.date)}</span>
                    </div>
                    <p className="hdv-record-detail">{detail(record)}</p>
                    {record.body && <p className="muted text-small hdv-truncate">{record.body}</p>}
                    {activity === 'strength' && numberData(record, 'reps') <= 10 && (
                      <span className="text-small muted">
                        추정 1RM{' '}
                        {Math.round(
                          numberData(record, 'load') * (1 + numberData(record, 'reps') / 30) * 10,
                        ) / 10}{' '}
                        kg · Epley 참고값
                      </span>
                    )}
                  </div>
                  <div className="hdv-row-actions">
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`${record.title} 수정`}
                      onClick={() => edit(record)}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`${record.title} 삭제`}
                      onClick={() => setConfirmDelete(record)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      {draft && (
        <Modal
          title={
            draft.type === 'weight'
              ? '몸무게 기록'
              : draft.id
                ? '운동 기록 수정'
                : '오늘의 운동 기록'
          }
          onClose={() => setDraft(null)}
        >
          <form onSubmit={save} className="page-stack">
            <div className="form-grid">
              <Field label="날짜">
                <input
                  required
                  type="date"
                  className="input"
                  value={draft.date}
                  onChange={(event) => set('date', event.target.value)}
                />
              </Field>
              {draft.type === 'workout' && (
                <Field label="운동 종류">
                  <select
                    className="select"
                    value={draft.activity}
                    onChange={(event) => set('activity', event.target.value)}
                  >
                    {Object.entries(activities).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value.label}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
            {draft.type === 'weight' ? (
              <Field label="몸무게 (kg)">
                <input
                  autoFocus
                  required
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="1"
                  max="500"
                  className="input"
                  placeholder="예: 75.4"
                  value={draft.kg}
                  onChange={(event) => set('kg', event.target.value)}
                />
              </Field>
            ) : draft.activity === 'running' || draft.activity === 'swimming' ? (
              <>
                <div className="form-grid">
                  <Field label={`거리 (${draft.activity === 'running' ? 'km' : 'm'})`}>
                    <input
                      required
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min="0.01"
                      className="input"
                      placeholder={draft.activity === 'running' ? '예: 3.5' : '예: 1000'}
                      value={draft.distance}
                      onChange={(event) => set('distance', event.target.value)}
                    />
                  </Field>
                  <Field label="시간 (분)">
                    <input
                      required
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min="0.01"
                      className="input"
                      placeholder="예: 30"
                      value={draft.duration}
                      onChange={(event) => set('duration', event.target.value)}
                    />
                  </Field>
                </div>
                {draft.activity === 'running' &&
                  Number(draft.distance) > 0 &&
                  Number(draft.duration) > 0 && (
                    <div className="hdv-info">
                      <Footprints size={18} />
                      평균 페이스 {pace(Number(draft.distance), Number(draft.duration))} /km
                    </div>
                  )}
              </>
            ) : draft.activity === 'pullups' ? (
              <Field label="세트별 횟수" hint="쉼표로 구분하세요. 예: 8, 6, 5">
                <input
                  required
                  className="input"
                  inputMode="text"
                  placeholder="8, 6, 5"
                  value={draft.sets}
                  onChange={(event) => set('sets', event.target.value)}
                />
              </Field>
            ) : (
              <>
                <Field label="운동 이름">
                  <input
                    required
                    className="input"
                    placeholder="예: 스쿼트"
                    value={draft.exercise}
                    onChange={(event) => set('exercise', event.target.value)}
                  />
                </Field>
                <div className="form-grid">
                  <Field label="중량 (kg)">
                    <input
                      required
                      className="input"
                      type="number"
                      inputMode="decimal"
                      min="0.1"
                      step="0.1"
                      value={draft.load}
                      onChange={(event) => set('load', event.target.value)}
                    />
                  </Field>
                  <Field label="반복 횟수">
                    <input
                      required
                      className="input"
                      type="number"
                      inputMode="numeric"
                      min="1"
                      step="1"
                      value={draft.reps}
                      onChange={(event) => set('reps', event.target.value)}
                    />
                  </Field>
                </div>
              </>
            )}
            <Field label="메모 (선택)">
              <textarea
                className="textarea"
                rows={3}
                placeholder="오늘의 컨디션이나 기억할 내용을 남기세요."
                value={draft.notes}
                onChange={(event) => set('notes', event.target.value)}
              />
            </Field>
            {error && (
              <p className="hdv-error" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <Button variant="secondary" onClick={() => setDraft(null)}>
                취소
              </Button>
              <Button type="submit">기록 저장</Button>
            </div>
          </form>
        </Modal>
      )}
      {confirmDelete && (
        <Modal title="기록을 삭제할까요?" onClose={() => setConfirmDelete(null)}>
          <p>
            {prettyDate(confirmDelete.date)}의 {confirmDelete.title} 기록이 삭제됩니다.
          </p>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
              취소
            </Button>
            <Button variant="danger" onClick={deleteEntry}>
              삭제
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
