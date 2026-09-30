"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, LogIn, LogOut, UserCheck, Database, Smartphone } from "lucide-react";
import { signOutUser, onAuthChanged } from "@/lib/firebase/client";
import { GoogleAuthModal } from "@/components/auth/GoogleAuthModal";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onOpenSyncHub?: () => void;
  onOpenInstallGuide?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title = "Life-OS",
  subtitle = "Single View Personal Operating System",
  onOpenSyncHub,
  onOpenInstallGuide,
}) => {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOutUser();
    } catch (error) {
      console.error("로그아웃 실패:", error);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#090a0f]/85 backdrop-blur-md border-b border-[#1f2433] px-3 py-2.5 pt-safe">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          {/* Logo and Titles */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5 truncate">
                {title}
                <span className="text-[9px] uppercase font-semibold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  1인 전용
                </span>
              </h1>
              <p className="text-[10px] text-zinc-400 leading-tight truncate hidden xs:block">{subtitle}</p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* iOS App Download Button */}
            {onOpenInstallGuide && (
              <button
                onClick={onOpenInstallGuide}
                title="아이폰 앱 다운로드 가이드"
                className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-indigo-400 border border-indigo-500/20 transition-all flex items-center gap-1 shrink-0 whitespace-nowrap"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold hidden sm:inline">앱받기</span>
              </button>
            )}

            {/* Raw Data Sync Hub Button */}
            {onOpenSyncHub && (
              <button
                onClick={onOpenSyncHub}
                title="로우 데이터 싱크 센터"
                className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-purple-400 border border-purple-500/20 transition-all flex items-center gap-1 shrink-0 whitespace-nowrap"
              >
                <Database className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold hidden sm:inline">싱크</span>
              </button>
            )}

            {/* User Profile / Google Login */}
            {currentUser ? (
              <div
                onClick={() => setShowAuthModal(true)}
                title="클릭하여 클라우드 동기화 상태 및 계정 확인"
                className="flex items-center gap-1.5 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-indigo-500/40 px-2 py-1 rounded-xl shadow-sm shrink-0 cursor-pointer transition-all"
              >
                {/* Live Sync Pulse */}
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>

                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt="Profile"
                    className="w-4 h-4 rounded-full border border-indigo-400/40 shrink-0"
                  />
                ) : (
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
                <span className="text-[10px] text-zinc-200 font-semibold truncate max-w-[65px] whitespace-nowrap">
                  {currentUser.displayName || currentUser.email?.split("@")[0]}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLogout();
                  }}
                  title="로그아웃"
                  className="text-zinc-500 hover:text-rose-400 p-0.5 ml-0.5 transition-colors shrink-0"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 text-[11px] font-bold shadow-md transition-all active:scale-95 shrink-0 whitespace-nowrap"
              >
                <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24">
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
                <span>로그인</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Google Auth Modal */}
      <GoogleAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
};
