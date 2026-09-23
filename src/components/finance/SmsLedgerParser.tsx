"use client";

import React, { useState } from "react";
import { parseSms, ParsedTransaction } from "@/lib/parser/smsParser";
import { Receipt, Sparkles, Plus, Trash2, ArrowDownRight, Tag, CreditCard } from "lucide-react";

const SAMPLE_TRANSACTIONS: ParsedTransaction[] = [
  {
    amount: 14500,
    merchant: "배달의민족 (동대문엽기떡볶이)",
    date: "2026-09-22",
    time: "19:30",
    paymentMethod: "현대카드",
    category: "식비",
    rawText: "[Web발신]\n현대카드 승인\n14,500원 일시불\n09/22 19:30\n배달의민족",
  },
  {
    amount: 5800,
    merchant: "스타벅스 강남R점",
    date: "2026-09-22",
    time: "12:15",
    paymentMethod: "신한카드",
    category: "카페",
    rawText: "[Web발신]\n신한카드 승인\n5,800원 일시불\n09/22 12:15\n스타벅스강남점",
  },
  {
    amount: 12500,
    merchant: "카카오T 택시",
    date: "2026-09-21",
    time: "23:10",
    paymentMethod: "토스카드",
    category: "교통",
    rawText: "토스뱅크 체크 승인 12,500원 09/21 23:10 카카오T택시",
  },
  {
    amount: 42000,
    merchant: "쿠팡 로켓프레시",
    date: "2026-09-20",
    time: "08:40",
    paymentMethod: "국민카드",
    category: "쇼핑",
    rawText: "KB국민카드 승인 42,000원 쿠팡 결제완료",
  },
];

export const SmsLedgerParser: React.FC = () => {
  const [inputText, setInputText] = useState("");
  const [parsedPreview, setParsedPreview] = useState<ParsedTransaction | null>(null);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>(SAMPLE_TRANSACTIONS);

  const handleParse = () => {
    if (!inputText.trim()) return;
    const result = parseSms(inputText);
    if (result && result.amount > 0) {
      setParsedPreview(result);
    } else {
      // 직접 입력 가능한 기본 형태
      setParsedPreview({
        amount: 0,
        merchant: "수동 등록",
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
    setTransactions([parsedPreview, ...transactions]);
    setParsedPreview(null);
    setInputText("");
  };

  const handleDelete = (index: number) => {
    setTransactions(transactions.filter((_, i) => i !== index));
  };

  const totalExpense = transactions.reduce((acc, cur) => acc + cur.amount, 0);

  return (
    <div className="space-y-4">
      {/* Total Expense Summary Card */}
      <div className="bg-gradient-to-br from-purple-950/50 via-[#12141c] to-[#12141c] border border-purple-500/20 rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-purple-400">
            <Receipt className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">이번 달 지출 합계</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 font-mono">
            {transactions.length}건 기록
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-2xl font-black text-white tracking-tight">
            {totalExpense.toLocaleString()}
          </span>
          <span className="text-sm font-bold text-zinc-400">원</span>
        </div>
      </div>

      {/* SMS Paste Parser Box */}
      <div className="bg-[#12141c] border border-[#1f2433] rounded-3xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white">결제 문자 / 알림톡 0.1초 파싱</h3>
          </div>
          <span className="text-[10px] text-zinc-400">신한, 현대, 토스, 카카오 등 지원</span>
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
          placeholder="카드사 승인 문자나 알림톡을 그대로 붙여넣으세요.&#10;예: [신한카드] 승인 14,500원 스타벅스 09/22 14:20"
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 resize-none font-mono"
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={handleParse}
            disabled={!inputText.trim()}
            className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all"
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
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 font-medium">
                  {parsedPreview.category}
                </span>
                <span className="text-[11px] text-zinc-400">
                  {parsedPreview.paymentMethod}
                </span>
              </div>

              <button
                onClick={handleSaveParsed}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/30"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>가계부에 추가</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction History List */}
      <div className="bg-[#12141c] border border-[#1f2433] rounded-3xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
          <ArrowDownRight className="w-4 h-4 text-indigo-400" />
          최근 지출 내역
        </h3>

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
    </div>
  );
};
