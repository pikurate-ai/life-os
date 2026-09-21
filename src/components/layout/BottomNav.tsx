"use client";

import React from "react";
import { LayoutDashboard, Copy, BookOpen, KeyRound, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export type TabType = "dashboard" | "quickcopy" | "diary" | "vault" | "health";

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  const tabs = [
    { id: "dashboard" as TabType, label: "홈", icon: LayoutDashboard },
    { id: "quickcopy" as TabType, label: "1초복사", icon: Copy, badge: "인기" },
    { id: "diary" as TabType, label: "일기/루틴", icon: BookOpen },
    { id: "vault" as TabType, label: "암호금고", icon: KeyRound },
    { id: "health" as TabType, label: "헬스1RM", icon: Activity },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#090a0f]/90 backdrop-blur-lg border-t border-[#1f2433] pb-safe">
      <div className="max-w-md mx-auto px-3 py-2 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={cn(
                "relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200",
                isActive
                  ? "text-indigo-400 font-semibold"
                  : "text-zinc-500 hover:text-zinc-300 font-medium"
              )}
            >
              <div className="relative">
                <Icon className={cn("w-5 h-5 transition-transform", isActive && "scale-110")} />
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-2 px-1 py-0.2 rounded-full text-[9px] bg-pink-500 text-white font-bold leading-tight">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1">{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 w-8 h-0.5 bg-indigo-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
