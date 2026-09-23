"use client";

import React, { useState, useEffect } from "react";
import { Activity, Heart, Scale, Plus, RefreshCw, Footprints, Flame, Check } from "lucide-react";
import { onAuthChanged, saveHealthMetricsToCloud, loadHealthMetricsFromCloud } from "@/lib/firebase/client";
import { HealthKitData, getStoredHealthData, syncHealthKit } from "@/lib/healthkit/healthKitBridge";
import type { User } from "firebase/auth";

export interface BodyMetric {
  id: string;
  weight: number;
  muscleMass?: number;
  fatRatio?: number;
  systolicBp?: number;
  diastolicBp?: number;
  date: string;
}

const DEFAULT_METRICS: BodyMetric[] = [
  { id: "bm-1", weight: 74.5, muscleMass: 35.2, fatRatio: 16.8, systolicBp: 118, diastolicBp: 78, date: "2026-09-22" },
  { id: "bm-2", weight: 75.1, muscleMass: 34.8, fatRatio: 17.5, systolicBp: 122, diastolicBp: 80, date: "2026-09-15" },
];

const METRICS_STORAGE_KEY = "life_os_body_metrics_v1";

export const BodyMetricsCard: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [metrics, setMetrics] = useState<BodyMetric[]>(DEFAULT_METRICS);
  const [healthKitData, setHealthKitData] = useState<HealthKitData>(getStoredHealthData());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const [weight, setWeight] = useState<number>(74.5);
  const [muscle, setMuscle] = useState<number>(35.2);
  const [fat, setFat] = useState<number>(16.5);
  const [systolic, setSystolic] = useState<number>(120);
  const [diastolic, setDiastolic] = useState<number>(80);

  const [showInputModal, setShowInputModal] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(METRICS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) setMetrics(parsed);
      }
    } catch {}

    const unsubscribe = onAuthChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        const cloudMetrics = await loadHealthMetricsFromCloud(user.uid);
        if (cloudMetrics && Array.isArray(cloudMetrics) && cloudMetrics.length > 0) {
          setMetrics(cloudMetrics);
          try {
            localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(cloudMetrics));
          } catch {}
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSyncHealthKit = async () => {
    setIsSyncing(true);
    const res = await syncHealthKit();
    setHealthKitData(res.data);
    setSyncStatus(res.message);
    setIsSyncing(false);
    setTimeout(() => setSyncStatus(null), 4000);
  };

  const updateMetrics = (newMetrics: BodyMetric[]) => {
    setMetrics(newMetrics);
    try {
      localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(newMetrics));
    } catch {}
    if (currentUser) {
      saveHealthMetricsToCloud(currentUser.uid, newMetrics);
    }
  };

  const handleAddMetric = (e: React.FormEvent) => {
    e.preventDefault();
    const newM: BodyMetric = {
      id: "bm-" + Date.now(),
      weight,
      muscleMass: muscle || undefined,
      fatRatio: fat || undefined,
      systolicBp: systolic || undefined,
      diastolicBp: diastolic || undefined,
      date: new Date().toISOString().split("T")[0],
    };

    updateMetrics([newM, ...metrics]);
    setShowInputModal(false);
  };

  const latest = metrics[0] || DEFAULT_METRICS[0];

  return (
    <div className="space-y-4">
      {/* Apple HealthKit Sync Live Panel */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-[#12141c] border border-indigo-500/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
              <Heart className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                Apple HealthKit 실시간 연동
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20">
                  {healthKitData.source === "apple_healthkit" ? "iOS Native" : "동기화 모듈"}
                </span>
              </h4>
              <p className="text-[10px] text-zinc-400">
                마지막 동기화: {healthKitData.lastSyncTime}
              </p>
            </div>
          </div>

          <button
            onClick={handleSyncHealthKit}
            disabled={isSyncing}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold rounded-xl border border-indigo-400/20 active:scale-95 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "동기화 중..." : "동기화"}</span>
          </button>
        </div>

        {syncStatus && (
          <div className="text-[11px] text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" />
            <span>{syncStatus}</span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="bg-[#12141c]/80 border border-[#1f2433] rounded-2xl p-2.5 text-center">
            <div className="flex items-center justify-center text-indigo-400 mb-1">
              <Footprints className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-zinc-400 block">오늘 걸음 수</span>
            <span className="text-sm font-bold text-white font-mono">
              {healthKitData.stepCount.toLocaleString()}
            </span>
            <span className="text-[9px] text-zinc-500 block">{healthKitData.walkingDistanceKm} km</span>
          </div>

          <div className="bg-[#12141c]/80 border border-[#1f2433] rounded-2xl p-2.5 text-center">
            <div className="flex items-center justify-center text-orange-400 mb-1">
              <Flame className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-zinc-400 block">활동 칼로리</span>
            <span className="text-sm font-bold text-white font-mono">
              {healthKitData.activeCalories}
            </span>
            <span className="text-[9px] text-zinc-500 block">kcal 소모</span>
          </div>

          <div className="bg-[#12141c]/80 border border-[#1f2433] rounded-2xl p-2.5 text-center">
            <div className="flex items-center justify-center text-rose-400 mb-1">
              <Heart className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-zinc-400 block">안정시 심박수</span>
            <span className="text-sm font-bold text-white font-mono">
              {healthKitData.restingHeartRate}
            </span>
            <span className="text-[9px] text-zinc-500 block">BPM</span>
          </div>
        </div>
      </div>

      {/* Latest Metrics Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#12141c] border border-[#1f2433] rounded-3xl p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold">체중</span>
            <Scale className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-white font-mono">{latest.weight}</span>
            <span className="text-xs font-bold text-zinc-400">kg</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono mt-1 block">골격근량 {latest.muscleMass || "-"}kg</span>
        </div>

        <div className="bg-[#12141c] border border-[#1f2433] rounded-3xl p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold">체지방률</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-white font-mono">{latest.fatRatio}</span>
            <span className="text-xs font-bold text-zinc-400">%</span>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono mt-1 block">표준 건강 범위</span>
        </div>

        <div className="col-span-2 bg-[#12141c] border border-[#1f2433] rounded-3xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">최근 측정 혈압</span>
              <span className="text-xs text-zinc-400 font-mono">
                {latest.systolicBp || 120} / {latest.diastolicBp || 80} mmHg (정상)
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowInputModal(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>지표 기록</span>
          </button>
        </div>
      </div>

      {/* Input Modal */}
      {showInputModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#12141c] border border-zinc-800 rounded-3xl w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white">신체 건강 지표 기록</h3>
              <button onClick={() => setShowInputModal(false)} className="text-xs text-zinc-400">
                닫기
              </button>
            </div>

            <form onSubmit={handleAddMetric} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">체중 (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-2 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">골격근량 (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={muscle}
                    onChange={(e) => setMuscle(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-2 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">체지방률 (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={fat}
                    onChange={(e) => setFat(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-2 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">수축기 혈압 (mmHg)</label>
                  <input
                    type="number"
                    value={systolic}
                    onChange={(e) => setSystolic(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-2 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">이완기 혈압 (mmHg)</label>
                  <input
                    type="number"
                    value={diastolic}
                    onChange={(e) => setDiastolic(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-2 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowInputModal(false)}
                  className="flex-1 py-2.5 bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/30"
                >
                  지표 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
