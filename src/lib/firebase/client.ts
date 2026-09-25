import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
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

// Google Sign-In with Popup
export async function signInWithGoogle(): Promise<User> {
  googleProvider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

// Sign-Out
export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

// Auth State Listener
export function onAuthChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// Cloud Database: Save Essential Info for User
export async function saveEssentialInfoToCloud(userId: string, items: EssentialInfoItem[]) {
  try {
    const userDocRef = doc(db, "users_essential_info", userId);
    await setDoc(userDocRef, {
      items,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("클라우드 저장 실패:", error);
    return false;
  }
}

// Cloud Database: Load Essential Info for User
export async function loadEssentialInfoFromCloud(userId: string): Promise<EssentialInfoItem[] | null> {
  try {
    const userDocRef = doc(db, "users_essential_info", userId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data()?.items || null;
    }
    return null;
  } catch (error) {
    console.error("클라우드 데이터 조회 실패:", error);
    return null;
  }
}

// Cloud Database: Financial Logs Sync
export async function saveFinancialLogsToCloud(userId: string, logs: any[]) {
  try {
    const userDocRef = doc(db, "users_financial_logs", userId);
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

export async function loadFinancialLogsFromCloud(userId: string): Promise<any[] | null> {
  try {
    const userDocRef = doc(db, "users_financial_logs", userId);
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

// Cloud Database: Assets Sync
export async function saveAssetsToCloud(userId: string, assets: any[]) {
  try {
    const userDocRef = doc(db, "users_assets", userId);
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

export async function loadAssetsFromCloud(userId: string): Promise<any[] | null> {
  try {
    const userDocRef = doc(db, "users_assets", userId);
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

// Cloud Database: Encrypted Vault Sync (Zero-Knowledge: 저장소에는 암호문, IV, Salt만 저장)
export async function saveVaultToCloud(userId: string, vaultEntries: any[]) {
  try {
    const userDocRef = doc(db, "users_encrypted_vault", userId);
    // 평문 비밀번호(decryptedPassword)는 서버로 절대 전송하지 않음!
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

export async function loadVaultFromCloud(userId: string): Promise<any[] | null> {
  try {
    const userDocRef = doc(db, "users_encrypted_vault", userId);
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

// Cloud Database: 1RM Workout Logs Sync
export async function saveWorkout1RMToCloud(userId: string, workouts: any[]) {
  try {
    const userDocRef = doc(db, "users_workout_1rm", userId);
    await setDoc(userDocRef, {
      workouts,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("1RM 운동 기록 클라우드 저장 실패:", error);
    return false;
  }
}

export async function loadWorkout1RMFromCloud(userId: string): Promise<any[] | null> {
  try {
    const userDocRef = doc(db, "users_workout_1rm", userId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data()?.workouts || null;
    }
    return null;
  } catch (error) {
    console.error("1RM 운동 기록 클라우드 조회 실패:", error);
    return null;
  }
}

// Cloud Database: Health Metrics Sync
export async function saveHealthMetricsToCloud(userId: string, metrics: any[]) {
  try {
    const userDocRef = doc(db, "users_health_metrics", userId);
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

export async function loadHealthMetricsFromCloud(userId: string): Promise<any[] | null> {
  try {
    const userDocRef = doc(db, "users_health_metrics", userId);
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

// Cloud Database: Archived Diaries Sync
export async function saveArchivedDiariesToCloud(userId: string, diaries: any[]) {
  try {
    const userDocRef = doc(db, "users_archived_diaries", userId);
    await setDoc(userDocRef, {
      diaries,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("과거 일기 클라우드 저장 실패:", error);
    return false;
  }
}

export async function loadArchivedDiariesFromCloud(userId: string): Promise<any[] | null> {
  try {
    const userDocRef = doc(db, "users_archived_diaries", userId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data()?.diaries || null;
    }
    return null;
  } catch (error) {
    console.error("과거 일기 클라우드 조회 실패:", error);
    return null;
  }
}

// Cloud Database: Life Photos Sync
export async function savePhotosToCloud(userId: string, photos: any[]) {
  try {
    const userDocRef = doc(db, "users_life_photos", userId);
    await setDoc(userDocRef, {
      photos,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("인생샷 클라우드 저장 실패:", error);
    return false;
  }
}

export async function loadPhotosFromCloud(userId: string): Promise<any[] | null> {
  try {
    const userDocRef = doc(db, "users_life_photos", userId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data()?.photos || null;
    }
    return null;
  } catch (error) {
    console.error("인생샷 클라우드 조회 실패:", error);
    return null;
  }
}

// Cloud Database: General Memos Sync (LRU top-order)
export async function saveGeneralMemosToCloud(userId: string, memos: any[]) {
  try {
    const userDocRef = doc(db, "users_general_memos", userId);
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

export async function loadGeneralMemosFromCloud(userId: string): Promise<any[] | null> {
  try {
    const userDocRef = doc(db, "users_general_memos", userId);
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



