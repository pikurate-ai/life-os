"use client";

import React, { useState } from "react";
import { SmsLedgerParser } from "./SmsLedgerParser";
import { AssetDashboard } from "./AssetDashboard";
import { Receipt, Wallet } from "lucide-react";

export const FinanceHub: React.FC = () => {
  const [subTab, setSubTab] = useState<"ledger" | "asset">("ledger");

  return (
    <div className="space-y-4">
      {/* Sub-tab Switcher */}
      <div className="flex bg-[#12141c] p-1 rounded-2xl border border-[#1f2433]">
        <button
          onClick={() => setSubTab("ledger")}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            subTab === "ledger"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>문자 파싱 가계부</span>
        </button>

        <button
          onClick={() => setSubTab("asset")}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            subTab === "asset"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>총자산 대시보드</span>
        </button>
      </div>

      {subTab === "ledger" && <SmsLedgerParser />}
      {subTab === "asset" && <AssetDashboard />}
    </div>
  );
};
