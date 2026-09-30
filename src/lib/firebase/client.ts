import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  signOut, 
  onAuthStateChanged, 
  User 
} from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import { EssentialInfoItem } from "@/types/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyARVNtlWdB5Qau7sOJwN_lzQh0Y-rMoVYs",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "quote-ff971434543345.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "quote-ff971434543345",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "quote-ff971434543345.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "105798078537",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:105798078537:web:4ae2fbd353911fed882f98",
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Local 1-Person Master User (allows seamless login even when offline or domain is unauthorized)
const LOCAL_USER_KEY = "life_os_local_master_user";
export const LAST_AUTH_EMAIL_KEY = "life_os_last_auth_email";

export interface MasterProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isLocalMaster?: boolean;
}

/**
 * Universal Canonical Sync Document Key:
 * Transforms any email (or user object) into a consistent Firestore document ID.
 * Regardless of whether the user logged in via Google OAuth on Web or 1-Click Master Login on Mobile,
 * as long as the email matches, they are GUARANTEED to share the exact same Firestore document!
 */
export function getSyncUserId(userOrId: any): string {
  // 1. If userOrId is an object containing an email
  if (userOrId && typeof userOrId === "object") {
    const email = userOrId.email?.toLowerCase().trim();
    if (email && email.includes("@")) {
      return `usr_${email.replace(/[^a-z0-9]/g, "_")}`;
    }
  }

  // 2. If userOrId is a string email directly
  if (typeof userOrId === "string") {
    const trimmed = userOrId.toLowerCase().trim();
    if (trimmed.includes("@")) {
      return `usr_${trimmed.replace(/[^a-z0-9]/g, "_")}`;
    }
    // If it's already an email-based usr_ key like usr_foo_gmail_com
    if (
      trimmed.startsWith("usr_") &&
      (trimmed.includes("_gmail_") ||
        trimmed.includes("_naver_") ||
        trimmed.includes("_kakao_") ||
        trimmed.includes("_daum_") ||
        trimmed.includes("_com") ||
        trimmed.includes("_net") ||
        trimmed.includes("_kr"))
    ) {
      return trimmed;
    }
  }

  // 3. Fallback: Lookup current authenticated email from Firebase or local storage
  if (typeof window !== "undefined") {
    const currentFbEmail = auth.currentUser?.email;
    if (currentFbEmail && currentFbEmail.includes("@")) {
      return `usr_${currentFbEmail.toLowerCase().trim().replace(/[^a-z0-9]/g, "_")}`;
    }
    const lastEmail = localStorage.getItem(LAST_AUTH_EMAIL_KEY);
    if (lastEmail && lastEmail.includes("@")) {
      return `usr_${lastEmail.toLowerCase().trim().replace(/[^a-z0-9]/g, "_")}`;
    }
  }

  // 4. Last resort if no email exists anywhere
  if (typeof userOrId === "string" && userOrId.trim()) {
    const trimmed = userOrId.toLowerCase().trim();
    return trimmed.startsWith("usr_") ? trimmed : `usr_${trimmed}`;
  }
  if (userOrId && typeof userOrId === "object" && userOrId.uid) {
    return `usr_${String(userOrId.uid).toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
  }

  return "";
}

export function getLocalMasterUser(): MasterProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCAL_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setLocalMasterUser(user: MasterProfile | null): void {
  if (typeof window === "undefined") return;
  if (!user) {
    localStorage.removeItem(LOCAL_USER_KEY);
  } else {
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
    if (user.email) {
      localStorage.setItem(LAST_AUTH_EMAIL_KEY, user.email.toLowerCase().trim());
    }
  }
  window.dispatchEvent(new CustomEvent("life_os_auth_change"));
}

// Google Sign-In with Popup
export async function signInWithGoogle(): Promise<User> {
  googleProvider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(auth, googleProvider);
  if (result.user) {
    setLocalMasterUser({
      uid: result.user.uid,
      displayName: result.user.displayName || "Life-OS 사용자",
      email: result.user.email || "user@gmail.com",
      photoURL: result.user.photoURL || undefined,
    });
  }
  return result.user;
}

// Google Sign-In with Redirect (for mobile browsers where popups get blocked)
export async function signInWithGoogleRedirect(): Promise<void> {
  googleProvider.setCustomParameters({ prompt: "select_account" });
  await signInWithRedirect(auth, googleProvider);
}

// Sign-Out
export async function signOutUser(): Promise<void> {
  setLocalMasterUser(null);
  try {
    await signOut(auth);
  } catch (e) {
    console.warn("Firebase sign out error:", e);
  }
}

// Auth State Listener (Binds both Firebase Auth & Local Master User)
export function onAuthChanged(callback: (user: any | null) => void) {
  // Capture potential redirect sign-in result on page load
  if (typeof window !== "undefined") {
    getRedirectResult(auth)
      .then((res) => {
        if (res?.user) {
          setLocalMasterUser({
            uid: res.user.uid,
            displayName: res.user.displayName || "Life-OS 사용자",
            email: res.user.email || "user@gmail.com",
            photoURL: res.user.photoURL || undefined,
          });
          callback(res.user);
        }
      })
      .catch((e) => console.log("Redirect check:", e));
  }

  const unsubscribeFirebase = onAuthStateChanged(auth, (fbUser) => {
    if (fbUser) {
      if (fbUser.email) {
        localStorage.setItem(LAST_AUTH_EMAIL_KEY, fbUser.email.toLowerCase().trim());
      }
      callback(fbUser);
    } else {
      const local = getLocalMasterUser();
      callback(local);
    }
  });

  const handleCustomEvent = () => {
    if (!auth.currentUser) {
      callback(getLocalMasterUser());
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("life_os_auth_change", handleCustomEvent);
  }

  return () => {
    unsubscribeFirebase();
    if (typeof window !== "undefined") {
      window.removeEventListener("life_os_auth_change", handleCustomEvent);
    }
  };
}

/**
 * Intelligent Two-Way List Merger:
 * Merges local items and cloud items by ID (or smart key).
 * If an item exists in both, keeps the one with the latest timestamp.
 */
export function mergeItemsById<T extends Record<string, any>>(
  localList: T[],
  cloudList: T[]
): T[] {
  const map = new Map<string, T>();

  const getItemKey = (item: T): string => {
    if (item.id) return String(item.id);
    if (item.merchant && item.amount !== undefined && item.date) {
      return `${item.date}_${item.time || ""}_${item.amount}_${item.merchant}`;
    }
    return JSON.stringify(item);
  };

  // 1. Add all local items
  for (const item of localList) {
    map.set(getItemKey(item), item);
  }

  // 2. Merge cloud items (latest wins)
  for (const item of cloudList) {
    const key = getItemKey(item);
    if (!map.has(key)) {
      map.set(key, item);
    } else {
      const existing = map.get(key)!;
      const existingTime = existing.updatedAt || existing.last_clicked_at || existing.lastClickedAt || existing.date || 0;
      const cloudTime = item.updatedAt || item.last_clicked_at || item.lastClickedAt || item.date || 0;
      if (cloudTime >= existingTime) {
        map.set(key, item);
      }
    }
  }

  return Array.from(map.values());
}

/* =========================================================================
 * 1. GENERAL MEMOS (일반 자유 메모장)
 * ========================================================================= */
export async function saveGeneralMemosToCloud(userId: any, memos: any[]) {
  const docId = getSyncUserId(userId);
  if (!docId) return false;
  try {
    const userDocRef = doc(db, "users_general_memos", docId);
    await setDoc(userDocRef, {
      memos,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("일반 메모 클라우드 저장 실패:", error);
    return false;
  }
}

export async function loadGeneralMemosFromCloud(userId: any): Promise<any[] | null> {
  const docId = getSyncUserId(userId);
  if (!docId) return null;
  try {
    const userDocRef = doc(db, "users_general_memos", docId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data()?.memos || null;
    }
    return null;
  } catch (error) {
    console.error("일반 메모 클라우드 조회 실패:", error);
    return null;
  }
}

export function subscribeGeneralMemosFromCloud(
  userId: any,
  callback: (memos: any[] | null) => void
): () => void {
  const docId = getSyncUserId(userId);
  if (!docId) return () => {};
  const userDocRef = doc(db, "users_general_memos", docId);
  return onSnapshot(
    userDocRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data()?.memos || []);
      } else {
        callback(null);
      }
    },
    (err) => console.error("Firestore memos snapshot error:", err)
  );
}

/* =========================================================================
 * 2. ESSENTIAL INFO (1초 복사 필수 정보)
 * ========================================================================= */
export async function saveEssentialInfoToCloud(userId: any, items: EssentialInfoItem[]) {
  const docId = getSyncUserId(userId);
  if (!docId) return false;
  try {
    const userDocRef = doc(db, "users_essential_info", docId);
    await setDoc(userDocRef, {
      items,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("1초복사 클라우드 저장 실패:", error);
    return false;
  }
}

export async function loadEssentialInfoFromCloud(userId: any): Promise<EssentialInfoItem[] | null> {
  const docId = getSyncUserId(userId);
  if (!docId) return null;
  try {
    const userDocRef = doc(db, "users_essential_info", docId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data()?.items || null;
    }
    return null;
  } catch (error) {
    console.error("1초복사 클라우드 조회 실패:", error);
    return null;
  }
}

export function subscribeEssentialInfoFromCloud(
  userId: any,
  callback: (items: EssentialInfoItem[] | null) => void
): () => void {
  const docId = getSyncUserId(userId);
  if (!docId) return () => {};
  const userDocRef = doc(db, "users_essential_info", docId);
  return onSnapshot(
    userDocRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data()?.items || []);
      } else {
        callback(null);
      }
    },
    (err) => console.error("Firestore essential info snapshot error:", err)
  );
}

/* =========================================================================
 * 3. FINANCIAL LOGS (가계부 지출 내역)
 * ========================================================================= */
export async function saveFinancialLogsToCloud(userId: any, logs: any[]) {
  const docId = getSyncUserId(userId);
  if (!docId) return false;
  try {
    const userDocRef = doc(db, "users_financial_logs", docId);
    await setDoc(userDocRef, {
      logs,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("가계부 클라우드 저장 실패:", error);
    return false;
  }
}

export async function loadFinancialLogsFromCloud(userId: any): Promise<any[] | null> {
  const docId = getSyncUserId(userId);
  if (!docId) return null;
  try {
    const userDocRef = doc(db, "users_financial_logs", docId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data()?.logs || null;
    }
    return null;
  } catch (error) {
    console.error("가계부 클라우드 조회 실패:", error);
    return null;
  }
}

export function subscribeFinancialLogsFromCloud(
  userId: any,
  callback: (logs: any[] | null) => void
): () => void {
  const docId = getSyncUserId(userId);
  if (!docId) return () => {};
  const userDocRef = doc(db, "users_financial_logs", docId);
  return onSnapshot(
    userDocRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data()?.logs || []);
      } else {
        callback(null);
      }
    },
    (err) => console.error("Firestore financial snapshot error:", err)
  );
}

/* =========================================================================
 * 4. ASSETS (순자산 & 부채 내역)
 * ========================================================================= */
export async function saveAssetsToCloud(userId: any, assets: any[]) {
  const docId = getSyncUserId(userId);
  if (!docId) return false;
  try {
    const userDocRef = doc(db, "users_assets", docId);
    await setDoc(userDocRef, {
      assets,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("자산 클라우드 저장 실패:", error);
    return false;
  }
}

export async function loadAssetsFromCloud(userId: any): Promise<any[] | null> {
  const docId = getSyncUserId(userId);
  if (!docId) return null;
  try {
    const userDocRef = doc(db, "users_assets", docId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data()?.assets || null;
    }
    return null;
  } catch (error) {
    console.error("자산 클라우드 조회 실패:", error);
    return null;
  }
}

export function subscribeAssetsFromCloud(
  userId: any,
  callback: (assets: any[] | null) => void
): () => void {
  const docId = getSyncUserId(userId);
  if (!docId) return () => {};
  const userDocRef = doc(db, "users_assets", docId);
  return onSnapshot(
    userDocRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data()?.assets || []);
      } else {
        callback(null);
      }
    },
    (err) => console.error("Firestore assets snapshot error:", err)
  );
}

/* =========================================================================
 * 5. ENCRYPTED VAULT (AES-256 암호 금고)
 * ========================================================================= */
export async function saveVaultToCloud(userId: any, vaultEntries: any[]) {
  const docId = getSyncUserId(userId);
  if (!docId) return false;
  try {
    const userDocRef = doc(db, "users_encrypted_vault", docId);
    // 평문 비밀번호는 서버로 절대 전송하지 않음! 암호문, IV, Salt만 저장
    const sanitized = vaultEntries.map((e) => ({
      id: e.id,
      siteName: e.siteName,
      username: e.username,
      encrypted: e.encrypted,
    }));
    await setDoc(userDocRef, {
      entries: sanitized,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("암호 금고 클라우드 저장 실패:", error);
    return false;
  }
}

export async function loadVaultFromCloud(userId: any): Promise<any[] | null> {
  const docId = getSyncUserId(userId);
  if (!docId) return null;
  try {
    const userDocRef = doc(db, "users_encrypted_vault", docId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data()?.entries || null;
    }
    return null;
  } catch (error) {
    console.error("암호 금고 클라우드 조회 실패:", error);
    return null;
  }
}

export function subscribeVaultFromCloud(
  userId: any,
  callback: (entries: any[] | null) => void
): () => void {
  const docId = getSyncUserId(userId);
  if (!docId) return () => {};
  const userDocRef = doc(db, "users_encrypted_vault", docId);
  return onSnapshot(
    userDocRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data()?.entries || []);
      } else {
        callback(null);
      }
    },
    (err) => console.error("Firestore vault snapshot error:", err)
  );
}

/* =========================================================================
 * 6. 1RM WORKOUT LOGS (3대 운동 기록)
 * ========================================================================= */
export async function saveWorkout1RMToCloud(userId: any, workouts: any[]) {
  const docId = getSyncUserId(userId);
  if (!docId) return false;
  try {
    const userDocRef = doc(db, "users_workout_1rm", docId);
    await setDoc(userDocRef, {
      workouts,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("1RM 클라우드 저장 실패:", error);
    return false;
  }
}

export async function loadWorkout1RMFromCloud(userId: any): Promise<any[] | null> {
  const docId = getSyncUserId(userId);
  if (!docId) return null;
  try {
    const userDocRef = doc(db, "users_workout_1rm", docId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data()?.workouts || null;
    }
    return null;
  } catch (error) {
    console.error("1RM 클라우드 조회 실패:", error);
    return null;
  }
}

export function subscribeWorkout1RMFromCloud(
  userId: any,
  callback: (workouts: any[] | null) => void
): () => void {
  const docId = getSyncUserId(userId);
  if (!docId) return () => {};
  const userDocRef = doc(db, "users_workout_1rm", docId);
  return onSnapshot(
    userDocRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data()?.workouts || []);
      } else {
        callback(null);
      }
    },
    (err) => console.error("Firestore workout snapshot error:", err)
  );
}

/* =========================================================================
 * 7. HEALTH METRICS (건강 지표 & HealthKit)
 * ========================================================================= */
export async function saveHealthMetricsToCloud(userId: any, metrics: any[]) {
  const docId = getSyncUserId(userId);
  if (!docId) return false;
  try {
    const userDocRef = doc(db, "users_health_metrics", docId);
    await setDoc(userDocRef, {
      metrics,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("건강 지표 클라우드 저장 실패:", error);
    return false;
  }
}

export async function loadHealthMetricsFromCloud(userId: any): Promise<any[] | null> {
  const docId = getSyncUserId(userId);
  if (!docId) return null;
  try {
    const userDocRef = doc(db, "users_health_metrics", docId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data()?.metrics || null;
    }
    return null;
  } catch (error) {
    console.error("건강 지표 클라우드 조회 실패:", error);
    return null;
  }
}

export function subscribeHealthMetricsFromCloud(
  userId: any,
  callback: (metrics: any[] | null) => void
): () => void {
  const docId = getSyncUserId(userId);
  if (!docId) return () => {};
  const userDocRef = doc(db, "users_health_metrics", docId);
  return onSnapshot(
    userDocRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data()?.metrics || []);
      } else {
        callback(null);
      }
    },
    (err) => console.error("Firestore health metrics snapshot error:", err)
  );
}

/* =========================================================================
 * 8. ARCHIVED DIARIES (일기 보관함)
 * ========================================================================= */
export async function saveArchivedDiariesToCloud(userId: any, diaries: any[]) {
  const docId = getSyncUserId(userId);
  if (!docId) return false;
  try {
    const userDocRef = doc(db, "users_archived_diaries", docId);
    await setDoc(userDocRef, {
      diaries,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("일기 클라우드 저장 실패:", error);
    return false;
  }
}

export async function loadArchivedDiariesFromCloud(userId: any): Promise<any[] | null> {
  const docId = getSyncUserId(userId);
  if (!docId) return null;
  try {
    const userDocRef = doc(db, "users_archived_diaries", docId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data()?.diaries || null;
    }
    return null;
  } catch (error) {
    console.error("일기 클라우드 조회 실패:", error);
    return null;
  }
}

export function subscribeArchivedDiariesFromCloud(
  userId: any,
  callback: (diaries: any[] | null) => void
): () => void {
  const docId = getSyncUserId(userId);
  if (!docId) return () => {};
  const userDocRef = doc(db, "users_archived_diaries", docId);
  return onSnapshot(
    userDocRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data()?.diaries || []);
      } else {
        callback(null);
      }
    },
    (err) => console.error("Firestore diaries snapshot error:", err)
  );
}

/* =========================================================================
 * 9. LIFE PHOTOS (인생 사진)
 * ========================================================================= */
export async function savePhotosToCloud(userId: any, photos: any[]) {
  const docId = getSyncUserId(userId);
  if (!docId) return false;
  try {
    const userDocRef = doc(db, "users_life_photos", docId);
    await setDoc(userDocRef, {
      photos,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("사진 클라우드 저장 실패:", error);
    return false;
  }
}

export async function loadPhotosFromCloud(userId: any): Promise<any[] | null> {
  const docId = getSyncUserId(userId);
  if (!docId) return null;
  try {
    const userDocRef = doc(db, "users_life_photos", docId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data()?.photos || null;
    }
    return null;
  } catch (error) {
    console.error("사진 클라우드 조회 실패:", error);
    return null;
  }
}

export function subscribePhotosFromCloud(
  userId: any,
  callback: (photos: any[] | null) => void
): () => void {
  const docId = getSyncUserId(userId);
  if (!docId) return () => {};
  const userDocRef = doc(db, "users_life_photos", docId);
  return onSnapshot(
    userDocRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data()?.photos || []);
      } else {
        callback(null);
      }
    },
    (err) => console.error("Firestore photos snapshot error:", err)
  );
}

