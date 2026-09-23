"use client";

import React, { useState, useEffect } from "react";
import { Copy, Check, Plus, Edit2, Trash2, Sparkles, Building2, MapPin, Car, Shield, CreditCard, Hash, Phone, Mail, User, Globe, RotateCcw } from "lucide-react";
import { EssentialInfoItem } from "@/types/database";

// 두 개의 구글 시트에서 중복을 제거하고 단 1개씩 선별한 최신 정제 데이터셋
const SYNCED_DEFAULT_ITEMS: EssentialInfoItem[] = [
  {
    id: "info-biz-num",
    user_id: "user",
    category: "custom",
    title: "사업자등록번호",
    value: "276-88-01467",
  },
  {
    id: "info-corp-num",
    user_id: "user",
    category: "custom",
    title: "법인등록번호",
    value: "110111-7222964",
  },
  {
    id: "info-head-address",
    user_id: "user",
    category: "address",
    title: "본사 주소 (구래동 스타프라자)",
    value: "경기도 김포시 김포한강8로 410, 1001-343호(구래동, 스타프라자) [10071]",
  },
  {
    id: "info-main-account",
    user_id: "user",
    category: "account",
    title: "주거래 법인 계좌 (기업은행)",
    value: "047-116828-01-015 (주식회사 피큐레잇)",
  },
  {
    id: "info-corp-card",
    user_id: "user",
    category: "account",
    title: "법인카드 (우리은행 마스터)",
    value: "5532-0800-1231-6491 (09/29, CVC 574)",
  },
  {
    id: "info-ceo-name",
    user_id: "user",
    category: "custom",
    title: "대표자 성명 / 직위",
    value: "송석규 대표",
  },
  {
    id: "info-ceo-phone",
    user_id: "user",
    category: "custom",
    title: "대표 연락처 (휴대전화)",
    value: "010-8871-6102",
  },
  {
    id: "info-ceo-email",
    user_id: "user",
    category: "custom",
    title: "대표 이메일",
    value: "leo.song@pikurate.com",
  },
  {
    id: "info-vehicle",
    user_id: "user",
    category: "vehicle",
    title: "차량 번호",
    value: "48보5508",
  },
  {
    id: "info-customs-code",
    user_id: "user",
    category: "id_number",
    title: "개인통관고유번호",
    value: "P811151508155",
  },
  {
    id: "info-venture-cert",
    user_id: "user",
    category: "insurance",
    title: "벤처기업확인서 번호",
    value: "20251022010021 (2025.11.24~2028.11.23)",
  },
  {
    id: "info-sme-cert",
    user_id: "user",
    category: "insurance",
    title: "중소기업확인서 번호",
    value: "0010-2025-356786",
  },
  {
    id: "info-scientist-id",
    user_id: "user",
    category: "id_number",
    title: "과학기술인등록번호 (연구원)",
    value: "12555772",
  },
  {
    id: "info-patent-applicant",
    user_id: "user",
    category: "custom",
    title: "지적재산권 출원인 코드",
    value: "1-2020-014440-6",
  },
  {
    id: "info-homepage",
    user_id: "user",
    category: "custom",
    title: "공식 홈페이지",
    value: "https://www.pikurate.com/",
  },
];

const STORAGE_KEY = "life_os_essential_info_v1";

