"use client";

import React, { useState } from "react";
import { Header } from "@/components/layout/Header";
import { BottomNav, TabType } from "@/components/layout/BottomNav";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { QuickCopyManager } from "@/components/essential-info/QuickCopyManager";
import { RuthlessDiarySkeleton } from "@/components/diary/RuthlessDiarySkeleton";
import { PasswordVaultManager } from "@/components/vault/PasswordVaultManager";
import { FinanceHub } from "@/components/finance/FinanceHub";
import { Activity } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");

  const getHeaderTitle = () => {
    switch (activeTab) {
      case "quickcopy":
        return "필수 정보 1초 복사";
      case "diary":
        return "지독한 일기 & 루틴";
      case "finance":
        return "자산 & 파싱 가계부";
      case "vault":
        return "암호화 Vault 매니저";
      case "health":
        return "헬스 & 1RM (Phase 3)";
      default:
        return "Life-OS";
    }
  };

  const getHeaderSubtitle = () => {
    switch (activeTab) {
      case "quickcopy":
        return "터치 즉시 클립보드에 복사";
      case "diary":
        return "일기 쓸 때까지 울리는 알람 & 스트릭";
      case "finance":
        return "SMS 0.1초 파싱 가계부 & 순자산 대시보드";
      case "vault":
        return "Web Crypto AES-256 Zero-Knowledge";
      case "health":
        return "Apple HealthKit & 1RM 포뮬러";
      default:
        return "Single View Personal Operating System";
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header title={getHeaderTitle()} subtitle={getHeaderSubtitle()} />

      <main className="flex-1 max-w-md w-full mx-auto p-4 pb-24">
        {activeTab === "dashboard" && (
          <DashboardOverview onNavigateTab={(tab) => setActiveTab(tab)} />
        )}

        {activeTab === "quickcopy" && <QuickCopyManager />}

        {activeTab === "diary" && <RuthlessDiarySkeleton />}

        {activeTab === "finance" && <FinanceHub />}

        {activeTab === "vault" && <PasswordVaultManager />}

        {activeTab === "health" && (
          <div className="p-6 rounded-3xl bg-[#12141c] border border-zinc-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">헬스 & 1RM 트래커</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Phase 3에서 구현될 모듈입니다. 3대 운동 1RM 자동 계산 공식($1RM = W \times (1 + r/30)$) 및 시각화 차트, Apple HealthKit 동기화 파이프라인이 탑재됩니다.
            </p>
            <div className="pt-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                Phase 3 준비 중
              </span>
            </div>
          </div>
        )}
      </main>

      <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />
    </div>
  );
}
