import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";
import { FIREBASE_CONFIG, APP_CONFIG } from "../constants";
import { Position, PortfolioHistoryPoint } from "../types";

// --- Initialize Firebase Safely ---
let app;
let auth: any;
let db: any;

try {
    // Only initialize if config looks somewhat valid to prevent immediate crash
    if (FIREBASE_CONFIG.apiKey && !FIREBASE_CONFIG.apiKey.includes("PASTE_YOUR")) {
        app = initializeApp(FIREBASE_CONFIG);
        auth = getAuth(app);
        db = getFirestore(app);
    } else {
        console.warn("Firebase Config missing or invalid. Cloud features will be disabled.");
    }
} catch (error) {
    console.error("Firebase Initialization Failed:", error);
}

export interface UserPortfolioData {
    balance: number;
    displayName: string;
    avatar: string;
    maxLots: number;
    positions: Position[];
    closedPositions: Position[];
    history: PortfolioHistoryPoint[];
    tradeIdCounter: number;
    lastUpdated: number;
}

const DEFAULT_DATA: UserPortfolioData = {
    balance: APP_CONFIG.STARTING_BALANCE,
    displayName: '',
    avatar: '',
    maxLots: APP_CONFIG.MAX_LOTS,
    positions: [],
    closedPositions: [],
    history: [],
    tradeIdCounter: 1,
    lastUpdated: Date.now()
};

/**
 * Connects to Firebase anonymously.
 * This ensures we have a valid UID for security rules.
 */
export const connectToFirebase = async () => {
    if (!auth) {
        throw new Error("Firebase not initialized. Please check constants.ts API keys.");
    }
    try {
        const userCred = await signInAnonymously(auth);
        return userCred.user;
    } catch (error) {
        console.error("Firebase Auth Error:", error);
        throw error;
    }
};

/**
 * Subscribes to a user's portfolio document in Firestore.
 * This handles Real-time Sync (Cloud -> Device).
 */
export const subscribeToPortfolio = (
    username: string, 
    onUpdate: (data: UserPortfolioData) => void
) => {
    if (!db) return () => {};

    const docRef = doc(db, "portfolios", username);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data() as UserPortfolioData;
            onUpdate(data);
        } else {
            // Document doesn't exist yet, initialize it
            setDoc(docRef, DEFAULT_DATA, { merge: true });
            onUpdate(DEFAULT_DATA);
        }
    }, (error) => {
        console.error("Firestore Sync Error:", error);
    });

    return unsubscribe;
};

/**
 * Saves the portfolio to Firestore.
 * This handles Data Persistence (Device -> Cloud).
 */
export const savePortfolioToCloud = async (
    username: string, 
    data: Partial<UserPortfolioData>
) => {
    if (!username || !db) return;
    const docRef = doc(db, "portfolios", username);
    
    try {
        await setDoc(docRef, {
            ...data,
            lastUpdated: Date.now()
        }, { merge: true });
    } catch (error) {
        console.error("Save to Cloud Error:", error);
    }
};