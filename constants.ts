


export const APP_CONFIG = {
  VERSION: '8.8',
  LOT_SIZE: 75,
  STARTING_BALANCE: 200000,
  MAX_LOTS: 20, // Default limit
  SPOT_PRICE_INITIAL: 25000,
  ACCESS_USERNAME: 'vindejo', // Security layer username (Case Sensitive)
};

export const UPSTOX_CONFIG = {
  API_KEY: "226170d8-02ff-47d2-bb74-3611749f4d8d",
  API_SECRET: "3yn8j0huzj",
  REDIRECT_URI: "https://localhost.com", // Matches the Python script config
  AUTH_URL: "https://api.upstox.com/v2/login/authorization/dialog",
  TOKEN_URL: "https://api.upstox.com/v2/login/authorization/token",
  CHAIN_URL: "https://api.upstox.com/v2/option/chain",
  CONTRACT_URL: "https://api.upstox.com/v2/option/contract",
  LTP_URL: "https://api.upstox.com/v2/market-quote/ltp",
  INSTRUMENT_KEY: "NSE_INDEX|Nifty 50",
  VIX_INSTRUMENT_KEY: "NSE_INDEX|India VIX"
};

export const REFRESH_INTERVAL_MS = 2000; // 2 seconds

// --- FIREBASE CONFIGURATION ---
// Configured for Project: composed-future-469413-p2
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAvRUs2u_Ifd_-VpMYg2-JIUs4nKuowVuI",
  authDomain: "composed-future-469413-p2.firebaseapp.com",
  projectId: "composed-future-469413-p2",
  storageBucket: "composed-future-469413-p2.firebasestorage.app",
  messagingSenderId: "1095197507448",
  appId: "1:1095197507448:web:bc5162705c166e1757d28d",
  measurementId: "G-L8GEZC8JLJ"
};