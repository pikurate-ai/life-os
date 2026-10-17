import type { LifeRecord, NewRecord } from './types';
import { localDate } from './types';

/** Fictional examples only. Never inspect legacy user data to populate the demo. */
export function demoRecords(now = new Date()): LifeRecord[] {
  const day = (offset: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() + offset);
    return localDate(date);
  };
  const make = (id: string, input: NewRecord): LifeRecord => ({
    ...input,
    id: `demo-${id}`,
    updatedAt: new Date(now.getTime() - 60_000).toISOString(),
  });
  const today = day(0);
  return [
    make('task-study', {
      type: 'task',
      title: '클라우드 자격증, 오늘 한 챕터',
      body: '25분만 집중해서 한 걸음 나아가기',
      date: today,
      data: { completed: false, category: 'study', time: '09:00' },
    }),
    make('task-work', {
      type: 'task',
      title: 'AI 프로젝트 제안서 다듬기',
      body: '핵심 가설과 다음 실험 정리',
      date: today,
      data: { completed: false, category: 'work', time: '14:00' },
    }),
    make('task-family', {
      type: 'task',
      title: '가족과 저녁 산책',
      body: '오늘 좋았던 일 하나씩 나누기',
      date: today,
      data: { completed: false, category: 'family', time: '19:30' },
    }),
    make('routine-swim', {
      type: 'routine',
      title: '아침 수영',
      body: '몸을 깨우는 30분',
      date: today,
      data: {
        completedDates: [today, day(-1), day(-2), day(-4), day(-5)],
        icon: 'swim',
        target: 5,
      },
    }),
    make('routine-book', {
      type: 'routine',
      title: '책 10쪽 읽기',
      body: '작은 배움을 차곡차곡',
      date: today,
      data: { completedDates: [day(-1), day(-2), day(-3)], icon: 'book', target: 7 },
    }),
    make('routine-diary', {
      type: 'routine',
      title: '하루 일기',
      body: '오늘의 감정과 감사 한 가지',
      date: today,
      data: { completedDates: [day(-1), day(-2), day(-3), day(-4)], icon: 'diary', target: 7 },
    }),
    make('routine-pullup', {
      type: 'routine',
      title: '턱걸이',
      body: '어제보다 한 번 더',
      date: today,
      data: { completedDates: [day(-1), day(-3)], icon: 'run', target: 3 },
    }),
    make('diary-1', {
      type: 'diary',
      title: '작은 약속을 지킨 하루',
      body: '바쁜 하루였지만 아침 수영을 다녀왔다. 완벽한 하루보다 작은 약속을 지킨 하루가 오래 남는다. 저녁에는 가족과 웃으며 식사했다.',
      date: day(-1),
      data: { mood: 4, gratitude: '함께 저녁을 먹을 수 있다는 것', tags: ['일상', '감사'] },
    }),
    make('diary-2', {
      type: 'diary',
      title: '배움을 다시 시작하며',
      body: '새로운 개념을 이해하는 데 시간이 걸렸다. 조급해하지 않고 내 속도로 계속하면 된다. 오늘 이해한 한 가지를 노트에 남겼다.',
      date: day(-2),
      data: { mood: 3, gratitude: '새롭게 배울 기회', tags: ['성장'] },
    }),
    make('memory-1', {
      type: 'memory',
      title: '가족 여행 체크리스트',
      body: '여권 유효기간 확인\n여행자 보험\n충전기와 보조 배터리\n함께 가고 싶은 곳 물어보기',
      date: today,
      data: { category: 'family', pinned: true },
    }),
    make('memory-2', {
      type: 'memory',
      title: '집중이 필요할 때',
      body: '휴대폰 내려놓기 → 오늘 할 일 하나 고르기 → 25분 집중 → 5분 쉬기',
      date: day(-1),
      data: { category: 'daily', pinned: false },
    }),
    make('workout-swim', {
      type: 'workout',
      title: '기분 좋은 아침 수영',
      body: '자유형 위주로 천천히',
      date: today,
      data: {
        activity: 'swimming',
        distance: 1200,
        duration: 35,
        sets: [],
        exercise: '',
        load: 0,
        reps: 0,
      },
    }),
    make('workout-run', {
      type: 'workout',
      title: '동네 한 바퀴 달리기',
      body: '대화할 수 있을 정도의 속도',
      date: day(-1),
      data: {
        activity: 'running',
        distance: 3.2,
        duration: 24,
        sets: [],
        exercise: '',
        load: 0,
        reps: 0,
      },
    }),
    make('workout-pullup', {
      type: 'workout',
      title: '저녁 턱걸이',
      body: '충분히 쉬며 자세에 집중',
      date: day(-1),
      data: {
        activity: 'pullups',
        distance: 0,
        duration: 15,
        sets: [8, 7, 6],
        exercise: '',
        load: 0,
        reps: 0,
      },
    }),
    ...[0, 1, 2, 4, 6].map((offset, index) =>
      make(`weight-${index}`, {
        type: 'weight',
        title: '아침 체중',
        body: '',
        date: day(-offset),
        data: { kg: [74.8, 75.0, 74.9, 75.2, 75.3][index] },
      }),
    ),
    make('expense-1', {
      type: 'transaction',
      title: '점심 식사',
      body: '',
      date: today,
      data: { direction: 'expense', amount: 11000, category: '식비' },
    }),
    make('expense-2', {
      type: 'transaction',
      title: '대중교통',
      body: '',
      date: today,
      data: { direction: 'expense', amount: 3000, category: '교통' },
    }),
    make('expense-3', {
      type: 'transaction',
      title: '읽고 싶던 책',
      body: '',
      date: day(-1),
      data: { direction: 'expense', amount: 18000, category: '교육' },
    }),
    make('income-1', {
      type: 'transaction',
      title: '예시 수입',
      body: '샘플 데이터입니다',
      date: day(-3),
      data: { direction: 'income', amount: 200000, category: '기타' },
    }),
    make('asset-1', {
      type: 'asset',
      title: '생활비 통장',
      body: '샘플 자산',
      date: today,
      data: { direction: 'asset', amount: 500000, category: '예금·현금' },
    }),
    make('book-1', {
      type: 'bookmark',
      title: 'AI를 공부하는 나만의 노트',
      body: '학습한 내용을 정리하고 다시 읽기',
      date: today,
      data: {
        url: 'https://ai.google/learn-ai-skills/',
        tags: ['AI', '학습'],
        read: false,
        favorite: true,
      },
    }),
    make('book-2', {
      type: 'bookmark',
      title: '클라우드 학습 자료 모음',
      body: '다음 공부 시간에 살펴볼 자료',
      date: day(-1),
      data: {
        url: 'https://learn.microsoft.com/training/',
        tags: ['클라우드'],
        read: false,
        favorite: false,
      },
    }),
    make('goal-1', {
      type: 'goal',
      title: '클라우드 자격증 취득',
      body: '매일 조금씩, 실무 경험을 단단한 기초 위에 쌓기',
      date: today,
      data: {
        category: 'study',
        steps: [
          '시험과 범위 정하기',
          '기초 강의 완주',
          '실습 프로젝트',
          '모의고사 풀기',
          '시험 응시',
        ],
        completedSteps: [0],
        targetDate: day(90),
        status: 'active',
      },
    }),
    make('goal-2', {
      type: 'goal',
      title: '편안하게 5km 달리기',
      body: '속도보다 꾸준함. 몸의 신호를 들으며.',
      date: today,
      data: {
        category: 'personal',
        steps: ['걷기와 달리기 20분', '3km 이어 달리기', '4km 천천히', '5km 완주'],
        completedSteps: [0, 1],
        targetDate: day(45),
        status: 'active',
      },
    }),
  ];
}
