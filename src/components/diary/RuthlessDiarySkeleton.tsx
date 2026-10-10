"use client";

import React, { useState, useEffect } from "react";
import {
  Flame,
  CheckCircle2,
  Circle,
  Clock,
  Save,
  BellRing,
  Settings,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  AlarmConfig,
  getAlarmConfig,
  saveAlarmConfig,
  scheduleRuthlessAlarm,
  triggerTestAlarm,
  playAlarmChime,
  requestAlarmPermission,
} from "@/lib/notifications/ruthlessAlarm";
import { onAuthChanged, saveArchivedDiariesToCloud, loadArchivedDiariesFromCloud } from "@/lib/firebase/client";
import type { User } from "firebase/auth";

export const RuthlessDiarySkeleton: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [diaryText, setDiaryText] = useState("");
  const [isSavedToday, setIsSavedToday] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string>("good");
  const [showSettings, setShowSettings] = useState(false);
  const [alarmConfig, setAlarmConfig] = useState<AlarmConfig>(getAlarmConfig());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [routines, setRoutines] = useState([
    { id: 1, title: "기상 후 미온수 한 잔", completed: true, streak: 15 },
    { id: 2, title: "오메가3 & 멀티비타민 섭취", completed: true, streak: 13 },
    { id: 3, title: "3대 운동 or 40분 유산소 러닝", completed: false, streak: 6 },
    { id: 4, title: "지독한 하루 감사 일기 작성", completed: false, streak: 10 },
  ]);

  // Load today's diary state from localStorage
  useEffect(() => {
    const todayKey = `life_os_diary_${new Date().toISOString().split("T")[0]}`;
    const saved = localStorage.getItem(todayKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setDiaryText(parsed.text || "");
        setSelectedMood(parsed.mood || "good");
        setIsSavedToday(true);
        setRoutines((prev) =>
          prev.map((r) => (r.id === 4 ? { ...r, completed: true } : r))
        );
      } catch (e) {
        console.error(e);
      }
    }

    const unsubscribe = onAuthChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        const cloudDiaries = await loadArchivedDiariesFromCloud(user.uid);
        if (cloudDiaries && Array.isArray(cloudDiaries)) {
          const todayEntry = cloudDiaries.find((d: { date: string }) => d.date === new Date().toISOString().split("T")[0]);
          if (todayEntry) {
            setDiaryText(todayEntry.text || "");
            setSelectedMood(todayEntry.mood || "good");
            setIsSavedToday(true);
            setRoutines((prev) =>
              prev.map((r) => (r.id === 4 ? { ...r, completed: true } : r))
            );
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync alarm status on mount or when isSavedToday changes
  useEffect(() => {
    scheduleRuthlessAlarm(isSavedToday).then((res) => {
      if (res.message) setStatusMessage(res.message);
    });
  }, [isSavedToday]);

  const toggleRoutine = (id: number) => {
    setRoutines(
      routines.map((r) =>
        r.id === id
          ? {
              ...r,
              completed: !r.completed,
              streak: !r.completed ? r.streak + 1 : Math.max(0, r.streak - 1),
            }
          : r
      )
    );
  };

  const handleSaveDiary = async () => {
    if (!diaryText.trim()) return;

    const todayDate = new Date().toISOString().split("T")[0];
    const todayKey = `life_os_diary_${todayDate}`;
    const diaryEntry = {
      date: todayDate,
      text: diaryText,
      mood: selectedMood,
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem(todayKey, JSON.stringify(diaryEntry));
    setIsSavedToday(true);
    playAlarmChime("success");

    // Mark routine 4 as completed
    setRoutines((prev) =>
      prev.map((r) => (r.id === 4 ? { ...r, completed: true, streak: r.streak + 1 } : r))
    );

    // Sync to Firestore cloud archive
    if (currentUser) {
      try {
        const existing = await loadArchivedDiariesFromCloud(currentUser.uid) || [];
        const updated = [
          diaryEntry,
          ...existing.filter((d: { date: string }) => d.date !== todayDate),
        ];
        await saveArchivedDiariesToCloud(currentUser.uid, updated);
        setStatusMessage("일기가 클라우드 & 로컬에 안전하게 저장되었습니다! 스누즈 알람이 해제되었습니다.");
      } catch {
        setStatusMessage("일기 저장 완료 (오프라인 모드). 스누즈 알람이 해제되었습니다.");
      }
    } else {
      setStatusMessage("일기 저장 완료 (로컬 보관). 스누즈 알람이 해제되었습니다.");
    }

    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleUpdateConfig = (newCfg: AlarmConfig) => {
    setAlarmConfig(newCfg);
    saveAlarmConfig(newCfg);
    scheduleRuthlessAlarm(isSavedToday);
  };

  const handleTestChime = async () => {
    const res = await triggerTestAlarm();
    setStatusMessage(res.message);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const moods = [
    { id: "great", label: "🔥 최상", color: "text-amber-400" },
    { id: "good", label: "😊 만족", color: "text-emerald-400" },
    { id: "neutral", label: "😐 무난", color: "text-zinc-400" },
    { id: "tired", label: "😴 피곤", color: "text-blue-400" },
    { id: "bad", label: "😡 힘듦", color: "text-rose-400" },
  ];

  return (
    <div className="space-y-4">
      {/* Ruthless Alarm Banner */}
      <div
        className={`p-4 rounded-3xl border transition-all ${
          isSavedToday
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            : "bg-gradient-to-r from-rose-950/40 via-red-950/30 to-[#12141c] border-rose-500/40 text-rose-300 shadow-lg shadow-rose-950/20"
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2.5">
            {isSavedToday ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <BellRing className="w-5 h-5 text-rose-400 shrink-0 animate-bounce" />
            )}
            <h3 className="text-sm font-bold text-white">
              {isSavedToday ? "오늘의 지독한 일기 작성 완료" : "지독한 알람 가동 중 : 일기 미작성"}
            </h3>
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs flex items-center gap-1 transition-all"
            title="알람 환경설정"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="text-[11px] font-mono">
              {alarmConfig.targetHour.toString().padStart(2, "0")}:{alarmConfig.targetMinute.toString().padStart(2, "0")}
            </span>
          </button>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed">
          {isSavedToday
            ? "오늘 하루 기록이 안전하게 보관되었습니다. 스트릭 +1 달성!"
            : `매일 밤 ${alarmConfig.targetHour}시 ${alarmConfig.targetMinute}분에 일기 쓸 때까지 5분 간격 무한 스누즈 알람이 작동합니다.`}
        </p>

        {statusMessage && (
          <div className="mt-2.5 text-[11px] text-zinc-300 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* Alarm Settings Modal / Drawer */}
      {showSettings && (
        <div className="bg-[#12141c] border border-indigo-500/30 rounded-3xl p-4 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-indigo-400" />
              지독한 알람 & 스누즈 상세 설정
            </h4>
            <button
              onClick={() => setShowSettings(false)}
              className="text-xs text-zinc-400 hover:text-white"
            >
              닫기
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">목표 알람 시간 (시)</label>
              <input
                type="number"
                min={0}
                max={23}
                value={alarmConfig.targetHour}
                onChange={(e) =>
                  handleUpdateConfig({ ...alarmConfig, targetHour: parseInt(e.target.value) || 0 })
                }
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">목표 알람 시간 (분)</label>
              <input
                type="number"
                min={0}
                max={59}
                value={alarmConfig.targetMinute}
                onChange={(e) =>
                  handleUpdateConfig({ ...alarmConfig, targetMinute: parseInt(e.target.value) || 0 })
                }
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs cursor-pointer">
              <span className="text-zinc-200 font-medium">5분 간격 무한 스누즈 (작성할 때까지)</span>
              <input
                type="checkbox"
                checked={alarmConfig.ruthlessMode}
                onChange={(e) => handleUpdateConfig({ ...alarmConfig, ruthlessMode: e.target.checked })}
                className="rounded accent-indigo-600"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs cursor-pointer">
              <span className="text-zinc-200 font-medium">신시사이저 차임벨 사운드</span>
              <input
                type="checkbox"
                checked={alarmConfig.soundEnabled}
                onChange={(e) => handleUpdateConfig({ ...alarmConfig, soundEnabled: e.target.checked })}
                className="rounded accent-indigo-600"
              />
            </label>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleTestChime}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 rounded-xl border border-zinc-700 transition-all"
            >
              <Play className="w-3 h-3 text-indigo-400" />
              <span>알람 소리 & 알림 즉시 테스트</span>
            </button>

            <button
              onClick={async () => {
                const granted = await requestAlarmPermission();
                setStatusMessage(granted ? "알림 권한이 허용되었습니다." : "알림 권한이 거부되었거나 지원되지 않습니다.");
              }}
              className="text-[11px] text-indigo-400 underline hover:text-indigo-300"
            >
              알림 권한 확인
            </button>
          </div>
        </div>
      )}

      {/* Diary Input Section */}
      <div className="bg-[#12141c] border border-[#1f2433] rounded-3xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold text-zinc-300">
              {new Date().toLocaleDateString("ko-KR", {
                month: "long",
                day: "numeric",
                weekday: "short",
              })}
            </span>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
            {moods.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMood(m.id)}
                className={`px-2.5 py-1 rounded-xl text-xs whitespace-nowrap transition-all min-h-[32px] ${
                  selectedMood === m.id
                    ? "bg-zinc-800 font-bold scale-105 border border-zinc-600 text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <textarea
          rows={4}
          value={diaryText}
          onChange={(e) => setDiaryText(e.target.value)}
          placeholder="오늘 하루의 가장 중요한 성취와 반성을 기록하세요. (저장 즉시 지독한 스누즈 알람이 해제되고 스트릭이 갱신됩니다)"
          className="w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
        />

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-zinc-500 font-mono">
            {diaryText.length}자 작성 중
          </span>
          <button
            onClick={handleSaveDiary}
            disabled={!diaryText.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/30 transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>일기 저장 & 알람 해제</span>
          </button>
        </div>
      </div>

      {/* Routine Tracker Checklist */}
      <div className="bg-[#12141c] border border-[#1f2433] rounded-3xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-bold text-white">데일리 루틴 & 스트릭</h3>
          </div>
          <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            {routines.filter((r) => r.completed).length} / {routines.length} 완료
          </span>
        </div>

        <div className="space-y-2">
          {routines.map((routine) => (
            <div
              key={routine.id}
              onClick={() => toggleRoutine(routine.id)}
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                routine.completed
                  ? "bg-zinc-900/60 border-zinc-800/80 text-zinc-400"
                  : "bg-zinc-900 border-zinc-800 text-white hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center gap-3">
                {routine.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                ) : (
                  <Circle className="w-4 h-4 text-zinc-600" />
                )}
                <span className={`text-xs font-medium ${routine.completed ? "line-through" : ""}`}>
                  {routine.title}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-orange-400 font-mono font-semibold">
                <Flame className="w-3 h-3 fill-orange-400" />
                <span>{routine.streak}일 연속</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
