"use client";

import React from "react";
import { Copy, BookOpen, KeyRound, Activity, Wallet, ChevronRight, TrendingUp, ShieldCheck } from "lucide-react";
import { TabType } from "@/components/layout/BottomNav";

interface DashboardOverviewProps {
  onNavigateTab: (tab: TabType) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigateTab }) => {
  return (
    <div className="space-y-4">
      {/* Hero Welcome Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/60 via-purple-950/40 to-[#12141c] border border-indigo-500/20 p-5">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
              Life Operating System
            </span>
            <h2 className="text-xl font-black text-white mt-0.5">단 하나의 개인 전용 OS</h2>
            <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
              복잡한 일상 데이터를 단 1초 만에 복사하고, 지독하게 습관을 지킵니다.
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-indigo-500/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>AES-256 Zero-Knowledge 준비 완료</span>
          </div>
          <span className="text-zinc-500">Phase 1 구동 중</span>
        </div>
      </div>

      {/* Quick Action Bento Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Quick Copy Card */}
        <div
          onClick={() => onNavigateTab("quickcopy")}
          className="group cursor-pointer bg-[#12141c] hover:bg-[#181b26] active:scale-[0.98] border border-[#1f2433] hover:border-indigo-500/40 rounded-2xl p-4 transition-all"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
            <Copy className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 flex items-center justify-between">
            1초 정보 복사
            <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
          </h3>
          <p className="text-[11px] text-zinc-400 mt-1">계좌·주소·차량번호 초고속 복사</p>
        </div>

        {/* Ruthless Diary Card */}
        <div
          onClick={() => onNavigateTab("diary")}
          className="group cursor-pointer bg-[#12141c] hover:bg-[#181b26] active:scale-[0.98] border border-[#1f2433] hover:border-rose-500/40 rounded-2xl p-4 transition-all"
        >
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-3">
            <BookOpen className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white group-hover:text-rose-300 flex items-center justify-between">
            지독한 일기
            <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
          </h3>
          <p className="text-[11px] text-zinc-400 mt-1">스누즈 알람 & 루틴 스트릭</p>
        </div>

        {/* Vault Card */}
        <div
          onClick={() => onNavigateTab("vault")}
          className="group cursor-pointer bg-[#12141c] hover:bg-[#181b26] active:scale-[0.98] border border-[#1f2433] hover:border-amber-500/40 rounded-2xl p-4 transition-all"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
            <KeyRound className="w-4 h-4" />
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white group-hover:text-amber-300">암호 금고</h3>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">가동 중</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">AES-256 클라이언트 금고</p>
        </div>

        {/* Health 1RM Preview (Phase 3) */}
        <div
          onClick={() => onNavigateTab("health")}
          className="group cursor-pointer bg-[#12141c] hover:bg-[#181b26] active:scale-[0.98] border border-[#1f2433] rounded-2xl p-4 transition-all"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
            <Activity className="w-4 h-4" />
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">헬스 & 1RM</h3>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">Phase 3</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">3대 운동 및 건강 지표</p>
        </div>
      </div>

      {/* Financial Status Summary */}
      <div
        onClick={() => onNavigateTab("finance")}
        className="group cursor-pointer bg-[#12141c] hover:bg-[#181b26] border border-[#1f2433] hover:border-purple-500/40 rounded-3xl p-4 transition-all"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white group-hover:text-purple-300 flex items-center gap-1.5">
              자산 & 파싱 가계부
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
            </h3>
          </div>
          <span className="text-[10px] text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
            SMS 0.1초 파싱 가능
          </span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          카드 결제 문자나 카카오톡 알림을 복사해 붙여넣으면 금액과 가맹점을 자동 파싱하고 순자산을 한눈에 집계합니다.
        </p>
      </div>
    </div>
  );
};
