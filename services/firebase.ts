import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Helper to get config with priority: LocalStorage > Env Vars > Hardcoded Default
const getFirebaseConfig = () => {
  // 1. Try Local Storage (User entered via UI - Manual override)
  try {
    const stored = localStorage.getItem('firebase_config');
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error("Error reading firebase config from local storage", e);
  }

  // 2. Try Env Vars (If defined in .env)
  if (process.env.FIREBASE_API_KEY && 
      process.env.FIREBASE_API_KEY.length > 5 && 
      !process.env.FIREBASE_API_KEY.includes("YOUR_")) {
    return {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID
    };
  }

  // 3. Fallback to provided hardcoded configuration
  return {
    apiKey: "AIzaSyBPW2OcV80tgp5kXC_KUIl5OTmsYjJyKTc",
    authDomain: "trolycanhan-1239a.firebaseapp.com",
    projectId: "trolycanhan-1239a",
    storageBucket: "trolycanhan-1239a.firebasestorage.app",
    messagingSenderId: "862419639560",
    appId: "1:862419639560:web:1de55e5bd9ee19380a60bd",
    measurementId: "G-3424DY602N"
  };
};

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Export flag to check if running on valid config
export const isFirebaseConfigured = firebaseConfig.apiKey !== "MISSING_CONFIG";

export default app;