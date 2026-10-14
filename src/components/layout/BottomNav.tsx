"use client";

import React from "react";
import { LayoutDashboard, Copy, BookOpen, Wallet, KeyRound, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export type TabType = "quickcopy" | "diary" | "finance" | "vault" | "health" | "dashboard";

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  const tabs: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }[] = [
    { id: "quickcopy", label: "기억", icon: Copy },
    { id: "diary", label: "일기", icon: BookOpen },
    { id: "finance", label: "가계/자산", icon: Wallet },
    { id: "vault", label: "암호금고", icon: KeyRound },
    { id: "health", label: "헬스1RM", icon: Activity },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#090a0f]/92 backdrop-blur-lg border-t border-[#1f2433] pb-safe">
      <div className="max-w-md mx-auto px-1 sm:px-2 py-1 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={cn(
                "relative flex flex-col items-center justify-center min-h-[48px] py-1 px-1 sm:px-2 flex-1 min-w-0 rounded-xl transition-all duration-200 select-none",
                isActive
                  ? "text-indigo-400 font-semibold"
                  : "text-zinc-500 hover:text-zinc-300 font-medium"
              )}
            >
              <div className="relative">
                <Icon className={cn("w-5 h-5 transition-transform", isActive && "scale-110")} />
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-2 px-1.5 py-0.5 rounded-full text-[9px] bg-pink-500 text-white font-bold leading-none">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] mt-0.5 whitespace-nowrap tracking-tight">{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 w-6 h-0.5 bg-indigo-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
