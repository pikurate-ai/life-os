"use client";

import React, { useState, useEffect } from "react";
import { Wallet, TrendingUp, Building, DollarSign, Bitcoin, Landmark, Edit3, Check, Plus, Trash2, ShieldAlert, ArrowUpRight } from "lucide-react";
import { onAuthChanged, saveAssetsToCloud, loadAssetsFromCloud } from "@/lib/firebase/client";
import type { User } from "firebase/auth";

export interface AssetCategory {
  id: string;
  name: string;
  amount: number;
  type: "asset" | "debt";
  color: string;
}

const DEFAULT_ASSETS: AssetCategory[] = [
  { id: "savings", name: "예적금 & 현금", amount: 28500000, type: "asset", color: "bg-blue-500" },
  { id: "stocks", name: "국내/해외 주식 & ETF", amount: 45200000, type: "asset", color: "bg-indigo-500" },
  { id: "realestate", name: "부동산 보증금/자산", amount: 150000000, type: "asset", color: "bg-emerald-500" },
  { id: "crypto", name: "가상자산", amount: 4800000, type: "asset", color: "bg-amber-500" },
  { id: "loans", name: "대출 & 마이너스통장", amount: 40000000, type: "debt", color: "bg-rose-500" },
];

const ASSET_STORAGE_KEY = "life_os_assets_v2";

export const AssetDashboard: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [assets, setAssets] = useState<AssetCategory[]>(DEFAULT_ASSETS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempAmount, setTempAmount] = useState<number>(0);

  // New Asset Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState<number>(0);
  const [newType, setNewType] = useState<"asset" | "debt">("asset");

  // Load from LocalStorage & Cloud
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ASSET_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAssets(parsed);
        }
      }
    } catch {}

    const unsubscribe = onAuthChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        const cloudAssets = await loadAssetsFromCloud(user.uid);
        if (cloudAssets && Array.isArray(cloudAssets) && cloudAssets.length > 0) {
          setAssets(cloudAssets);
          try {
            localStorage.setItem(ASSET_STORAGE_KEY, JSON.stringify(cloudAssets));
          } catch {}
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const updateAssets = (newAssets: AssetCategory[]) => {
    setAssets(newAssets);
    try {
      localStorage.setItem(ASSET_STORAGE_KEY, JSON.stringify(newAssets));
    } catch {}
    if (currentUser) {
      saveAssetsToCloud(currentUser.uid, newAssets);
    }
  };

  const totalAsset = assets
    .filter((a) => a.type === "asset")
    .reduce((sum, cur) => sum + cur.amount, 0);

  const totalDebt = assets
    .filter((a) => a.type === "debt")
    .reduce((sum, cur) => sum + cur.amount, 0);

  const netWorth = totalAsset - totalDebt;
  const debtRatio = totalAsset > 0 ? Math.round((totalDebt / totalAsset) * 100) : 0;

  const handleStartEdit = (cat: AssetCategory) => {
    setEditingId(cat.id);
    setTempAmount(cat.amount);
  };

  const handleSaveEdit = (id: string) => {
    const updated = assets.map((a) =>
      a.id === id ? { ...a, amount: Number(tempAmount) || 0 } : a
    );
    updateAssets(updated);
    setEditingId(null);
  };

  const handleDeleteAsset = (id: string) => {
    if (confirm("이 자산/부채 항목을 삭제하시겠습니까?")) {
      updateAssets(assets.filter((a) => a.id !== id));
    }
  };

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const colors = ["bg-sky-500", "bg-purple-500", "bg-teal-500", "bg-pink-500", "bg-orange-500"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newItem: AssetCategory = {
      id: "asset-" + Date.now(),
      name: newName.trim(),
      amount: newAmount,
      type: newType,
      color: newType === "debt" ? "bg-rose-500" : randomColor,
    };

    updateAssets([...assets, newItem]);
    setNewName("");
    setNewAmount(0);
    setShowAddModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Net Worth Summary Card */}
      <div className="bg-gradient-to-br from-indigo-950/70 via-slate-900 to-[#12141c] border border-indigo-500/30 rounded-3xl p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
            Net Worth Overview
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 font-mono">
            부채비율 {debtRatio}%
          </span>
        </div>
        <h2 className="text-sm font-medium text-zinc-300 mt-0.5">내 순자산 (총자산 - 부채)</h2>

        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-3xl font-black text-white tracking-tight font-mono">
            {netWorth.toLocaleString()}
          </span>
          <span className="text-sm font-bold text-zinc-400">원</span>
        </div>

        {/* Detailed Asset vs Debt split */}
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

      {/* Portfolio Progress Bar */}
      <div className="bg-[#12141c] border border-[#1f2433] rounded-3xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-zinc-300">자산 포트폴리오 비중</h3>
          <span className="text-[10px] text-zinc-500">{assets.filter((a) => a.type === "asset").length}개 자산</span>
        </div>

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

      {/* Categories List with Add Button */}
      <div className="bg-[#12141c] border border-[#1f2433] rounded-3xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">자산 및 부채 상세 항목</h3>
            <p className="text-[11px] text-zinc-400">금액 터치 시 즉시 수정</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>항목 추가</span>
          </button>
        </div>

        <div className="space-y-2.5">
          {assets.map((cat) => {
            const isEditing = editingId === cat.id;

            return (
              <div
                key={cat.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                    {cat.type === "asset" ? (
                      <Landmark className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <DollarSign className="w-4 h-4 text-rose-400" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-white block">{cat.name}</span>
                    <span className="text-[10px] text-zinc-500">
                      {cat.type === "asset" ? "자산 (+)" : "부채 (-)"}
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

                  <button
                    onClick={() => handleDeleteAsset(cat.id)}
                    className="p-1 text-zinc-600 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Asset Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#12141c] border border-zinc-800 rounded-3xl w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white">새 자산/부채 항목 추가</h3>
              <button onClick={() => setShowAddModal(false)} className="text-xs text-zinc-400">
                닫기
              </button>
            </div>

            <form onSubmit={handleAddAsset} className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">구분</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewType("asset")}
                    className={`py-2 text-xs font-bold rounded-xl transition-all ${
                      newType === "asset"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                        : "bg-zinc-900 border border-zinc-800 text-zinc-400"
                    }`}
                  >
                    자산 (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType("debt")}
                    className={`py-2 text-xs font-bold rounded-xl transition-all ${
                      newType === "debt"
                        ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                        : "bg-zinc-900 border border-zinc-800 text-zinc-400"
                    }`}
                  >
                    부채 (-)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">항목 이름</label>
                <input
                  type="text"
                  placeholder="예: 청약저축, 자동차 할부"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">금액 (원)</label>
                <input
                  type="number"
                  placeholder="예: 5000000"
                  value={newAmount || ""}
                  onChange={(e) => setNewAmount(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  required
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/30"
                >
                  항목 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
