"use client";

import React, { useState, useEffect } from "react";
import { parseSms, ParsedTransaction } from "@/lib/parser/smsParser";
import { Receipt, Sparkles, Plus, Trash2, ArrowDownRight, Tag, CreditCard, PieChart, Target, Calendar, Check } from "lucide-react";
import {
  onAuthChanged,
  saveFinancialLogsToCloud,
  loadFinancialLogsFromCloud,
  subscribeFinancialLogsFromCloud,
  mergeItemsById,
} from "@/lib/firebase/client";

const SAMPLE_TRANSACTIONS: ParsedTransaction[] = [
  {
    amount: 14500,
    merchant: "배달의민족 (동대문엽기떡볶이)",
    date: "2026-09-23",
    time: "19:30",
    paymentMethod: "현대카드",
    category: "식비",
    rawText: "[Web발신]\n현대카드 승인\n14,500원 일시불\n09/23 19:30\n배달의민족",
  },
  {
    amount: 5800,
    merchant: "스타벅스 강남R점",
    date: "2026-09-23",
    time: "12:15",
    paymentMethod: "신한카드",
    category: "카페",
    rawText: "[Web발신]\n신한카드 승인\n5,800원 일시불\n09/23 12:15\n스타벅스강남점",
  },
  {
    amount: 12500,
    merchant: "카카오T 택시",
    date: "2026-09-22",
    time: "23:10",
    paymentMethod: "토스카드",
    category: "교통",
    rawText: "토스뱅크 체크 승인 12,500원 09/22 23:10 카카오T택시",
  },
  {
    amount: 42000,
    merchant: "쿠팡 로켓프레시",
    date: "2026-09-21",
    time: "08:40",
    paymentMethod: "국민카드",
    category: "쇼핑",
    rawText: "KB국민카드 승인 42,000원 쿠팡 결제완료",
  },
  {
    amount: 150000,
    merchant: "SK에너지 주유소 (주유)",
    date: "2026-09-20",
    time: "18:20",
    paymentMethod: "우리법인카드",
    category: "교통",
    rawText: "우리비즈 승인 150,000원 SK에너지",
  },
];

const FINANCE_STORAGE_KEY = "life_os_financial_logs_v2";
const BUDGET_STORAGE_KEY = "life_os_monthly_budget_v2";

