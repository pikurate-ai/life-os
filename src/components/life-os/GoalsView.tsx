'use client';

import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  BookOpen,
  Briefcase,
  Compass,
  Flag,
  Globe,
  Heart,
  Pencil,
  Plus,
  Target,
} from 'lucide-react';
import { useLife } from '@/lib/life-os/store';
import { preserveRecordData } from '@/lib/life-os/editing';
import { localDate, type LifeRecord } from '@/lib/life-os/types';
import { Badge, Button, EmptyState, Field, Modal, SectionHeader } from './ui';
import { attempt, DeleteControl, shortDate, validDate } from './domain-utils';
import styles from './domain.module.css';

const categories = {
  work: '일과 커리어',
  study: '배움과 자격증',
  family: '가족과 관계',
  immigration: '새로운 시작',
  faith: '가치와 신앙',
  personal: '나를 위한 성장',
};
const icons: Record<string, ReactNode> = {
  work: <Briefcase />,
  study: <BookOpen />,
  family: <Heart />,
  immigration: <Globe />,
  faith: <Compass />,
  personal: <Flag />,
};
type Category = keyof typeof categories;
type Draft = {
  title: string;
  body: string;
  category: Category;
  steps: string;
  targetDate: string;
  done: boolean;
};
const blank = (): Draft => ({
  title: '',
  body: '',
  category: 'work',
  steps: '',
  targetDate: '',
  done: false,
});
const goalSteps = (record: LifeRecord): string[] =>
  Array.isArray(record.data.steps)
    ? record.data.steps.filter((step): step is string => typeof step === 'string')
    : [];
const completedSteps = (record: LifeRecord): number[] =>
  Array.isArray(record.data.completedSteps)
    ? record.data.completedSteps.filter((step): step is number => typeof step === 'number')
    : [];

