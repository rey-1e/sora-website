// ==========================================================================
// Sora — Owner Dashboard Controller (Real-time Firestore Sync)
// ==========================================================================
import { db } from "./firebase-config.js";
import { onAuth, signOutUser, getStoreForUser } from "./auth.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

let currentStore = null;
let requestsUnsubscribe = null;
let feedbackUnsubscribe = null;

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const storeNameEl = document.getElementById("dash-store-name");
  const storeIdEl = document.getElementById("dash-store-id");
  const ownerPhoneEl = document.getElementById("dash-owner-phone");
  const copyIdBtn = document.getElementById("btn-copy-id");
  const copyNotice = document.getElementById("copy-notice");
  const signOutBtn = document.getElementById("btn-signout");
  const userProfileEl = document.getElementById("user-profile-name");

  // Counter stats
  const statRequestsEl = document.getElementById("stat-total-requests");
  const statFeedbackEl = document.getElementById("stat-total-feedback");
  const statPositiveEl = document.getElementById("stat-positive-reviews");

  // Tables
  const requestsTableBody = document.getElementById("requests-table-body");
  const feedbackTableBody = document.getElementById("feedback-table-body");
  const emptyRequestsEl = document.getElementById("empty-requests");
  const emptyFeedbackEl = document.getElementById("empty-feedback");

  // Settings inputs
  const settingsStoreName = document.getElementById("settings-store-name");
  const settingsOwnerPhone = document.getElementById("settings-owner-phone");
  const settingsReviewLink = document.getElementById("settings-review-link");
  const settingsForm = document.getElementById("settings-form");
  const settingsSuccess = document.getElementById("settings-success");

  // WhatsApp API inputs
  const waForm = document.getElementById("wa-form");
  const waPhoneNumberIdInput = document.getElementById("wa-phone-number-id");
  const waAccessTokenInput = document.getElementById("wa-access-token");
  const waStatusBadge = document.getElementById("wa-status-badge");
  const btnSaveWa = document.getElementById("btn-save-wa");
  const btnDisconnectWa = document.getElementById("btn-disconnect-wa");
  const waSuccess = document.getElementById("wa-success");
  const waDisconnectSuccess = document.getElementById("wa-disconnect-success");
  const waError = document.getElementById("wa-error");

  // Test Request Modal/Form
  const testRequestForm = document.getElementById("test-request-form");
  const testCustomerName = document.getElementById("test-customer-name");
  const testCustomerPhone = document.getElementById("test-customer-phone");
  const testRequestBtn = document.getElementById("btn-send-test-request");
  const testRequestSuccess = document.getElementById("test-request-success");

  // Tab switching
  setupTabs();

  // Sign out listener
  if (signOutBtn) {
    signOutBtn.addEventListener("click", () => signOutUser());
  }

  // Copy Store ID
  if (copyIdBtn) {
    copyIdBtn.addEventListener("click", () => {
      if (!currentStore) return;
      navigator.clipboard.writeText(currentStore.store_id);
      if (copyNotice) {
        copyNotice.style.display = "inline";
        setTimeout(() => {
          copyNotice.style.display = "none";
        }, 2000);
      }
    });
  }

  // Observe Authentication
  onAuth(async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    if (userProfileEl) {
      userProfileEl.textContent = user.displayName || user.email;
    }

    // Load Store
    const store = await getStoreForUser(user.uid);
    if (!store) {
      // No store yet, send to setup
      window.location.href = "setup.html";
      return;
    }

    currentStore = store;
    renderStoreDetails(store);
    listenToRequests(store.store_id);
    listenToFeedback(store.store_id);
  });

  function renderStoreDetails(store) {
    if (storeNameEl) storeNameEl.textContent = store.store_name;
    if (storeIdEl) storeIdEl.textContent = store.store_id;
    if (ownerPhoneEl) ownerPhoneEl.textContent = store.owner_phone;

    // Prefill settings
    if (settingsStoreName) settingsStoreName.value = store.store_name || "";
    if (settingsOwnerPhone) settingsOwnerPhone.value = store.owner_phone || "";
    if (settingsReviewLink) settingsReviewLink.value = store.google_review_link || "";

    // Render WhatsApp connection status
    const hasOwnWa = !!(store.wa_phone_number_id && store.wa_access_token);
    if (waStatusBadge) waStatusBadge.style.display = hasOwnWa ? "inline" : "none";
    if (btnDisconnectWa) btnDisconnectWa.style.display = hasOwnWa ? "inline-block" : "none";
    if (btnSaveWa) btnSaveWa.textContent = hasOwnWa ? "Update Credentials" : "Connect WhatsApp";
    // Prefill Phone Number ID only (token is write-only — never echoed back for security)
    if (waPhoneNumberIdInput) waPhoneNumberIdInput.value = store.wa_phone_number_id || "";
    if (waAccessTokenInput) waAccessTokenInput.value = ""; // always blank on load

    // Set demo links to pass store_id query param
    const demoLink = document.getElementById("btn-open-demo");
    if (demoLink) {
      demoLink.href = `demo.html?store_id=${encodeURIComponent(store.store_id)}`;
    }
  }

  // Real-time listener for review requests
  function listenToRequests(storeId) {
    if (requestsUnsubscribe) requestsUnsubscribe();

    const requestsRef = collection(db, "stores", storeId, "requests");
    const q = query(requestsRef, orderBy("created_at", "desc"));

    requestsUnsubscribe = onSnapshot(q, (snapshot) => {
      const requests = [];
      snapshot.forEach((doc) => requests.push({ id: doc.id, ...doc.data() }));

      if (statRequestsEl) statRequestsEl.textContent = requests.length;

      renderRequestsTable(requests);
    }, (error) => {
      console.error("[SORA DASHBOARD] Requests error:", error);
    });
  }

  function renderRequestsTable(requests) {
    if (!requestsTableBody) return;

    if (requests.length === 0) {
      requestsTableBody.innerHTML = "";
      if (emptyRequestsEl) emptyRequestsEl.style.display = "block";
      return;
    }

    if (emptyRequestsEl) emptyRequestsEl.style.display = "none";

    requestsTableBody.innerHTML = requests.map((req) => {
      const dateStr = req.created_at?.toDate
        ? req.created_at.toDate().toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })
        : "Just now";

      return `
        <tr>
          <td><strong>${escapeHtml(req.customer_name || "Customer")}</strong></td>
          <td>${escapeHtml(req.customer_phone || "—")}</td>
          <td>${dateStr}</td>
          <td><span class="badge badge-success">✓ Sent</span></td>
        </tr>
      `;
    }).join("");
  }

  // Real-time listener for customer feedback
  function listenToFeedback(storeId) {
    if (feedbackUnsubscribe) feedbackUnsubscribe();

    const feedbackRef = collection(db, "stores", storeId, "feedback");
    const q = query(feedbackRef, orderBy("created_at", "desc"));

    feedbackUnsubscribe = onSnapshot(q, (snapshot) => {
      const items = [];
      let positiveCount = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.rating >= 4) positiveCount++;
        items.push({ id: doc.id, ...data });
      });

      if (statFeedbackEl) statFeedbackEl.textContent = items.length;
      if (statPositiveEl) statPositiveEl.textContent = positiveCount;

      renderFeedbackTable(items);
    }, (error) => {
      console.error("[SORA DASHBOARD] Feedback error:", error);
    });
  }

  function renderFeedbackTable(items) {
    if (!feedbackTableBody) return;

    if (items.length === 0) {
      feedbackTableBody.innerHTML = "";
      if (emptyFeedbackEl) emptyFeedbackEl.style.display = "block";
      return;
    }

    if (emptyFeedbackEl) emptyFeedbackEl.style.display = "none";

    feedbackTableBody.innerHTML = items.map((item) => {
      const dateStr = item.created_at?.toDate
        ? item.created_at.toDate().toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })
        : "Just now";

      const ratingStars = "★".repeat(item.rating || 5) + "☆".repeat(5 - (item.rating || 5));
      const ratingColor = (item.rating >= 4) ? "#10B981" : "#F59E0B";

      return `
        <tr>
          <td><span style="color: ${ratingColor}; font-size: 1.15rem; font-weight: bold;">${ratingStars}</span> (${item.rating || 5}/5)</td>
          <td>${escapeHtml(item.feedback_text || "No written comment")}</td>
          <td>${escapeHtml(item.customer_name || "Anonymous")}</td>
          <td>${dateStr}</td>
        </tr>
      `;
    }).join("");
  }

  // Handle Test Review Request Trigger
  if (testRequestForm) {
    testRequestForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!currentStore) return;

      const customerName = testCustomerName.value.trim();
      const customerPhone = testCustomerPhone.value.trim();

      if (!customerName || !customerPhone) {
        alert("Please enter customer name and phone number.");
        return;
      }

      testRequestBtn.disabled = true;
      testRequestBtn.textContent = "Sending...";

      try {
        const requestsRef = collection(db, "stores", currentStore.store_id, "requests");
        await addDoc(requestsRef, {
          customer_name: customerName,
          customer_phone: customerPhone,
          status: "sent",
          created_at: serverTimestamp()
        });

        testCustomerName.value = "";
        testCustomerPhone.value = "";
        if (testRequestSuccess) {
          testRequestSuccess.style.display = "block";
          setTimeout(() => {
            testRequestSuccess.style.display = "none";
          }, 3000);
        }
      } catch (err) {
        console.error("[SORA] Error sending test request:", err);
        alert("Failed to send: " + err.message);
      } finally {
        testRequestBtn.disabled = false;
        testRequestBtn.textContent = "Send Review Request";
      }
    });
  }

  // Handle Settings Update
  if (settingsForm) {
    settingsForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!currentStore) return;

      const newName = settingsStoreName.value.trim();
      const newPhone = settingsOwnerPhone.value.trim();
      const newLink = settingsReviewLink.value.trim();

      try {
        const storeRef = doc(db, "stores", currentStore.store_id);
        await updateDoc(storeRef, {
          store_name: newName,
          owner_phone: newPhone,
          google_review_link: newLink
        });

        currentStore.store_name = newName;
        currentStore.owner_phone = newPhone;
        currentStore.google_review_link = newLink;
        renderStoreDetails(currentStore);

        if (settingsSuccess) {
          settingsSuccess.style.display = "block";
          setTimeout(() => { settingsSuccess.style.display = "none"; }, 3000);
        }
      } catch (err) {
        alert("Failed to update settings: " + err.message);
      }
    });
  }

  // Handle WhatsApp API credentials — Save
  if (waForm) {
    waForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!currentStore) return;

      const phoneNumberId = waPhoneNumberIdInput.value.trim();
      const accessToken = waAccessTokenInput.value.trim();

      if (!phoneNumberId || !accessToken) {
        if (waError) {
          waError.textContent = "Both Phone Number ID and Access Token are required.";
          waError.style.display = "block";
          setTimeout(() => { waError.style.display = "none"; }, 4000);
        }
        return;
      }

      if (btnSaveWa) { btnSaveWa.disabled = true; btnSaveWa.textContent = "Saving..."; }

      try {
        const storeRef = doc(db, "stores", currentStore.store_id);
        await updateDoc(storeRef, {
          wa_phone_number_id: phoneNumberId,
          wa_access_token: accessToken
        });

        // Update local state
        currentStore.wa_phone_number_id = phoneNumberId;
        currentStore.wa_access_token = accessToken;
        renderStoreDetails(currentStore);

        if (waSuccess) {
          waSuccess.style.display = "block";
          setTimeout(() => { waSuccess.style.display = "none"; }, 4000);
        }
      } catch (err) {
        if (waError) {
          waError.textContent = "Failed to save: " + err.message;
          waError.style.display = "block";
          setTimeout(() => { waError.style.display = "none"; }, 5000);
        }
      } finally {
        if (btnSaveWa) { btnSaveWa.disabled = false; }
        renderStoreDetails(currentStore); // re-render button label
      }
    });
  }

  // Handle WhatsApp API credentials — Disconnect
  if (btnDisconnectWa) {
    btnDisconnectWa.addEventListener("click", async () => {
      if (!currentStore) return;
      if (!confirm("Disconnect your WhatsApp? Sora's shared number will be used instead.")) return;

      btnDisconnectWa.disabled = true;

      try {
        const storeRef = doc(db, "stores", currentStore.store_id);
        await updateDoc(storeRef, {
          wa_phone_number_id: "",
          wa_access_token: ""
        });

        currentStore.wa_phone_number_id = "";
        currentStore.wa_access_token = "";
        renderStoreDetails(currentStore);

        if (waDisconnectSuccess) {
          waDisconnectSuccess.style.display = "block";
          setTimeout(() => { waDisconnectSuccess.style.display = "none"; }, 4000);
        }
      } catch (err) {
        alert("Failed to disconnect: " + err.message);
      } finally {
        btnDisconnectWa.disabled = false;
      }
    });
  }

  function setupTabs() {
    const tabBtns = document.querySelectorAll(".tab-btn");
    const tabPanes = document.querySelectorAll(".tab-pane");

    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tabTarget = btn.getAttribute("data-tab");

        tabBtns.forEach((b) => b.classList.remove("active"));
        tabPanes.forEach((p) => p.classList.remove("active"));

        btn.classList.add("active");
        const targetPane = document.getElementById(tabTarget);
        if (targetPane) targetPane.classList.add("active");
      });
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (m) => {
      switch (m) {
        case "&": return "&amp;";
        case "<": return "&lt;";
        case ">": return "&gt;";
        case "\"": return "&quot;";
        case "'": return "&#039;";
        default: return m;
      }
    });
  }
});
