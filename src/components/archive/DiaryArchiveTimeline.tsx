"use client";

import React, { useState, useEffect } from "react";
import { BookOpen, Upload, Calendar, Search, Sparkles, ChevronDown, ChevronUp, Trash2, Plus, Clock } from "lucide-react";
import {
  onAuthChanged,
  saveArchivedDiariesToCloud,
  subscribeArchivedDiariesFromCloud,
  mergeItemsById,
} from "@/lib/firebase/client";
import type { User } from "firebase/auth";

export interface ArchivedDiary {
  id: string;
  date: string;
  title: string;
  content: string;
  source: string; // 'google_docs', 'notion', 'email', 'direct'
  updatedAt?: string;
}

const SAMPLE_ARCHIVES: ArchivedDiary[] = [
  {
    id: "arch-1",
    date: "2025-11-24",
    title: "피큐레잇 벤처기업인증 갱신 완료",
    content: "기술보증기금 실사 후 최종 벤처기업인증 확인서가 발급되었다. 2028년까지 3년간 유효. 그동안 고생해준 팀원들에게 감사하며 다음 AI 챗봇 빌더 개발에 박차를 가하자.",
    source: "notion",
  },
  {
    id: "arch-2",
    date: "2024-09-02",
    title: "법인 카드 갱신 및 마스터 카드 발급",
    content: "우리은행 법인카드 유효기간 갱신 완료. 앞으로 지출 내역 관리를 더 철저히 하고 KMS 기반 서비스 유료화 전환을 준비해야겠다.",
    source: "google_docs",
  },
  {
    id: "arch-3",
    date: "2023-04-02",
    title: "북마크 큐레이션 시스템 특허 출원",
    content: "온라인 리서치와 북마크 이력 기반 개인화 추천 알고리즘 특허 출원서 접수 완료. 지식의 우주를 향한 첫 걸음.",
    source: "email",
  },
];

const ARCHIVE_STORAGE_KEY = "life_os_archived_diaries_v1";

