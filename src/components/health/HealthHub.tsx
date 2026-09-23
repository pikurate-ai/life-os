"use client";

import React, { useState } from "react";
import { Workout1RMTracker } from "./Workout1RMTracker";
import { BodyMetricsCard } from "./BodyMetricsCard";
import { DiaryArchiveTimeline } from "@/components/archive/DiaryArchiveTimeline";
import { LifePhotoGallery } from "@/components/gallery/LifePhotoGallery";
import { Dumbbell, Activity, History, Image as ImageIcon } from "lucide-react";

export const HealthHub: React.FC = () => {
  const [subTab, setSubTab] = useState<"workout" | "metrics" | "archive" | "gallery">("workout");

  return (
    <div className="space-y-4">
      {/* Sub Tabs */}
      <div className="flex bg-[#12141c] p-1 rounded-2xl border border-[#1f2433] gap-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setSubTab("workout")}
          className={`flex-1 min-w-[75px] py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
            subTab === "workout"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Dumbbell className="w-3.5 h-3.5" />
          <span>3대 1RM</span>
        </button>

        <button
          onClick={() => setSubTab("metrics")}
          className={`flex-1 min-w-[75px] py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
            subTab === "metrics"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>신체지표</span>
        </button>

        <button
          onClick={() => setSubTab("archive")}
          className={`flex-1 min-w-[75px] py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
            subTab === "archive"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>일기보관</span>
        </button>

        <button
          onClick={() => setSubTab("gallery")}
          className={`flex-1 min-w-[75px] py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
            subTab === "gallery"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>인생샷</span>
        </button>
      </div>

      {subTab === "workout" && <Workout1RMTracker />}
      {subTab === "metrics" && <BodyMetricsCard />}
      {subTab === "archive" && <DiaryArchiveTimeline />}
      {subTab === "gallery" && <LifePhotoGallery />}
    </div>
  );
};
