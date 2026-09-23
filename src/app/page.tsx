"use client";

import React, { useState } from "react";
import { Header } from "@/components/layout/Header";
import { BottomNav, TabType } from "@/components/layout/BottomNav";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { QuickCopyManager } from "@/components/essential-info/QuickCopyManager";
import { RuthlessDiarySkeleton } from "@/components/diary/RuthlessDiarySkeleton";
import { PasswordVaultManager } from "@/components/vault/PasswordVaultManager";
import { FinanceHub } from "@/components/finance/FinanceHub";
import { HealthHub } from "@/components/health/HealthHub";
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
        return "헬스 1RM & 라이프 아카이브";
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
        return "3대 1RM Epley 공식 & 신체 지표 & 일기 아카이브 & 인생샷";
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

        {activeTab === "health" && <HealthHub />}
      </main>

      <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />
    </div>
  );
}
