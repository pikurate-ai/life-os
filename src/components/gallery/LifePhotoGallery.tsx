"use client";

import React, { useState, useEffect } from "react";
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  X,
  FolderPlus,
  Folder,
  Camera,
  Upload,
  Download,
  Check,
} from "lucide-react";
import {
  onAuthChanged,
  savePhotosToCloud,
  subscribePhotosFromCloud,
  mergeItemsById,
} from "@/lib/firebase/client";
import { triggerVibration } from "@/lib/notifications/ruthlessAlarm";
import type { User } from "firebase/auth";

export interface PhotoItem {
  id: string;
  url: string; // Base64 or URL
  title: string;
  date: string;
  folder: string;
  tag?: string;
  updatedAt?: string;
}

const DEFAULT_FOLDERS = ["전체", "바디체크/운동", "가족/여행", "성취/사업", "일상/기억"];

const SAMPLE_PHOTOS: PhotoItem[] = [
  {
    id: "p-1",
    url: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80",
    title: "턱걸이 12회 & 체지방 16% 기념 바디체크",
    date: "2026.10.14",
    folder: "바디체크/운동",
    tag: "피트니스",
  },
  {
    id: "p-2",
    url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80",
    title: "제주도 서귀포 가족 여행",
    date: "2025.10.12",
    folder: "가족/여행",
    tag: "가족여행",
  },
  {
    id: "p-3",
    url: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80",
    title: "신규 AI 연구소 오픈 및 시스템 런칭",
    date: "2025.03.01",
    folder: "성취/사업",
    tag: "도전",
  },
];

const PHOTO_STORAGE_KEY = "life_os_photos_v2";
const FOLDERS_STORAGE_KEY = "life_os_photo_folders_v2";

