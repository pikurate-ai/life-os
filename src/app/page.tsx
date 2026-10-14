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
import { DataSyncHub } from "@/components/sync/DataSyncHub";
import { ArrowLeft } from "lucide-react";

const LAST_TAB_KEY = "life_os_last_active_tab";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>("quickcopy");
  const [showSyncHub, setShowSyncHub] = useState<boolean>(false);

  // Restore last active tab on mount
  React.useEffect(() => {
    try {
      const savedTab = localStorage.getItem(LAST_TAB_KEY) as TabType | null;
      if (savedTab && savedTab !== "dashboard" && ["quickcopy", "diary", "finance", "vault", "health"].includes(savedTab)) {
        setActiveTab(savedTab);
      } else {
        setActiveTab("quickcopy");
      }
    } catch {
      setActiveTab("quickcopy");
    }
  }, []);

  const getHeaderTitle = () => {
    if (showSyncHub) return "데이터 싱크 센터";

    switch (activeTab) {
      case "quickcopy":
        return "기억 (필수 정보)";
      case "diary":
        return "지독한 일기 & 루틴";
      case "finance":
        return "자산 & 파싱 가계부";
      case "vault":
        return "암호화 Vault 매니저";
      case "health":
        return "헬스 1RM & 피트니스";
      default:
        return "기억 (필수 정보)";
    }
  };

  const getHeaderSubtitle = () => {
    if (showSyncHub) return "구글 시트·닥스 & 로우데이터 파일 연동";

    switch (activeTab) {
      case "quickcopy":
        return "원터치로 즉시 클립보드에 복사";
      case "diary":
        return "일기 쓸 때까지 울리는 알람 & 스트릭";
      case "finance":
        return "SMS 0.1초 파싱 가계부 & 순자산 대시보드";
      case "vault":
        return "Web Crypto AES-256 Zero-Knowledge";
      case "health":
        return "턱걸이 성장 & 체중 & 수영·운동 지표";
      default:
        return "원터치로 즉시 클립보드에 복사";
    }
  };

  const handleTabChange = (tab: TabType) => {
    setShowSyncHub(false);
    const targetTab = tab === "dashboard" ? "quickcopy" : tab;
    setActiveTab(targetTab);
    try {
      localStorage.setItem(LAST_TAB_KEY, targetTab);
    } catch {}
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title={getHeaderTitle()}
        subtitle={getHeaderSubtitle()}
        onOpenSyncHub={() => setShowSyncHub(true)}
      />

      <main className="flex-1 max-w-md w-full mx-auto p-4 pb-28">
        {showSyncHub ? (
          <div className="space-y-3">
            <button
              onClick={() => setShowSyncHub(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>메인 화면으로 돌아가기</span>
            </button>
            <DataSyncHub />
          </div>
        ) : (
          <>
            {activeTab === "dashboard" && (
              <DashboardOverview
                onNavigateTab={(tab) => handleTabChange(tab)}
                onOpenSyncHub={() => setShowSyncHub(true)}
              />
            )}

            {activeTab === "quickcopy" && <QuickCopyManager />}

            {activeTab === "diary" && <RuthlessDiarySkeleton />}

            {activeTab === "finance" && <FinanceHub />}

            {activeTab === "vault" && <PasswordVaultManager />}

            {activeTab === "health" && <HealthHub />}
          </>
        )}
      </main>

      <BottomNav activeTab={activeTab} onChangeTab={handleTabChange} />
    </div>
  );
}
