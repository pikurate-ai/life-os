"use client";

import React, { useState, useEffect } from "react";
import { Activity, Heart, Scale, Plus, RefreshCw, Footprints, Flame, Check, CheckCircle2, Clock, TrendingDown, TrendingUp, Waves, Dumbbell, Trash2, Edit3, X, Info } from "lucide-react";
import {
  onAuthChanged,
  saveHealthMetricsToCloud,
  loadHealthMetricsFromCloud,
  subscribeHealthMetricsFromCloud,
  mergeItemsById,
} from "@/lib/firebase/client";
import { HealthKitData, getStoredHealthData, saveStoredHealthData, syncHealthKit } from "@/lib/healthkit/healthKitBridge";
import { triggerVibration } from "@/lib/notifications/ruthlessAlarm";

export interface BodyMetric {
  id: string;
  weight: number;
  measuredAt: string; // YYYY-MM-DD HH:mm
  date: string; // YYYY-MM-DD
  muscleMass?: number;
  fatRatio?: number;
  systolicBp?: number;
  diastolicBp?: number;
  notes?: string;
}

const DEFAULT_METRICS: BodyMetric[] = [
  { id: "bm-1", weight: 74.2, measuredAt: "2026-10-14 07:30", date: "2026-10-14", muscleMass: 35.4, fatRatio: 16.2, notes: "기상 직후 공복 체중" },
  { id: "bm-2", weight: 74.6, measuredAt: "2026-10-13 07:35", date: "2026-10-13", muscleMass: 35.2, fatRatio: 16.5, notes: "수영 후 측정" },
  { id: "bm-3", weight: 75.1, measuredAt: "2026-10-11 08:00", date: "2026-10-11", muscleMass: 35.0, fatRatio: 16.8, notes: "주말 아침" },
];

const METRICS_STORAGE_KEY = "life_os_body_metrics_v2";