export function GoalsView() {
  const { records, addRecord, updateRecord, deleteRecord, notify } = useLife();
  const [filter, setFilter] = useState('active');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editing, setEditing] = useState<LifeRecord | null | undefined>(undefined);
  const [draft, setDraft] = useState<Draft>(blank);
  const [error, setError] = useState('');
  const goals = useMemo(
    () =>
      records
        .filter((record) => record.type === 'goal')
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [records],
  );
  const doneCount = goals.filter((goal) => goal.data.status === 'done').length;
  const filtered = goals.filter(
    (goal) =>
      (filter === 'all' ||
        (filter === 'done' ? goal.data.status === 'done' : goal.data.status !== 'done')) &&
      (categoryFilter === 'all' || goal.data.category === categoryFilter),
  );
  const openEditor = (goal: LifeRecord | null) => {
    setEditing(goal);
    setError('');
    setDraft(
      goal
        ? {
            title: goal.title,
            body: goal.body,
            category:
              typeof goal.data.category === 'string' && goal.data.category in categories
                ? (goal.data.category as Category)
                : 'personal',
            steps: goalSteps(goal).join('\n'),
            targetDate: String(goal.data.targetDate || ''),
            done: goal.data.status === 'done',
          }
        : blank(),
    );
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const steps = draft.steps
      .split(/\r?\n/)
      .map((step) => step.trim())
      .filter(Boolean);
    if (!draft.title.trim()) {
      setError('목표의 제목을 입력해 주세요.');
      return;
    }
    if (draft.targetDate && !validDate(draft.targetDate)) {
      setError('목표 날짜를 확인해 주세요. 날짜 없이 저장해도 괜찮아요.');
      return;
    }
    if (steps.length > 30 || steps.some((step) => step.length > 200)) {
      setError('실천 단계는 최대 30개, 각 200자까지 작성할 수 있어요.');
      return;
    }
    const previousSteps = editing ? goalSteps(editing) : [];
    const previousDone = editing ? completedSteps(editing) : [];
    const doneSteps = draft.done
      ? steps.map((_, index) => index)
      : steps.flatMap((step, index) =>
          previousSteps.some(
            (oldStep, oldIndex) => oldStep === step && previousDone.includes(oldIndex),
          )
            ? [index]
            : [],
        );
    const status =
      draft.done || (steps.length > 0 && doneSteps.length === steps.length) ? 'done' : 'active';
    const value = {
      type: 'goal' as const,
      title: draft.title.trim(),
      body: draft.body.trim(),
      date: editing?.date || localDate(),
      data: preserveRecordData(
        records.filter((record) => record.type === 'goal'),
        editing?.id,
        {
          category: draft.category,
          steps,
          completedSteps: doneSteps,
          targetDate: draft.targetDate,
          status,
        },
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
    notify(editing ? '목표를 다듬었어요.' : '새로운 방향을 세웠어요.');
  };
  const toggleStep = (goal: LifeRecord, index: number) => {
    const existing = completedSteps(goal);
    const next = existing.includes(index)
      ? existing.filter((step) => step !== index)
      : [...existing, index];
    const isDone = next.length === goalSteps(goal).length;
    if (
      !attempt(
        () =>
          updateRecord(goal.id, {
            data: { ...goal.data, completedSteps: next, status: isDone ? 'done' : 'active' },
          }),
        notify,
      )
    )
      return;
    if (isDone) notify('목표를 이루었어요. 오늘의 한 걸음을 기억해 두세요.');
  };
  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="SMALL STEPS, A LIFE OF YOUR OWN"
        title="목표와 성장"
        description="내가 향하고 싶은 방향을 정하고, 오늘 할 수 있는 한 걸음으로 나눠 보세요."
        action={
          <Button onClick={() => openEditor(null)}>
            <Plus size={16} />새 목표
          </Button>
        }
      />
      <div className="card card-pad">
        <div className={styles.toolbar}>
          <p className={styles.introQuote}>
            빠르게 가는 것보다, 나의 방향을 잃지 않는 것.
            <br />
            일과 배움, 가족과 나의 삶을 균형 있게 가꿔요.
          </p>
          <div className={styles.goalsSummary}>
            <span>
              <strong>{goals.length - doneCount}</strong>진행 중
            </span>
            <span>
              <strong>{doneCount}</strong>이룬 목표
            </span>
          </div>
        </div>
      </div>
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          {[
            ['active', '진행 중'],
            ['done', '이룬 목표'],
            ['all', '전체'],
          ].map(([key, label]) => (
            <button
              key={key}
              className={`${styles.filter} ${filter === key ? styles.selected : ''}`}
              onClick={() => setFilter(key)}
            >
              {label}
              <span className={styles.count}>
                {key === 'active'
                  ? goals.length - doneCount
                  : key === 'done'
                    ? doneCount
                    : goals.length}
              </span>
            </button>
          ))}
        </div>
        <select
          className="select"
          style={{ width: 'auto', maxWidth: '100%' }}
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          aria-label="목표 영역 필터"
        >
          <option value="all">모든 영역</option>
          {Object.entries(categories).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {filtered.length ? (
        Object.entries(categories).map(([category, label]) => {
          const group = filtered.filter(
            (goal) =>
              (typeof goal.data.category === 'string' && goal.data.category in categories
                ? goal.data.category
                : 'personal') === category,
          );
          return group.length ? (
            <section key={category} className={styles.goalSection}>
              <div className={styles.goalHeader}>
                <h2 className={styles.goalSectionTitle}>
                  {icons[category]}
                  {label}
                  <span className={styles.count}>{group.length}</span>
                </h2>
              </div>
              <div className={styles.goalList}>
                {group.map((goal) => {
                  const steps = goalSteps(goal),
                    done = completedSteps(goal),
                    isDone = goal.data.status === 'done';
                  const progress = isDone
                    ? 100
                    : steps.length
                      ? Math.round((done.length / steps.length) * 100)
                      : 0;
                  return (
                    <article key={goal.id} className={`card ${styles.goalCard}`}>
                      <div className={styles.goalCardTop}>
                        <div className={styles.hideOverflow}>
                          <h3 className={styles.goalTitle}>{goal.title}</h3>
                          {isDone && (
                            <div className={styles.goalSubline}>
                              <Badge tone="green">이룬 목표</Badge>
                            </div>
                          )}
                        </div>
                        <button
                          className={styles.icon}
                          aria-label={`${goal.title} 편집`}
                          onClick={() => openEditor(goal)}
                        >
                          <Pencil />
                        </button>
                      </div>
                      {goal.body && <p className={styles.goalBody}>{goal.body}</p>}
                      <div
                        className={styles.progressTrack}
                        role="progressbar"
                        aria-label={`${goal.title} 진행률`}
                        aria-valuenow={progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                      </div>
                      <div className={styles.progressLabel}>
                        <span>
                          {steps.length
                            ? `${done.length} / ${steps.length} 단계`
                            : '나의 속도로 진행해요'}
                        </span>
                        <span>{progress}%</span>
                      </div>
                      {steps.map((step, index) => (
                        <label
                          key={`${index}-${step}`}
                          className={`${styles.step} ${done.includes(index) ? styles.stepDone : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={done.includes(index)}
                            onChange={() => toggleStep(goal, index)}
                          />
                          <span>{step}</span>
                        </label>
                      ))}
                      <div className={styles.goalFooter}>
                        <span>
                          {goal.data.targetDate
                            ? `${shortDate(String(goal.data.targetDate))} 목표`
                            : '목표일 없이 꾸준히'}
                        </span>
                        <button
                          className={styles.quietButton}
                          onClick={() => {
                            if (
                              !attempt(
                                () =>
                                  updateRecord(goal.id, {
                                    data: {
                                      ...goal.data,
                                      status: isDone ? 'active' : 'done',
                                      completedSteps: isDone ? [] : steps.map((_, index) => index),
                                    },
                                  }),
                                notify,
                              )
                            )
                              return;
                            notify(
                              isDone ? '진행 중인 목표로 옮겼어요.' : '이룬 목표로 기록했어요.',
                            );
                          }}
                        >
                          {isDone ? '다시 시작' : '목표 완료'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null;
        })
      ) : (
        <EmptyState
          icon={<Target size={30} />}
          title={filter === 'done' ? '앞으로 쌓일 나의 성취들' : '나의 다음 장을 그려 볼까요?'}
          description={
            filter === 'done'
              ? '완료한 목표가 이곳에 차곡차곡 모여요.'
              : 'AI·클라우드 공부, 새로운 커리어, 가족과 함께하는 시간. 작은 목표부터 시작해 보세요.'
          }
          action={<Button onClick={() => openEditor(null)}>나의 첫 목표 만들기</Button>}
        />
      )}
      {editing !== undefined && (
        <Modal
          title={editing ? '목표 다듬기' : '새로운 방향 세우기'}
          onClose={() => setEditing(undefined)}
        >
          <form onSubmit={submit} className={styles.formStack}>
            <Field label="이루고 싶은 목표">
              <input
                className="input"
                autoFocus
                required
                maxLength={160}
                value={draft.title}
                placeholder="예: 클라우드 자격증 공부 시작하기"
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              />
            </Field>
            <div className="form-grid">
              <Field label="삶의 영역">
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
              <Field label="목표일 (선택)">
                <input
                  className="input"
                  type="date"
                  value={draft.targetDate}
                  onChange={(event) => setDraft({ ...draft, targetDate: event.target.value })}
                />
              </Field>
            </div>
            <Field label="이 목표가 나에게 중요한 이유 (선택)">
              <textarea
                className="textarea"
                rows={3}
                maxLength={4000}
                value={draft.body}
                placeholder="어떤 내일을 위해 이 목표를 세웠나요?"
                onChange={(event) => setDraft({ ...draft, body: event.target.value })}
              />
            </Field>
            <Field
              label="작은 실천 단계 (선택)"
              hint="한 줄에 하나씩 적어 주세요. 각 단계를 체크하며 나아갈 수 있어요."
            >
              <textarea
                className="textarea"
                rows={5}
                maxLength={6500}
                value={draft.steps}
                placeholder={'학습 자료 찾아보기\n매주 공부 시간 정하기\n첫 단원 마무리하기'}
                onChange={(event) => setDraft({ ...draft, steps: event.target.value })}
              />
            </Field>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={draft.done}
                onChange={(event) => setDraft({ ...draft, done: event.target.checked })}
              />
              이미 이룬 목표로 기록하기
            </label>
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <Button variant="secondary" onClick={() => setEditing(undefined)}>
                취소
              </Button>
              <Button type="submit">목표 저장하기</Button>
            </div>
          </form>
          {editing && (
            <DeleteControl
              onDelete={() => {
                deleteRecord(editing.id);
                setEditing(undefined);
                notify('목표를 삭제했어요.');
              }}
            />
          )}
        </Modal>
      )}
    </div>
  );
}
