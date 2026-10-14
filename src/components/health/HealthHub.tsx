"use client";

import React, { useState } from "react";
import { Workout1RMTracker } from "./Workout1RMTracker";
import { BodyMetricsCard } from "./BodyMetricsCard";
import { LifePhotoGallery } from "@/components/gallery/LifePhotoGallery";
import { Dumbbell, Activity, Image as ImageIcon } from "lucide-react";

export const HealthHub: React.FC = () => {
  const [subTab, setSubTab] = useState<"workout" | "metrics" | "gallery">("workout");

  return (
    <div className="space-y-4">
      {/* Sub Tabs */}
      <div className="flex bg-[#12141c] p-1 rounded-2xl border border-[#1f2433] gap-1">
        <button
          type="button"
          onClick={() => setSubTab("workout")}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all min-h-[38px] ${
            subTab === "workout"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Dumbbell className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">턱걸이 & 1RM</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab("metrics")}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all min-h-[38px] ${
            subTab === "metrics"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Activity className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">체중 & 애플건강</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab("gallery")}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all min-h-[38px] ${
            subTab === "gallery"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <ImageIcon className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">인생샷 앨범</span>
        </button>
      </div>

      {subTab === "workout" && <Workout1RMTracker />}
      {subTab === "metrics" && <BodyMetricsCard />}
      {subTab === "gallery" && <LifePhotoGallery />}
    </div>
  );
};
