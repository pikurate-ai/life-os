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
import { IosInstallGuideModal } from "@/components/pwa/IosInstallGuideModal";
import { ArrowLeft } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [showSyncHub, setShowSyncHub] = useState<boolean>(false);
  const [showInstallGuide, setShowInstallGuide] = useState<boolean>(false);

  const getHeaderTitle = () => {
    if (showSyncHub) return "데이터 싱크 & 적재 센터";

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
    if (showSyncHub) return "구글 시트·닥스 & 카카오톡 실시간 연동";

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

  const handleTabChange = (tab: TabType) => {
    setShowSyncHub(false);
    setActiveTab(tab);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title={getHeaderTitle()}
        subtitle={getHeaderSubtitle()}
        onOpenSyncHub={() => setShowSyncHub(true)}
        onOpenInstallGuide={() => setShowInstallGuide(true)}
      />

      <main className="flex-1 max-w-md w-full mx-auto p-4 pb-24">
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
                onOpenInstallGuide={() => setShowInstallGuide(true)}
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

      {/* iOS PWA Install Guide Modal */}
      <IosInstallGuideModal
        isOpen={showInstallGuide}
        onClose={() => setShowInstallGuide(false)}
      />
    </div>
  );
}
