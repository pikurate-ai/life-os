"use client";

import React, { useState, useEffect } from "react";
import { Lock, Unlock, KeyRound, Copy, Check, Upload, Plus, Eye, EyeOff, ShieldCheck, Search, Trash2, RefreshCw, Wand2 } from "lucide-react";
import { encryptData, decryptData, EncryptedData } from "@/lib/crypto/aes";
import {
  onAuthChanged,
  saveVaultToCloud,
  loadVaultFromCloud,
  subscribeVaultFromCloud,
  mergeItemsById,
} from "@/lib/firebase/client";

interface VaultEntry {
  id: string;
  siteName: string;
  siteUrl?: string;
  username: string;
  encrypted: EncryptedData;
  decryptedPassword?: string;
}

const VAULT_STORAGE_KEY = "life_os_encrypted_vault_v2";

export const PasswordVaultManager: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [masterPassword, setMasterPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlockError, setUnlockError] = useState("");
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // New item form
  const [newSite, setNewSite] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Load encrypted vault from local & cloud
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VAULT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setEntries(parsed);
        }
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
          const cloudVault = await loadVaultFromCloud(user);
          const currentSaved = localStorage.getItem(VAULT_STORAGE_KEY);
          const localList: VaultEntry[] = currentSaved ? JSON.parse(currentSaved) : [];

          const merged = mergeItemsById<VaultEntry>(localList, cloudVault || []);
          if (merged.length > 0) {
            setEntries(merged);
            try {
              localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(merged));
            } catch {}
            await saveVaultToCloud(user, merged);
          }

          // 2. Real-Time Live Sync (Mobile <-> Web)
          unsubscribeSnapshot = subscribeVaultFromCloud(user, (realtimeVault) => {
            if (realtimeVault && Array.isArray(realtimeVault)) {
              setEntries((prevLocal) => {
                const updated = mergeItemsById<VaultEntry>(prevLocal, realtimeVault);
                try {
                  localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(updated));
                } catch {}
                return updated;
              });
            }
          });
        } catch (e) {
          console.error("Vault sync error:", e);
        }
      }
    });

    return () => {
      unsubscribe();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const updateEntries = (newEntries: VaultEntry[]) => {
    setEntries(newEntries);
    try {
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(newEntries));
    } catch {}
    if (currentUser) {
      saveVaultToCloud(currentUser, newEntries);
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterPassword.trim()) {
      setUnlockError("마스터 패스워드를 입력해주세요.");
      return;
    }

    try {
      const decrypted = await Promise.all(
        entries.map(async (entry) => {
          try {
            const pass = await decryptData(entry.encrypted, masterPassword);
            return { ...entry, decryptedPassword: pass };
          } catch {
            return entry;
          }
        })
      );
      setEntries(decrypted);
      setIsUnlocked(true);
      setUnlockError("");
    } catch {
      setUnlockError("복호화 중 오류가 발생했습니다. 마스터 패스워드를 확인해주세요.");
    }
  };

  const handleLock = () => {
    // 메모리 상에서 복호화된 비밀번호 즉시 제거
    setEntries(
      entries.map((entry) => ({
        ...entry,
        decryptedPassword: undefined,
      }))
    );
    setMasterPassword("");
    setIsUnlocked(false);
  };

  const handleCopy = async (id: string, text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {}
  };

  // 강력한 랜덤 비밀번호 생성기
  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~";
    let generated = "";
    for (let i = 0; i < 16; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(generated);
  };

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSite.trim() || !newPassword.trim() || !masterPassword) return;

    try {
      const enc = await encryptData(newPassword.trim(), masterPassword);
      const newEntry: VaultEntry = {
        id: "vault-" + Date.now(),
        siteName: newSite.trim(),
        username: newUsername.trim(),
        encrypted: enc,
        decryptedPassword: newPassword.trim(),
      };

      updateEntries([newEntry, ...entries]);
      setNewSite("");
      setNewUsername("");
      setNewPassword("");
      setShowAddModal(false);
    } catch {
      alert("암호화 처리 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteEntry = (id: string) => {
    if (confirm("이 비밀번호 항목을 삭제하시겠습니까?")) {
      updateEntries(entries.filter((e) => e.id !== id));
    }
  };

  // Google / LastPass CSV Import
  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !masterPassword) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) return;

      const header = lines[0].toLowerCase().split(",");
      const nameIdx = header.findIndex((h) => h.includes("name") || h.includes("title"));
      const urlIdx = header.findIndex((h) => h.includes("url"));
      const userIdx = header.findIndex((h) => h.includes("username") || h.includes("user") || h.includes("login"));
      const passIdx = header.findIndex((h) => h.includes("password") || h.includes("pass"));

      const newEntries: VaultEntry[] = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(",").map((c) => c.replace(/^"|"$/g, "").trim());
        const site = (nameIdx !== -1 && row[nameIdx]) ? row[nameIdx] : (urlIdx !== -1 && row[urlIdx]) ? row[urlIdx] : "웹사이트";
        const user = (userIdx !== -1 && row[userIdx]) ? row[userIdx] : "";
        const pass = (passIdx !== -1 && row[passIdx]) ? row[passIdx] : "";

        if (site && pass) {
          const enc = await encryptData(pass, masterPassword);
          newEntries.push({
            id: `csv-${Date.now()}-${i}`,
            siteName: site,
            username: user,
            encrypted: enc,
            decryptedPassword: pass,
          });
        }
      }

      updateEntries([...newEntries, ...entries]);
      alert(`성공적으로 ${newEntries.length}개의 비밀번호를 암호화하여 볼트에 임포트 및 클라우드 동기화했습니다!`);
    };
    reader.readAsText(file);
  };

  const filteredEntries = entries.filter(
    (e) =>
      e.siteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Zero-Knowledge Security Notice */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-300">
        <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
        <div className="text-xs leading-relaxed">
          <span className="font-bold block text-sm mb-0.5">Zero-Knowledge 클라이언트 암호화</span>
          마스터 패스워드는 서버에 일절 저장되지 않으며, 기기 내 Web Crypto API(AES-256)로 직접 암호화/복호화됩니다.
        </div>
      </div>

      {/* Locked Screen */}
      {!isUnlocked ? (
        <div className="bg-[#12141c] border border-[#1f2433] rounded-3xl p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
            <Lock className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-base font-bold text-white">암호 금고 잠금 상태</h3>
            <p className="text-xs text-zinc-400 mt-1">
              금고를 열려면 본인만의 마스터 패스워드를 입력하세요.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-3 max-w-xs mx-auto">
            <input
              type="password"
              placeholder="마스터 패스워드 입력"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-center font-mono"
              required
            />

            {unlockError && <p className="text-xs text-rose-400">{unlockError}</p>}

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5"
            >
              <Unlock className="w-4 h-4" />
              <span>금고 잠금 해제</span>
            </button>
          </form>
        </div>
      ) : (
        /* Unlocked Screen */
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-sm whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>계정 추가</span>
              </button>

              <label className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl cursor-pointer border border-zinc-700 whitespace-nowrap shrink-0">
                <Upload className="w-3.5 h-3.5" />
                <span>CSV 임포트</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="hidden"
                />
              </label>
            </div>

            <button
              onClick={handleLock}
              className="flex items-center gap-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white text-xs rounded-xl whitespace-nowrap shrink-0"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>금고 잠그기</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="사이트명, 아이디 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#12141c] border border-[#1f2433] rounded-2xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Copied Toast */}
          {copiedId && (
            <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-full shadow-xl flex items-center gap-2 animate-bounce">
              <Check className="w-4 h-4" />
              클립보드에 안전하게 복사되었습니다!
            </div>
          )}

          {/* Entries List */}
          <div className="space-y-2.5">
            {filteredEntries.length === 0 ? (
              <div className="text-center py-8 text-xs text-zinc-500 bg-[#12141c] rounded-3xl border border-[#1f2433]">
                보관 중인 비밀번호가 없습니다. [계정 추가] 또는 Google/LastPass [CSV 임포트]를 이용해 보세요.
              </div>
            ) : (
              filteredEntries.map((entry) => {
                const isPasswordVisible = showPasswordMap[entry.id];
                const passwordText = entry.decryptedPassword || "••••••••";

                return (
                  <div
                    key={entry.id}
                    className="p-3.5 rounded-2xl bg-[#12141c] border border-[#1f2433] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-bold text-white">{entry.siteName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-500 font-mono">AES-256</span>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="p-1 text-zinc-600 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-zinc-500 block">계정 아이디</span>
                        <span className="text-zinc-200 font-mono text-xs">{entry.username || "없음"}</span>
                      </div>
                      {entry.username && (
                        <button
                          onClick={() => handleCopy(`user-${entry.id}`, entry.username)}
                          className="text-[11px] text-zinc-400 hover:text-white px-2 py-1 bg-zinc-800 rounded-lg whitespace-nowrap shrink-0"
                        >
                          아이디 복사
                        </button>
                      )}
                    </div>

                    <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-zinc-500 block">비밀번호</span>
                        <span className="text-white font-mono text-xs tracking-wider">
                          {isPasswordVisible ? passwordText : "••••••••••••"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() =>
                            setShowPasswordMap({
                              ...showPasswordMap,
                              [entry.id]: !isPasswordVisible,
                            })
                          }
                          className="p-1 text-zinc-400 hover:text-white shrink-0"
                        >
                          {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => handleCopy(entry.id, entry.decryptedPassword || "")}
                          disabled={!entry.decryptedPassword}
                          className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold rounded-lg shadow-sm whitespace-nowrap shrink-0"
                        >
                          <Copy className="w-3 h-3" />
                          <span>복사</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Add Manual Modal with Random Password Generator */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#12141c] border border-zinc-800 rounded-3xl w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white">새 비밀번호 암호화 저장</h3>
              <button onClick={() => setShowAddModal(false)} className="text-xs text-zinc-400">
                닫기
              </button>
            </div>

            <form onSubmit={handleAddManual} className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">사이트명 / 서비스</label>
                <input
                  type="text"
                  placeholder="예: 구글, 네이버, 깃허브"
                  value={newSite}
                  onChange={(e) => setNewSite(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">아이디 / 이메일</label>
                <input
                  type="text"
                  placeholder="예: user@example.com"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-zinc-400">비밀번호</label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>강력한 비밀번호 생성</span>
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="보관할 비밀번호 입력 또는 생성"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  required
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
                  암호화하여 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
