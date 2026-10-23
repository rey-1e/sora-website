// ==========================================================================
// Sora — Firebase Client Configuration (Pure ESM, No Bundler Needed)
// ==========================================================================
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// Firebase project configuration (sora-platform-kpnm3)
const firebaseConfig = {
  apiKey: "AIzaSyC2j4xM7MfbohEeuvdOiEOWUGTx000ZCpQ",
  authDomain: "sora-platform-kpnm3.firebaseapp.com",
  projectId: "sora-platform-kpnm3",
  storageBucket: "sora-platform-kpnm3.firebasestorage.app",
  messagingSenderId: "940575553321",
  appId: "1:940575553321:web:14ca9fc29e07e28c3e2938"
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Connect to local Firebase emulators ONLY when explicitly enabled (e.g. ?emulator=true)
// or when localStorage flag 'sora_use_emulator' is set to 'true'.
// This ensures real Google Sign-In works seamlessly on localhost and in production.
const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
const urlParams = typeof window !== "undefined" && window.location.search ? new URLSearchParams(window.location.search) : null;
const useEmulator = isLocalhost && (
  urlParams?.get("emulator") === "true" ||
  (typeof localStorage !== "undefined" && localStorage.getItem("sora_use_emulator") === "true")
);

if (useEmulator) {
  try {
    if (!window.__EMULATORS_CONNECTED__) {
      connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
      window.__EMULATORS_CONNECTED__ = true;
      console.log("[SORA] Connected to local Firebase emulators (Auth: 9099, Firestore: 8080)");
    }
  } catch (err) {
    console.debug("[SORA] Emulators status:", err.message);
  }
}
