"use client";

import React from "react";
import { Smartphone, Share2, PlusSquare, CheckCircle2, X, DownloadCloud, Sparkles } from "lucide-react";

interface IosInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IosInstallGuideModal: React.FC<IosInstallGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#12141c] border border-indigo-500/30 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                1인 전용 아이폰 앱
              </span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <h3 className="text-base font-black text-white mt-1">아이폰에 1초 만에 앱 다운로드</h3>
          </div>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed">
          앱스토어 승인이나 1년 99달러 개발자 계정 없이도, 본인 아이폰에 <strong className="text-white">주소창 없는 완벽한 전체화면 네이티브 앱</strong>으로 설치하여 사용할 수 있습니다.
        </p>

        {/* Step-by-Step Visual Cards */}
        <div className="space-y-2.5">
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800">
            <div className="w-7 h-7 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
              1
            </div>
            <div className="text-xs">
              <span className="font-bold text-white block">아이폰 사파리(Safari)로 접속</span>
              <span className="text-zinc-400 text-[11px]">이 웹페이지를 아이폰 기본 브라우저인 Safari에서 열어줍니다.</span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800">
            <div className="w-7 h-7 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Share2 className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs">
              <span className="font-bold text-white block">사파리 하단 [공유 버튼] 터치</span>
              <span className="text-zinc-400 text-[11px]">브라우저 하단 중앙의 네모 상자 위쪽 화살표(↑) 아이콘을 누릅니다.</span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <PlusSquare className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs">
              <span className="font-bold text-white block">[홈 화면에 추가] 선택</span>
              <span className="text-zinc-400 text-[11px]">메뉴를 아래로 내려 [홈 화면에 추가]를 누르고 우측 상단 [추가]를 누르면 끝!</span>
            </div>
          </div>
        </div>

        {/* Advantages Notice */}
        <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-[11px] text-zinc-300 space-y-1.5">
          <div className="flex items-center gap-1.5 text-indigo-300 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>설치 후 달라지는 점</span>
          </div>
          <p className="text-zinc-400 pl-5 leading-relaxed">
            • 사파리 URL 주소창과 툴바가 사라지고 <strong className="text-white">아이폰 전체화면 앱</strong>으로 구동됩니다.<br />
            • 홈 화면에 Life-OS 전용 아이콘이 생성되어 1초 만에 켜집니다.<br />
            • 오프라인 캐싱 및 AES-256 클라이언트 암호화가 유지됩니다.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white text-xs font-bold rounded-2xl shadow-lg shadow-indigo-600/30 transition-all"
        >
          확인했습니다
        </button>
      </div>
    </div>
  );
};