export const BodyMetricsCard: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [metrics, setMetrics] = useState<BodyMetric[]>(DEFAULT_METRICS);
  const [healthKitData, setHealthKitData] = useState<HealthKitData>(getStoredHealthData());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // New weight input state
  const [showInputModal, setShowInputModal] = useState(false);
  const [newWeight, setNewWeight] = useState<number>(74.2);
  const [newMuscle, setNewMuscle] = useState<number>(35.4);
  const [newFat, setNewFat] = useState<number>(16.2);
  const [newDate, setNewDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [newTime, setNewTime] = useState<string>(
    new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })
  );
  const [newNotes, setNewNotes] = useState<string>("기상 직후 공복 측정");

  // HealthKit direct user edit state
  const [showHealthEditModal, setShowHealthEditModal] = useState(false);
  const [editActiveCalories, setEditActiveCalories] = useState<number>(healthKitData.activeCalories);
  const [editSwimmingCalories, setEditSwimmingCalories] = useState<number>(380);
  const [editSwimmingMeters, setEditSwimmingMeters] = useState<number>(healthKitData.swimmingDistanceMeters);
  const [editSwimmingMinutes, setEditSwimmingMinutes] = useState<number>(healthKitData.swimmingMinutes);
  const [editSteps, setEditSteps] = useState<number>(healthKitData.stepCount);
  const [editMaxHr, setEditMaxHr] = useState<number>(healthKitData.maxHeartRate);
  const [editWorkoutMinutes, setEditWorkoutMinutes] = useState<number>(healthKitData.totalWorkoutMinutes);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(METRICS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMetrics(parsed.sort((a: BodyMetric, b: BodyMetric) => (b.measuredAt || b.date).localeCompare(a.measuredAt || a.date)));
        }
      }
    } catch {}

    let unsubscribeSnapshot: (() => void) | null = null;
    const unsubscribe = onAuthChanged(async (user) => {
      setCurrentUser(user);
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (user) {
        try {
          const cloudMetrics = await loadHealthMetricsFromCloud(user);
          const currentSaved = localStorage.getItem(METRICS_STORAGE_KEY);
          const localList: BodyMetric[] = currentSaved ? JSON.parse(currentSaved) : DEFAULT_METRICS;

          const merged = mergeItemsById<BodyMetric>(localList, cloudMetrics || []);
          if (merged.length > 0) {
            setMetrics(merged.sort((a, b) => (b.measuredAt || b.date).localeCompare(a.measuredAt || a.date)));
            try {
              localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(merged));
            } catch {}
            await saveHealthMetricsToCloud(user, merged);
          }

          unsubscribeSnapshot = subscribeHealthMetricsFromCloud(user, (realtimeMetrics) => {
            if (realtimeMetrics && Array.isArray(realtimeMetrics)) {
              setMetrics((prevLocal) => {
                const updated = mergeItemsById<BodyMetric>(prevLocal, realtimeMetrics);
                try {
                  localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(updated));
                } catch {}
                return updated.sort((a, b) => (b.measuredAt || b.date).localeCompare(a.measuredAt || a.date));
              });
            }
          });
        } catch (e) {
          console.error("Health metrics sync error:", e);
        }
      }
    });

    return () => {
      unsubscribe();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  // Save new Weight Metric
  const handleAddMetric = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeight || newWeight <= 0) return;

    const measuredAt = `${newDate} ${newTime}`;
    const newEntry: BodyMetric = {
      id: `bm-${Date.now()}`,
      weight: parseFloat(newWeight.toString()),
      measuredAt,
      date: newDate,
      muscleMass: newMuscle > 0 ? parseFloat(newMuscle.toString()) : undefined,
      fatRatio: newFat > 0 ? parseFloat(newFat.toString()) : undefined,
      notes: newNotes.trim() || undefined,
    };

    const updated = [newEntry, ...metrics.filter((m) => m.measuredAt !== measuredAt)].sort(
      (a, b) => (b.measuredAt || b.date).localeCompare(a.measuredAt || a.date)
    );

    setMetrics(updated);
    try {
      localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    if (currentUser) {
      saveHealthMetricsToCloud(currentUser, updated);
    }

    setShowInputModal(false);
    triggerVibration([100, 50, 100]);
  };

  const handleDeleteMetric = (id: string) => {
    if (!confirm("이 체중 기록을 삭제하시겠습니까?")) return;
    const updated = metrics.filter((m) => m.id !== id);
    setMetrics(updated);
    try {
      localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    if (currentUser) {
      saveHealthMetricsToCloud(currentUser, updated);
    }
  };

  // Sync Apple HealthKit
  const handleSyncHealthKit = async () => {
    setIsSyncing(true);
    triggerVibration(40);
    const res = await syncHealthKit();
    setIsSyncing(false);
    setHealthKitData(res.data);
    setSyncStatus(res.message);
    triggerVibration([80, 50, 80]);
    setTimeout(() => setSyncStatus(null), 3500);
  };

  const openHealthEditModal = () => {
    setEditActiveCalories(healthKitData.activeCalories);
    setEditSwimmingCalories(healthKitData.todayWorkouts[0]?.caloriesBurned || 380);
    setEditSwimmingMeters(healthKitData.swimmingDistanceMeters || 1250);
    setEditSwimmingMinutes(healthKitData.swimmingMinutes || 45);
    setEditSteps(healthKitData.stepCount);
    setEditMaxHr(healthKitData.maxHeartRate);
    setEditWorkoutMinutes(healthKitData.totalWorkoutMinutes);
    setShowHealthEditModal(true);
    triggerVibration(40);
  };

  const handleSaveHealthEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const timeNow = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    const updated: HealthKitData = {
      ...healthKitData,
      activeCalories: editActiveCalories,
      swimmingDistanceMeters: editSwimmingMeters,
      swimmingMinutes: editSwimmingMinutes,
      stepCount: editSteps,
      maxHeartRate: editMaxHr,
      totalWorkoutMinutes: editWorkoutMinutes,
      lastSyncTime: `${timeNow} (직접 수정)`,
      source: "apple_healthkit",
      todayWorkouts: [
        {
          type: "아침 수영 (자유형/평영)",
          durationMin: editSwimmingMinutes,
          caloriesBurned: editSwimmingCalories,
          distanceMeters: editSwimmingMeters,
          maxHeartRate: editMaxHr,
          avgHeartRate: Math.max(100, editMaxHr - 30),
          timeString: "06:40 - 07:25",
        },
        ...(healthKitData.todayWorkouts.slice(1) || []),
      ],
    };

    setHealthKitData(updated);
    saveStoredHealthData(updated);
    setShowHealthEditModal(false);
    setSyncStatus("오늘의 실제 건강 지표가 정상적으로 저장되었습니다!");
    triggerVibration([80, 40, 80]);
    setTimeout(() => setSyncStatus(null), 3000);
  };

  // Most recent weight entry
  const latestMetric = metrics[0] || DEFAULT_METRICS[0];
  const previousMetric = metrics[1];
  const weightDiff = previousMetric ? Number((latestMetric.weight - previousMetric.weight).toFixed(1)) : 0;

  return (
    <div className="space-y-4">
      {/* 1. TOP SECTION: 가장 최근 체중 기록 대형 카드 */}
      <div className="bg-gradient-to-br from-indigo-950/80 via-slate-950 to-[#12141c] border-2 border-indigo-500/40 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">가장 최근 신체 체중 기록</h3>
          </div>
          <button
            type="button"
            onClick={() => setShowInputModal(true)}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>체중 기록하기</span>
          </button>
        </div>

        {/* Hero Recent Weight Display */}
        <div className="bg-black/40 p-4 rounded-2xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-white font-mono tracking-tight">
                {latestMetric.weight}
              </span>
              <span className="text-base font-bold text-indigo-400">kg</span>

              {weightDiff !== 0 && (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 font-mono ${
                    weightDiff < 0
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  }`}
                >
                  {weightDiff < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                  <span>{weightDiff > 0 ? `+${weightDiff}` : weightDiff} kg</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-400">
              <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="font-mono font-semibold text-zinc-300">
                측정 시점: {latestMetric.measuredAt || latestMetric.date}
              </span>
              {latestMetric.notes && (
                <span className="text-zinc-500 truncate max-w-[150px]">({latestMetric.notes})</span>
              )}
            </div>
          </div>

          {/* Sub Body Metrics (Muscle & Fat) */}
          <div className="flex items-center gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
            <div className="bg-[#12141c] px-3 py-2 rounded-xl border border-white/5 text-center min-w-[75px]">
              <span className="text-[10px] text-zinc-400 block">골격근량</span>
              <span className="text-xs font-bold text-emerald-400 font-mono">
                {latestMetric.muscleMass ? `${latestMetric.muscleMass}kg` : "-"}
              </span>
            </div>
            <div className="bg-[#12141c] px-3 py-2 rounded-xl border border-white/5 text-center min-w-[75px]">
              <span className="text-[10px] text-zinc-400 block">체지방률</span>
              <span className="text-xs font-bold text-amber-400 font-mono">
                {latestMetric.fatRatio ? `${latestMetric.fatRatio}%` : "-"}
              </span>
            </div>
          </div>
        </div>

        {/* Weight History Timeline */}
        <div className="space-y-2 pt-1 border-t border-white/10">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold">
            <span>체중 측정 히스토리 ({metrics.length}회 기록됨)</span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {metrics.map((m, idx) => (
              <div
                key={m.id}
                className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-2.5 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white font-mono">{m.weight}kg</span>
                    <span className="text-[11px] font-mono text-zinc-400">{m.measuredAt || m.date}</span>
                    {idx === 0 && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 font-bold">
                        최신
                      </span>
                    )}
                  </div>
                  {(m.muscleMass || m.fatRatio || m.notes) && (
                    <div className="text-[10px] text-zinc-500 mt-0.5">
                      {m.muscleMass && `골격근 ${m.muscleMass}kg · `}
                      {m.fatRatio && `체지방 ${m.fatRatio}% `}
                      {m.notes && `· ${m.notes}`}
                    </div>
                  )}
                </div>

                {metrics.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteMetric(m.id)}
                    className="p-1 text-zinc-600 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. APPLE HEALTHKIT & WORKOUT DASHBOARD (수영 & 턱걸이 & 칼로리 & 걸음수 & 최대심박수) */}
      <div className="bg-[#12141c] border border-[#1f2433] rounded-3xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30 font-bold">
                  Apple HealthKit
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {healthKitData.lastSyncTime} 기준
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mt-0.5">오늘의 운동 & 피트니스 지표</h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={openHealthEditModal}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs font-bold flex items-center gap-1 border border-indigo-500/30 transition-all shrink-0 whitespace-nowrap min-h-[36px]"
              title="내 실제 건강 수치 직접 수정"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>수치 수정</span>
            </button>
            <button
              type="button"
              onClick={handleSyncHealthKit}
              disabled={isSyncing}
              className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs flex items-center gap-1 border border-zinc-800 transition-all shrink-0 whitespace-nowrap min-h-[36px]"
              title="애플 건강 데이터 실시간 갱신"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-rose-400 ${isSyncing ? "animate-spin" : ""}`} />
              <span className="font-bold">동기화</span>
            </button>
          </div>
        </div>

        {/* Apple Health Web Notice Banner */}
        <div className="p-2.5 rounded-xl bg-blue-950/30 border border-blue-500/20 text-[11px] text-zinc-300 flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="text-blue-300 font-bold block mb-0.5">실제 애플 건강 데이터 반영 안내:</span>
            아이폰 Safari 브라우저는 애플 보안 정책상 네이티브 건강 앱의 비공개 DB 자동 읽기를 제한합니다. 오늘 실제 건강 앱의 <strong>수영 칼로리·시간·심박수</strong>를 우측 상단 <strong>[수치 수정]</strong> 버튼으로 입력하시면 기기와 클라우드에 실제 수치로 영구 보존됩니다!
          </div>
        </div>

        {syncStatus && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{syncStatus}</span>
          </div>
        )}

        {/* Core Fitness 4-Grid Dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Active Calories */}
          <div className="bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold">
              <Flame className="w-4 h-4 fill-rose-400" />
              <span>활동 칼로리</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-white font-mono">{healthKitData.activeCalories}</span>
              <span className="text-xs text-zinc-400">kcal</span>
            </div>
          </div>

          {/* Workout Minutes */}
          <div className="bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
              <Activity className="w-4 h-4" />
              <span>총 운동 시간</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-white font-mono">{healthKitData.totalWorkoutMinutes}</span>
              <span className="text-xs text-zinc-400">분</span>
            </div>
          </div>

          {/* Step Count */}
          <div className="bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-blue-400 font-semibold">
              <Footprints className="w-4 h-4" />
              <span>일일 걸음수</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-white font-mono">{healthKitData.stepCount.toLocaleString()}</span>
              <span className="text-xs text-zinc-400">보</span>
            </div>
          </div>

          {/* Heart Rate: Max & Resting */}
          <div className="bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
              <Heart className="w-4 h-4" />
              <span>최대 심박수</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-white font-mono">{healthKitData.maxHeartRate}</span>
              <span className="text-xs text-zinc-400">bpm</span>
              <span className="text-[10px] text-zinc-500 ml-1">/ 안 {healthKitData.restingHeartRate}</span>
            </div>
          </div>
        </div>

        {/* Daily Workout Sessions (Morning Swimming & Pull-ups) */}
        <div className="space-y-2 pt-1 border-t border-zinc-800">
          <span className="text-xs font-bold text-white block">오늘 기록된 맞춤 운동 세션:</span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* 1. Morning Swimming Card */}
            <div className="bg-gradient-to-r from-blue-950/40 to-cyan-950/20 border border-blue-500/30 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center">
                    <Waves className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">아침 수영 (자유형/평영)</h5>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      06:40 - 07:25 ({healthKitData.swimmingMinutes}분)
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-cyan-300 font-mono">
                  {healthKitData.swimmingDistanceMeters}m
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-300 pt-1 border-t border-white/5 font-mono">
                <span>소모 {healthKitData.todayWorkouts[0]?.caloriesBurned || 380} kcal</span>
                <span>최대 심박 {healthKitData.todayWorkouts[0]?.maxHeartRate || healthKitData.maxHeartRate} bpm</span>
                <span>{healthKitData.swimmingDistanceMeters > 0 ? `${Math.round(healthKitData.swimmingDistanceMeters / 25)}바퀴` : "완주"}</span>
              </div>
            </div>

            {/* 2. Pull-up & Core Card */}
            <div className="bg-gradient-to-r from-indigo-950/40 to-purple-950/20 border border-indigo-500/30 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
                    <Dumbbell className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">턱걸이 & 상체 코어 루틴</h5>
                    <span className="text-[10px] text-zinc-400 font-mono">18:30 - 19:05 (35분)</span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-indigo-300 font-mono">
                  총 {healthKitData.pullupCompletedToday}회 완주
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-300 pt-1 border-t border-white/5 font-mono">
                <span>소모 300 kcal</span>
                <span>최대 심박 154 bpm</span>
                <span>전 세트 데드행</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: New Weight & Metric Input */}
      {showInputModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAddMetric}
            className="bg-[#12141c] border border-zinc-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95"
          >
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-indigo-400" />
              신체 체중 및 지표 측정 기록
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">측정 일자</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">측정 시각</label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">체중 (kg) *</label>
              <input
                type="number"
                step="0.1"
                min="30"
                max="250"
                value={newWeight}
                onChange={(e) => setNewWeight(parseFloat(e.target.value) || 0)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white font-bold font-mono focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">골격근량 (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newMuscle}
                  onChange={(e) => setNewMuscle(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">체지방률 (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newFat}
                  onChange={(e) => setNewFat(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">측정 조건 / 메모</label>
              <input
                type="text"
                placeholder="예: 기상 직후 공복, 수영 후 측정 등"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowInputModal(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
              >
                저장하기
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Direct HealthKit Metrics Edit */}
      {showHealthEditModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveHealthEdit}
            className="bg-[#12141c] border border-zinc-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-indigo-400" />
                내 실제 운동 & 건강 데이터 직접 입력
              </h4>
              <button
                type="button"
                onClick={() => setShowHealthEditModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              아이폰 건강 앱에서 오늘 확인하신 실제 수치를 입력하세요. 저장 즉시 라이프 OS에 반영되고 영구 보존됩니다.
            </p>

            <div className="space-y-3">
              {/* Active Calories */}
              <div>
                <label className="text-xs text-rose-400 font-bold block mb-1">오늘 총 활동 칼로리 (kcal)</label>
                <input
                  type="number"
                  min={0}
                  max={10000}
                  value={editActiveCalories}
                  onChange={(e) => setEditActiveCalories(parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold"
                  required
                />
              </div>

              {/* Swimming Calories & Distance */}
              <div className="p-3 rounded-2xl bg-blue-950/20 border border-blue-500/20 space-y-2.5">
                <span className="text-xs font-bold text-cyan-300 block">🏊 아침 수영 세션 실제 수치</span>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">수영 소모 칼로리 (kcal)</label>
                    <input
                      type="number"
                      min={0}
                      value={editSwimmingCalories}
                      onChange={(e) => setEditSwimmingCalories(parseInt(e.target.value) || 0)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">수영 거리 (미터)</label>
                    <input
                      type="number"
                      min={0}
                      step={25}
                      value={editSwimmingMeters}
                      onChange={(e) => setEditSwimmingMeters(parseInt(e.target.value) || 0)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">수영 진행 시간 (분)</label>
                  <input
                    type="number"
                    min={1}
                    value={editSwimmingMinutes}
                    onChange={(e) => setEditSwimmingMinutes(parseInt(e.target.value) || 0)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold"
                  />
                </div>
              </div>

              {/* Steps & Workout minutes */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">오늘 걸음 수 (보)</label>
                  <input
                    type="number"
                    min={0}
                    value={editSteps}
                    onChange={(e) => setEditSteps(parseInt(e.target.value) || 0)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">최대 심박수 (bpm)</label>
                  <input
                    type="number"
                    min={40}
                    max={230}
                    value={editMaxHr}
                    onChange={(e) => setEditMaxHr(parseInt(e.target.value) || 0)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">오늘 총 운동 시간 (분)</label>
                <input
                  type="number"
                  min={0}
                  value={editWorkoutMinutes}
                  onChange={(e) => setEditWorkoutMinutes(parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowHealthEditModal(false)}
                className="px-3 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
              >
                닫기
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>실제 수치로 저장</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
