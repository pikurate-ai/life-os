"use client";

import React, { useState, useEffect } from "react";
import {
  StickyNote,
  Plus,
  Copy,
  Check,
  Trash2,
  Edit3,
  Pin,
  PinOff,
  Search,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Tag,
  Clock,
  CheckCircle2,
} from "lucide-react";
import {
  onAuthChanged,
  saveGeneralMemosToCloud,
  loadGeneralMemosFromCloud,
  subscribeGeneralMemosFromCloud,
  mergeItemsById,
} from "@/lib/firebase/client";

export interface MemoItem {
  id: string;
  title?: string;
  content: string;
  category: string;
  color: "indigo" | "emerald" | "amber" | "rose" | "purple" | "zinc";
  isPinned: boolean;
  clickCount: number;
  lastClickedAt: number;
  createdAt: string;
  updatedAt: string;
}

const MEMOS_STORAGE_KEY = "life_os_general_memos_v1";

const INITIAL_MEMOS: MemoItem[] = [
  {
    id: "memo-preset-1",
    title: "오늘 꼭 챙겨야 할 핵심 할일",
    content: "1. 세무사 통화해서 법인세 중간예납 확인\n2. 카카오톡 계약서 초안 검토 후 회신\n3. 저녁 헬스장 3대 운동 루틴 데드리프트 120kg",
    category: "중요",
    color: "amber",
    isPinned: true,
    clickCount: 15,
    lastClickedAt: Date.now() + 1000,
    createdAt: new Date().toLocaleDateString("ko-KR"),
    updatedAt: new Date().toLocaleDateString("ko-KR"),
  },
  {
    id: "memo-preset-2",
    title: "새로운 사업 및 프로젝트 아이디어",
    content: "AI 에이전트와 통합된 1인 라이프 OS를 모바일 PWA로 배포해서 오프라인에서도 모든 일상 데이터를 1초 만에 복사하고 통제하는 단일 슈퍼앱.",
    category: "아이디어",
    color: "indigo",
    isPinned: false,
    clickCount: 8,
    lastClickedAt: Date.now() + 500,
    createdAt: new Date().toLocaleDateString("ko-KR"),
    updatedAt: new Date().toLocaleDateString("ko-KR"),
  },
  {
    id: "memo-preset-3",
    title: "자주 쓰는 회의 링크 및 주소",
    content: "강남 공유오피스 4층 대회의실 비밀번호: 1024*\n온라인 줌 링크: https://zoom.us/j/lifeos-meeting",
    category: "업무",
    color: "emerald",
    isPinned: false,
    clickCount: 4,
    lastClickedAt: Date.now() + 200,
    createdAt: new Date().toLocaleDateString("ko-KR"),
    updatedAt: new Date().toLocaleDateString("ko-KR"),
  },
];

const COLOR_MAP = {
  indigo: {
    bg: "bg-indigo-950/30",
    border: "border-indigo-500/30 hover:border-indigo-500/60",
    badge: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    glow: "shadow-indigo-500/10",
    dot: "bg-indigo-400",
  },
  emerald: {
    bg: "bg-emerald-950/30",
    border: "border-emerald-500/30 hover:border-emerald-500/60",
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    glow: "shadow-emerald-500/10",
    dot: "bg-emerald-400",
  },
  amber: {
    bg: "bg-amber-950/30",
    border: "border-amber-500/30 hover:border-amber-500/60",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    glow: "shadow-amber-500/10",
    dot: "bg-amber-400",
  },
  rose: {
    bg: "bg-rose-950/30",
    border: "border-rose-500/30 hover:border-rose-500/60",
    badge: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    glow: "shadow-rose-500/10",
    dot: "bg-rose-400",
  },
  purple: {
    bg: "bg-purple-950/30",
    border: "border-purple-500/30 hover:border-purple-500/60",
    badge: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    glow: "shadow-purple-500/10",
    dot: "bg-purple-400",
  },
  zinc: {
    bg: "bg-zinc-900/60",
    border: "border-zinc-800 hover:border-zinc-700",
    badge: "bg-zinc-800 text-zinc-300 border-zinc-700",
    glow: "shadow-zinc-500/10",
    dot: "bg-zinc-400",
  },
};

const CATEGORIES = ["전체", "중요", "업무", "아이디어", "할일", "일상"];

