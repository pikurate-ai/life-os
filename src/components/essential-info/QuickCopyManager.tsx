"use client";

import React, { useState } from "react";
import { Copy, Check, Plus, Eye, EyeOff, Sparkles, Building2, MapPin, Car, Shield, CreditCard, Hash } from "lucide-react";
import { EssentialInfoItem } from "@/types/database";

const DEFAULT_ITEMS: EssentialInfoItem[] = [
  {
    id: "demo-1",
    user_id: "demo-user",
    category: "account",
    title: "주거래 계좌 (토스뱅크)",
    value: "1000-2345-6789",
    is_masked: false,
  },
  {
    id: "demo-2",
    user_id: "demo-user",
    category: "address",
    title: "집 도로명 주소",
    value: "서울특별시 강남구 테헤란로 152 강남파이낸스센터 18층",
    is_masked: false,
  },
  {
    id: "demo-3",
    user_id: "demo-user",
    category: "id_number",
    title: "주민등록번호",
    value: "920514-1******",
    is_masked: true,
  },
  {
    id: "demo-4",
    user_id: "demo-user",
    category: "vehicle",
    title: "차량 번호",
    value: "123가 4567",
    is_masked: false,
  },
  {
    id: "demo-5",
    user_id: "demo-user",
    category: "insurance",
    title: "실손보험 증권번호",
    value: "POL-2024-8849201",
    is_masked: false,
  },
  {
    id: "demo-6",
    user_id: "demo-user",
    category: "custom",
    title: "사업자등록번호",
    value: "123-86-78901",
    is_masked: false,
  },
];

export const QuickCopyManager: React.FC = () => {
  const [items, setItems] = useState<EssentialInfoItem[]>(DEFAULT_ITEMS);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newCategory, setNewCategory] = useState<EssentialInfoItem["category"]>("account");

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newValue.trim()) return;

    const newItem: EssentialInfoItem = {
      id: "item-" + Date.now(),
      user_id: "demo-user",
      category: newCategory,
      title: newTitle.trim(),
      value: newValue.trim(),
      is_masked: newCategory === "id_number",
    };

    setItems([newItem, ...items]);
    setNewTitle("");
    setNewValue("");
    setShowAddModal(false);
  };

  const getCategoryIcon = (category: EssentialInfoItem["category"]) => {
    switch (category) {
      case "account":
        return <CreditCard className="w-4 h-4 text-emerald-400" />;
      case "address":
        return <MapPin className="w-4 h-4 text-blue-400" />;
      case "id_number":
        return <Shield className="w-4 h-4 text-amber-400" />;
      case "vehicle":
        return <Car className="w-4 h-4 text-purple-400" />;
      case "insurance":
        return <Building2 className="w-4 h-4 text-pink-400" />;
      default:
        return <Hash className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Quick Add */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
            필수 정보 1초 복사
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
          </h2>
          <p className="text-xs text-zinc-400">터치 한 번으로 클립보드에 초고속 복사됩니다.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/20"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>항목 추가</span>
        </button>
      </div>

      {/* Copy Notification Toast if active */}
      {copiedId && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-full shadow-xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4" />
          클립보드에 1초 만에 복사되었습니다!
        </div>
      )}

      {/* Item Cards */}
      <div className="grid grid-cols-1 gap-2.5">
        {items.map((item) => {
          const isCopied = copiedId === item.id;
          return (
            <div
              key={item.id}
              onClick={() => handleCopy(item.id, item.value)}
              className="group relative cursor-pointer bg-[#12141c] hover:bg-[#181b26] active:scale-[0.99] border border-[#1f2433] hover:border-indigo-500/50 rounded-2xl p-3.5 transition-all shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-medium text-zinc-400 block mb-0.5">
                      {item.title}
                    </span>
                    <p className="text-sm font-semibold text-white tracking-wide truncate font-mono">
                      {item.value}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="복사하기"
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                    isCopied
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-zinc-800/80 text-zinc-300 group-hover:bg-indigo-600 group-hover:text-white"
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>복사됨</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>복사</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#12141c] border border-zinc-800 rounded-3xl w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white">새 필수 정보 등록</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-white text-xs px-2 py-1"
              >
                닫기
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">카테고리</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as EssentialInfoItem["category"])}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="account">계좌번호</option>
                  <option value="address">주소</option>
                  <option value="id_number">주민등록번호</option>
                  <option value="vehicle">차량번호</option>
                  <option value="insurance">보험증권</option>
                  <option value="custom">기타</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">항목 이름</label>
                <input
                  type="text"
                  placeholder="예: 주거래 계좌, 집 주소"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">복사할 내용</label>
                <input
                  type="text"
                  placeholder="예: 110-123-456789"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  required
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/30"
                >
                  등록하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
