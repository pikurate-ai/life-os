"use client";

import React, { useState } from "react";
import { AlertCircle, Flame, CheckCircle2, Circle, Clock, Save, BellRing, Sparkles } from "lucide-react";

export const RuthlessDiarySkeleton: React.FC = () => {
  const [diaryText, setDiaryText] = useState("");
  const [isSavedToday, setIsSavedToday] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string>("good");
  const [routines, setRoutines] = useState([
    { id: 1, title: "기상 후 미온수 한 잔", completed: true, streak: 14 },
    { id: 2, title: "오메가3 & 멀티비타민 섭취", completed: true, streak: 12 },
    { id: 3, title: "3대 운동 or 40분 유산소 러닝", completed: false, streak: 5 },
    { id: 4, title: "지독한 하루 감사 일기 작성", completed: isSavedToday, streak: 9 },
  ]);

  const toggleRoutine = (id: number) => {
    setRoutines(
      routines.map((r) =>
        r.id === id ? { ...r, completed: !r.completed, streak: !r.completed ? r.streak + 1 : r.streak - 1 } : r
      )
    );
  };

  const handleSaveDiary = () => {
    if (!diaryText.trim()) return;
    setIsSavedToday(true);
    // 루틴 중 일기 항목도 완료 처리
    setRoutines(
      routines.map((r) => (r.id === 4 ? { ...r, completed: true } : r))
    );
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
      {/* Ruthless Alarm Warning Banner */}
      <div
        className={`p-4 rounded-2xl border transition-all ${
          isSavedToday
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            : "bg-rose-500/10 border-rose-500/30 text-rose-300 animate-pulse"
        }`}
      >
        <div className="flex items-center gap-2.5 mb-1">
          {isSavedToday ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <BellRing className="w-5 h-5 text-rose-400 shrink-0 animate-bounce" />
          )}
          <h3 className="text-sm font-bold">
            {isSavedToday ? "오늘의 지독한 일기 작성 완료!" : "지독한 알람 작동 중: 일기 미작성"}
          </h3>
        </div>
        <p className="text-xs text-zinc-300 pl-7.5">
          {isSavedToday
            ? "오늘 하루 기록이 안전하게 보관되었습니다. 스트릭 +1 달성!"
            : "단 한 줄이라도 작성하여 저장하기 전까지 5분 간격 스누즈 알람이 지속됩니다."}
        </p>
      </div>

      {/* Diary Input Section */}
      <div className="bg-[#12141c] border border-[#1f2433] rounded-3xl p-4 space-y-3">
        <div className="flex items-center justify-between">
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

          <div className="flex items-center gap-1">
            {moods.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMood(m.id)}
                className={`px-2 py-0.5 rounded-lg text-xs transition-all ${
                  selectedMood === m.id
                    ? "bg-zinc-800 font-bold scale-105 border border-zinc-600"
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
          placeholder="오늘 하루의 가장 중요한 성취와 반성을 기록하세요. (한 글자라도 저장하면 지독한 스누즈 알람이 해제됩니다)"
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
