"use client";

import React, { useState, useEffect } from "react";
import {
  Database,
  Cloud,
  FileSpreadsheet,
  MessageSquare,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Copy,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Layers,
  FileText,
  Save,
  Trash2,
} from "lucide-react";
import {
  PRESET_GOOGLE_SHEETS,
  fetchLiveGoogleSheet,
  parseDocsOrSlidesText,
  GoogleSyncResultItem,
} from "@/lib/sync/googleDriveSync";
import { parseKakaoChatText, ParsedKakaoItem } from "@/lib/parser/kakaoParser";
import { downloadBackupFile, restoreFromBackup, exportAllLocalData } from "@/lib/sync/universalBackup";
import { onAuthChanged, saveEssentialInfoToCloud, loadEssentialInfoFromCloud } from "@/lib/firebase/client";
import type { User } from "firebase/auth";

export const DataSyncHub: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<"google" | "kakao" | "backup">("google");

  // Google Sync States
  const [googleUrl, setGoogleUrl] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleItems, setGoogleItems] = useState<GoogleSyncResultItem[]>([]);
  const [googleDocText, setGoogleDocText] = useState("");
  const [googleStatus, setGoogleStatus] = useState<string | null>(null);

  // Kakao Sync States
  const [kakaoRawText, setKakaoRawText] = useState("");
  const [kakaoItems, setKakaoItems] = useState<ParsedKakaoItem[]>([]);
  const [kakaoStatus, setKakaoStatus] = useState<string | null>(null);

  // Backup / Cloud States
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [localDataSummary, setLocalDataSummary] = useState<Record<string, number>>({});

  useEffect(() => {
    const unsubscribe = onAuthChanged((user) => setCurrentUser(user));
    refreshLocalSummary();
    return () => unsubscribe();
  }, []);

  const refreshLocalSummary = () => {
    const backup = exportAllLocalData();
    setLocalDataSummary({
      essential: backup.data.essentialInfo?.length || 0,
      financial: backup.data.financialLogs?.length || 0,
      assets: backup.data.assets?.length || 0,
      vault: backup.data.encryptedVault?.length || 0,
      workout: backup.data.workout1RM?.length || 0,
      health: backup.data.healthMetrics?.length || 0,
      diaries: backup.data.archivedDiaries?.length || 0,
    });
  };

  // Google Sheets Fetch Handler
  const handleFetchGoogleSheet = async (urlToFetch?: string) => {
    const target = urlToFetch || googleUrl;
    if (!target) return;

    setIsGoogleLoading(true);
    setGoogleStatus("구글 시트로부터 실시간 로우 데이터를 읽어오는 중...");

    const res = await fetchLiveGoogleSheet(target);
    setIsGoogleLoading(false);
    setGoogleStatus(res.message);

    if (res.success && res.items.length > 0) {
      setGoogleItems(res.items);
    }
  };

  // Google Docs / Slides Text Parse Handler
  const handleParseGoogleDocsText = () => {
    if (!googleDocText.trim()) return;
    const parsed = parseDocsOrSlidesText(googleDocText, "google_docs");
    setGoogleItems((prev) => [...prev, ...parsed]);
    setGoogleStatus(`구글 닥스/슬라이드 텍스트에서 ${parsed.length}개 항목을 추출했습니다.`);
    setGoogleDocText("");
  };

  // Load Google Items into Life-OS Essential Info
  const handleLoadGoogleItemsIntoLifeOS = async () => {
    if (googleItems.length === 0) return;

    try {
      const storedRaw = localStorage.getItem("life_os_essential_info_v1");
      const existing = storedRaw ? JSON.parse(storedRaw) : [];

      // Deduplicate by title & value
      const existingKeys = new Set(existing.map((item: any) => `${item.title}:${item.value}`));
      const newAdditions = googleItems
        .filter((item) => !existingKeys.has(`${item.title}:${item.value}`))
        .map((item) => ({
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          title: item.title,
          value: item.value,
          category: item.category,
          memo: item.memo,
          clickCount: 0,
          lastClickedAt: new Date().toISOString(),
        }));

      const merged = [...newAdditions, ...existing];
      localStorage.setItem("life_os_essential_info_v1", JSON.stringify(merged));

      if (currentUser) {
        await saveEssentialInfoToCloud(currentUser.uid, merged);
      }

      setGoogleStatus(`성공: 신규 ${newAdditions.length}개 항목이 1초 복사 메모장에 안전하게 적재되었습니다!`);
      setGoogleItems([]);
      refreshLocalSummary();
    } catch (e: any) {
      setGoogleStatus(`적재 실패: ${e.message}`);
    }
  };

  // Kakao Parse Handler
  const handleParseKakao = () => {
    if (!kakaoRawText.trim()) return;
    const parsed = parseKakaoChatText(kakaoRawText);
    setKakaoItems(parsed);
    setKakaoStatus(`카카오톡 텍스트에서 계좌/주소/지출 등 ${parsed.length}개 데이터를 성공적으로 분리했습니다.`);
  };

  // Load Kakao Items into Life-OS
  const handleLoadKakaoItems = async () => {
    if (kakaoItems.length === 0) return;

    try {
      // 1. QuickCopy items
      const quickItems = kakaoItems.filter((i) => i.targetModule === "quickcopy");
      if (quickItems.length > 0) {
        const storedRaw = localStorage.getItem("life_os_essential_info_v1");
        const existing = storedRaw ? JSON.parse(storedRaw) : [];
        const newAdditions = quickItems.map((item) => ({
          id: `kakao-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          title: item.title,
          value: item.value,
          category: item.category,
          memo: item.memo,
          clickCount: 0,
          lastClickedAt: new Date().toISOString(),
        }));
        const merged = [...newAdditions, ...existing];
        localStorage.setItem("life_os_essential_info_v1", JSON.stringify(merged));
        if (currentUser) await saveEssentialInfoToCloud(currentUser.uid, merged);
      }

      setKakaoStatus(`성공: ${quickItems.length}개 데이터가 1초 복사 메모장에 적재되었습니다.`);
      setKakaoItems([]);
      setKakaoRawText("");
      refreshLocalSummary();
    } catch (e: any) {
      setKakaoStatus(`적재 실패: ${e.message}`);
    }
  };

  // Backup File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const res = await restoreFromBackup(json, currentUser?.uid);
        setBackupStatus(res.message);
        refreshLocalSummary();
      } catch (err: any) {
        setBackupStatus(`복원 실패: 유효한 JSON 백업 파일이 아닙니다 (${err.message}).`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-950/60 via-purple-950/30 to-[#12141c] border border-indigo-500/20 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                  Data Ingestion Hub
                </span>
                {currentUser && (
                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                    Cloud Connected
                  </span>
                )}
              </div>
              <h3 className="text-base font-black text-white mt-0.5">로우 데이터 통합 싱크 & 적재 센터</h3>
            </div>
          </div>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed">
          구글 드라이브(시트·닥스·슬라이드), 카카오톡 내보내기 텍스트 등 흩어진 모든 원천 데이터를 가져와 Life-OS에 실시간으로 적재합니다.
        </p>

        {/* Live Data Count Chips */}
        <div className="pt-2 border-t border-indigo-500/10 grid grid-cols-4 gap-2 text-center">
          <div className="bg-[#12141c]/60 p-2 rounded-xl border border-white/5">
            <span className="text-[10px] text-zinc-400 block">1초복사</span>
            <span className="text-xs font-bold text-indigo-300 font-mono">{localDataSummary.essential || 0}개</span>
          </div>
          <div className="bg-[#12141c]/60 p-2 rounded-xl border border-white/5">
            <span className="text-[10px] text-zinc-400 block">가계부</span>
            <span className="text-xs font-bold text-purple-300 font-mono">{localDataSummary.financial || 0}건</span>
          </div>
          <div className="bg-[#12141c]/60 p-2 rounded-xl border border-white/5">
            <span className="text-[10px] text-zinc-400 block">암호금고</span>
            <span className="text-xs font-bold text-amber-300 font-mono">{localDataSummary.vault || 0}개</span>
          </div>
          <div className="bg-[#12141c]/60 p-2 rounded-xl border border-white/5">
            <span className="text-[10px] text-zinc-400 block">일기보관</span>
            <span className="text-xs font-bold text-emerald-300 font-mono">{localDataSummary.diaries || 0}편</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#12141c] p-1 rounded-2xl border border-[#1f2433] gap-1">
        <button
          onClick={() => setActiveTab("google")}
          className={`flex-1 py-2 px-1 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition-all min-w-0 ${
            activeTab === "google"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
          <span className="whitespace-nowrap truncate">구글 시트/드라이브</span>
        </button>

        <button
          onClick={() => setActiveTab("kakao")}
          className={`flex-1 py-2 px-1 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition-all min-w-0 ${
            activeTab === "kakao"
              ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 shrink-0" />
          <span className="whitespace-nowrap truncate">카톡 파서</span>
        </button>

        <button
          onClick={() => setActiveTab("backup")}
          className={`flex-1 py-2 px-1 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition-all min-w-0 ${
            activeTab === "backup"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Cloud className="w-3.5 h-3.5 shrink-0" />
          <span className="whitespace-nowrap truncate">백업 & 복원</span>
        </button>
      </div>

      {/* TAB 1: Google Drive & Sheets */}
      {activeTab === "google" && (
        <div className="space-y-4">
          {/* Preset Buttons for User's Sheets */}
          <div className="bg-[#12141c] border border-[#1f2433] rounded-3xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                보유 구글 시트 원클릭 라이브 싱크
              </h4>
              <span className="text-[10px] text-zinc-500 font-mono">2개 프리셋 등록됨</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_GOOGLE_SHEETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleFetchGoogleSheet(preset.url)}
                  disabled={isGoogleLoading}
                  className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-left transition-all group disabled:opacity-50"
                >
                  <div>
                    <span className="text-xs font-bold text-white group-hover:text-indigo-300 block">
                      {preset.name}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono truncate block max-w-[200px]">
                      {preset.sheetId}
                    </span>
                  </div>
                  <RefreshCw
                    className={`w-4 h-4 text-indigo-400 shrink-0 ${isGoogleLoading ? "animate-spin" : ""}`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Custom Google Sheet URL input */}
          <div className="bg-[#12141c] border border-[#1f2433] rounded-3xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <ExternalLink className="w-4 h-4 text-indigo-400" />
              임의의 구글 시트 공유 링크 실시간 페치
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={googleUrl}
                onChange={(e) => setGoogleUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button
                onClick={() => handleFetchGoogleSheet()}
                disabled={isGoogleLoading || !googleUrl.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1 disabled:opacity-50 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGoogleLoading ? "animate-spin" : ""}`} />
                <span>가져오기</span>
              </button>
            </div>
          </div>

          {/* Google Docs / Slides Raw Text Ingestion */}
          <div className="bg-[#12141c] border border-[#1f2433] rounded-3xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-purple-400" />
              구글 닥스 / 슬라이드 / 메모 텍스트 붙여넣기
            </h4>
            <textarea
              rows={3}
              value={googleDocText}
              onChange={(e) => setGoogleDocText(e.target.value)}
              placeholder="구글 닥스나 슬라이드에서 복사한 텍스트를 붙여넣으세요. (예: 주민번호: 7xxxx-1xxxx | 법인사업자: 123-45-67890 | 주소: 서울시 강남구...)"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
            <div className="flex justify-end">
              <button
                onClick={handleParseGoogleDocsText}
                disabled={!googleDocText.trim()}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>텍스트 자동 분석</span>
              </button>
            </div>
          </div>

          {/* Status Message */}
          {googleStatus && (
            <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{googleStatus}</span>
            </div>
          )}

          {/* Extracted Google Items Preview */}
          {googleItems.length > 0 && (
            <div className="bg-[#12141c] border border-emerald-500/30 rounded-3xl p-4 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white">
                    추출된 로우 데이터 ({googleItems.length}개)
                  </h4>
                </div>
                <button
                  onClick={handleLoadGoogleItemsIntoLifeOS}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-md shadow-emerald-600/30"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Life-OS 적재하기</span>
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {googleItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {item.category}
                        </span>
                        <span className="font-bold text-white">{item.title}</span>
                      </div>
                      <span className="text-zinc-400 font-mono text-[11px] block mt-0.5">{item.value}</span>
                    </div>
                    {item.memo && (
                      <span className="text-[10px] text-zinc-500 max-w-[120px] truncate">{item.memo}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: KakaoTalk Chat & Text Parser */}
      {activeTab === "kakao" && (
        <div className="space-y-4">
          <div className="bg-[#12141c] border border-[#1f2433] rounded-3xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                카카오톡 대화 내용 / 알림톡 복사 & 붙여넣기
              </h4>
              <span className="text-[10px] text-zinc-500">계좌·주소·금액 자동 탐지</span>
            </div>

            <textarea
              rows={5}
              value={kakaoRawText}
              onChange={(e) => setKakaoRawText(e.target.value)}
              placeholder="카카오톡 대화방에서 내보낸 텍스트나 복사한 메시지를 그대로 붙여넣으세요.
예시:
[홍길동] [오후 2:30] 국민 123-456-789012 로 50000원 보냈어
[배송알림] 서울특별시 서초구 반포대로 58 101동 203호 배송 완료"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 leading-relaxed resize-none"
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-zinc-500 font-mono">
                {kakaoRawText.length}자 입력됨
              </span>
              <button
                onClick={handleParseKakao}
                disabled={!kakaoRawText.trim()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 active:scale-95 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-600/30 flex items-center gap-1.5 shrink-0 whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>지능형 데이터 추출</span>
              </button>
            </div>
          </div>

          {/* Status Message */}
          {kakaoStatus && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{kakaoStatus}</span>
            </div>
          )}

          {/* Extracted Kakao Items Preview */}
          {kakaoItems.length > 0 && (
            <div className="bg-[#12141c] border border-amber-500/30 rounded-3xl p-4 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-white">
                    추출된 카카오 데이터 ({kakaoItems.length}개)
                  </h4>
                </div>
                <button
                  onClick={handleLoadKakaoItems}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-md shadow-amber-600/30"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Life-OS 적재</span>
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {kakaoItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {item.type.toUpperCase()}
                        </span>
                        <span className="font-bold text-white">{item.title}</span>
                      </div>
                      <span className="text-zinc-300 font-mono text-[11px] block mt-0.5">{item.value}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500">{item.timestamp || item.sender}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Universal Raw Backup & Restore */}
      {activeTab === "backup" && (
        <div className="space-y-4">
          {/* Download Raw Backup Card */}
          <div className="bg-[#12141c] border border-[#1f2433] rounded-3xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-purple-400" />
                <h4 className="text-xs font-bold text-white">전체 로우 데이터 원본 백업</h4>
              </div>
              <span className="text-[10px] text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                JSON 원본 추출
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              필수 정보, 가계부 지출, 순자산, 1RM, 신체지표, 과거 일기 등 Life-OS 내 모든 7개 도메인 데이터를 하나의 JSON 파일로 즉시 다운로드하여 안전하게 영구 소장합니다.
            </p>
            <button
              onClick={downloadBackupFile}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 active:scale-98 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-600/30 flex items-center justify-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>전체 백업 파일 다운로드 (.json)</span>
            </button>
          </div>

          {/* Restore from Backup Card */}
          <div className="bg-[#12141c] border border-[#1f2433] rounded-3xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-white">백업 파일 업로드 및 전체 복원</h4>
              </div>
              <span className="text-[10px] text-zinc-500">1클릭 복구</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              이전에 다운로드해 둔 `life-os-raw-backup-*.json` 파일을 선택하면 모든 데이터를 즉시 복원하고 구글 클라우드 DB에도 실시간 동기화합니다.
            </p>
            <label className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 active:scale-98 border border-zinc-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all">
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>백업 파일 선택 및 복원</span>
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* Status Alert */}
          {backupStatus && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{backupStatus}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