export const SmsLedgerParser: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>(SAMPLE_TRANSACTIONS);
  const [monthlyBudget, setMonthlyBudget] = useState<number>(1500000); // 150만원 기본 예산
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState(1500000);

  const [inputText, setInputText] = useState("");
  const [parsedPreview, setParsedPreview] = useState<ParsedTransaction | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);

  // Manual Form
  const [manualMerchant, setManualMerchant] = useState("");
  const [manualAmount, setManualAmount] = useState<number>(0);
  const [manualCategory, setManualCategory] = useState("식비");
  const [manualPaymentMethod, setManualPaymentMethod] = useState("신용카드");

  // Load from LocalStorage & Cloud
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FINANCE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTransactions(parsed);
        }
      }

      const savedBudget = localStorage.getItem(BUDGET_STORAGE_KEY);
      if (savedBudget) {
        setMonthlyBudget(Number(savedBudget));
        setTempBudget(Number(savedBudget));
      }
    } catch {}

    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribe = onAuthChanged(async (user) => {
      setCurrentUser(user);
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (user) {
        try {
          // 1. Initial Two-Way Merge on Login
          const cloudLogs = await loadFinancialLogsFromCloud(user);
          const currentSaved = localStorage.getItem(FINANCE_STORAGE_KEY);
          const localList: ParsedTransaction[] = currentSaved ? JSON.parse(currentSaved) : SAMPLE_TRANSACTIONS;

          const merged = mergeItemsById<ParsedTransaction>(localList, cloudLogs || []);
          if (merged.length > 0) {
            setTransactions(merged);
            try {
              localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(merged));
            } catch {}
            await saveFinancialLogsToCloud(user, merged);
          }

          // 2. Real-Time Live Sync (Mobile <-> Web)
          unsubscribeSnapshot = subscribeFinancialLogsFromCloud(user, (realtimeLogs) => {
            if (realtimeLogs && Array.isArray(realtimeLogs)) {
              setTransactions((prevLocal) => {
                const updated = mergeItemsById<ParsedTransaction>(prevLocal, realtimeLogs);
                try {
                  localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(updated));
                } catch {}
                return updated;
              });
            }
          });
        } catch (e) {
          console.error("Financial logs sync error:", e);
        }
      }
    });

    return () => {
      unsubscribe();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const updateTransactions = (newTx: ParsedTransaction[]) => {
    setTransactions(newTx);
    try {
      localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(newTx));
    } catch {}
    if (currentUser) {
      saveFinancialLogsToCloud(currentUser, newTx);
    }
  };

  const handleParse = () => {
    if (!inputText.trim()) return;
    const result = parseSms(inputText);
    if (result && result.amount > 0) {
      setParsedPreview(result);
    } else {
      setParsedPreview({
        amount: 0,
        merchant: "가맹점 입력",
        date: new Date().toISOString().split("T")[0],
        time: new Date().toTimeString().slice(0, 5),
        paymentMethod: "신용카드",
        category: "기타",
        rawText: inputText,
      });
    }
  };

  const handleSaveParsed = () => {
    if (!parsedPreview) return;
    updateTransactions([parsedPreview, ...transactions]);
    setParsedPreview(null);
    setInputText("");
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualMerchant.trim() || manualAmount <= 0) return;

    const newTx: ParsedTransaction = {
      amount: manualAmount,
      merchant: manualMerchant.trim(),
      date: new Date().toISOString().split("T")[0],
      time: new Date().toTimeString().slice(0, 5),
      paymentMethod: manualPaymentMethod,
      category: manualCategory,
      rawText: "수동 등록",
    };

    updateTransactions([newTx, ...transactions]);
    setManualMerchant("");
    setManualAmount(0);
    setShowManualModal(false);
  };

  const handleDelete = (index: number) => {
    if (confirm("이 지출 내역을 삭제하시겠습니까?")) {
      updateTransactions(transactions.filter((_, i) => i !== index));
    }
  };

  const handleSaveBudget = () => {
    setMonthlyBudget(tempBudget);
    try {
      localStorage.setItem(BUDGET_STORAGE_KEY, String(tempBudget));
    } catch {}
    setIsEditingBudget(false);
  };

  const totalExpense = transactions.reduce((acc, cur) => acc + cur.amount, 0);
  const budgetUsagePercent = monthlyBudget > 0 ? Math.min(100, Math.round((totalExpense / monthlyBudget) * 100)) : 0;

  // 카테고리별 합계 계산
  const categoryTotals = transactions.reduce((acc, cur) => {
    acc[cur.category] = (acc[cur.category] || 0) + cur.amount;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Monthly Budget & Spending Header Card */}
      <div className="bg-gradient-to-br from-purple-950/60 via-slate-950 to-[#12141c] border border-purple-500/30 rounded-3xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-purple-400">
            <Receipt className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">이번 달 지출 현황</span>
          </div>
          <button
            onClick={() => setIsEditingBudget(!isEditingBudget)}
            className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg shrink-0 whitespace-nowrap"
          >
            <Target className="w-3 h-3 text-indigo-400" />
            <span>예산 설정</span>
          </button>
        </div>

        {isEditingBudget ? (
          <div className="flex items-center gap-2 bg-zinc-900 p-2.5 rounded-2xl border border-zinc-700">
            <span className="text-xs text-zinc-400">월 예산 (원):</span>
            <input
              type="number"
              value={tempBudget}
              onChange={(e) => setTempBudget(Number(e.target.value))}
              className="flex-1 bg-transparent text-white font-mono text-sm font-bold focus:outline-none"
            />
            <button
              onClick={handleSaveBudget}
              className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-lg"
            >
              저장
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-black text-white tracking-tight font-mono">
                  {totalExpense.toLocaleString()}
                </span>
                <span className="text-sm font-bold text-zinc-400 ml-1">원</span>
              </div>
              <span className="text-xs text-zinc-400 font-mono">
                목표 {monthlyBudget.toLocaleString()}원
              </span>
            </div>

            {/* Budget Progress Bar */}
            <div className="mt-3 space-y-1">
              <div className="h-2.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div
                  style={{ width: `${budgetUsagePercent}%` }}
                  className={`h-full transition-all duration-500 rounded-full ${
                    budgetUsagePercent > 90
                      ? "bg-rose-500"
                      : budgetUsagePercent > 70
                      ? "bg-amber-500"
                      : "bg-indigo-500"
                  }`}
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                <span>예산 소진율 {budgetUsagePercent}%</span>
                <span>잔여: {Math.max(0, monthlyBudget - totalExpense).toLocaleString()}원</span>
              </div>
            </div>
          </div>
        )}

        {/* Category Share Bars */}
        <div className="pt-2 border-t border-purple-500/15">
          <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
            <span className="font-semibold text-zinc-300">카테고리별 지출 비율</span>
            <span>{Object.keys(categoryTotals).length}개 분류</span>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
            {Object.entries(categoryTotals).map(([cat, amt]) => {
              const pct = totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0;
              return (
                <div
                  key={cat}
                  className="px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] whitespace-nowrap flex items-center gap-1.5"
                >
                  <span className="text-zinc-300 font-medium">{cat}</span>
                  <span className="text-indigo-400 font-bold font-mono">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SMS Parser Input Card */}
      <div className="bg-[#12141c] border border-[#1f2433] rounded-3xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white">결제 문자 / 카톡 0.1초 파싱</h3>
          </div>
          <button
            onClick={() => setShowManualModal(true)}
            className="text-[11px] text-zinc-400 hover:text-white px-2 py-1 bg-zinc-800 rounded-lg flex items-center gap-1 shrink-0 whitespace-nowrap"
          >
            <Plus className="w-3 h-3" />
            <span>직접 입력</span>
          </button>
        </div>

        <textarea
          rows={3}
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            if (e.target.value.trim().length > 10) {
              const res = parseSms(e.target.value);
              if (res) setParsedPreview(res);
            }
          }}
          placeholder="카드사 승인 문자나 카카오톡 알림톡을 복사해 붙여넣으세요.&#10;예: [신한카드] 승인 14,500원 스타벅스 09/23 14:20"
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 resize-none font-mono"
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={handleParse}
            disabled={!inputText.trim()}
            className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shrink-0 whitespace-nowrap"
          >
            파싱 분석
          </button>
        </div>

        {/* Parsed Preview Card */}
        {parsedPreview && (
          <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 space-y-2.5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between text-xs">
              <span className="text-indigo-300 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                자동 분석 완료
              </span>
              <span className="text-zinc-400 font-mono text-[11px]">
                {parsedPreview.date} {parsedPreview.time}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-zinc-900/80 p-2 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block">사용처</span>
                <input
                  type="text"
                  value={parsedPreview.merchant}
                  onChange={(e) => setParsedPreview({ ...parsedPreview, merchant: e.target.value })}
                  className="bg-transparent text-white font-semibold text-xs focus:outline-none w-full"
                />
              </div>

              <div className="bg-zinc-900/80 p-2 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block">금액 (원)</span>
                <input
                  type="number"
                  value={parsedPreview.amount}
                  onChange={(e) => setParsedPreview({ ...parsedPreview, amount: Number(e.target.value) })}
                  className="bg-transparent text-emerald-400 font-bold text-xs focus:outline-none w-full font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 font-medium shrink-0">
                  {parsedPreview.category}
                </span>
                <span className="text-[11px] text-zinc-400 font-mono truncate">
                  {parsedPreview.paymentMethod}
                </span>
              </div>

              <button
                onClick={handleSaveParsed}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/30 shrink-0 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>가계부에 추가</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transactions History List */}
      <div className="bg-[#12141c] border border-[#1f2433] rounded-3xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <ArrowDownRight className="w-4 h-4 text-indigo-400" />
            최근 지출 내역
          </h3>
          <span className="text-xs text-zinc-500 font-mono">{transactions.length}건 기록</span>
        </div>

        <div className="space-y-2">
          {transactions.map((tx, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                  <Tag className="w-3.5 h-3.5 text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white truncate">{tx.merchant}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-medium shrink-0">
                      {tx.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono mt-0.5">
                    <span>{tx.date}</span>
                    <span>•</span>
                    <span>{tx.paymentMethod}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-black text-rose-400 font-mono">
                  -{tx.amount.toLocaleString()}원
                </span>
                <button
                  onClick={() => handleDelete(idx)}
                  className="p-1 text-zinc-600 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manual Add Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#12141c] border border-zinc-800 rounded-3xl w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white">직접 지출 등록</h3>
              <button onClick={() => setShowManualModal(false)} className="text-xs text-zinc-400">
                닫기
              </button>
            </div>

            <form onSubmit={handleManualAdd} className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">사용처 (가맹점명)</label>
                <input
                  type="text"
                  placeholder="예: 김밥천국, 메가커피"
                  value={manualMerchant}
                  onChange={(e) => setManualMerchant(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">결제 금액 (원)</label>
                <input
                  type="number"
                  placeholder="예: 12000"
                  value={manualAmount || ""}
                  onChange={(e) => setManualAmount(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">카테고리</label>
                  <select
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="식비">식비</option>
                    <option value="카페">카페</option>
                    <option value="교통">교통</option>
                    <option value="쇼핑">쇼핑</option>
                    <option value="정기결제">정기결제</option>
                    <option value="의료">의료</option>
                    <option value="기타">기타</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">결제 수단</label>
                  <input
                    type="text"
                    value={manualPaymentMethod}
                    onChange={(e) => setManualPaymentMethod(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="flex-1 py-2.5 bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/30"
                >
                  지출 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
