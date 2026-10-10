"use client";

import React, { useState, useEffect } from "react";
import { Image as ImageIcon, Plus, Trash2, Calendar, Sparkles, X, Heart } from "lucide-react";
import {
  onAuthChanged,
  savePhotosToCloud,
  subscribePhotosFromCloud,
  mergeItemsById,
} from "@/lib/firebase/client";
import type { User } from "firebase/auth";

export interface PhotoItem {
  id: string;
  url: string; // Base64 or URL
  title: string;
  date: string;
  tag?: string;
  updatedAt?: string;
}

const SAMPLE_PHOTOS: PhotoItem[] = [
  {
    id: "p-1",
    url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80",
    title: "제주도 서귀포 가족 여행",
    date: "2025.10.12",
    tag: "가족여행",
  },
  {
    id: "p-2",
    url: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80",
    title: "스쿼트 150kg 달성 기념 바디체크",
    date: "2026.04.18",
    tag: "피트니스",
  },
  {
    id: "p-3",
    url: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80",
    title: "피큐레잇 신규 연구소 오픈 날",
    date: "2025.03.01",
    tag: "사업/도전",
  },
];

const PHOTO_STORAGE_KEY = "life_os_photos_v1";

export const LifePhotoGallery: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>(SAMPLE_PHOTOS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activePhoto, setActivePhoto] = useState<PhotoItem | null>(null);

  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("일상");
  const [imagePreview, setImagePreview] = useState<string>("");

  useEffect(() => {
    let localItems: PhotoItem[] = SAMPLE_PHOTOS;
    try {
      const saved = localStorage.getItem(PHOTO_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localItems = parsed;
          setPhotos(parsed);
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

  const updatePhotos = (newPhotos: PhotoItem[]) => {
    setPhotos(newPhotos);
    try {
      localStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify(newPhotos));
    } catch {}
    if (currentUser) {
      savePhotosToCloud(currentUser.uid, newPhotos);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddPhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePreview || !title.trim()) return;

    const newPhoto: PhotoItem = {
      id: "photo-" + Date.now(),
      url: imagePreview,
      title: title.trim(),
      date: new Date().toISOString().split("T")[0].replace(/-/g, "."),
      tag: tag.trim(),
      updatedAt: new Date().toISOString(),
    };

    updatePhotos([newPhoto, ...photos]);
    setTitle("");
    setImagePreview("");
    setShowAddModal(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("이 인생샷을 갤러리에서 삭제하시겠습니까?")) {
      updatePhotos(photos.filter((p) => p.id !== id));
      if (activePhoto?.id === id) setActivePhoto(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-pink-400" />
            인생샷 갤러리 (Highlights)
          </h3>
          <p className="text-[11px] text-zinc-400">가족, 여행, 최고 성취의 순간만 엄선 보관</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-pink-600/30"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>인생샷 등록</span>
        </button>
      </div>

      {/* Masonry / Grid Cards */}
      <div className="grid grid-cols-2 gap-3">
        {photos.map((item) => (
          <div
            key={item.id}
            onClick={() => setActivePhoto(item)}
            className="group relative cursor-pointer overflow-hidden rounded-2xl bg-[#12141c] border border-[#1f2433] hover:border-pink-500/40 transition-all shadow-sm"
          >
            <div className="aspect-[4/3] w-full overflow-hidden bg-zinc-900">
              <img
                src={item.url}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>

            <div className="p-2.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-zinc-400">{item.date}</span>
                {item.tag && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-300 font-medium">
                    {item.tag}
                  </span>
                )}
              </div>
              <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
            </div>

            <button
              type="button"
              onClick={(e) => handleDelete(item.id, e)}
              className="absolute top-2 right-2 p-2 rounded-full bg-black/70 text-zinc-300 hover:text-rose-400 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity min-w-[32px] min-h-[32px] flex items-center justify-center"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {activePhoto && (
        <div
          onClick={() => setActivePhoto(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-lg w-full bg-[#12141c] rounded-3xl overflow-hidden border border-zinc-800 space-y-3 p-4"
          >
            <button
              onClick={() => setActivePhoto(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="rounded-2xl overflow-hidden max-h-[65vh] bg-black flex items-center justify-center">
              <img src={activePhoto.url} alt={activePhoto.title} className="max-h-[65vh] object-contain" />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <h3 className="text-sm font-bold text-white">{activePhoto.title}</h3>
                <span className="text-xs text-zinc-400 font-mono">{activePhoto.date}</span>
              </div>
              {activePhoto.tag && (
                <span className="px-2.5 py-1 rounded-xl bg-pink-500/10 text-pink-300 text-xs font-medium border border-pink-500/20">
                  {activePhoto.tag}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Photo Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4">
          <div className="bg-[#12141c] border border-zinc-800 rounded-3xl w-full max-w-md p-5 pb-safe space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white">새 인생샷 등록</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-xs text-zinc-400 hover:text-white p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl hover:bg-zinc-800 transition-colors"
              >
                닫기
              </button>
            </div>

            <form onSubmit={handleAddPhoto} className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">사진 파일 선택</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-xs text-zinc-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700"
                  required
                />
              </div>

              {imagePreview && (
                <div className="w-full h-36 rounded-2xl overflow-hidden bg-black border border-zinc-800">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}

              <div>
                <label className="block text-xs text-zinc-400 mb-1">제목 / 설명</label>
                <input
                  type="text"
                  placeholder="예: 가족 여름 휴가 제주도, 첫 마라톤 완주"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">태그</label>
                <input
                  type="text"
                  placeholder="예: 가족, 피트니스, 사업, 여행"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
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
                  className="flex-1 py-2.5 bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-pink-600/30"
                >
                  인생샷 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