export const DiaryArchiveTimeline: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [diaries, setDiaries] = useState<ArchivedDiary[]>(SAMPLE_ARCHIVES);
  const [searchQuery, setSearchQuery] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let localItems: ArchivedDiary[] = SAMPLE_ARCHIVES;
    try {
      const saved = localStorage.getItem(ARCHIVE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localItems = parsed;
          setDiaries(parsed);
        }
      }
    } catch {}

    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthChanged((user) => {
      setCurrentUser(user);

      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (user) {
        unsubscribeSnapshot = subscribeArchivedDiariesFromCloud(user.uid, (cloudDiaries) => {
          if (cloudDiaries && cloudDiaries.length > 0) {
            setDiaries((prev) => {
              const merged = mergeItemsById(prev, cloudDiaries);
              try {
                localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(merged));
              } catch {}
              return merged;
            });
          } else if (localItems && localItems.length > 0) {
            saveArchivedDiariesToCloud(user.uid, localItems);
          }
        });
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const updateDiaries = (newDiaries: ArchivedDiary[]) => {
    setDiaries(newDiaries);
    try {
      localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(newDiaries));
    } catch {}
    if (currentUser) {
      saveArchivedDiariesToCloud(currentUser.uid, newDiaries);
    }
  };

  // 대량 텍스트 파싱 파이프라인: 날짜 패턴(YYYY.MM.DD, YYYY-MM-DD 등)을 기준으로 일기를 자동 분할!
  const handleBulkImport = () => {
    if (!bulkText.trim()) return;

    // 날짜 매칭 정규식: 202X.XX.XX 또는 202X-XX-XX 또는 202X년 X월 X일
    const lines = bulkText.split(/\r?\n/);
    const parsedList: ArchivedDiary[] = [];

    let currentDate = new Date().toISOString().split("T")[0];
    let currentTitle = "과거 기록";
    let currentContent: string[] = [];

    const flushEntry = () => {
      if (currentContent.length > 0) {
        parsedList.push({
          id: "bulk-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
          date: currentDate,
          title: currentTitle,
          content: currentContent.join("\n").trim(),
          source: "google_docs",
        });
        currentContent = [];
      }
    };

    for (const line of lines) {
      const dateMatch = line.match(/(20\d{2})[\.\-\/년]\s*(\d{1,2})[\.\-\/월]\s*(\d{1,2})/);
      if (dateMatch) {
        flushEntry();
        const y = dateMatch[1];
        const m = dateMatch[2].padStart(2, "0");
        const d = dateMatch[3].padStart(2, "0");
        currentDate = `${y}-${m}-${d}`;
        // 날짜 뒷부분을 제목으로 추론
        const remaining = line.replace(dateMatch[0], "").replace(/^[일\s\.\:\-\]]+/, "").trim();
        currentTitle = remaining || `${currentDate} 기록`;
      } else {
        currentContent.push(line);
      }
    }
    flushEntry();

    if (parsedList.length > 0) {
      const merged = [...parsedList, ...diaries];
      // 날짜 최신순 정렬
      merged.sort((a, b) => b.date.localeCompare(a.date));
      updateDiaries(merged);
      alert(`성공적으로 ${parsedList.length}건의 과거 일기/기록을 타임라인으로 이관했습니다!`);
      setBulkText("");
      setShowImportModal(false);
    } else {
      alert("날짜가 포함된 텍스트를 찾을 수 없습니다. 예: '2024-05-10 오늘의 일기'");
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("이 기록을 삭제하시겠습니까?")) {
      updateDiaries(diaries.filter((d) => d.id !== id));
    }
  };

  const filtered = diaries.filter(
    (d) =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.date.includes(searchQuery)
  );

  return (
    <div className="space-y-4">
      {/* Header and Bulk Import Trigger */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            과거 일기 & 타임라인 아카이브
          </h3>
          <p className="text-[11px] text-zinc-400">구글 독스, 노션, 이메일 일기 대량 이관</p>
        </div>

        <button
          onClick={() => setShowImportModal(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-sm"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>대량 붙여넣기</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="과거 일기 내용, 키워드, 날짜(예: 2024) 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#12141c] border border-[#1f2433] rounded-2xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Timeline List */}
      <div className="space-y-3">
        {filtered.map((diary) => {
          const isExpanded = expandedId === diary.id;
          return (
            <div
              key={diary.id}
              className="p-4 rounded-3xl bg-[#12141c] border border-[#1f2433] space-y-2 hover:border-zinc-700 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">
                    {diary.date}
                  </span>
                  <span className="text-xs font-bold text-white">{diary.title}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDelete(diary.id)}
                    className="p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-zinc-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : diary.id)}
                    className="p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-white transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <p
                onClick={() => setExpandedId(isExpanded ? null : diary.id)}
                className={`text-xs text-zinc-300 leading-relaxed cursor-pointer ${
                  isExpanded ? "" : "line-clamp-2"
                }`}
              >
                {diary.content}
              </p>
            </div>
          );
        })}
      </div>

      {/* Bulk Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4">
          <div className="bg-[#12141c] border border-zinc-800 rounded-3xl w-full max-w-md p-5 pb-safe space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white">과거 일기 텍스트 대량 임포터</h3>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-xs text-zinc-400 hover:text-white p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl hover:bg-zinc-800 transition-colors"
              >
                닫기
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              구글 독스, 메모장, 노션에 있던 과거 일기들을 복사해서 한 번에 붙여넣으세요. 날짜(예: 2024.08.15)를 자동 인식하여 날짜별 타임라인으로 흡수합니다.
            </p>

            <textarea
              rows={8}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="예시:&#10;2024.03.15 창업 멤버들과 첫 회의&#10;오늘은 지식 큐레이션 서비스 기획을 구체화했다...&#10;&#10;2024.08.20 투자 IR 미팅&#10;본격적인 시드 라운드 미팅을 진행했다..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl p-3 text-sm sm:text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 resize-none font-mono"
            />

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="flex-1 py-2.5 bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleBulkImport}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/30"
              >
                분석 및 타임라인 흡수
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
