// ==========================================================================
// Sora — Store Setup Handler (Automatic store_id as Primary Key)
// ==========================================================================
import { db } from "./firebase-config.js";
import { onAuth, getStoreForUser } from "./auth.js";
import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// Helper to generate a clean, friendly, unique store_id
export function generateStoreId() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let randomPart = "";
  for (let i = 0; i < 6; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `sora-${randomPart}`;
}

let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
  const storeIdDisplay = document.getElementById("store-id-display");
  const storeIdInput = document.getElementById("store-id-input");
  const regenerateBtn = document.getElementById("btn-regenerate-id");
  const storeNameInput = document.getElementById("store-name-input");
  const ownerPhoneInput = document.getElementById("owner-phone-input");
  const googleReviewInput = document.getElementById("google-review-input");
  const setupForm = document.getElementById("setup-form");
  const submitBtn = document.getElementById("btn-save-store");
  const userGreeting = document.getElementById("user-greeting");
  const errorBanner = document.getElementById("setup-error");

  // Initial generated store_id
  function refreshGeneratedId() {
    const newId = generateStoreId();
    if (storeIdDisplay) storeIdDisplay.textContent = newId;
    if (storeIdInput) storeIdInput.value = newId;
  }
  refreshGeneratedId();

  if (regenerateBtn) {
    regenerateBtn.addEventListener("click", (e) => {
      e.preventDefault();
      refreshGeneratedId();
    });
  }

  // Observe Auth state
  onAuth(async (user) => {
    if (!user) {
      // If not logged in with Google, redirect to sign-in page
      window.location.href = "index.html";
      return;
    }

    currentUser = user;
    if (userGreeting) {
      userGreeting.textContent = `Signed in as ${user.displayName || user.email}`;
    }

    // Check if user already has a store
    const existingStore = await getStoreForUser(user.uid);
    if (existingStore) {
      // Already has a store, go straight to dashboard
      window.location.href = "dashboard.html";
    }
  });

  // Handle Form Submission
  if (setupForm) {
    setupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!currentUser) return;

      const storeId = storeIdInput.value.trim().toLowerCase();
      const storeName = storeNameInput.value.trim();
      const ownerPhone = ownerPhoneInput.value.trim();
      const googleReviewLink = googleReviewInput.value.trim();

      if (!storeId) {
        showError("Store ID is required");
        return;
      }
      if (!storeName) {
        showError("Please enter your Store Name");
        return;
      }
      if (!ownerPhone) {
        showError("Please enter your Phone Number");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Creating Store...";

      try {
        // Primary Key is store_id in /stores/{store_id}
        const storeDocRef = doc(db, "stores", storeId);
        
        await setDoc(storeDocRef, {
          store_id: storeId,
          store_name: storeName,
          owner_phone: ownerPhone,
          owner_uid: currentUser.uid,
          owner_email: currentUser.email || "",
          google_review_link: googleReviewLink || `https://search.google.com/local/writereview?placeid=${encodeURIComponent(storeName)}`,
          active: true,
          created_at: serverTimestamp()
        });

        // Store created! Redirect to dashboard
        window.location.href = "dashboard.html";
      } catch (err) {
        console.error("[SORA SETUP ERROR]", err);
        showError(err.message || "Failed to create store. Please try again.");
        submitBtn.disabled = false;
        submitBtn.textContent = "Create Store & Launch Dashboard";
      }
    });
  }

  function showError(msg) {
    if (errorBanner) {
      errorBanner.textContent = msg;
      errorBanner.style.display = "block";
    } else {
      alert(msg);
    }
  }
});
