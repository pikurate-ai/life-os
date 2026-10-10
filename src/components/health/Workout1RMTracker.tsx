"use client";

import React, { useState, useEffect } from "react";
import { Dumbbell, Flame, Trophy, Plus, Trash2, TrendingUp, Calendar, Check, Sparkles } from "lucide-react";
import {
  onAuthChanged,
  saveWorkout1RMToCloud,
  subscribeWorkout1RMFromCloud,
  mergeItemsById,
} from "@/lib/firebase/client";
import type { User } from "firebase/auth";

export interface WorkoutRecord {
  id: string;
  exercise: string;
  weight: number;
  reps: number;
  calculated1RM: number;
  date: string;
  notes?: string;
  updatedAt?: string;
}

const DEFAULT_EXERCISES = ["벤치프레스", "스쿼트", "데드리프트", "오버헤드프레스", "바벨로우"];

const SAMPLE_RECORDS: WorkoutRecord[] = [
  { id: "w-1", exercise: "벤치프레스", weight: 90, reps: 5, calculated1RM: 105, date: "2026-09-22", notes: "안정적인 폼" },
  { id: "w-2", exercise: "스쿼트", weight: 130, reps: 5, calculated1RM: 151.7, date: "2026-09-21", notes: "벨트 착용 풀스쿼트" },
  { id: "w-3", exercise: "데드리프트", weight: 150, reps: 4, calculated1RM: 170, date: "2026-09-19", notes: "컨벤셔널 데드리프트" },
  { id: "w-4", exercise: "오버헤드프레스", weight: 55, reps: 6, calculated1RM: 66, date: "2026-09-18" },
];

const WORKOUT_STORAGE_KEY = "life_os_workout_1rm_v1";

