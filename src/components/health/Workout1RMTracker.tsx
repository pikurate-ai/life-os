"use client";

import React, { useState, useEffect } from "react";
import { Dumbbell, Flame, Trophy, Plus, Trash2, TrendingUp, Calendar, Check, Sparkles, ChevronRight, ArrowUpRight } from "lucide-react";
import {
  onAuthChanged,
  saveWorkout1RMToCloud,
  subscribeWorkout1RMFromCloud,
  mergeItemsById,
} from "@/lib/firebase/client";
import { triggerVibration } from "@/lib/notifications/ruthlessAlarm";
import type { User } from "firebase/auth";

export interface PullUpRecord {
  id: string;
  date: string;
  sets: number[]; // e.g. [10, 8, 8, 6]
  totalReps: number;
  maxReps: number;
  notes?: string;
  createdAt: string;
}

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

const SAMPLE_PULLUPS: PullUpRecord[] = [
  { id: "pu-1", date: "2026-10-14", sets: [12, 10, 8, 8, 6], totalReps: 44, maxReps: 12, notes: "정자세 데드행 풀업", createdAt: "2026-10-14" },
  { id: "pu-2", date: "2026-10-12", sets: [10, 10, 8, 6, 6], totalReps: 40, maxReps: 10, notes: "마지막 세트 쥐어짬", createdAt: "2026-10-12" },
  { id: "pu-3", date: "2026-10-10", sets: [10, 8, 7, 6, 5], totalReps: 36, maxReps: 10, notes: "가슴 닿기 풀업", createdAt: "2026-10-10" },
];

const SAMPLE_RECORDS: WorkoutRecord[] = [
  { id: "w-1", exercise: "벤치프레스", weight: 90, reps: 5, calculated1RM: 105, date: "2026-09-22", notes: "안정적인 폼" },
  { id: "w-2", exercise: "스쿼트", weight: 130, reps: 5, calculated1RM: 151.7, date: "2026-09-21", notes: "벨트 착용 풀스쿼트" },
  { id: "w-3", exercise: "데드리프트", weight: 150, reps: 4, calculated1RM: 170, date: "2026-09-19", notes: "컨벤셔널 데드리프트" },
  { id: "w-4", exercise: "오버헤드프레스", weight: 55, reps: 6, calculated1RM: 66, date: "2026-09-18" },
];

const WORKOUT_STORAGE_KEY = "life_os_workout_1rm_v1";
const PULLUP_STORAGE_KEY = "life_os_pullup_records_v1";

