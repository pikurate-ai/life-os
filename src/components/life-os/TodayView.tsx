'use client';

import { useState } from 'react';
import {
  ArrowUpRight,
  Plus,
  Check,
  MoreHorizontal,
  Waves,
  BookOpen,
  Footprints,
  PenLine,
  ChevronRight,
  ArrowRight,
  CheckCheck,
  Target,
  Heart,
  TrendingUp,
  Wallet,
  CalendarDays,
  Trash2,
} from 'lucide-react';
import { useLife } from '@/lib/life-os/store';
import { LifeRecord, localDate, PageId, numberData } from '@/lib/life-os/types';
import { Badge, Button, EmptyState, Field, IconButton, Modal, Progress } from './ui';

const taskCategories: Record<string, string> = {
  work: '일과 커리어',
  study: '공부와 성장',
  family: '가족과 사랑',
  health: '건강과 운동',
  personal: '나를 위한 일',
};
const taskCategoryLabel = (value: unknown) =>
  taskCategories[String(value)] || String(value || '나를 위한 일');

function Landscape() {
  return (
    <svg className="hero-art" viewBox="0 0 380 210" fill="none" aria-hidden="true">
      <circle cx="249" cy="69" r="30" fill="#dddfb9" />
      <path
        d="M15 184C73 146 81 116 129 116C177 116 205 159 247 159C289 159 312 121 381 115V211H15Z"
        fill="#b4c9b6"
      />
      <path
        d="M0 200C41 172 70 176 114 172C158 168 158 140 200 140C242 140 272 192 317 181C340 177 365 161 390 163V216H0Z"
        fill="#88a78f"
      />
      <path
        d="M142 217C162 191 195 181 212 165C235 143 235 116 255 115C276 114 267 142 282 152C299 165 327 160 345 167"
        stroke="#f0f0dc"
        strokeWidth="9"
      />
      <path
        d="M319 134V61M319 61C292 64 301 85 319 91M319 73C340 60 349 79 319 100M319 100C291 91 286 111 319 120"
        stroke="#486d54"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M53 121V81M53 89C37 79 32 96 53 103M53 101C70 89 77 108 53 114"
        stroke="#55745b"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M107 64C113 59 118 59 123 64M123 64C129 59 134 59 139 64"
        stroke="#77907a"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TodayView({
  navigate,
  date,
  onDate,
}: {
  navigate: (page: PageId) => void;
  date: string;
  onDate: (date: string) => void;
}) {
  const { records, addRecord, updateRecord, deleteRecord, notify, user } = useLife();
  function guard(action: () => void) {
    try {
      action();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : '기록을 저장하지 못했어요. 다시 시도해 주세요.',
      );
    }
  }
  const [taskModal, setTaskModal] = useState<LifeRecord | 'new' | null>(null);
  const [routineModal, setRoutineModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState('나를 위한 일');
  const [taskTime, setTaskTime] = useState('');
  const [confirmTaskDelete, setConfirmTaskDelete] = useState(false);
  const [routineTitle, setRoutineTitle] = useState('');
  const tasks = records.filter((r) => r.type === 'task' && r.date === date);
  const completed = tasks.filter((r) => r.data.completed).length;
  const routines = records.filter((r) => r.type === 'routine');
  const doneRoutines = routines.filter((r) =>
    ((r.data.completedDates as string[]) || []).includes(date),
  ).length;
  const diaries = records.filter((r) => r.type === 'diary');
  const diaryDays = new Set(diaries.map((r) => r.date)).size;
  const todaysDiary = diaries.find((r) => r.date === date);
  const workouts = records.filter((r) => r.type === 'workout');
  const weight = records
    .filter((r) => r.type === 'weight')
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const month = date.slice(0, 7);
  const expenses = records
    .filter(
      (r) => r.type === 'transaction' && r.date.startsWith(month) && r.data.direction === 'expense',
    )
    .reduce((s, r) => s + numberData(r, 'amount'), 0);
  const bookmarks = records.filter((r) => r.type === 'bookmark' && !r.data.read).slice(0, 2);
  const goals = records.filter((r) => r.type === 'goal' && r.data.status !== 'done').slice(0, 2);
  const selectedDate = new Date(`${date}T12:00:00`);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 6 + i);
    return localDate(d);
  });
  const weekly = workouts.filter((r) => days.includes(r.date));
  const weekMinutes = weekly.reduce((s, r) => s + numberData(r, 'duration'), 0);
  const routineIcons: Record<string, typeof Waves> = {
    swim: Waves,
    book: BookOpen,
    run: Footprints,
    diary: PenLine,
  };
  function openTask(task?: LifeRecord) {
    setConfirmTaskDelete(false);
    setTaskTitle(task?.title || '');
    setTaskCategory(taskCategoryLabel(task?.data.category));
    setTaskTime(String(task?.data.time || ''));
    setTaskModal(task || 'new');
  }
  const name = user?.displayName?.split(' ')[0];
  return (
    <div className="page-stack today-page">
      <div className="today-heading">
        <div>
          <div className="eyebrow">MY EVERYDAY, A LITTLE BETTER</div>
          <h1>{name ? `${name}님의 하루` : '나의 하루'}</h1>
          <p>지금의 작은 기록이, 내일의 나를 만듭니다.</p>
        </div>
        <label className="date-selector">
          <CalendarDays size={16} />
          <input
            aria-label="대시보드 날짜"
            type="date"
            value={date}
            onChange={(e) => e.target.value && onDate(e.target.value)}
          />
        </label>
      </div>
      <section className="daily-hero">
        <div className="hero-copy">
          <Badge tone="green">YOUR LIFE, YOUR PACE</Badge>
          <h2>오늘도, 나답게 한 걸음.</h2>
          <p>
            모든 걸 잘할 필요는 없어요.
            <br />
            나에게 중요한 것부터 하나씩 채워가요.
          </p>
          <button className="hero-link" onClick={() => openTask()}>
            오늘의 할 일 정하기 <ArrowRight size={16} />
          </button>
        </div>
        <Landscape />
      </section>
      <div className="overview-grid">
        <button className="overview-card" onClick={() => navigate('health')}>
          <span className="overview-icon sage">
            <Footprints size={19} />
          </span>
          <span className="overview-label">이번 주 운동</span>
          <span className="overview-number">
            {weekly.length}
            <small>회</small>
            <span className="overview-detail">{weekMinutes}분 움직였어요</span>
          </span>
        </button>
        <button className="overview-card" onClick={() => navigate('diary')}>
          <span className="overview-icon peach">
            <PenLine size={18} />
          </span>
          <span className="overview-label">마음을 남긴 날</span>
          <span className="overview-number">
            {diaryDays}
            <small>일</small>
            <span className="overview-detail">
              {todaysDiary ? '오늘도 기록했어요' : '오늘의 이야기를 들려주세요'}
            </span>
          </span>
        </button>
        <button className="overview-card" onClick={() => navigate('health')}>
          <span className="overview-icon lavender">
            <Heart size={18} />
          </span>
          <span className="overview-label">최근 몸무게</span>
          <span className="overview-number">
            {weight ? numberData(weight, 'kg') : '—'}
            <small>kg</small>
            <span className="overview-detail">
              {weight ? `${weight.date.slice(5).replace('-', '.')} 측정` : '나의 변화를 기록해요'}
            </span>
          </span>
        </button>
        <button className="overview-card" onClick={() => navigate('finance')}>
          <span className="overview-icon sand">
            <Wallet size={18} />
          </span>
          <span className="overview-label">이번 달 지출</span>
          <span className="overview-number finance-number">
            {expenses.toLocaleString('ko-KR')}
            <small>원</small>
            <span className="overview-detail">{Number(date.slice(5, 7))}월의 돈 흐름 살펴보기</span>
          </span>
        </button>
      </div>
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <section className="card focus-card">
            <div className="card-heading">
              <div className="heading-with-icon">
                <span className="section-icon">
                  <CheckCheck size={18} />
                </span>
                <h2>오늘의 포커스</h2>
                <span className="count">
                  {completed}/{tasks.length}
                </span>
              </div>
              <IconButton label="오늘 할 일 추가" onClick={() => openTask()}>
                <Plus size={19} />
              </IconButton>
            </div>
            <div className="focus-progress">
              <Progress
                value={tasks.length ? (completed / tasks.length) * 100 : 0}
                label="오늘 할 일 완료율"
              />
              <span>
                {completed === tasks.length && tasks.length
                  ? '오늘도 잘했어요!'
                  : '차근차근, 하나씩'}
              </span>
            </div>
            <div className="task-list">
              {tasks.map((task) => (
                <div key={task.id} className={`task-row ${task.data.completed ? 'is-done' : ''}`}>
                  <button
                    className="task-check"
                    aria-label={`${task.title} ${task.data.completed ? '완료 취소' : '완료'}`}
                    aria-pressed={Boolean(task.data.completed)}
                    onClick={() =>
                      guard(() =>
                        updateRecord(task.id, {
                          data: { ...task.data, completed: !task.data.completed },
                        }),
                      )
                    }
                  >
                    {task.data.completed && <Check size={13} />}
                  </button>
                  <button className="task-copy" onClick={() => openTask(task)}>
                    <span>{task.title}</span>
                    <small>
                      {taskCategoryLabel(task.data.category)}
                      {task.data.time ? ` · ${task.data.time}` : ''}
                    </small>
                  </button>
                  <IconButton label={`${task.title} 수정`} onClick={() => openTask(task)}>
                    <MoreHorizontal size={18} />
                  </IconButton>
                </div>
              ))}
              {!tasks.length && (
                <div className="inline-empty">
                  <Target size={22} />
                  <p>오늘 나를 위해 하고 싶은 일은 무엇인가요?</p>
                </div>
              )}
            </div>
            <button className="add-task-line" onClick={() => openTask()}>
              <Plus size={16} /> 할 일 추가하기
            </button>
          </section>
          <section className="card routine-card">
            <div className="card-heading">
              <div className="heading-with-icon">
                <span className="section-icon">
                  <TrendingUp size={18} />
                </span>
                <h2>나를 만드는 루틴</h2>
              </div>
              <span className="muted text-small">
                {doneRoutines} / {routines.length} 완료
              </span>
            </div>
            <div className="routine-grid">
              {routines.map((r) => {
                const Icon = routineIcons[String(r.data.icon)] || Check;
                const done = ((r.data.completedDates as string[]) || []).includes(date);
                return (
                  <button
                    key={r.id}
                    className={`routine-item ${done ? 'routine-done' : ''}`}
                    onClick={() =>
                      guard(() => {
                        const dates = (r.data.completedDates as string[]) || [];
                        updateRecord(r.id, {
                          data: {
                            ...r.data,
                            completedDates: done
                              ? dates.filter((d) => d !== date)
                              : [...dates, date],
                          },
                        });
                      })
                    }
                    aria-pressed={done}
                  >
                    <span className="routine-symbol">
                      <Icon size={21} />
                    </span>
                    <span>{r.title}</span>
                    <small>
                      {done ? (
                        <>
                          <Check size={12} /> 완료
                        </>
                      ) : (
                        '오늘도 이어가기'
                      )}
                    </small>
                  </button>
                );
              })}
            </div>
            <button className="add-task-line" onClick={() => setRoutineModal(true)}>
              <Plus size={15} /> 나만의 루틴 추가
            </button>
          </section>
          <section className="card">
            <div className="card-heading">
              <div className="heading-with-icon">
                <span className="section-icon">
                  <BookOpen size={18} />
                </span>
                <h2>잠깐, 읽고 갈까요?</h2>
              </div>
              <button className="text-link" onClick={() => navigate('library')}>
                모두 보기 <ChevronRight size={14} />
              </button>
            </div>
            <div className="reading-list">
              {bookmarks.map((r, i) => (
                <button className="reading-row" key={r.id} onClick={() => navigate('library')}>
                  <span className={`reading-cover ${i ? 'cover-blue' : ''}`}>
                    <BookOpen size={23} />
                    <span>{i ? 'LEARN' : 'READ'}</span>
                  </span>
                  <span className="reading-copy">
                    <small>{((r.data.tags as string[]) || ['읽을거리']).join(' · ')}</small>
                    <strong>{r.title}</strong>
                    <span>{r.body || '미래의 나를 위해 저장한 읽을거리'}</span>
                  </span>
                  <ArrowUpRight size={17} />
                </button>
              ))}
              {!bookmarks.length && (
                <div className="inline-empty">
                  <BookOpen size={22} />
                  <p>다시 읽고 싶은 좋은 자료를 모아두세요.</p>
                </div>
              )}
            </div>
          </section>
        </div>
        <div className="dashboard-aside">
          <section className="reflection-card">
            <span className="reflection-label">
              <PenLine size={16} /> 하루를 돌아보는 시간
            </span>
            <h2>{todaysDiary ? '오늘의 마음을 남겼어요.' : '오늘, 어떤 순간이\n기억에 남나요?'}</h2>
            <p>
              {todaysDiary
                ? todaysDiary.body.slice(0, 100)
                : '작은 감사 하나, 사소한 기쁨 하나.\n짧은 기록으로도 충분해요.'}
            </p>
            <Button variant="secondary" onClick={() => navigate('diary')}>
              {todaysDiary ? '오늘 일기 읽기' : '오늘의 일기 쓰기'}
              <ArrowUpRight size={15} />
            </Button>
            <span className="reflection-decoration" aria-hidden="true">
              ✳
            </span>
          </section>
          <section className="card activity-card">
            <div className="card-heading">
              <h2>이번 주의 움직임</h2>
              <Waves size={18} className="muted" />
            </div>
            <div className="activity-summary">
              <strong>
                {weekly.length}
                <small>회 운동</small>
              </strong>
              <span>
                <span className="legend-dot" />
                운동한 시간
              </span>
            </div>
            <div className="activity-chart">
              {days.map((day) => {
                const minutes = weekly
                  .filter((r) => r.date === day)
                  .reduce((s, r) => s + numberData(r, 'duration'), 0);
                const max = Math.max(
                  60,
                  ...days.map((d) =>
                    weekly
                      .filter((r) => r.date === d)
                      .reduce((s, r) => s + numberData(r, 'duration'), 0),
                  ),
                );
                return (
                  <div key={day} className={`activity-day ${day === date ? 'current' : ''}`}>
                    <div className="activity-column" title={`${day}: ${minutes}분`}>
                      <span
                        style={{ height: `${minutes ? Math.max(7, (minutes / max) * 100) : 4}%` }}
                      />
                    </div>
                    <span>
                      {new Date(`${day}T12:00:00`).toLocaleDateString('ko-KR', {
                        weekday: 'narrow',
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="activity-footer">
              <Footprints size={14} />
              <span>지난 7일, 총 {weekMinutes}분을 움직였어요</span>
            </div>
          </section>
          <section className="card goals-peek">
            <div className="card-heading">
              <h2>내일을 향한 한 걸음</h2>
              <button
                className="text-link"
                aria-label="목표 모두 보기"
                onClick={() => navigate('goals')}
              >
                <ArrowUpRight size={17} />
              </button>
            </div>
            {goals.map((g) => {
              const steps = (g.data.steps as string[]) || [];
              const progress = steps.length
                ? (((g.data.completedSteps as number[]) || []).length / steps.length) * 100
                : 0;
              return (
                <button className="goal-peek-row" key={g.id} onClick={() => navigate('goals')}>
                  <strong>{g.title}</strong>
                  <div>
                    <Progress value={progress} label={`${g.title} 진행률`} />
                    <span>{Math.round(progress)}%</span>
                  </div>
                </button>
              );
            })}
            {!goals.length && (
              <button className="goal-empty" onClick={() => navigate('goals')}>
                이루고 싶은 목표를 적어보세요 <ArrowRight size={15} />
              </button>
            )}
          </section>
        </div>
      </div>
      <div className="dashboard-footnote">
        <span className="brand-mini">✳</span> 완벽한 하루보다, 나다운 하루.
      </div>
      {taskModal && (
        <Modal
          title={taskModal === 'new' ? '오늘의 할 일' : '할 일 수정'}
          onClose={() => setTaskModal(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              guard(() => {
                if (!taskTitle.trim()) return;
                const input = {
                  type: 'task' as const,
                  title: taskTitle.trim(),
                  body: taskModal === 'new' ? '' : taskModal.body,
                  date,
                  data: {
                    ...(taskModal === 'new' ? {} : taskModal.data),
                    category: taskCategory,
                    time: taskTime,
                    completed: taskModal === 'new' ? false : Boolean(taskModal.data.completed),
                  },
                };
                if (taskModal === 'new') addRecord(input);
                else updateRecord(taskModal.id, input);
                setTaskModal(null);
                notify('할 일을 저장했어요.');
              });
            }}
            className="page-stack"
          >
            <Field label="무엇을 하고 싶으세요?">
              <input
                className="input"
                required
                maxLength={160}
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="예: 클라우드 자격증 30분 공부"
              />
            </Field>
            <div className="form-grid">
              <Field label="삶의 영역">
                <select
                  className="select"
                  value={taskCategory}
                  onChange={(e) => setTaskCategory(e.target.value)}
                >
                  {['나를 위한 일', '일과 커리어', '공부와 성장', '가족과 사랑', '건강과 운동'].map(
                    (x) => (
                      <option key={x}>{x}</option>
                    ),
                  )}
                </select>
              </Field>
              <Field label="시간 (선택)">
                <input
                  className="input"
                  type="time"
                  value={taskTime}
                  onChange={(e) => setTaskTime(e.target.value)}
                />
              </Field>
            </div>
            <div className="form-actions">
              {taskModal !== 'new' && (
                <Button
                  variant="danger"
                  onClick={() => {
                    if (!confirmTaskDelete) {
                      setConfirmTaskDelete(true);
                      return;
                    }
                    guard(() => {
                      deleteRecord(taskModal.id);
                      setTaskModal(null);
                    });
                  }}
                >
                  {confirmTaskDelete ? '한 번 더 눌러 삭제' : '삭제'}
                </Button>
              )}
              <Button variant="secondary" onClick={() => setTaskModal(null)}>
                취소
              </Button>
              <Button type="submit">저장하기</Button>
            </div>
          </form>
        </Modal>
      )}
      {routineModal && (
        <Modal title="나를 위한 작은 습관" onClose={() => setRoutineModal(false)}>
          <form
            className="page-stack"
            onSubmit={(e) => {
              e.preventDefault();
              guard(() => {
                if (!routineTitle.trim()) return;
                addRecord({
                  type: 'routine',
                  title: routineTitle.trim(),
                  body: '',
                  date,
                  data: { completedDates: [], icon: 'book' },
                });
                setRoutineTitle('');
                setRoutineModal(false);
                notify('새로운 루틴을 만들었어요.');
              });
            }}
          >
            <Field label="매일 이어가고 싶은 일">
              <input
                className="input"
                required
                maxLength={80}
                value={routineTitle}
                onChange={(e) => setRoutineTitle(e.target.value)}
                placeholder="예: 아이들과 10분 대화"
              />
            </Field>
            <div className="form-actions">
              <Button variant="secondary" onClick={() => setRoutineModal(false)}>
                취소
              </Button>
              <Button type="submit">루틴 만들기</Button>
            </div>
            {routines.length > 0 && (
              <div className="routine-management">
                <h3>등록된 루틴</h3>
                {routines.map((r) => (
                  <div className="record-row" key={r.id}>
                    <span>{r.title}</span>
                    <IconButton
                      label={`${r.title} 루틴 삭제`}
                      onClick={() => guard(() => deleteRecord(r.id))}
                    >
                      <Trash2 size={15} />
                    </IconButton>
                  </div>
                ))}
              </div>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
}
