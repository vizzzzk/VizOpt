import {
  initializeApp
} from "firebase/app";

import {
  getAuth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  type User
} from "firebase/auth";

import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot
} from "firebase/firestore";

import { FIREBASE_CONFIG } from "../constants";
import { Transaction, Asset, UserProfile, Goal, BudgetMap } from "../types";

// --- Initialize Firebase Safely (Browser-only) ---
let app;
let auth: any;
let db: any;
let isCloudAvailable = false;

try {
  if (FIREBASE_CONFIG?.apiKey?.length > 0) {
    app = initializeApp(FIREBASE_CONFIG);
    auth = getAuth(app);
    db = getFirestore(app);
    isCloudAvailable = true;
  } else {
    console.warn("Firebase config missing → Offline mode");
  }
} catch (err) {
  console.error("Firebase init failed:", err);
  isCloudAvailable = false;
}

export interface UserData {
  profile?: UserProfile;
  transactions?: Transaction[];
  assets?: Asset[];
  goals?: Goal[];
  budgets?: BudgetMap;
  lastUpdated?: number;
}

const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (key: string, value: any) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) return;
      seen.add(value);
    }
    return value;
  };
};

export const firebaseService = {
  auth,
  isAvailable: isCloudAvailable,

  // Fallback for auto-login if needed
  signIn: async () => {
    if (!isCloudAvailable) throw new Error("Firebase unavailable");
    const userCred = await signInAnonymously(auth);
    return userCred.user;
  },

  // New: Register with Username/PIN for Multi-device
  registerUser: async (username: string, pin: string) => {
    if (!isCloudAvailable) throw new Error("Cloud Unavailable");
    const email = `${username.toLowerCase().replace(/\s/g, '')}@vizbuck.app`;
    const userCred = await createUserWithEmailAndPassword(auth, email, pin);
    return userCred.user;
  },

  // New: Login with Username/PIN
  loginUser: async (username: string, pin: string) => {
    if (!isCloudAvailable) throw new Error("Cloud Unavailable");
    const email = `${username.toLowerCase().replace(/\s/g, '')}@vizbuck.app`;
    const userCred = await signInWithEmailAndPassword(auth, email, pin);
    return userCred.user;
  },

  logoutUser: async () => {
    if (!isCloudAvailable) return;
    await signOut(auth);
  },

  onAuthStateChange: (cb: (user: User | null) => void) => {
    if (!isCloudAvailable) {
      cb(null);
      return () => {};
    }
    return onAuthStateChanged(auth, cb);
  },

  subscribeToUserData: (uid: string, onUpdate: (data: UserData) => void) => {
    if (!isCloudAvailable || !uid) return () => {};

    const ref = doc(db, "users", uid);
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) onUpdate(snap.data() as UserData);
      else setDoc(ref, { lastUpdated: Date.now() }, { merge: true });
    });
  },

  saveUserData: async (uid: string, data: Partial<UserData>) => {
    if (!isCloudAvailable || !uid) return;

    const ref = doc(db, "users", uid);
    const cleaned = JSON.parse(JSON.stringify(data, getCircularReplacer()));

    await setDoc(
      ref,
      { ...cleaned, lastUpdated: Date.now() },
      { merge: true }
    );
  }
};