export const QuickCopyManager: React.FC = () => {
  const [items, setItems] = useState<EssentialInfoItem[]>(SYNCED_DEFAULT_ITEMS);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newCategory, setNewCategory] = useState<EssentialInfoItem["category"]>("account");

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<EssentialInfoItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editCategory, setEditCategory] = useState<EssentialInfoItem["category"]>("account");

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Save to localStorage helper
  const updateItems = (newItems: EssentialInfoItem[]) => {
    setItems(newItems);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
    } catch {
      // ignore
    }
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
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

  // Add Item
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newValue.trim()) return;

    const newItem: EssentialInfoItem = {
      id: "item-" + Date.now(),
      user_id: "user",
      category: newCategory,
      title: newTitle.trim(),
      value: newValue.trim(),
    };

    updateItems([newItem, ...items]);
    setNewTitle("");
    setNewValue("");
    setShowAddModal(false);
  };

  // Open Edit Modal
  const handleStartEdit = (item: EssentialInfoItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem(item);
    setEditTitle(item.title);
    setEditValue(item.value);
    setEditCategory(item.category);
  };

  // Save Edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editTitle.trim() || !editValue.trim()) return;

    const updated = items.map((it) =>
      it.id === editingItem.id
        ? { ...it, title: editTitle.trim(), value: editValue.trim(), category: editCategory }
        : it
    );

    updateItems(updated);
    setEditingItem(null);
  };

  // Delete Item
  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("이 항목을 정말 삭제하시겠습니까?")) {
      const filtered = items.filter((it) => it.id !== id);
      updateItems(filtered);
    }
  };

  // Reset to original synced data
  const handleResetToSynced = () => {
    if (confirm("구글 시트에서 가져온 기본 정제 데이터로 초기화하시겠습니까?")) {
      updateItems(SYNCED_DEFAULT_ITEMS);
    }
  };

  const getCategoryIcon = (category: EssentialInfoItem["category"], title: string) => {
    if (title.includes("전화") || title.includes("휴대폰")) {
      return <Phone className="w-4 h-4 text-emerald-400" />;
    }
    if (title.includes("이메일") || title.includes("email")) {
      return <Mail className="w-4 h-4 text-sky-400" />;
    }
    if (title.includes("대표자") || title.includes("성명")) {
      return <User className="w-4 h-4 text-purple-400" />;
    }
    if (title.includes("홈페이지")) {
      return <Globe className="w-4 h-4 text-blue-400" />;
    }

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
        return <Hash className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Quick Action Buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
            기본 정보 메모장 (1초 복사)
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
          </h2>
          <p className="text-xs text-zinc-400">구글 시트 연동 정제 완료 • 원클릭 복사 & 수정 지원</p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleResetToSynced}
            title="구글 시트 기본값으로 초기화"
            className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>새 항목 추가</span>
          </button>
        </div>
      </div>

      {/* Copy Notification Toast */}
      {copiedId && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-full shadow-xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4" />
          클립보드에 1초 만에 복사되었습니다!
        </div>
      )}

      {/* Item Cards List */}
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
                  <div className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800 shrink-0">
                    {getCategoryIcon(item.category, item.title)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-semibold text-zinc-400 block mb-0.5">
                      {item.title}
                    </span>
                    <p className="text-sm font-semibold text-white tracking-wide break-all font-mono leading-snug">
                      {item.value}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Edit Button */}
                  <button
                    type="button"
                    onClick={(e) => handleStartEdit(item, e)}
                    title="항목 수정"
                    className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteItem(item.id, e)}
                    title="항목 삭제"
                    className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Copy Badge */}
                  <div
                    className={`ml-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
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
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#12141c] border border-zinc-800 rounded-3xl w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white">새 기본 정보 등록</h3>
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
                  <option value="account">계좌번호 / 금융</option>
                  <option value="address">주소</option>
                  <option value="id_number">주민등록 / 인증번호</option>
                  <option value="vehicle">차량번호</option>
                  <option value="insurance">인증서 / 증권</option>
                  <option value="custom">기타 사업자 / 연락처</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">항목 이름</label>
                <input
                  type="text"
                  placeholder="예: 우리은행 계좌, 부서 연락처"
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
                  placeholder="예: 010-1234-5678, 123-45-67890"
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

      {/* Edit Item Modal (수정 기능) */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#12141c] border border-zinc-800 rounded-3xl w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white">기본 정보 수정</h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-zinc-400 hover:text-white text-xs px-2 py-1"
              >
                닫기
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">카테고리</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as EssentialInfoItem["category"])}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="account">계좌번호 / 금융</option>
                  <option value="address">주소</option>
                  <option value="id_number">주민등록 / 인증번호</option>
                  <option value="vehicle">차량번호</option>
                  <option value="insurance">인증서 / 증권</option>
                  <option value="custom">기타 사업자 / 연락처</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">항목 이름</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">복사할 내용</label>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  required
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-600/30"
                >
                  수정 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
