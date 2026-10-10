"use client";

import React, { useState, useEffect } from "react";
import { 
  Copy, Check, Plus, Edit2, Trash2, Sparkles, Building2, MapPin, Car, Shield, 
  CreditCard, Hash, Phone, Mail, User as UserIcon, Globe, RotateCcw, ChevronDown, ChevronUp, 
  Settings2, Briefcase, Heart, Home, Clock, ArrowUpRight, StickyNote
} from "lucide-react";
import { EssentialInfoItem } from "@/types/database";
import {
  onAuthChanged,
  loadEssentialInfoFromCloud,
  saveEssentialInfoToCloud,
  subscribeEssentialInfoFromCloud,
  mergeItemsById,
} from "@/lib/firebase/client";
import { GeneralMemoManager } from "@/components/memo/GeneralMemoManager";

// 카테고리 인터페이스
export interface CategoryMeta {
  id: string;
  name: string;
  iconName: string;
}

// 대한민국 40대 남성 맞춤형 기본 카테고리
const DEFAULT_CATEGORIES: CategoryMeta[] = [
  { id: "business", name: "업무/사업", iconName: "Briefcase" },
  { id: "finance", name: "금융/자산", iconName: "CreditCard" },
  { id: "vehicle", name: "차량/운전", iconName: "Car" },
  { id: "family", name: "부동산/가족", iconName: "Home" },
  { id: "health", name: "건강/의료", iconName: "Heart" },
  { id: "daily", name: "일상/기타", iconName: "Hash" },
];

// 구글 스프레드시트 2종 정제 + 40대 남성 군집화 데이터셋
const INITIAL_ITEMS: EssentialInfoItem[] = [
  // 1. 업무/사업 (Business)
  {
    id: "info-biz-num",
    user_id: "user",
    category: "business",
    title: "사업자등록번호",
    value: "276-88-01467",
    memo: "주식회사 피큐레잇 (일반과세자 / 정보통신업, 온라인 정보 제공업)",
    click_count: 5,
    last_clicked_at: 100,
  },
  {
    id: "info-corp-num",
    user_id: "user",
    category: "business",
    title: "법인등록번호",
    value: "110111-7222964",
    memo: "등기부등본 발급 및 은행 대출/계약 체결 시 사용",
    click_count: 3,
    last_clicked_at: 90,
  },
  {
    id: "info-head-address",
    user_id: "user",
    category: "business",
    title: "본사 사업자 주소",
    value: "경기도 김포시 김포한강8로 410, 1001-343호(구래동, 스타프라자) [10071]",
    memo: "세금계산서 발행 및 공식 우편물 수령지 (우편번호 10071)",
    click_count: 4,
    last_clicked_at: 95,
  },
  {
    id: "info-venture-cert",
    user_id: "user",
    category: "business",
    title: "벤처기업확인서 번호",
    value: "20251022010021",
    memo: "유효기간: 2025.11.24 ~ 2028.11.23 (투자유치 및 세제혜택 확인용)",
    click_count: 2,
    last_clicked_at: 80,
  },
  {
    id: "info-sme-cert",
    user_id: "user",
    category: "business",
    title: "중소기업확인서 번호",
    value: "0010-2025-356786",
    memo: "정부 지원사업 및 공공기관 입찰 제출용",
    click_count: 2,
    last_clicked_at: 70,
  },
  {
    id: "info-patent-applicant",
    user_id: "user",
    category: "business",
    title: "지적재산권 출원인 코드",
    value: "1-2020-014440-6",
    memo: "특허청 키프리스(KIPRIS) 및 특허 출원 시 출원인 고유번호",
    click_count: 1,
    last_clicked_at: 60,
  },
  {
    id: "info-scientist-id",
    user_id: "user",
    category: "business",
    title: "과학기술인등록번호 (연구원)",
    value: "12555772",
    memo: "국가 R&D 과제 참여 및 범부처통합연구지원시스템(IRIS) 등록번호",
    click_count: 1,
    last_clicked_at: 50,
  },
  {
    id: "info-homepage",
    user_id: "user",
    category: "business",
    title: "공식 홈페이지",
    value: "https://www.pikurate.com/",
    memo: "피큐레잇 AI 지식 큐레이션 플랫폼",
    click_count: 1,
    last_clicked_at: 40,
  },

  // 2. 금융/자산 (Finance)
  {
    id: "info-main-account",
    user_id: "user",
    category: "finance",
    title: "주거래 법인 계좌 (기업은행)",
    value: "047-116828-01-015",
    memo: "예금주: 주식회사 피큐레잇 (이체 및 결제 주사용 계좌)",
    click_count: 10,
    last_clicked_at: 200,
  },
  {
    id: "info-corp-card",
    user_id: "user",
    category: "finance",
    title: "사용 중인 법인카드 (우리 마스터)",
    value: "5532-0800-1231-6491",
    memo: "유효기간 09/29 | CVC 574 | 명의: Pikurate SEOKKUE SONG",
    click_count: 8,
    last_clicked_at: 150,
  },
  {
    id: "info-customs-code",
    user_id: "user",
    category: "finance",
    title: "개인통관고유부호",
    value: "P811151508155",
    memo: "관세청 발급 해외직구 통관용 고유번호",
    click_count: 6,
    last_clicked_at: 110,
  },

  // 3. 차량/운전 (Vehicle)
  {
    id: "info-vehicle-1",
    user_id: "user",
    category: "vehicle",
    title: "대표 차량 번호",
    value: "48보5508",
    memo: "건물 주차 할인 및 하이패스 연동 번호",
    click_count: 7,
    last_clicked_at: 120,
  },
  {
    id: "info-vehicle-2",
    user_id: "user",
    category: "vehicle",
    title: "보조/업무용 차량 번호",
    value: "161하1268",
    memo: "업무 출장 렌트/리스 차량",
    click_count: 2,
    last_clicked_at: 65,
  },

  // 4. 부동산/가족 (Family)
  {
    id: "info-ceo-info",
    user_id: "user",
    category: "family",
    title: "대표자 성명 / 직위",
    value: "송석규 대표",
    memo: "전략실 총괄 / 본인 확인 시 제출",
    click_count: 3,
    last_clicked_at: 85,
  },
  {
    id: "info-ceo-contact",
    user_id: "user",
    category: "family",
    title: "대표 연락처 & 이메일",
    value: "010-8871-6102 / leo.song@pikurate.com",
    memo: "비상연락망 및 공식 대외 소통 채널",
    click_count: 5,
    last_clicked_at: 105,
  },

  // 5. 건강/의료 (Health)
  {
    id: "info-health-check",
    user_id: "user",
    category: "health",
    title: "정기 건강검진 & 실손보험",
    value: "POL-2024-8849201 (현대해상 실손)",
    memo: "검진 주기: 매년 가을 / 혈압 및 간수치 정기 트래킹",
    click_count: 1,
    last_clicked_at: 30,
  },

  // 6. 일상/기타 (Daily)
  {
    id: "info-wifi",
    user_id: "user",
    category: "daily",
    title: "사무실 와이파이 / 게스트 비번",
    value: "Pikurate_5G / piku2026!@",
    memo: "방문객 및 회의실 전용 고속 Wi-Fi",
    click_count: 4,
    last_clicked_at: 75,
  },
];

