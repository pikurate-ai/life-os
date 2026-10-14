"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Flame,
  CheckCircle2,
  Circle,
  Clock,
  Save,
  BellRing,
  BellOff,
  Settings,
  Play,
  RotateCcw,
  Sparkles,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  Search,
  BookOpen,
  Check,
  X,
  Volume2,
} from "lucide-react";
import {
  AlarmConfig,
  getAlarmConfig,
  saveAlarmConfig,
  scheduleRuthlessAlarm,
  triggerTestAlarm,
  playAlarmChime,
  triggerVibration,
  requestAlarmPermission,
} from "@/lib/notifications/ruthlessAlarm";
import { onAuthChanged, saveArchivedDiariesToCloud, loadArchivedDiariesFromCloud } from "@/lib/firebase/client";
import type { User } from "firebase/auth";

export interface DiaryEntry {
  date: string; // YYYY-MM-DD
  text: string;
  mood: string;
  savedAt?: string;
}

export interface RoutineItem {
  id: number;
  title: string;
  completed: boolean;
  streak: number;
}

const DEFAULT_ROUTINES: RoutineItem[] = [
  { id: 1, title: "기상 후 미온수 한 잔", completed: true, streak: 15 },
  { id: 2, title: "오메가3 & 멀티비타민 섭취", completed: true, streak: 13 },
  { id: 3, title: "3대 운동 or 40분 유산소 러닝", completed: false, streak: 6 },
  { id: 4, title: "지독한 하루 감사 일기 작성", completed: false, streak: 10 },
];

const ROUTINES_STORAGE_KEY = "life_os_daily_routines_v2";
const ARCHIVES_STORAGE_KEY = "life_os_archived_diaries_v1";

const getTodayString = () => new Date().toISOString().split("T")[0];

