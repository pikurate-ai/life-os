"use client";

import React from "react";
import { Sparkles, ShieldCheck, Bell } from "lucide-react";

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title = "Life-OS",
  subtitle = "Single View Personal Operating System",
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#090a0f]/85 backdrop-blur-md border-b border-[#1f2433] px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              {title}
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                v1.0
              </span>
            </h1>
            <p className="text-[11px] text-zinc-400 leading-tight">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero-Knowledge</span>
          </div>
          <button
            aria-label="알림"
            className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <Bell className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