export const Workout1RMTracker: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Pull-up State
  const [pullupRecords, setPullupRecords] = useState<PullUpRecord[]>(SAMPLE_PULLUPS);
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [activeSets, setActiveSets] = useState<number[]>([10, 8, 8, 6]);
  const [pullupNotes, setPullupNotes] = useState("");
  const [pullupSaveSuccess, setPullupSaveSuccess] = useState(false);

  // 1RM Records State
  const [records, setRecords] = useState<WorkoutRecord[]>(SAMPLE_RECORDS);
  const [exercise, setExercise] = useState("벤치프레스");
  const [weight, setWeight] = useState<number>(80);
  const [reps, setReps] = useState<number>(5);
  const [notes, setNotes] = useState("");

  // Load from local storage & Firestore
  useEffect(() => {
    // 1. Pull-up load
    try {
      const savedPullup = localStorage.getItem(PULLUP_STORAGE_KEY);
      if (savedPullup) {
        const parsed = JSON.parse(savedPullup);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPullupRecords(parsed);
        }
      }
    } catch {}

    // 2. 1RM load
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

  // Save Pull-up Records
  const updatePullupRecords = (newRecords: PullUpRecord[]) => {
    setPullupRecords(newRecords);
    try {
      localStorage.setItem(PULLUP_STORAGE_KEY, JSON.stringify(newRecords));
    } catch {}
  };

  // Pull-up Set Operations
  const handleSetChange = (index: number, delta: number) => {
    setActiveSets((prev) => {
      const copy = [...prev];
      copy[index] = Math.max(1, (copy[index] || 0) + delta);
      return copy;
    });
    triggerVibration(30);
  };

  const handleAddSet = () => {
    setActiveSets((prev) => [...prev, prev.length > 0 ? prev[prev.length - 1] : 8]);
    triggerVibration(40);
  };

  const handleRemoveSet = (index: number) => {
    if (activeSets.length <= 1) return;
    setActiveSets((prev) => prev.filter((_, i) => i !== index));
    triggerVibration(40);
  };

  const totalPullupReps = activeSets.reduce((sum, r) => sum + r, 0);
  const maxPullupReps = Math.max(...activeSets, 0);

  const handleSavePullup = () => {
    if (activeSets.length === 0) return;

    const newRecord: PullUpRecord = {
      id: `pu-${Date.now()}`,
      date: currentDate,
      sets: [...activeSets],
      totalReps: totalPullupReps,
      maxReps: maxPullupReps,
      notes: pullupNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const updated = [newRecord, ...pullupRecords.filter((r) => r.date !== currentDate)].sort((a, b) =>
      b.date.localeCompare(a.date)
    );
    updatePullupRecords(updated);
    setPullupSaveSuccess(true);
    triggerVibration([100, 50, 100]);
    setTimeout(() => setPullupSaveSuccess(false), 2500);
  };

  const handleDeletePullup = (id: string) => {
    if (!confirm("이 턱걸이 기록을 삭제하시겠습니까?")) return;
    const updated = pullupRecords.filter((r) => r.id !== id);
    updatePullupRecords(updated);
  };

  // 1RM update helpers
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

  const handleAdd1RMRecord = (e: React.FormEvent) => {
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
    triggerVibration(60);
  };

  const handleDelete1RMRecord = (id: string) => {
    if (confirm("이 운동 기록을 삭제하시겠습니까?")) {
      updateRecords(records.filter((r) => r.id !== id));
    }
  };

  // Pull-up All-Time Best
  const allTimeMaxPullup = Math.max(...pullupRecords.map((r) => r.maxReps), 0);
  const allTimeTotalPullup = Math.max(...pullupRecords.map((r) => r.totalReps), 0);

  return (
    <div className="space-y-4">
      {/* 1. TOP SECTION: 턱걸이(Pull-up) 전용 세트별 기록 & 발전 트래커 */}
      <div className="bg-gradient-to-br from-indigo-950/80 via-blue-950/50 to-[#12141c] border-2 border-indigo-500/40 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5 fill-indigo-400 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  매일 성장 트래커
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">
                  최고 {allTimeMaxPullup}회 / 총 {allTimeTotalPullup}회
                </span>
              </div>
              <h3 className="text-base font-black text-white mt-0.5">턱걸이(Pull-up) 세트별 기록기</h3>
            </div>
          </div>
        </div>

        {/* Total & Set Stats Summary Banner */}
        <div className="grid grid-cols-3 gap-2 bg-black/40 p-3 rounded-2xl border border-white/5 text-center">
          <div>
            <span className="text-[10px] text-zinc-400 block">총 완료 횟수</span>
            <span className="text-xl font-black text-indigo-400 font-mono">{totalPullupReps}회</span>
          </div>
          <div>
            <span className="text-[10px] text-zinc-400 block">진행 세트</span>
            <span className="text-xl font-black text-white font-mono">{activeSets.length}세트</span>
          </div>
          <div>
            <span className="text-[10px] text-zinc-400 block">세트 최고 기록</span>
            <span className="text-xl font-black text-amber-400 font-mono">{maxPullupReps}회</span>
          </div>
        </div>

        {/* Set-by-Set Dynamic Reps Control */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-zinc-300">
            <span className="font-semibold whitespace-nowrap">세트별 수행 횟수 (Reps):</span>
            <button
              type="button"
              onClick={handleAddSet}
              className="text-xs px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold border border-indigo-400/30 flex items-center gap-1.5 shrink-0 whitespace-nowrap shadow-sm min-h-[32px] transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>세트 추가</span>
            </button>
          </div>

          <div className="space-y-2">
            {activeSets.map((repsCount, idx) => (
              <div
                key={idx}
                className="bg-zinc-900/95 border border-zinc-800 rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2 shadow-sm"
              >
                {/* Left: Set label & Reps counter */}
                <div className="flex items-center gap-3 min-w-0 shrink-0">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 whitespace-nowrap shrink-0">
                    {idx + 1}세트
                  </span>
                  <div className="flex items-baseline gap-1 whitespace-nowrap">
                    <span className="text-2xl font-black text-white font-mono leading-none tracking-tight">
                      {repsCount}
                    </span>
                    <span className="text-xs text-zinc-400 font-bold">회</span>
                  </div>
                </div>

                {/* Right: Generous touch target + / - / delete buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSetChange(idx, -1)}
                    aria-label={`${idx + 1}세트 1회 감소`}
                    className="w-9 h-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 text-base font-black flex items-center justify-center transition-all select-none border border-zinc-700/60 shadow-inner"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetChange(idx, 1)}
                    aria-label={`${idx + 1}세트 1회 증가`}
                    className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-base font-black flex items-center justify-center transition-all select-none shadow-md shadow-indigo-900/40"
                  >
                    +
                  </button>
                  {activeSets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSet(idx)}
                      aria-label={`${idx + 1}세트 삭제`}
                      className="w-8 h-8 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center text-sm font-bold ml-1 transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Date & Note input & Save Action */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <input
            type="date"
            value={currentDate}
            onChange={(e) => setCurrentDate(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
          />
          <input
            type="text"
            placeholder="메모 (예: 정자세 풀가동범위, 중량 5kg 착용)"
            value={pullupNotes}
            onChange={(e) => setPullupNotes(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500"
          />
          <button
            type="button"
            onClick={handleSavePullup}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap min-h-[40px] ${
              pullupSaveSuccess
                ? "bg-emerald-600 text-white ring-2 ring-emerald-400"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/40"
            }`}
          >
            {pullupSaveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>기록 완료!</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 text-indigo-300" />
                <span>오늘 턱걸이 저장</span>
              </>
            )}
          </button>
        </div>

        {/* Pull-up History & Growth Trend */}
        <div className="pt-2 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              턱걸이 발전 기록 히스토리
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">{pullupRecords.length}회차 기록됨</span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {pullupRecords.map((item, index) => {
              const prevItem = pullupRecords[index + 1];
              const diff = prevItem ? item.totalReps - prevItem.totalReps : null;

              return (
                <div
                  key={item.id}
                  className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-3 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white font-mono">{item.date}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-bold font-mono">
                        총 {item.totalReps}회 ({item.sets.length}세트)
                      </span>
                      {diff !== null && diff > 0 && (
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center font-mono">
                          +{diff}회 🚀
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-1 font-mono">
                      세트별: [{item.sets.join(" - ")}]회 (최고 {item.maxReps}회)
                    </div>
                    {item.notes && <p className="text-[10px] text-zinc-500 mt-0.5">{item.notes}</p>}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeletePullup(item.id)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. 3대 500 달성 게이지 대시보드 */}
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
              <span className="text-sm font-bold text-indigo-400">kg</span>
            </div>
            <span className="text-xs font-semibold text-zinc-400 font-mono">
              달성률 {target500Percent}%
            </span>
          </div>

          <div className="w-full h-3 bg-zinc-800 rounded-full mt-2 overflow-hidden p-0.5 border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-400 rounded-full transition-all duration-700"
              style={{ width: `${target500Percent}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-center">
          <div className="bg-[#12141c]/80 p-2.5 rounded-2xl border border-white/5">
            <span className="text-[10px] text-zinc-400 block mb-0.5">스쿼트</span>
            <span className="text-sm font-bold text-white font-mono">{bestSquat}kg</span>
          </div>
          <div className="bg-[#12141c]/80 p-2.5 rounded-2xl border border-white/5">
            <span className="text-[10px] text-zinc-400 block mb-0.5">벤치프레스</span>
            <span className="text-sm font-bold text-white font-mono">{bestBench}kg</span>
          </div>
          <div className="bg-[#12141c]/80 p-2.5 rounded-2xl border border-white/5">
            <span className="text-[10px] text-zinc-400 block mb-0.5">데드리프트</span>
            <span className="text-sm font-bold text-white font-mono">{bestDead}kg</span>
          </div>
        </div>
      </div>

      {/* 3. 1RM 계산 및 추가 폼 */}
      <div className="bg-[#12141c] border border-[#1f2433] rounded-3xl p-5 space-y-4">
        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
          <Dumbbell className="w-4 h-4 text-indigo-400" />
          Epley 공식 1RM 자동 계산기
        </h4>

        <form onSubmit={handleAdd1RMRecord} className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className="text-[11px] text-zinc-400 block mb-1">종목</label>
              <select
                value={exercise}
                onChange={(e) => setExercise(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
              >
                {DEFAULT_EXERCISES.map((ex) => (
                  <option key={ex} value={ex}>
                    {ex}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">중량 (kg)</label>
              <input
                type="number"
                min={1}
                value={weight}
                onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">반복 (회)</label>
              <input
                type="number"
                min={1}
                max={30}
                value={reps}
                onChange={(e) => setReps(parseInt(e.target.value) || 0)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono font-bold"
              />
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-between">
            <span className="text-xs text-zinc-300 font-medium">추정 1RM:</span>
            <span className="text-base font-black text-indigo-400 font-mono">
              {currentCalc1RM} kg
            </span>
          </div>

          <input
            type="text"
            placeholder="메모 (선택사항, 예: RPE 8.5 무난)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
          />

          <button
            type="submit"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>1RM 기록 추가하기</span>
          </button>
        </form>
      </div>

      {/* 4. 최근 1RM 기록 리스트 */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-white px-1">최근 1RM 기록</h4>
        {records.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center py-4">등록된 운동 기록이 없습니다.</p>
        ) : (
          records.map((r) => (
            <div
              key={r.id}
              className="bg-[#12141c] border border-[#1f2433] rounded-2xl p-3 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{r.exercise}</span>
                  <span className="text-xs font-black text-indigo-400 font-mono">
                    1RM {r.calculated1RM}kg
                  </span>
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  {r.weight}kg × {r.reps}회 · {r.date} {r.notes && `· ${r.notes}`}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDelete1RMRecord(r.id)}
                className="text-zinc-500 hover:text-rose-400 p-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