export const RuthlessDiarySkeleton: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Date selection state
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [diaryText, setDiaryText] = useState("");
  const [selectedMood, setSelectedMood] = useState<string>("good");
  const [isSavedToday, setIsSavedToday] = useState(false);

  // Save UI states
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Alarm states
  const [showSettings, setShowSettings] = useState(false);
  const [alarmConfig, setAlarmConfig] = useState<AlarmConfig>(getAlarmConfig());
  const [isAlarmRinging, setIsAlarmRinging] = useState(false);
  const lastAlarmTriggerRef = useRef<number>(0);

  // Routines state
  const [routines, setRoutines] = useState<RoutineItem[]>(DEFAULT_ROUTINES);
  const [editingRoutine, setEditingRoutine] = useState<RoutineItem | null>(null);
  const [showAddRoutineModal, setShowAddRoutineModal] = useState(false);
  const [newRoutineTitle, setNewRoutineTitle] = useState("");
  const [newRoutineStreak, setNewRoutineStreak] = useState<number>(0);

  // History & Archive
  const [allDiaries, setAllDiaries] = useState<DiaryEntry[]>([]);
  const [searchArchiveQuery, setSearchArchiveQuery] = useState("");
  const [showArchiveSection, setShowArchiveSection] = useState(true);

  const todayStr = getTodayString();
  const isSelectedDateToday = selectedDate === todayStr;

  // 1. Initial Load: Routines & All Diaries
  useEffect(() => {
    // Load routines
    try {
      const savedRoutines = localStorage.getItem(ROUTINES_STORAGE_KEY);
      if (savedRoutines) {
        const parsed = JSON.parse(savedRoutines);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRoutines(parsed);
        }
      }
    } catch (e) {
      console.warn("Failed loading routines:", e);
    }

    // Load archived diaries
    loadAllDiariesFromLocalAndCloud();

    // Load today's initial saved state
    checkTodaySavedState();

    // Firebase Auth listener
    const unsubscribe = onAuthChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const cloudDiaries = await loadArchivedDiariesFromCloud(user.uid);
          if (cloudDiaries && Array.isArray(cloudDiaries)) {
            syncCloudDiaries(cloudDiaries);
          }
        } catch (e) {
          console.warn("Cloud diaries sync error:", e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Load diary when selectedDate changes
  useEffect(() => {
    loadDiaryForDate(selectedDate);
  }, [selectedDate]);

  // 3. Real-time In-App Alarm Runner (checks every 20 seconds)
  useEffect(() => {
    const checkAlarmTime = () => {
      if (!alarmConfig.enabled || isSavedToday) {
        if (isAlarmRinging) setIsAlarmRinging(false);
        return;
      }

      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // Check if current time is at or past target time
      const isTargetPassed =
        currentHour > alarmConfig.targetHour ||
        (currentHour === alarmConfig.targetHour && currentMinute >= alarmConfig.targetMinute);

      if (isTargetPassed) {
        const nowMs = Date.now();
        // Trigger sound + vibration every 3 minutes if past target time and diary not saved
        if (nowMs - lastAlarmTriggerRef.current > 180000 || lastAlarmTriggerRef.current === 0) {
          lastAlarmTriggerRef.current = nowMs;
          setIsAlarmRinging(true);
          if (alarmConfig.soundEnabled) {
            playAlarmChime("alert");
          }
          triggerVibration([500, 200, 500, 200, 800]);
        }
      }
    };

    checkAlarmTime();
    const interval = setInterval(checkAlarmTime, 20000);
    return () => clearInterval(interval);
  }, [alarmConfig, isSavedToday, isAlarmRinging]);

  // Load diaries from local storage
  const loadAllDiariesFromLocalAndCloud = () => {
    try {
      const saved = localStorage.getItem(ARCHIVES_STORAGE_KEY);
      if (saved) {
        const parsed: DiaryEntry[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setAllDiaries(parsed.sort((a, b) => b.date.localeCompare(a.date)));
        }
      }
    } catch {}
  };

  const syncCloudDiaries = (cloudList: any[]) => {
    const formatted: DiaryEntry[] = cloudList.map((item) => ({
      date: item.date || item.id,
      text: item.text || item.content || "",
      mood: item.mood || "good",
      savedAt: item.savedAt || item.updatedAt || new Date().toISOString(),
    }));

    setAllDiaries((prev) => {
      const map = new Map<string, DiaryEntry>();
      prev.forEach((d) => map.set(d.date, d));
      formatted.forEach((d) => map.set(d.date, d));
      const merged = Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
      try {
        localStorage.setItem(ARCHIVES_STORAGE_KEY, JSON.stringify(merged));
      } catch {}
      return merged;
    });

    // Check if today's entry exists in cloud
    const today = getTodayString();
    const todayCloud = formatted.find((d) => d.date === today);
    if (todayCloud && selectedDate === today) {
      setDiaryText(todayCloud.text);
      setSelectedMood(todayCloud.mood);
      setIsSavedToday(true);
    }
  };

  const checkTodaySavedState = () => {
    const today = getTodayString();
    const todayKey = `life_os_diary_${today}`;
    const saved = localStorage.getItem(todayKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.text && parsed.text.trim()) {
          setIsSavedToday(true);
        }
      } catch {}
    }
  };

  const loadDiaryForDate = (date: string) => {
    const dateKey = `life_os_diary_${date}`;
    const saved = localStorage.getItem(dateKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setDiaryText(parsed.text || "");
        setSelectedMood(parsed.mood || "good");
        if (date === todayStr) setIsSavedToday(true);
        return;
      } catch {}
    }

    // Fallback to allDiaries array
    const entry = allDiaries.find((d) => d.date === date);
    if (entry) {
      setDiaryText(entry.text || "");
      setSelectedMood(entry.mood || "good");
      if (date === todayStr) setIsSavedToday(true);
    } else {
      setDiaryText("");
      setSelectedMood("good");
      if (date === todayStr) setIsSavedToday(false);
    }
  };

  // Date Navigation Handlers
  const changeDateByOffset = (offsetDays: number) => {
    const [year, month, day] = selectedDate.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day);
    dateObj.setDate(dateObj.getDate() + offsetDays);
    const newDateStr = dateObj.toISOString().split("T")[0];

    // Prevent future dates beyond today
    if (newDateStr > todayStr) {
      showToast("미래 날짜의 일기는 작성할 수 없습니다.");
      return;
    }
    setSelectedDate(newDateStr);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Save Diary Handler (Guaranteed Feedback & Vibration & Cloud Sync)
  const handleSaveDiary = async () => {
    if (!diaryText.trim()) {
      showToast("일기 내용을 입력해주세요!");
      return;
    }

    setSaveStatus("saving");
    triggerVibration([80, 50, 80]);

    const entry: DiaryEntry = {
      date: selectedDate,
      text: diaryText.trim(),
      mood: selectedMood,
      savedAt: new Date().toISOString(),
    };

    // 1. Save local date key
    const dateKey = `life_os_diary_${selectedDate}`;
    localStorage.setItem(dateKey, JSON.stringify(entry));

    // 2. Update allDiaries list
    const updatedList = [
      entry,
      ...allDiaries.filter((d) => d.date !== selectedDate),
    ].sort((a, b) => b.date.localeCompare(a.date));

    setAllDiaries(updatedList);
    try {
      localStorage.setItem(ARCHIVES_STORAGE_KEY, JSON.stringify(updatedList));
    } catch {}

    // 3. Mark routine 4 as completed if saving today's diary
    if (isSelectedDateToday) {
      setIsSavedToday(true);
      setIsAlarmRinging(false);
      setRoutines((prev) => {
        const updated = prev.map((r) =>
          r.id === 4 ? { ...r, completed: true, streak: r.streak + (r.completed ? 0 : 1) } : r
        );
        saveRoutinesToStorage(updated);
        return updated;
      });
      // Sound chime & cancel native alarm
      playAlarmChime("success");
      scheduleRuthlessAlarm(true);
    } else {
      triggerVibration([100, 50, 100]);
    }

    // 4. Firestore Cloud Sync
    if (currentUser) {
      try {
        const cloudFormatted = updatedList.map((d) => ({
          id: `diary-${d.date}`,
          date: d.date,
          title: `${d.date} 감사 일기`,
          content: d.text,
          mood: d.mood,
          source: "direct",
          updatedAt: d.savedAt,
        }));
        await saveArchivedDiariesToCloud(currentUser.uid, cloudFormatted);
      } catch (err) {
        console.warn("Cloud save warning:", err);
      }
    }

    // Visual feedback
    setSaveStatus("saved");
    showToast(
      isSelectedDateToday
        ? "🎉 오늘의 일기 저장 완료! 스트릭이 갱신되고 알람이 해제되었습니다."
        : `📅 ${selectedDate} 과거 일기가 성공적으로 저장/수정되었습니다.`
    );

    setTimeout(() => {
      setSaveStatus("idle");
    }, 2500);
  };

  // Delete Diary Entry
  const handleDeleteDiary = (dateToDelete: string) => {
    if (!window.confirm(`${dateToDelete} 일기를 삭제하시겠습니까?`)) return;

    localStorage.removeItem(`life_os_diary_${dateToDelete}`);
    const updated = allDiaries.filter((d) => d.date !== dateToDelete);
    setAllDiaries(updated);
    try {
      localStorage.setItem(ARCHIVES_STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    if (selectedDate === dateToDelete) {
      setDiaryText("");
      if (dateToDelete === todayStr) setIsSavedToday(false);
    }

    showToast(`${dateToDelete} 일기가 삭제되었습니다.`);
  };

  // Routines Storage Helper
  const saveRoutinesToStorage = (newRoutines: RoutineItem[]) => {
    try {
      localStorage.setItem(ROUTINES_STORAGE_KEY, JSON.stringify(newRoutines));
    } catch {}
  };

  // Routine Checklist Toggle
  const toggleRoutine = (id: number) => {
    const updated = routines.map((r) => {
      if (r.id === id) {
        const nextCompleted = !r.completed;
        return {
          ...r,
          completed: nextCompleted,
          streak: nextCompleted ? r.streak + 1 : Math.max(0, r.streak - 1),
        };
      }
      return r;
    });
    setRoutines(updated);
    saveRoutinesToStorage(updated);
    triggerVibration(40);
  };

  // Add Routine
  const handleAddRoutine = () => {
    if (!newRoutineTitle.trim()) return;
    const newRoutine: RoutineItem = {
      id: Date.now(),
      title: newRoutineTitle.trim(),
      completed: false,
      streak: Number(newRoutineStreak) || 0,
    };
    const updated = [...routines, newRoutine];
    setRoutines(updated);
    saveRoutinesToStorage(updated);
    setNewRoutineTitle("");
    setNewRoutineStreak(0);
    setShowAddRoutineModal(false);
    showToast(`새 루틴 '${newRoutine.title}'이(가) 추가되었습니다!`);
    triggerVibration([50, 50]);
  };

  // Save Edited Routine
  const handleSaveEditedRoutine = () => {
    if (!editingRoutine || !editingRoutine.title.trim()) return;
    const updated = routines.map((r) =>
      r.id === editingRoutine.id ? { ...editingRoutine, streak: Number(editingRoutine.streak) || 0 } : r
    );
    setRoutines(updated);
    saveRoutinesToStorage(updated);
    setEditingRoutine(null);
    showToast("루틴 및 스트릭이 수정되었습니다.");
  };

  // Delete Routine
  const handleDeleteRoutine = (id: number, title: string) => {
    if (!window.confirm(`'${title}' 루틴을 삭제하시겠습니까?`)) return;
    const updated = routines.filter((r) => r.id !== id);
    setRoutines(updated);
    saveRoutinesToStorage(updated);
    showToast("루틴이 삭제되었습니다.");
  };

  // Alarm Settings update
  const handleUpdateConfig = (newCfg: AlarmConfig) => {
    setAlarmConfig(newCfg);
    saveAlarmConfig(newCfg);
    scheduleRuthlessAlarm(isSavedToday);
  };

  const handleTestChime = async () => {
    const res = await triggerTestAlarm();
    showToast(res.message);
  };

  const snoozeAlarm = () => {
    setIsAlarmRinging(false);
    lastAlarmTriggerRef.current = Date.now();
    playAlarmChime("snooze");
    showToast("알람을 5분간 미뤘습니다. 5분 후 다시 울립니다!");
  };

  const moods = [
    { id: "1", score: 1, emoji: "😡", label: "1점 매우 힘듦", color: "text-rose-400" },
    { id: "2", score: 2, emoji: "🙁", label: "2점 조금 피곤", color: "text-orange-400" },
    { id: "3", score: 3, emoji: "😐", label: "3점 무난/보통", color: "text-zinc-400" },
    { id: "4", score: 4, emoji: "😊", label: "4점 만족/좋음", color: "text-emerald-400" },
    { id: "5", score: 5, emoji: "🔥", label: "5점 최고/성취", color: "text-amber-400" },
  ];

  const filteredArchive = allDiaries.filter((d) => {
    if (!searchArchiveQuery.trim()) return true;
    return (
      d.date.includes(searchArchiveQuery) ||
      (d.text && d.text.toLowerCase().includes(searchArchiveQuery.toLowerCase()))
    );
  });

  return (
    <div className="space-y-4">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="sticky top-2 z-50 p-3 rounded-2xl bg-gradient-to-r from-indigo-900/90 to-emerald-950/90 border border-emerald-500/40 text-white text-xs font-semibold shadow-xl shadow-black/50 flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="p-1 hover:text-zinc-300">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Active Alarm Siren Banner (When Alarm is Ringing) */}
      {isAlarmRinging && !isSavedToday && (
        <div className="p-4 rounded-3xl bg-rose-950/90 border-2 border-rose-500 text-rose-200 shadow-2xl shadow-rose-900/50 animate-pulse space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BellRing className="w-5 h-5 text-rose-400 animate-bounce shrink-0" />
              <h3 className="text-sm font-bold text-white">🚨 지금 지독한 알람 & 진동이 울리고 있습니다!</h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500 text-white font-bold animate-ping">
              ALARM
            </span>
          </div>
          <p className="text-xs text-rose-100">
            오늘 하루의 일기를 한 줄이라도 작성하여 저장해야 알람이 완전히 해제됩니다.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={snoozeAlarm}
              className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all border border-zinc-700"
            >
              5분간 스누즈 (잠시 미루기)
            </button>
            <button
              onClick={() => {
                setSelectedDate(todayStr);
                const textarea = document.querySelector("textarea");
                textarea?.focus();
              }}
              className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/30"
            >
              지금 즉시 일기 작성하기
            </button>
          </div>
        </div>
      )}

      {/* Ruthless Alarm Status Banner */}
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
              <BellRing className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <h3 className="text-sm font-bold text-white">
              {isSavedToday ? "오늘의 지독한 일기 작성 완료" : "지독한 알람 가동 중 : 일기 미작성"}
            </h3>
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs flex items-center gap-1 transition-all min-h-[32px]"
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
            : `매일 밤 ${alarmConfig.targetHour}시 ${alarmConfig.targetMinute}분에 일기 쓸 때까지 소리와 진동으로 무한 스누즈 알람이 작동합니다.`}
        </p>
      </div>

      {/* Alarm Settings Drawer */}
      {showSettings && (
        <div className="bg-[#12141c] border border-indigo-500/30 rounded-3xl p-4 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-indigo-400" />
              지독한 알람 & 진동 상세 설정
            </h4>
            <button onClick={() => setShowSettings(false)} className="text-xs text-zinc-400 hover:text-white p-1">
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
              <span className="text-zinc-200 font-medium">경보 차임벨 사운드 & 햅틱 진동</span>
              <input
                type="checkbox"
                checked={alarmConfig.soundEnabled}
                onChange={(e) => handleUpdateConfig({ ...alarmConfig, soundEnabled: e.target.checked })}
                className="rounded accent-indigo-600"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              onClick={handleTestChime}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 text-xs text-indigo-200 rounded-xl border border-indigo-500/40 transition-all font-semibold"
            >
              <Play className="w-3.5 h-3.5 text-indigo-400" />
              <span>알람 소리 & 진동 즉시 테스트</span>
            </button>

            <button
              onClick={async () => {
                const granted = await requestAlarmPermission();
                showToast(granted ? "알림 권한이 허용되었습니다." : "알림 권한이 거부되었거나 지원되지 않습니다.");
              }}
              className="text-[11px] text-zinc-400 underline hover:text-white"
            >
              알림 권한 확인
            </button>
          </div>
        </div>
      )}

      {/* Diary Input & Date Picker Section */}
      <div className="bg-[#12141c] border border-[#1f2433] rounded-3xl p-4 space-y-3">
        {/* Date Selector Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-zinc-900/80 p-2.5 rounded-2xl border border-zinc-800">
          <div className="flex items-center justify-between sm:justify-start gap-2 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => changeDateByOffset(-1)}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
              title="이전 날짜"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 flex-1 justify-center sm:justify-start min-w-0">
              <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
              <input
                type="date"
                max={todayStr}
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(e.target.value);
                }}
                className="bg-transparent text-white font-bold text-xs sm:text-sm font-mono focus:outline-none cursor-pointer text-center sm:text-left min-w-[125px]"
              />
            </div>

            <button
              type="button"
              onClick={() => changeDateByOffset(1)}
              disabled={isSelectedDateToday}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:hover:bg-zinc-800 transition-colors shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
              title="다음 날짜"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Today Indicator or Move to Today Button (Always unclipped, whitespace-nowrap) */}
          <div className="flex items-center justify-end shrink-0">
            {isSelectedDateToday ? (
              <span className="whitespace-nowrap shrink-0 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                오늘의 일기
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className="whitespace-nowrap shrink-0 px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs font-semibold border border-indigo-500/30 transition-all flex items-center gap-1"
              >
                <span>오늘로 이동</span>
              </button>
            )}
          </div>
        </div>

        {/* 5-Point Scale Mood Selection */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">
              하루의 기분 (5점 척도 선택):
            </span>
            <span className="text-xs font-bold text-amber-300">
              {moods.find((m) => m.id === selectedMood)?.label || "선택"}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {moods.map((m) => {
              const isSelected = selectedMood === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMood(m.id)}
                  className={`py-2 px-1 rounded-xl text-center flex flex-col items-center justify-center gap-0.5 transition-all select-none min-h-[50px] border ${
                    isSelected
                      ? "bg-indigo-600/40 border-indigo-400 text-white shadow-md shadow-indigo-600/30 scale-[1.02] ring-1 ring-indigo-400"
                      : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  }`}
                >
                  <span className="text-base sm:text-lg">{m.emoji}</span>
                  <span className="text-[10px] font-bold whitespace-nowrap">{m.score}점</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Textarea */}
        <textarea
          rows={5}
          value={diaryText}
          onChange={(e) => setDiaryText(e.target.value)}
          placeholder={
            isSelectedDateToday
              ? "오늘 하루의 가장 중요한 성취와 반성을 기록하세요. (저장 즉시 지독한 스누즈 알람이 해제되고 스트릭이 갱신됩니다)"
              : `${selectedDate}의 기억과 기록을 남겨보세요.`
          }
          className="w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
        />

        {/* Save & Feedback Bar */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-zinc-500 font-mono">{diaryText.length}자 작성 중</span>

          <button
            type="button"
            onClick={handleSaveDiary}
            disabled={!diaryText.trim() || saveStatus === "saving"}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 min-h-[40px] ${
              saveStatus === "saved"
                ? "bg-emerald-600 text-white shadow-emerald-900/40 ring-2 ring-emerald-400"
                : saveStatus === "saving"
                ? "bg-indigo-700 text-white opacity-80 cursor-wait"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/40"
            }`}
          >
            {saveStatus === "saved" ? (
              <>
                <Check className="w-4 h-4 text-white animate-in zoom-in-50" />
                <span>저장 완료!</span>
              </>
            ) : saveStatus === "saving" ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>저장하는 중...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isSelectedDateToday ? "일기 저장 & 알람 해제" : `${selectedDate} 일기 저장`}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Routine Tracker Checklist & Custom Streak Editing */}
      <div className="bg-[#12141c] border border-[#1f2433] rounded-3xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-bold text-white">데일리 루틴 & 스트릭</h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              {routines.filter((r) => r.completed).length} / {routines.length} 완료
            </span>
            <button
              type="button"
              onClick={() => setShowAddRoutineModal(true)}
              className="p-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs flex items-center gap-1 transition-all border border-indigo-500/40"
              title="새 루틴 추가"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold">추가</span>
            </button>
          </div>
        </div>

        {/* Routines List */}
        <div className="space-y-2">
          {routines.map((routine) => (
            <div
              key={routine.id}
              className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                routine.completed
                  ? "bg-zinc-900/50 border-zinc-800/80 text-zinc-400"
                  : "bg-zinc-900 border-zinc-800 text-white hover:border-zinc-700"
              }`}
            >
              {/* Click checkbox & title to toggle */}
              <div
                onClick={() => toggleRoutine(routine.id)}
                className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer pr-2"
              >
                {routine.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-zinc-600 shrink-0" />
                )}
                <span
                  className={`text-xs font-medium break-keep leading-snug ${
                    routine.completed ? "line-through text-zinc-500" : "text-white"
                  }`}
                >
                  {routine.title}
                </span>
              </div>

              {/* Action Buttons: Streak badge + Edit + Delete */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingRoutine(routine)}
                  className="flex items-center gap-1 text-[11px] text-orange-400 font-mono font-semibold bg-orange-500/10 hover:bg-orange-500/20 px-2 py-1 rounded-lg border border-orange-500/20 transition-all"
                  title="스트릭 수정"
                >
                  <Flame className="w-3 h-3 fill-orange-400" />
                  <span>{routine.streak}일</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditingRoutine(routine)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  title="루틴 수정"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteRoutine(routine.id, routine.title)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="루틴 삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Routine Edit Modal */}
      {editingRoutine && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12141c] border border-zinc-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Edit2 className="w-4 h-4 text-indigo-400" />
              루틴 & 스트릭 편집
            </h4>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">루틴 이름</label>
              <input
                type="text"
                value={editingRoutine.title}
                onChange={(e) => setEditingRoutine({ ...editingRoutine, title: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">현재 연속 스트릭 일수</label>
              <input
                type="number"
                min={0}
                value={editingRoutine.streak}
                onChange={(e) =>
                  setEditingRoutine({ ...editingRoutine, streak: parseInt(e.target.value) || 0 })
                }
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingRoutine(null)}
                className="px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveEditedRoutine}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md"
              >
                저장하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Routine Modal */}
      {showAddRoutineModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12141c] border border-zinc-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-indigo-400" />
              새로운 데일리 루틴 추가
            </h4>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">루틴 이름</label>
              <input
                type="text"
                placeholder="예: 매일 영단어 10개 암기"
                value={newRoutineTitle}
                onChange={(e) => setNewRoutineTitle(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">시작 스트릭 일수 (기본 0)</label>
              <input
                type="number"
                min={0}
                value={newRoutineStreak}
                onChange={(e) => setNewRoutineStreak(parseInt(e.target.value) || 0)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddRoutineModal(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleAddRoutine}
                disabled={!newRoutineTitle.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md disabled:opacity-50"
              >
                추가하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Past Diaries Archive & History Section */}
      <div className="bg-[#12141c] border border-[#1f2433] rounded-3xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">과거 일기 히스토리</h3>
            <span className="text-[11px] font-mono text-zinc-500 font-semibold">
              ({allDiaries.length}편)
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowArchiveSection(!showArchiveSection)}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
          >
            {showArchiveSection ? "접기" : "목록 보기"}
          </button>
        </div>

        {showArchiveSection && (
          <div className="space-y-3 pt-1">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchArchiveQuery}
                onChange={(e) => setSearchArchiveQuery(e.target.value)}
                placeholder="과거 일기 검색 (날짜, 키워드)..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* List of Entries */}
            {filteredArchive.length === 0 ? (
              <p className="text-xs text-zinc-500 py-3 text-center">작성된 과거 일기가 없습니다.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {filteredArchive.map((entry) => (
                  <div
                    key={entry.date}
                    onClick={() => {
                      setSelectedDate(entry.date);
                      window.scrollTo({ top: 100, behavior: "smooth" });
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                      selectedDate === entry.date
                        ? "bg-indigo-950/40 border-indigo-500/50 shadow-sm"
                        : "bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white font-mono">{entry.date}</span>
                        {entry.date === todayStr && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                            오늘
                          </span>
                        )}
                        <span className="text-[11px] text-zinc-400">
                          {moods.find((m) => m.id === entry.mood)?.label || "😊"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDate(entry.date);
                          }}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 underline"
                        >
                          불러오기
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDiary(entry.date);
                          }}
                          className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed whitespace-pre-wrap">
                      {entry.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