const ITEMS_STORAGE_KEY = "life_os_essential_items_v2";
const CATEGORIES_STORAGE_KEY = "life_os_categories_v2";

export const QuickCopyManager: React.FC = () => {
  const [items, setItems] = useState<EssentialInfoItem[]>(INITIAL_ITEMS);
  const [categories, setCategories] = useState<CategoryMeta[]>(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 펼쳐진 메모 아이템 ID Set
  const [expandedMemos, setExpandedMemos] = useState<Set<string>>(new Set());

  // Add Item Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newMemo, setNewMemo] = useState("");
  const [newCategory, setNewCategory] = useState<string>("business");

  // Edit Item Modal State
  const [editingItem, setEditingItem] = useState<EssentialInfoItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editMemo, setEditMemo] = useState("");
  const [editCategory, setEditCategory] = useState<string>("business");

  // Category Manager Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Sub-tab: Essential Info vs General Memo
  const [viewMode, setViewMode] = useState<"essential" | "general">("essential");

  // Firebase User Auth State
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  // Load from LocalStorage and Cloud
  useEffect(() => {
    try {
      const savedItems = localStorage.getItem(ITEMS_STORAGE_KEY);
      if (savedItems) {
        const parsed = JSON.parse(savedItems);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.sort((a, b) => (b.last_clicked_at || 0) - (a.last_clicked_at || 0));
          setItems(parsed);
        }
      }

      const savedCategories = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (savedCategories) {
        const parsedCat = JSON.parse(savedCategories);
        if (Array.isArray(parsedCat) && parsedCat.length > 0) {
          setCategories(parsedCat);
        }
      }
    } catch {
      // ignore
    }

    // Google Auth & Cloud Sync with Live Real-time Listener & Two-Way Merge
    let unsubscribeSnapshot: (() => void) | null = null;

    const handleDataSynced = () => {
      try {
        const saved = localStorage.getItem(ITEMS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsed.sort((a, b) => (b.last_clicked_at || 0) - (a.last_clicked_at || 0));
            setItems(parsed);
          }
        }
      } catch {}
    };

    if (typeof window !== "undefined") {
      window.addEventListener("life_os_data_synced", handleDataSynced);
    }

    const unsubscribe = onAuthChanged(async (user) => {
      setCurrentUser(user);
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (user) {
        try {
          // 1. Initial Two-Way Merge on Login
          const cloudData = await loadEssentialInfoFromCloud(user);
          const currentSaved = localStorage.getItem(ITEMS_STORAGE_KEY);
          const localList: EssentialInfoItem[] = currentSaved ? JSON.parse(currentSaved) : INITIAL_ITEMS;

          const merged = mergeItemsById<EssentialInfoItem>(localList, cloudData || []);
          merged.sort((a, b) => (b.last_clicked_at || 0) - (a.last_clicked_at || 0));
          setItems(merged);
          try {
            localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(merged));
          } catch {}
          await saveEssentialInfoToCloud(user, merged);

          // 2. Real-Time Live Sync (Mobile <-> Web)
          unsubscribeSnapshot = subscribeEssentialInfoFromCloud(user, (realtimeItems) => {
            if (realtimeItems && Array.isArray(realtimeItems)) {
              const sorted = [...realtimeItems].sort((a, b) => (b.last_clicked_at || 0) - (a.last_clicked_at || 0));
              setItems(sorted);
              try {
                localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(sorted));
              } catch {}
            }
          });
        } catch (e) {
          console.error("Essential info sync error:", e);
        }
      }
    });

    return () => {
      unsubscribe();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      if (typeof window !== "undefined") {
        window.removeEventListener("life_os_data_synced", handleDataSynced);
      }
    };
  }, []);

  // Save items helper (Local + Cloud DB)
  const updateItems = (newItems: EssentialInfoItem[]) => {
    newItems.sort((a, b) => (b.last_clicked_at || 0) - (a.last_clicked_at || 0));
    setItems(newItems);
    try {
      localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(newItems));
    } catch {}

    saveEssentialInfoToCloud(currentUser, newItems);
  };

  // Save categories helper
  const updateCategories = (newCats: CategoryMeta[]) => {
    setCategories(newCats);
    try {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(newCats));
    } catch {
      // ignore
    }
  };

  // ★ 핵심 기능: 클릭 시 1초 복사 + 무조건 최상단(Index 0)으로 이동!
  const handleCopyAndPromote = async (item: EssentialInfoItem) => {
    try {
      await navigator.clipboard.writeText(item.value);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = item.value;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1800);
    }

    // 클릭 횟수 증가 및 타임스탬프 갱신 -> 무조건 맨 위(0번 인덱스)로 재배치!
    const updatedItem: EssentialInfoItem = {
      ...item,
      click_count: (item.click_count || 0) + 1,
      last_clicked_at: Date.now(),
    };

    const remaining = items.filter((it) => it.id !== item.id);
    const newItems = [updatedItem, ...remaining];
    updateItems(newItems);
  };

  // 메모 토글
  const toggleMemo = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(expandedMemos);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedMemos(next);
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
      memo: newMemo.trim() || "",
      click_count: 1,
      last_clicked_at: Date.now(),
    };

    updateItems([newItem, ...items]);
    setNewTitle("");
    setNewValue("");
    setNewMemo("");
    setShowAddModal(false);
  };

  // Start Edit
  const handleStartEdit = (item: EssentialInfoItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem(item);
    setEditTitle(item.title);
    setEditValue(item.value);
    setEditMemo(item.memo || "");
    setEditCategory(item.category);
  };

  // Save Edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editTitle.trim() || !editValue.trim()) return;

    const updated = items.map((it) =>
      it.id === editingItem.id
        ? {
            ...it,
            title: editTitle.trim(),
            value: editValue.trim(),
            memo: editMemo.trim() || "",
            category: editCategory,
          }
        : it
    );

    updateItems(updated);
    setEditingItem(null);
  };

  // Delete Item
  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("이 항목을 삭제하시겠습니까?")) {
      updateItems(items.filter((it) => it.id !== id));
    }
  };

  // Category Add
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    const newId = "cat-" + Date.now();
    const newCat: CategoryMeta = {
      id: newId,
      name: newCategoryName.trim(),
      iconName: "Hash",
    };

    updateCategories([...categories, newCat]);
    setNewCategoryName("");
  };

  // Category Delete
  const handleDeleteCategory = (catId: string) => {
    if (confirm("이 카테고리를 삭제하시겠습니까? (해당 카테고리의 항목은 '기타'로 변경됩니다)")) {
      updateCategories(categories.filter((c) => c.id !== catId));
      // 해당 카테고리에 속한 항목들은 'daily'로 이동
      updateItems(
        items.map((it) => (it.category === catId ? { ...it, category: "daily" } : it))
      );
      if (selectedCategory === catId) setSelectedCategory("all");
    }
  };

  // Reset to initial
  const handleReset = () => {
    if (confirm("처음 추천 기본 정보와 카테고리로 초기화하시겠습니까?")) {
      updateItems(INITIAL_ITEMS);
      updateCategories(DEFAULT_CATEGORIES);
      setSelectedCategory("all");
    }
  };

  // 카테고리 아이콘 렌더링 헬퍼
  const renderCategoryIcon = (category: string) => {
    switch (category) {
      case "business":
        return <Briefcase className="w-4 h-4 text-sky-400" />;
      case "finance":
        return <CreditCard className="w-4 h-4 text-emerald-400" />;
      case "vehicle":
        return <Car className="w-4 h-4 text-purple-400" />;
      case "family":
        return <Home className="w-4 h-4 text-amber-400" />;
      case "health":
        return <Heart className="w-4 h-4 text-rose-400" />;
      default:
        return <Hash className="w-4 h-4 text-indigo-400" />;
    }
  };

  // 필터링된 항목 (선택된 카테고리)
  const filteredItems = selectedCategory === "all"
    ? items
    : items.filter((it) => it.category === selectedCategory);

  return (
    <div className="space-y-4">
      {/* Sub-tab Switcher: Essential Info vs General Memo */}
      <div className="flex bg-[#12141c] p-1 rounded-2xl border border-[#1f2433] gap-1">
        <button
          onClick={() => setViewMode("essential")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            viewMode === "essential"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Copy className="w-3.5 h-3.5" />
          <span>1초 필수 정보 복사</span>
        </button>

        <button
          onClick={() => setViewMode("general")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            viewMode === "general"
              ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <StickyNote className="w-3.5 h-3.5" />
          <span>자유 일반 메모</span>
        </button>
      </div>

      {viewMode === "general" ? (
        <GeneralMemoManager />
      ) : (
        <>
          {/* Top Header */}
          <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
            기본 정보 메모장
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
          </h2>
          <p className="text-xs text-zinc-400">
            대한민국 40대 남성 맞춤형 • 클릭 시 1초 복사 & 최상단 자동 정렬
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleReset}
            title="초기 데이터로 복원"
            className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowCategoryModal(true)}
            title="카테고리 관리"
            className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>추가</span>
          </button>
        </div>
      </div>

      {/* Copy Notification Toast */}
      {copiedId && (
        <div className="fixed top-20 sm:top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-full shadow-2xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4" />
          클립보드 복사 완료! 최상단으로 이동되었습니다.
        </div>
      )}

      {/* Category Pills (가로 스크롤 친화적 모바일 뷰) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            selectedCategory === "all"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          전체 ({items.length})
        </button>

        {categories.map((cat) => {
          const count = items.filter((it) => it.category === cat.id).length;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                isSelected
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {renderCategoryIcon(cat.id)}
              <span>{cat.name}</span>
              <span className="text-[10px] opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Item Cards List */}
      <div className="grid grid-cols-1 gap-2.5">
        {filteredItems.map((item, index) => {
          const isCopied = copiedId === item.id;
          const isExpanded = expandedMemos.has(item.id);
          const categoryMeta = categories.find((c) => c.id === item.category);

          return (
            <div
              key={item.id}
              onClick={() => handleCopyAndPromote(item)}
              className="group relative cursor-pointer bg-[#12141c] hover:bg-[#181b26] active:scale-[0.99] border border-[#1f2433] hover:border-indigo-500/50 rounded-2xl p-3.5 transition-all shadow-sm"
            >
              {/* Card Header: Icon, Category, Title, TOP1 on left; Compact Action Buttons on right */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="p-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 shrink-0 text-indigo-400">
                    {renderCategoryIcon(item.category)}
                  </div>
                  {categoryMeta && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-800/80 text-zinc-400 font-medium shrink-0">
                      {categoryMeta.name}
                    </span>
                  )}
                  <span className="text-xs font-bold text-white truncate min-w-0">
                    {item.title}
                  </span>
                  {index === 0 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30 shrink-0">
                      TOP 1
                    </span>
                  )}
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleStartEdit(item, e)}
                    title="항목 수정"
                    className="p-1.5 rounded-xl bg-zinc-800/70 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors min-w-[30px] min-h-[30px] flex items-center justify-center"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteItem(item.id, e)}
                    title="항목 삭제"
                    className="p-1.5 rounded-xl bg-zinc-800/70 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors min-w-[30px] min-h-[30px] flex items-center justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div
                    className={`ml-1 w-[60px] py-1 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all shrink-0 ${
                      isCopied
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "bg-zinc-800/80 text-zinc-300 group-hover:bg-indigo-600 group-hover:text-white"
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span className="whitespace-nowrap font-bold text-[11px]">복사됨</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="whitespace-nowrap text-[11px]">복사</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Value: Dedicated 100% Full-Width Container (Never Squished on iPhone 13 Pro) */}
              <div className="mt-2.5 p-3 rounded-xl bg-black/40 border border-white/5 group-hover:border-indigo-500/30 transition-colors w-full">
                <p className="text-sm font-semibold text-white tracking-wide break-all font-mono leading-relaxed select-all">
                  {item.value}
                </p>
              </div>

              {/* Memo Trigger & Expandable Content */}
              {item.memo && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={(e) => toggleMemo(item.id, e)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                  >
                    <span>{isExpanded ? "메모 닫기" : "추가 메모 보기"}</span>
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 p-2.5 rounded-xl bg-zinc-900/90 border border-indigo-500/30 text-xs text-zinc-300 leading-relaxed font-sans animate-in fade-in slide-in-from-top-1">
                      <span className="text-[10px] text-indigo-400 font-bold block mb-0.5">💡 추가 메모:</span>
                      {item.memo}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#12141c] border border-zinc-800 rounded-3xl w-full max-w-md p-5 pb-safe space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white">새 기본 정보 등록</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-white text-xs p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl hover:bg-zinc-800 transition-colors"
              >
                닫기
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">카테고리</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">항목 이름</label>
                <input
                  type="text"
                  placeholder="예: 주거래 계좌, 아파트 공동현관 비번"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">복사할 내용 (핵심 정보)</label>
                <input
                  type="text"
                  placeholder="예: 010-1234-5678, #1234*"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">추가 메모 (선택사항, 클릭 시 표시)</label>
                <textarea
                  rows={2}
                  placeholder="예: 이체 한도 1회 1천만원 / 관리사무소 문의용"
                  value={newMemo}
                  onChange={(e) => setNewMemo(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
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
                  등록하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#12141c] border border-zinc-800 rounded-3xl w-full max-w-md p-5 pb-safe space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white">기본 정보 수정</h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-zinc-400 hover:text-white text-xs p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl hover:bg-zinc-800 transition-colors"
              >
                닫기
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">카테고리</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
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
                <label className="block text-xs text-zinc-400 mb-1">복사할 내용 (핵심 정보)</label>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">추가 메모 (선택사항, 클릭 시 표시)</label>
                <textarea
                  rows={2}
                  value={editMemo}
                  onChange={(e) => setEditMemo(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-2.5 bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl"
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

      {/* Category Manager Modal (카테고리 추가/삭제/편집) */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#12141c] border border-zinc-800 rounded-3xl w-full max-w-md p-5 pb-safe space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white">카테고리 관리</h3>
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="text-zinc-400 hover:text-white text-xs p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl hover:bg-zinc-800 transition-colors"
              >
                닫기
              </button>
            </div>

            {/* Add Category Form */}
            <form onSubmit={handleAddCategory} className="flex gap-2">
              <input
                type="text"
                placeholder="새 카테고리 이름 (예: 취미/골프)"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                required
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl"
              >
                추가
              </button>
            </form>

            {/* Category List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-2.5 bg-zinc-900/80 rounded-xl border border-zinc-800 text-xs"
                >
                  <div className="flex items-center gap-2">
                    {renderCategoryIcon(cat.id)}
                    <span className="font-semibold text-white">{cat.name}</span>
                    <span className="text-[10px] text-zinc-500">
                      ({items.filter((it) => it.category === cat.id).length}개 항목)
                    </span>
                  </div>

                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-1 text-zinc-500 hover:text-rose-400"
                    title="카테고리 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-xl"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
