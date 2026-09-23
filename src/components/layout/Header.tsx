"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, ShieldCheck, LogIn, LogOut, UserCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title = "Life-OS",
  subtitle = "Single View Personal Operating System",
}) => {
  const [user, setUser] = useState<{ email?: string; name?: string; avatar?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          setUser({
            email: user.email,
            name: user.user_metadata?.full_name || user.email?.split("@")[0],
            avatar: user.user_metadata?.avatar_url,
          });
        }
      });

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser({
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0],
            avatar: session.user.user_metadata?.avatar_url,
          });
        } else {
          setUser(null);
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    } catch {
      // Supabase unconfigured or offline fallback
    }
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
      if (error) {
        alert("구글 로그인 시도: Supabase 프로젝트 URL 및 구글 OAuth 제공자 설정이 활성화되면 즉시 연동됩니다.\n현재 로컬 데이터베이스 모드로 안전하게 작동 중입니다.");
      }
    } catch {
      alert("현재 로컬 오프라인 데이터베이스 모드로 작동 중입니다. .env.local에 Supabase 키를 입력하면 클라우드 실시간 동기화가 활성화됩니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setUser(null);
    } catch {
      setUser(null);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#090a0f]/85 backdrop-blur-md border-b border-[#1f2433] px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              {title}
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                v1.2
              </span>
            </h1>
            <p className="text-[11px] text-zinc-400 leading-tight truncate max-w-[190px]">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {user ? (
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-xl">
              {user.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-4 h-4 rounded-full" />
              ) : (
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span className="text-[11px] text-zinc-300 font-medium truncate max-w-[70px]">
                {user.name}
              </span>
              <button
                onClick={handleLogout}
                title="로그아웃"
                className="text-zinc-500 hover:text-rose-400 p-0.5 ml-0.5"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-semibold shadow-sm transition-all active:scale-95"
            >
              {/* Google G Icon */}
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
              <span>구글 로그인</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