export const LifePhotoGallery: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>(SAMPLE_PHOTOS);
  const [folders, setFolders] = useState<string[]>(DEFAULT_FOLDERS);
  const [selectedFolder, setSelectedFolder] = useState<string>("전체");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [activePhoto, setActivePhoto] = useState<PhotoItem | null>(null);

  // Upload Form State
  const [title, setTitle] = useState("");
  const [targetFolder, setTargetFolder] = useState("바디체크/운동");
  const [imagePreview, setImagePreview] = useState<string>("");

  useEffect(() => {
    // 1. Load Folders
    try {
      const savedFolders = localStorage.getItem(FOLDERS_STORAGE_KEY);
      if (savedFolders) {
        const parsed = JSON.parse(savedFolders);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFolders(parsed);
        }
      }
    } catch {}

    // 2. Load Photos
    let localItems: PhotoItem[] = SAMPLE_PHOTOS;
    try {
      const saved = localStorage.getItem(PHOTO_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Normalize older items without folder
          const normalized = parsed.map((item: any) => ({
            ...item,
            folder: item.folder || "일상/기억",
          }));
          localItems = normalized;
          setPhotos(normalized);
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
        unsubscribeSnapshot = subscribePhotosFromCloud(user.uid, (cloudPhotos) => {
          if (cloudPhotos && cloudPhotos.length > 0) {
            setPhotos((prev) => {
              const merged = mergeItemsById(prev, cloudPhotos);
              try {
                localStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify(merged));
              } catch {}
              return merged;
            });
          } else if (localItems && localItems.length > 0) {
            savePhotosToCloud(user.uid, localItems);
          }
        });
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const savePhotos = (newPhotos: PhotoItem[]) => {
    setPhotos(newPhotos);
    try {
      localStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify(newPhotos));
    } catch {}
    if (currentUser) {
      savePhotosToCloud(currentUser.uid, newPhotos);
    }
  };

  const saveFolders = (newFolders: string[]) => {
    setFolders(newFolders);
    try {
      localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(newFolders));
    } catch {}
  };

  // Add Folder
  const handleAddFolder = () => {
    const trimmed = newFolderName.trim();
    if (!trimmed || folders.includes(trimmed)) return;
    const updated = [...folders, trimmed];
    saveFolders(updated);
    setTargetFolder(trimmed);
    setSelectedFolder(trimmed);
    setNewFolderName("");
    setShowNewFolderModal(false);
    triggerVibration(40);
  };

  // Handle Photo File Select (Camera or Gallery on Mobile/Web)
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    triggerVibration(30);
  };

  // Add Photo
  const handleAddPhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePreview || !title.trim()) return;

    const newPhoto: PhotoItem = {
      id: "p-" + Date.now(),
      url: imagePreview,
      title: title.trim(),
      folder: targetFolder,
      date: new Date().toLocaleDateString("ko-KR"),
      updatedAt: new Date().toISOString(),
    };

    savePhotos([newPhoto, ...photos]);
    setTitle("");
    setImagePreview("");
    setShowAddModal(false);
    triggerVibration([100, 50, 100]);
  };

  // Delete Photo
  const handleDeletePhoto = (id: string) => {
    if (confirm("이 인생샷 사진을 삭제하시겠습니까?")) {
      savePhotos(photos.filter((p) => p.id !== id));
      setActivePhoto(null);
      triggerVibration(50);
    }
  };

  // Filtered Photos by Folder
  const filteredPhotos = photos.filter((p) => {
    if (selectedFolder === "전체") return true;
    return p.folder === selectedFolder;
  });

  return (
    <div className="space-y-4">
      {/* Header & Folder Selector Bar */}
      <div className="bg-[#12141c] border border-[#1f2433] rounded-3xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                인생샷 & 폴더별 갤러리
                <span className="text-[10px] text-indigo-400 font-mono">
                  ({filteredPhotos.length}장)
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">모바일·웹 사진 업로드 및 앨범 폴더별 분류 관리</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-all shrink-0 whitespace-nowrap min-h-[36px]"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>사진 업로드</span>
          </button>
        </div>

        {/* Folder Pills Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1 border-t border-zinc-800">
          {folders.map((fName) => {
            const isSelected = selectedFolder === fName;
            const count = fName === "전체" ? photos.length : photos.filter((p) => p.folder === fName).length;

            return (
              <button
                key={fName}
                type="button"
                onClick={() => setSelectedFolder(fName)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 whitespace-nowrap transition-all flex items-center gap-1.5 border min-h-[32px] ${
                  isSelected
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-sm"
                    : "bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                <Folder className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-zinc-500"}`} />
                <span>{fName}</span>
                <span className="text-[10px] font-mono opacity-80">({count})</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setShowNewFolderModal(true)}
            className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold shrink-0 whitespace-nowrap flex items-center gap-1 border border-zinc-700 min-h-[32px]"
            title="새 앨범 폴더 만들기"
          >
            <FolderPlus className="w-3.5 h-3.5 text-indigo-400" />
            <span>+ 새 폴더</span>
          </button>
        </div>
      </div>

      {/* Photo Grid */}
      {filteredPhotos.length === 0 ? (
        <div className="bg-[#12141c] border border-[#1f2433] rounded-3xl p-8 text-center space-y-2">
          <ImageIcon className="w-8 h-8 text-zinc-600 mx-auto" />
          <p className="text-xs text-zinc-400">'{selectedFolder}' 폴더에 등록된 사진이 없습니다.</p>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-bold underline"
          >
            첫 인생샷 업로드하기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {filteredPhotos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => setActivePhoto(photo)}
              className="group cursor-pointer bg-[#12141c] border border-[#1f2433] hover:border-indigo-500/40 rounded-2xl overflow-hidden transition-all shadow-md relative"
            >
              <div className="aspect-[4/5] w-full overflow-hidden bg-zinc-900 relative">
                <img
                  src={photo.url}
                  alt={photo.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[9px] font-bold border border-white/10">
                  {photo.folder}
                </div>
              </div>

              <div className="p-2.5 space-y-1">
                <h4 className="text-xs font-bold text-white truncate group-hover:text-indigo-300">
                  {photo.title}
                </h4>
                <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                  <span>{photo.date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add New Folder */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12141c] border border-zinc-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              <FolderPlus className="w-4 h-4 text-indigo-400" />
              새로운 앨범 폴더 추가
            </h4>
            <input
              type="text"
              placeholder="폴더 이름 (예: 수영/바다, 바디프로필 2026)"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewFolderModal(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleAddFolder}
                disabled={!newFolderName.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md disabled:opacity-50"
              >
                폴더 생성
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Photo */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAddPhoto}
            className="bg-[#12141c] border border-zinc-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-indigo-400" />
                인생샷 사진 업로드
              </h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Folder Selector */}
            <div>
              <label className="text-xs text-zinc-400 block mb-1">저장할 앨범 폴더</label>
              <select
                value={targetFolder}
                onChange={(e) => setTargetFolder(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                {folders
                  .filter((f) => f !== "전체")
                  .map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
              </select>
            </div>

            {/* Image Preview / File Picker */}
            <div>
              <label className="text-xs text-zinc-400 block mb-1">사진 파일 선택 (카메라/앨범)</label>
              {imagePreview ? (
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-zinc-700 bg-black">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImagePreview("")}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 text-white rounded-full hover:bg-black"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="aspect-[4/3] rounded-2xl border-2 border-dashed border-zinc-700 hover:border-indigo-500 bg-zinc-900/60 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all">
                  <Camera className="w-6 h-6 text-indigo-400 mb-1" />
                  <span className="text-xs font-bold text-white">모바일 / 웹 사진 업로드</span>
                  <span className="text-[10px] text-zinc-500">카메라 촬영 또는 갤러리 선택</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">사진 제목 / 설명</label>
              <input
                type="text"
                placeholder="예: 턱걸이 12회 바디체크"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={!imagePreview || !title.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md disabled:opacity-50"
              >
                앨범에 등록하기
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Active Fullscreen Photo Viewer */}
      {activePhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-3">
            <div className="flex items-center justify-between text-white">
              <div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                  {activePhoto.folder}
                </span>
                <h3 className="text-sm font-bold text-white mt-1">{activePhoto.title}</h3>
                <span className="text-[10px] text-zinc-400 font-mono">{activePhoto.date}</span>
              </div>
              <button
                type="button"
                onClick={() => setActivePhoto(null)}
                className="p-2 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-3xl overflow-hidden bg-black border border-white/10 max-h-[70vh] flex items-center justify-center">
              <img
                src={activePhoto.url}
                alt={activePhoto.title}
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => handleDeletePhoto(activePhoto.id)}
                className="px-3 py-2 rounded-xl bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>사진 삭제</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePhoto(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-white text-xs font-bold"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