export const Workout1RMTracker: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [records, setRecords] = useState<WorkoutRecord[]>(SAMPLE_RECORDS);

  // Form State
  const [exercise, setExercise] = useState("벤치프레스");
  const [weight, setWeight] = useState<number>(80);
  const [reps, setReps] = useState<number>(5);
  const [notes, setNotes] = useState("");

  // Load from local & live Firestore sync
  useEffect(() => {
    let localItems: WorkoutRecord[] = SAMPLE_RECORDS;
    try {
      const saved = localStorage.getItem(WORKOUT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localItems = parsed;
          setRecords(parsed);
        }
      }
    } catch {}

    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthChanged((user) => {
      setCurrentUser(user);

      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (user) {
        unsubscribeSnapshot = subscribeWorkout1RMFromCloud(user.uid, (cloudWorkouts) => {
          if (cloudWorkouts && cloudWorkouts.length > 0) {
            setRecords((prev) => {
              const merged = mergeItemsById(prev, cloudWorkouts);
              try {
                localStorage.setItem(WORKOUT_STORAGE_KEY, JSON.stringify(merged));
              } catch {}
              return merged;
            });
          } else if (localItems && localItems.length > 0) {
            saveWorkout1RMToCloud(user.uid, localItems);
          }
        });
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const updateRecords = (newRecords: WorkoutRecord[]) => {
    setRecords(newRecords);
    try {
      localStorage.setItem(WORKOUT_STORAGE_KEY, JSON.stringify(newRecords));
    } catch {}
    if (currentUser) {
      saveWorkout1RMToCloud(currentUser.uid, newRecords);
    }
  };

  // Epley Formula: 1RM = Weight * (1 + Reps / 30)
  const currentCalc1RM = reps === 1 ? weight : Math.round(weight * (1 + reps / 30) * 10) / 10;

  // 3대 운동 최고 1RM 계산
  const getBest1RM = (name: string): number => {
    const list = records.filter((r) => r.exercise === name);
    if (list.length === 0) return 0;
    return Math.max(...list.map((r) => r.calculated1RM));
  };

  const bestBench = getBest1RM("벤치프레스");
  const bestSquat = getBest1RM("스쿼트");
  const bestDead = getBest1RM("데드리프트");
  const totalBig3 = Math.round((bestBench + bestSquat + bestDead) * 10) / 10;
  const target500Percent = Math.min(100, Math.round((totalBig3 / 500) * 100));

  const handleAddRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (weight <= 0 || reps <= 0) return;

    const newRecord: WorkoutRecord = {
      id: "w-" + Date.now(),
      exercise,
      weight,
      reps,
      calculated1RM: currentCalc1RM,
      date: new Date().toISOString().split("T")[0],
      notes: notes.trim() || "",
      updatedAt: new Date().toISOString(),
    };

    updateRecords([newRecord, ...records]);
    setNotes("");
  };

  const handleDeleteRecord = (id: string) => {
    if (confirm("이 운동 기록을 삭제하시겠습니까?")) {
      updateRecords(records.filter((r) => r.id !== id));
    }
  };

  return (
    <div className="space-y-4">
      {/* 3대 500 달성 게이지 대시보드 */}
      <div className="bg-gradient-to-br from-indigo-950/70 via-slate-950 to-[#12141c] border border-indigo-500/30 rounded-3xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white">3대 운동(S·B·D) 종합 1RM</h3>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-mono">
            목표: 500kg
          </span>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-white font-mono tracking-tight">
                {totalBig3}
              </span>
              <span className="text-sm font-bold text-zinc-400">kg</span>
            </div>
            <span className="text-xs text-amber-400 font-bold font-mono">
              3대 500 달성률 {target500Percent}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mt-3 h-3 w-full bg-zinc-800 rounded-full overflow-hidden p-0.5 border border-zinc-700">
            <div
              style={{ width: `${target500Percent}%` }}
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-400 transition-all duration-700"
            />
          </div>
        </div>

        {/* 3대 세부 최고기록 미니 그리드 */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-indigo-500/20 text-center">
          <div className="bg-zinc-900/80 p-2.5 rounded-2xl border border-zinc-800">
            <span className="text-[10px] text-zinc-400 block font-semibold">스쿼트</span>
            <span className="text-sm font-black text-white font-mono">{bestSquat}kg</span>
          </div>
          <div className="bg-zinc-900/80 p-2.5 rounded-2xl border border-zinc-800">
            <span className="text-[10px] text-zinc-400 block font-semibold">벤치프레스</span>
            <span className="text-sm font-black text-white font-mono">{bestBench}kg</span>
          </div>
          <div className="bg-zinc-900/80 p-2.5 rounded-2xl border border-zinc-800">
            <span className="text-[10px] text-zinc-400 block font-semibold">데드리프트</span>
            <span className="text-sm font-black text-white font-mono">{bestDead}kg</span>
          </div>
        </div>
      </div>

      {/* 1RM 계산 및 빠른 기록 등록 카드 */}
      <div className="bg-[#12141c] border border-[#1f2433] rounded-3xl p-4 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">1RM 자동 계산 & 기록</h3>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">공식: W × (1 + r/30)</span>
        </div>

        <form onSubmit={handleAddRecord} className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">운동 종목</label>
            <select
              value={exercise}
              onChange={(e) => setExercise(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {DEFAULT_EXERCISES.map((ex) => (
                <option key={ex} value={ex}>
                  {ex}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">중량 (kg)</label>
              <input
                type="number"
                step="0.5"
                value={weight || ""}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">반복 횟수 (Reps)</label>
              <input
                type="number"
                min="1"
                max="30"
                value={reps || ""}
                onChange={(e) => setReps(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          {/* 실시간 1RM 계산 결과 프리뷰 */}
          <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
              <span className="text-xs font-semibold text-zinc-300">추정 1RM 결과:</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-emerald-400 font-mono">
                {currentCalc1RM}
              </span>
              <span className="text-xs font-bold text-zinc-400">kg</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">메모 (선택사항)</label>
            <input
              type="text"
              placeholder="예: RPE 8.5 / 그립 너비 수정"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>오늘의 운동 일지에 저장</span>
          </button>
        </form>
      </div>

      {/* 운동 기록 히스토리 */}
      <div className="bg-[#12141c] border border-[#1f2433] rounded-3xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            최근 1RM 운동 기록
          </h3>
          <span className="text-xs text-zinc-500 font-mono">{records.length}회 기록</span>
        </div>

        <div className="space-y-2">
          {records.map((rec) => (
            <div
              key={rec.id}
              className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                  <Dumbbell className="w-4 h-4 text-zinc-300" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">{rec.exercise}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-mono font-semibold">
                      1RM {rec.calculated1RM}kg
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono mt-0.5">
                    <span>{rec.weight}kg × {rec.reps}회</span>
                    <span>•</span>
                    <span>{rec.date}</span>
                  </div>
                  {rec.notes && (
                    <p className="text-[10px] text-zinc-500 mt-0.5">{rec.notes}</p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDeleteRecord(rec.id)}
                className="p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-zinc-500 hover:text-rose-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
