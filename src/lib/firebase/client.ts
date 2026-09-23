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
