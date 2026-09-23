"use client";

import React, { useState } from "react";
import { Wallet, TrendingUp, Building, DollarSign, Bitcoin, Landmark, Edit3, Check } from "lucide-react";

interface AssetCategory {
  id: string;
  name: string;
  amount: number;
  type: "asset" | "debt";
  icon: typeof Wallet;
  color: string;
}

const DEFAULT_ASSETS: AssetCategory[] = [
  { id: "savings", name: "예적금 & 현금", amount: 28500000, type: "asset", icon: Landmark, color: "bg-blue-500" },
  { id: "stocks", name: "국내/해외 주식 & ETF", amount: 45200000, type: "asset", icon: TrendingUp, color: "bg-indigo-500" },
  { id: "crypto", name: "가상자산", amount: 4800000, type: "asset", icon: Bitcoin, color: "bg-amber-500" },
  { id: "realestate", name: "부동산 보증금/자산", amount: 150000000, type: "asset", icon: Building, color: "bg-emerald-500" },
  { id: "loans", name: "대출 & 마이너스통장", amount: 40000000, type: "debt", icon: DollarSign, color: "bg-rose-500" },
];

export const AssetDashboard: React.FC = () => {
  const [assets, setAssets] = useState<AssetCategory[]>(DEFAULT_ASSETS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempAmount, setTempAmount] = useState<number>(0);

  const totalAsset = assets
    .filter((a) => a.type === "asset")
    .reduce((sum, cur) => sum + cur.amount, 0);

  const totalDebt = assets
    .filter((a) => a.type === "debt")
    .reduce((sum, cur) => sum + cur.amount, 0);

  const netWorth = totalAsset - totalDebt;

  const handleStartEdit = (cat: AssetCategory) => {
    setEditingId(cat.id);
    setTempAmount(cat.amount);
  };

  const handleSaveEdit = (id: string) => {
    setAssets(
      assets.map((a) => (a.id === id ? { ...a, amount: Number(tempAmount) || 0 } : a))
    );
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      {/* Net Worth Summary Card */}
      <div className="bg-gradient-to-br from-indigo-950/70 via-slate-900 to-[#12141c] border border-indigo-500/30 rounded-3xl p-5 shadow-lg">
        <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
          Net Worth Overview
        </span>
        <h2 className="text-sm font-medium text-zinc-300 mt-0.5">내 순자산 (총자산 - 부채)</h2>

        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-3xl font-black text-white tracking-tight font-mono">
            {netWorth.toLocaleString()}
          </span>
          <span className="text-sm font-bold text-zinc-400">원</span>
        </div>

        {/* Mini comparison */}
        <div className="mt-4 pt-3 border-t border-indigo-500/20 grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-zinc-400 block text-[11px]">총 자산</span>
            <span className="text-emerald-400 font-bold font-mono">
              +{totalAsset.toLocaleString()}원
            </span>
          </div>
          <div>
            <span className="text-zinc-400 block text-[11px]">총 부채</span>
            <span className="text-rose-400 font-bold font-mono">
              -{totalDebt.toLocaleString()}원
            </span>
          </div>
        </div>
      </div>

      {/* Portfolio Distribution Progress Bar */}
      <div className="bg-[#12141c] border border-[#1f2433] rounded-3xl p-4 space-y-3">
        <h3 className="text-xs font-bold text-zinc-300">자산 포트폴리오 비중</h3>
        <div className="h-3 rounded-full bg-zinc-800 flex overflow-hidden gap-0.5">
          {assets
            .filter((a) => a.type === "asset")
            .map((cat) => {
              const pct = totalAsset > 0 ? (cat.amount / totalAsset) * 100 : 0;
              return (
                <div
                  key={cat.id}
                  style={{ width: `${pct}%` }}
                  className={`${cat.color} transition-all duration-500`}
                  title={`${cat.name}: ${pct.toFixed(1)}%`}
                />
              );
            })}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          {assets
            .filter((a) => a.type === "asset")
            .map((cat) => {
              const pct = totalAsset > 0 ? ((cat.amount / totalAsset) * 100).toFixed(1) : "0.0";
              return (
                <div key={cat.id} className="flex items-center gap-2 text-xs">
                  <span className={`w-2.5 h-2.5 rounded-full ${cat.color} shrink-0`} />
                  <span className="text-zinc-400 text-[11px] truncate flex-1">{cat.name}</span>
                  <span className="text-white font-mono text-[11px] font-semibold">{pct}%</span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Detailed Categories List */}
      <div className="bg-[#12141c] border border-[#1f2433] rounded-3xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">항목별 자산 수정</h3>
          <span className="text-[10px] text-zinc-400">금액 클릭 시 즉시 수정</span>
        </div>

        <div className="space-y-2.5">
          {assets.map((cat) => {
            const Icon = cat.icon;
            const isEditing = editingId === cat.id;

            return (
              <div
                key={cat.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl bg-zinc-800 border border-zinc-700`}>
                    <Icon className="w-4 h-4 text-zinc-300" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-white block">{cat.name}</span>
                    <span className="text-[10px] text-zinc-500">
                      {cat.type === "asset" ? "자산 항목" : "부채 항목"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={tempAmount}
                        onChange={(e) => setTempAmount(Number(e.target.value))}
                        className="w-28 bg-zinc-800 border border-indigo-500 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit(cat.id)}
                        className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => handleStartEdit(cat)}
                      className="group cursor-pointer flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-zinc-800 transition-all"
                    >
                      <span
                        className={`text-xs font-bold font-mono ${
                          cat.type === "asset" ? "text-white" : "text-rose-400"
                        }`}
                      >
                        {cat.amount.toLocaleString()}원
                      </span>
                      <Edit3 className="w-3 h-3 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
