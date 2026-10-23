// ==========================================================================
// Sora — Authentication Manager (Google Sign-In via Firebase Auth)
// ==========================================================================
import { auth, db } from "./firebase-config.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

/**
 * Triggers Google Sign-In popup with automatic redirect fallback if popups are blocked
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.warn("[SORA AUTH] Google sign-in issue:", error);
    if (error.code === "auth/popup-blocked" || error.code === "auth/cancelled-popup-request") {
      console.log("[SORA AUTH] Popup blocked or cancelled. Falling back to signInWithRedirect...");
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw error;
  }
}

/**
 * Handles redirect result on page load (if user returned from signInWithRedirect)
 */
export async function checkRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      return result.user;
    }
  } catch (error) {
    console.error("[SORA AUTH] Redirect result error:", error);
  }
  return null;
}

/**
 * Signs the user out
 */
export async function signOutUser() {
  try {
    await signOut(auth);
    window.location.href = "index.html";
  } catch (error) {
    console.error("[SORA AUTH] Sign out failed:", error);
  }
}

/**
 * Finds the store owned by the given Firebase Auth user UID
 */
export async function getStoreForUser(uid) {
  try {
    const storesRef = collection(db, "stores");
    const q = query(storesRef, where("owner_uid", "==", uid));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const docSnap = snapshot.docs[0];
    return {
      store_id: docSnap.id,
      ...docSnap.data()
    };
  } catch (error) {
    console.error("[SORA AUTH] Error fetching store for user:", error);
    return null;
  }
}

/**
 * Observes authentication state and executes callback
 */
export function onAuth(callback) {
  return onAuthStateChanged(auth, async (user) => {
    callback(user);
  });
}