export const GeneralMemoManager: React.FC = () => {
  const [memos, setMemos] = useState<MemoItem[]>(INITIAL_MEMOS);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  // New Memo Composer State
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("일상");
  const [newColor, setNewColor] = useState<MemoItem["color"]>("indigo");
  const [newIsPinned, setNewIsPinned] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("전체");

  // Interaction feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [justJumpedId, setJustJumpedId] = useState<string | null>(null);

  // Edit Modal State
  const [editingMemo, setEditingMemo] = useState<MemoItem | null>(null);

  // Sorting function: Pinned items first, then by lastClickedAt (LRU)
  const sortMemos = (list: MemoItem[]): MemoItem[] => {
    return [...list].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (b.lastClickedAt || 0) - (a.lastClickedAt || 0);
    });
  };

  // Load from LocalStorage and Cloud with Intelligent Two-Way Sync & Live Real-time Listener
  useEffect(() => {
    let initialLocal: MemoItem[] = INITIAL_MEMOS;
    try {
      const saved = localStorage.getItem(MEMOS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          initialLocal = sortMemos(parsed);
          setMemos(initialLocal);
        }
      }
    } catch {}

    let unsubscribeSnapshot: (() => void) | null = null;

    const handleDataSynced = () => {
      try {
        const saved = localStorage.getItem(MEMOS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMemos(sortMemos(parsed));
          }
        }
      } catch {}
    };

    if (typeof window !== "undefined") {
      window.addEventListener("life_os_data_synced", handleDataSynced);
    }

    const unsubscribeAuth = onAuthChanged(async (user) => {
      setCurrentUser(user);
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (user) {
        try {
          // 1. Initial Two-Way Merge on Login
          const cloudMemos = await loadGeneralMemosFromCloud(user);
          const currentSaved = localStorage.getItem(MEMOS_STORAGE_KEY);
          const localList: MemoItem[] = currentSaved ? JSON.parse(currentSaved) : initialLocal;

          const merged = sortMemos(mergeItemsById<MemoItem>(localList, cloudMemos || []));
          if (merged.length > 0) {
            setMemos(merged);
            try {
              localStorage.setItem(MEMOS_STORAGE_KEY, JSON.stringify(merged));
            } catch {}
            // Push merged back to cloud so both devices have all items
            await saveGeneralMemosToCloud(user, merged);
          }

          // 2. Real-Time Live Listener (Mobile <-> Web 0.1s instant sync)
          unsubscribeSnapshot = subscribeGeneralMemosFromCloud(user, (realtimeMemos) => {
            if (realtimeMemos && Array.isArray(realtimeMemos)) {
              const sorted = sortMemos(realtimeMemos);
              setMemos(sorted);
              try {
                localStorage.setItem(MEMOS_STORAGE_KEY, JSON.stringify(sorted));
              } catch {}
            }
          });
        } catch (e) {
          console.error("Memo sync initialization error:", e);
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      if (typeof window !== "undefined") {
        window.removeEventListener("life_os_data_synced", handleDataSynced);
      }
    };
  }, []);

  const saveMemos = (newMemos: MemoItem[]) => {
    const sorted = sortMemos(newMemos);
    setMemos(sorted);
    try {
      localStorage.setItem(MEMOS_STORAGE_KEY, JSON.stringify(sorted));
    } catch {}
    saveGeneralMemosToCloud(currentUser, sorted);
  };

  /**
   * Card Click Handler:
   * Moves the clicked memo card to the VERY TOP of the list immediately!
   */
  const handleCardClick = (target: MemoItem, e?: React.MouseEvent) => {
    // If the click is directly on the action buttons (copy, edit, delete, pin), don't trigger LRU jump twice
    const targetEl = e?.target as HTMLElement | undefined;
    if (targetEl && (targetEl.closest("button") || targetEl.closest("input"))) {
      return;
    }

    const now = Date.now();
    const updatedTarget: MemoItem = {
      ...target,
      clickCount: (target.clickCount || 0) + 1,
      lastClickedAt: now,
    };

    // If target is pinned, move to index 0 among pinned
    // If unpinned, move to index 0 among unpinned
    const remaining = memos.filter((m) => m.id !== target.id);
    let reordered: MemoItem[];

    if (updatedTarget.isPinned) {
      const pinned = remaining.filter((m) => m.isPinned);
      const unpinned = remaining.filter((m) => !m.isPinned);
      reordered = [updatedTarget, ...pinned, ...unpinned];
    } else {
      const pinned = remaining.filter((m) => m.isPinned);
      const unpinned = remaining.filter((m) => !m.isPinned);
      reordered = [...pinned, updatedTarget, ...unpinned];
    }

    setJustJumpedId(target.id);
    setTimeout(() => setJustJumpedId(null), 1200);

    saveMemos(reordered);
  };

  // One-click copy memo content to clipboard
  const handleCopyContent = (memo: MemoItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = memo.title ? `${memo.title}\n\n${memo.content}` : memo.content;
    navigator.clipboard.writeText(textToCopy);

    setCopiedId(memo.id);
    setTimeout(() => setCopiedId(null), 2000);

    // Also trigger top jump on copy
    handleCardClick(memo);
  };

  // Toggle Pin
  const handleTogglePin = (memo: MemoItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = memos.map((m) =>
      m.id === memo.id
        ? { ...m, isPinned: !m.isPinned, lastClickedAt: Date.now() }
        : m
    );
    saveMemos(updated);
  };

  // Delete Memo
  const handleDeleteMemo = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("이 메모를 삭제하시겠습니까?")) {
      saveMemos(memos.filter((m) => m.id !== id));
    }
  };

  // Create New Memo
  const handleCreateMemo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    const newMemo: MemoItem = {
      id: `memo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      title: newTitle.trim(),
      content: newContent.trim(),
      category: newCategory,
      color: newColor,
      isPinned: newIsPinned,
      clickCount: 1,
      lastClickedAt: Date.now(),
      createdAt: new Date().toLocaleDateString("ko-KR"),
      updatedAt: new Date().toISOString(),
    };

    setJustJumpedId(newMemo.id);
    setTimeout(() => setJustJumpedId(null), 1200);

    saveMemos([newMemo, ...memos]);

    // Reset Form
    setNewTitle("");
    setNewContent("");
    setIsComposerOpen(false);
  };

  // Save Edited Memo
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMemo || !editingMemo.content.trim()) return;

    const updated = memos.map((m) =>
      m.id === editingMemo.id
        ? {
            ...editingMemo,
            title: editingMemo.title?.trim() || "",
            content: editingMemo.content.trim(),
            updatedAt: new Date().toISOString(),
            lastClickedAt: Date.now(),
          }
        : m
    );
    saveMemos(updated);
    setEditingMemo(null);
  };

  // Filtered memos
  const filteredMemos = memos.filter((m) => {
    const matchesCategory = selectedCategory === "전체" || m.category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      (m.title && m.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      m.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Header & Quick Memo Trigger */}
      <div className="bg-[#12141c] border border-[#1f2433] rounded-3xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <StickyNote className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                자유 일반 메모장
                <span className="text-[10px] text-amber-300 font-mono bg-amber-500/10 px-2 py-0.2 rounded-full border border-amber-500/20">
                  클릭 시 최상단 자동 이동
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">터치하는 카드가 즉시 맨 위로 점프하여 자주 쓰는 메모를 상시 노출합니다.</p>
            </div>
          </div>

          <button
            onClick={() => setIsComposerOpen(!isComposerOpen)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
              isComposerOpen
                ? "bg-zinc-800 text-zinc-300"
                : "bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30"
            }`}
          >
            {isComposerOpen ? (
              <span>닫기</span>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>새 메모</span>
              </>
            )}
          </button>
        </div>

        {/* Expandable Fast Memo Composer */}
        {isComposerOpen && (
          <form onSubmit={handleCreateMemo} className="pt-2 border-t border-zinc-800 space-y-3 animate-in fade-in">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="메모 제목 (선택사항)"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />

            <textarea
              rows={4}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="자유롭게 무엇이든 메모를 남기세요... (주소, 계좌, 할일, 회의록, 링크 등)"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none leading-relaxed"
              required
            />

            {/* Color & Category & Pin options */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-zinc-400">색상:</span>
                {(["indigo", "emerald", "amber", "rose", "purple", "zinc"] as const).map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewColor(color)}
                    className={`w-5 h-5 rounded-full transition-transform ${COLOR_MAP[color].dot} ${
                      newColor === color ? "scale-125 ring-2 ring-white" : "opacity-60 hover:opacity-100"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1 text-xs text-zinc-300 focus:outline-none"
                >
                  {CATEGORIES.filter((c) => c !== "전체").map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-1 text-[11px] text-zinc-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newIsPinned}
                    onChange={(e) => setNewIsPinned(e.target.checked)}
                    className="rounded accent-amber-500"
                  />
                  <span>상단고정</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={!newContent.trim()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-600/30 flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>메모 저장</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Search and Category Filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="메모 검색 (제목, 내용, 키워드)..."
            className="w-full bg-[#12141c] border border-[#1f2433] rounded-2xl pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none py-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                selectedCategory === cat
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-[#12141c] text-zinc-400 hover:text-white border border-[#1f2433]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Memo Cards List (LRU Top Order) */}
      <div className="space-y-2.5">
        {filteredMemos.length === 0 ? (
          <div className="p-8 rounded-3xl bg-[#12141c] border border-zinc-800 text-center space-y-2">
            <StickyNote className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-xs text-zinc-400">등록된 메모가 없습니다.</p>
          </div>
        ) : (
          filteredMemos.map((memo) => {
            const style = COLOR_MAP[memo.color] || COLOR_MAP.indigo;
            const isJustJumped = justJumpedId === memo.id;
            const isCopied = copiedId === memo.id;

            return (
              <div
                key={memo.id}
                onClick={(e) => handleCardClick(memo, e)}
                className={`group cursor-pointer rounded-2xl p-4 border transition-all duration-300 relative shadow-md ${
                  style.bg
                } ${style.border} ${style.glow} ${
                  isJustJumped
                    ? "ring-2 ring-amber-400 scale-[1.01] -translate-y-0.5"
                    : "hover:scale-[1.005]"
                }`}
              >
                {/* Top Row: Category, Pin, and Action Controls */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border font-mono ${style.badge}`}
                    >
                      {memo.category}
                    </span>
                    {memo.isPinned && (
                      <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                        <Pin className="w-3 h-3 fill-amber-400" />
                        <span>고정됨</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Copy Button */}
                    <button
                      onClick={(e) => handleCopyContent(memo, e)}
                      title="클립보드 전체 복사"
                      className="p-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 transition-all flex items-center gap-1 shrink-0"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="text-[10px] text-emerald-400 font-bold whitespace-nowrap">복사됨!</span>
                        </>
                      ) : (
                        <Copy className="w-3 h-3 shrink-0" />
                      )}
                    </button>

                    {/* Pin Toggle */}
                    <button
                      onClick={(e) => handleTogglePin(memo, e)}
                      title={memo.isPinned ? "상단 고정 해제" : "상단 고정"}
                      className={`p-1.5 rounded-lg border transition-all shrink-0 ${
                        memo.isPinned
                          ? "bg-amber-500/20 border-amber-500/30 text-amber-400"
                          : "bg-zinc-900/80 hover:bg-zinc-800 border-zinc-700/60 text-zinc-400"
                      }`}
                    >
                      {memo.isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                    </button>

                    {/* Edit Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingMemo(memo);
                      }}
                      title="메모 수정"
                      className="p-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-400 hover:text-white transition-all shrink-0"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={(e) => handleDeleteMemo(memo.id, e)}
                      title="메모 삭제"
                      className="p-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-400 hover:text-rose-400 transition-all shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Title (if present) */}
                {memo.title && (
                  <h4 className="text-xs font-bold text-white mb-1.5 group-hover:text-amber-300 transition-colors break-words">
                    {memo.title}
                  </h4>
                )}

                {/* Content */}
                <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap selectable-text break-words w-full">
                  {memo.content}
                </p>

                {/* Footer: Click Count & Timestamp */}
                <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-white/5 text-[10px] text-zinc-400 font-mono">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    <span>{memo.updatedAt || memo.createdAt}</span>
                  </span>

                  <span className="text-zinc-500">
                    {memo.clickCount > 0 ? `${memo.clickCount}회 조회` : "새 메모"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Memo Modal */}
      {editingMemo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#12141c] border border-zinc-800 rounded-3xl w-full max-w-md p-5 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-amber-400" />
                메모 편집
              </h4>
              <button
                onClick={() => setEditingMemo(null)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                닫기
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <input
                type="text"
                value={editingMemo.title || ""}
                onChange={(e) => setEditingMemo({ ...editingMemo, title: e.target.value })}
                placeholder="메모 제목"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
              />

              <textarea
                rows={5}
                value={editingMemo.content}
                onChange={(e) => setEditingMemo({ ...editingMemo, content: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl p-3 text-xs text-white resize-none leading-relaxed"
                required
              />

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  {(["indigo", "emerald", "amber", "rose", "purple", "zinc"] as const).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditingMemo({ ...editingMemo, color })}
                      className={`w-5 h-5 rounded-full ${COLOR_MAP[color].dot} ${
                        editingMemo.color === color ? "scale-125 ring-2 ring-white" : "opacity-60"
                      }`}
                    />
                  ))}
                </div>

                <select
                  value={editingMemo.category}
                  onChange={(e) => setEditingMemo({ ...editingMemo, category: e.target.value })}
                  className="bg-zinc-900 border border-zinc-700 rounded-xl px-2 py-1 text-xs text-white"
                >
                  {CATEGORIES.filter((c) => c !== "전체").map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMemo(null)}
                  className="flex-1 py-2 bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-600/30"
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
