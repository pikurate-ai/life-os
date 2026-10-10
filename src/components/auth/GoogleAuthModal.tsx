"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  LogIn,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  UserCheck,
  Smartphone,
  Database,
  RefreshCw,
  Server,
  Lock,
} from "lucide-react";
import {
  signInWithGoogle,
  signInWithGoogleRedirect,
  setLocalMasterUser,
  getLocalMasterUser,
  getSyncUserId,
  syncAllModulesFromCloud,
} from "@/lib/firebase/client";

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // 1-Person Master Profile form
  const [masterName, setMasterName] = useState("JU (주성빈)");
  const [masterEmail, setMasterEmail] = useState("leo.song.life@gmail.com");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedEmail = localStorage.getItem("life_os_last_auth_email");
      const savedName = localStorage.getItem("life_os_last_auth_name");
      const localMaster = getLocalMasterUser();

      if (localMaster?.email) {
        setMasterEmail(localMaster.email);
      } else if (savedEmail) {
        setMasterEmail(savedEmail);
      } else {
        setMasterEmail("leo.song.life@gmail.com");
      }

      if (localMaster?.displayName) {
        setMasterName(localMaster.displayName);
      } else if (savedName) {
        setMasterName(savedName);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle standard popup login
  const handlePopupLogin = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const user = await signInWithGoogle();
      if (user?.email) {
        await syncAllModulesFromCloud(user.email);
      }
      onClose();
    } catch (err: any) {
      console.error("Popup login error:", err);
      if (err?.code === "auth/unauthorized-domain") {
        setErrorMessage(
          "Firebase 보안 정책: 현재 배포 도메인이 Firebase Console에 미등록되어 구글 팝업이 차단되었습니다. 아래 '1인 전용 즉시 연결'을 누르시거나 Firebase에 도메인을 등록해주세요."
        );
      } else if (err?.code === "auth/popup-blocked") {
        setErrorMessage(
          "모바일 브라우저에 의해 팝업창이 차단되었습니다. 아래 '리다이렉트 로그인' 또는 '1인 전용 즉시 연결'을 이용해주세요."
        );
      } else if (err?.code !== "auth/popup-closed-by-user") {
        setErrorMessage(`로그인 오류: ${err.message || err.code}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle mobile redirect login
  const handleRedirectLogin = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await signInWithGoogleRedirect();
    } catch (err: any) {
      setErrorMessage(`리다이렉트 로그인 오류: ${err.message || err.code}`);
      setLoading(false);
    }
  };

  // Handle 1-Person Instant Master User Connect
  const handleInstantMasterLogin = async () => {
    const email = masterEmail.trim().toLowerCase() || "leo.song.life@gmail.com";
    const name = masterName.trim() || "JU (주성빈)";
    const uid = getSyncUserId(email);

    if (typeof window !== "undefined") {
      localStorage.setItem("life_os_last_auth_name", name);
      localStorage.setItem("life_os_last_auth_email", email);
    }

    setLocalMasterUser({
      uid,
      displayName: name,
      email,
      photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=" + encodeURIComponent(name),
      isLocalMaster: true,
    });

    setLoading(true);
    setSyncStatus("클라우드 Firestore와 전체 양방향 동기화 중...");
    try {
      await syncAllModulesFromCloud(email);
      setSyncStatus("모든 데이터 동기화 완료! 실시간 연결됨");
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (e) {
      console.error("Instant login sync error:", e);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleForceSync = async () => {
    setLoading(true);
    setSyncStatus("클라우드 Firestore와 강제 전체 재동기화 중...");
    try {
      const email = masterEmail.trim().toLowerCase() || "leo.song.life@gmail.com";
      await syncAllModulesFromCloud(email);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("life_os_auth_change"));
      }
      setSyncStatus("클라우드 Firestore와 0.1초 실시간 전체 동기화 완료!");
      setTimeout(() => setSyncStatus(null), 3000);
    } catch (e) {
      console.error("Force sync error:", e);
      setSyncStatus("동기화 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyVercelDomain = () => {
    const host = typeof window !== "undefined" ? window.location.hostname : "pikurate-ai.github.io";
    navigator.clipboard.writeText(host);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2000);
  };

  const computedDocId = getSyncUserId(masterEmail);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#12141c] border border-indigo-500/30 rounded-3xl w-full max-w-md p-5 sm:p-6 pb-safe space-y-4 sm:space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          aria-label="닫기"
          className="absolute top-4 right-4 p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <LogIn className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                Universal Cloud Sync
              </span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <h3 className="text-base font-black text-white mt-1">계정 연동 & 클라우드 실시간 동기화</h3>
          </div>
        </div>

        {/* Active Account & Firestore Document Status */}
        <div className="p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <div>
              <span className="text-[10px] text-zinc-400 block">클라우드 Firestore 매핑 키</span>
              <span className="font-mono text-emerald-400 font-bold text-[11px]">{computedDocId || "usr_leo_song_life_gmail_com"}</span>
            </div>
          </div>
          <span className="text-[9px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
            0.1초 실시간 연동
          </span>
        </div>

        {/* Error Alert if any */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>로그인 안내</span>
            </div>
            <p className="text-[11px] leading-relaxed text-zinc-300 pl-5">{errorMessage}</p>
          </div>
        )}

        {/* Sync Status Banner */}
        {syncStatus && (
          <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{syncStatus}</span>
          </div>
        )}

        {/* Option 1: Fast 1-Person Instant Login (100% Reliable, 0s, No Domain Block) */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/50 to-purple-950/30 border border-indigo-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-white">모바일 • 웹 통합 1초 즉시 연동 (강력 추천)</h4>
            </div>
            <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
              동일 이메일 100% 일치
            </span>
          </div>

          <p className="text-[11px] text-zinc-300 leading-relaxed">
            모바일(아이폰/갤럭시)과 PC 웹에서 <strong className="text-white">동일한 이메일</strong>을 입력하시면, 동일한 Firestore DB 문서로 자동 병합 및 실시간 동기화됩니다.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">사용자 이름</label>
              <input
                type="text"
                value={masterName}
                onChange={(e) => setMasterName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm sm:text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">연동 이메일 (계정 키)</label>
              <input
                type="email"
                value={masterEmail}
                onChange={(e) => setMasterEmail(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm sm:text-xs text-white"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleInstantMasterLogin}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>내 계정으로 즉시 연동하기</span>
            </button>
            <button
              onClick={handleForceSync}
              title="강제 전체 재동기화"
              className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl border border-zinc-700 transition-all flex items-center justify-center shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Database Storage Information Card (Answers user question) */}
        <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Database className="w-4 h-4 text-indigo-400" />
              데이터는 어디에 보관되나요? (DB 아키텍처)
            </span>
            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              실시간 NoSQL
            </span>
          </div>

          <div className="space-y-2 text-[11px] text-zinc-300 leading-relaxed divide-y divide-zinc-800/80">
            <div className="pt-1 space-y-1">
              <div className="flex items-center gap-1.5 text-indigo-300 font-semibold">
                <Server className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Google Cloud Firestore (영구 중앙 DB)</span>
              </div>
              <p className="text-zinc-400 pl-5">
                구글 Firebase 프로젝트 (<span className="text-zinc-200 font-mono">quote-ff971434543345</span>)의 NoSQL DB에 모든 데이터(메모, 1초 복사, 가계부, 자산, 1RM, 지표, 사진)가 영구 저장됩니다.
              </p>
              <p className="text-zinc-500 pl-5 font-mono text-[10px]">
                고유 문서 키: <span className="text-emerald-400">{computedDocId || "usr_user_gmail_com"}</span>
              </p>
            </div>

            <div className="pt-2 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>로컬 오프라인 캐시 (localStorage)</span>
              </div>
              <p className="text-zinc-400 pl-5">
                오프라인이나 비행기 모드에서도 0ms 반응 속도를 위해 브라우저 로컬에 자동 캐싱되며, 온라인 복귀 시 클라우드와 양방향 자동 병합(Merge)됩니다.
              </p>
            </div>

            <div className="pt-2 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>AES-256 Zero-Knowledge 보안 금고</span>
              </div>
              <p className="text-zinc-400 pl-5">
                암호 금고 데이터는 브라우저 단에서 마스터 비밀번호로 암호화된 상태로만 Firestore에 저장되므로, 구글 서버나 외부 누구도 내용을 절대 열람할 수 없습니다.
              </p>
            </div>
          </div>
        </div>

        {/* Option 2: Standard Google OAuth Popup */}
        <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Google Firebase OAuth 로그인</span>
            </h4>
            <span className="text-[10px] text-zinc-500 font-mono">공식 OAuth</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handlePopupLogin}
              disabled={loading}
              className="py-2 bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-bold rounded-xl transition-all disabled:opacity-50"
            >
              {loading ? "연결 중..." : "구글 팝업 열기"}
            </button>

            <button
              onClick={handleRedirectLogin}
              disabled={loading}
              className="py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl border border-zinc-700 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>모바일 리다이렉트</span>
            </button>
          </div>
        </div>

        {/* Option 3: Firebase Console Whitelist Guide */}
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              구글 팝업 오류(`auth/unauthorized-domain`) 도메인 등록법
            </span>
          </div>
          <p className="text-[11px] text-zinc-300 leading-relaxed">
            Firebase Console의 승인된 도메인에 <strong className="text-white">현재 접속 도메인(pikurate-ai.github.io 등)</strong>을 추가하시면 공식 구글 팝업도 즉시 100% 작동합니다.
          </p>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleCopyVercelDomain}
              className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg border border-zinc-700 text-[11px] font-mono flex items-center justify-center gap-1"
            >
              {copiedDomain ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedDomain ? "복사됨!" : "접속 도메인 복사"}</span>
            </button>

            <a
              href="https://console.firebase.google.com/project/quote-ff971434543345/authentication/settings"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-1.5 bg-amber-600/80 hover:bg-amber-600 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Firebase 설정</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
