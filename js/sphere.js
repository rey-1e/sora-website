// ==========================================================================
// Sora — Reusable Floating "S" Sphere & Popover Component
// ==========================================================================
import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

export function initSoraSphere(options = {}) {
  const storeId = options.storeId || "demo-store";

  // Prevent multiple injections
  if (document.getElementById("sora-sphere-root")) return;

  const root = document.createElement("div");
  root.id = "sora-sphere-root";
  root.className = "sora-sphere-root";

  root.innerHTML = `
    <!-- Floating 'S' Button -->
    <div id="sora-sphere-btn" class="sora-sphere-btn" title="Sora Review Assistant">
      <span class="sora-sphere-letter">S</span>
    </div>

    <!-- Popover Card -->
    <div id="sora-popover" class="sora-popover">
      <div class="sora-popover-header">
        <div class="sora-popover-title">
          <span>Sora</span>
          <span class="sora-badge">Counter</span>
        </div>
        <button id="sora-popover-close" class="sora-popover-close">&times;</button>
      </div>

      <div class="sora-input-group">
        <label class="sora-input-label">Customer / Patient Name</label>
        <input type="text" id="sora-input-name" class="sora-input" placeholder="e.g. Dr. Aarav Patel">
      </div>

      <div class="sora-input-group">
        <label class="sora-input-label">Mobile Number</label>
        <input type="tel" id="sora-input-phone" class="sora-input" placeholder="10-digit mobile (e.g. 9876543210)">
      </div>

      <div class="sora-checkbox-group">
        <input type="checkbox" id="sora-consent-check" checked>
        <label for="sora-consent-check">Customer agreed to receive WhatsApp review link</label>
      </div>

      <button id="sora-btn-send" class="sora-btn-send">
        <span>Send via WhatsApp</span>
      </button>

      <div id="sora-success-banner" class="sora-success-banner">
        ✓ Review request sent via WhatsApp!
      </div>
    </div>
  `;

  document.body.appendChild(root);

  // Setup Event Handlers
  const sphereBtn = document.getElementById("sora-sphere-btn");
  const popover = document.getElementById("sora-popover");
  const closeBtn = document.getElementById("sora-popover-close");
  const nameInput = document.getElementById("sora-input-name");
  const phoneInput = document.getElementById("sora-input-phone");
  const consentCheck = document.getElementById("sora-consent-check");
  const sendBtn = document.getElementById("sora-btn-send");
  const successBanner = document.getElementById("sora-success-banner");

  let isOpen = false;

  sphereBtn.addEventListener("click", () => {
    isOpen = !isOpen;
    if (isOpen) {
      popover.classList.add("open");
      autoExtractPageDetails();
    } else {
      popover.classList.remove("open");
    }
  });

  closeBtn.addEventListener("click", () => {
    isOpen = false;
    popover.classList.remove("open");
  });

  // Auto-extraction from host billing page
  function autoExtractPageDetails() {
    // If inputs are already filled, don't overwrite
    if (nameInput.value && phoneInput.value) return;

    // Search for name field in the document
    const nameSelectors = [
      "input[name*='name' i]",
      "input[id*='name' i]",
      "input[placeholder*='name' i]",
      "input[id*='patient' i]",
      "input[id*='customer' i]",
      "[data-customer-name]"
    ];

    for (const sel of nameSelectors) {
      const el = document.querySelector(sel);
      if (el && el !== nameInput) {
        const val = el.value || el.textContent || el.getAttribute("data-customer-name");
        if (val && val.trim().length > 1) {
          nameInput.value = val.trim();
          break;
        }
      }
    }

    // Search for phone field in the document
    const phoneSelectors = [
      "input[type='tel']",
      "input[name*='phone' i]",
      "input[id*='phone' i]",
      "input[name*='mobile' i]",
      "input[id*='mobile' i]",
      "input[placeholder*='mobile' i]",
      "[data-customer-phone]"
    ];

    for (const sel of phoneSelectors) {
      const el = document.querySelector(sel);
      if (el && el !== phoneInput) {
        const val = el.value || el.textContent || el.getAttribute("data-customer-phone");
        if (val) {
          const digits = val.replace(/\D/g, "");
          if (digits.length >= 10) {
            phoneInput.value = digits.slice(-10);
            break;
          }
        }
      }
    }
  }

  // Send Action
  sendBtn.addEventListener("click", async () => {
    const customerName = nameInput.value.trim() || "Customer";
    const rawPhone = phoneInput.value.trim().replace(/\D/g, "");

    if (rawPhone.length < 10) {
      alert("Please enter a valid 10-digit mobile number.");
      phoneInput.focus();
      return;
    }

    if (!consentCheck.checked) {
      alert("Please confirm that the customer agreed to receive the WhatsApp message.");
      return;
    }

    sendBtn.disabled = true;
    sendBtn.innerHTML = "<span>Sending...</span>";

    try {
      // 1. Log request in Firestore under stores/{store_id}/requests
      const requestsCol = collection(db, "stores", storeId, "requests");
      await addDoc(requestsCol, {
        customer_name: customerName,
        customer_phone: rawPhone,
        status: "sent",
        consent_confirmed: true,
        source: "sphere",
        created_at: serverTimestamp()
      });

      // 2. Show success banner
      successBanner.style.display = "block";
      sendBtn.innerHTML = "<span>Sent ✓</span>";

      setTimeout(() => {
        successBanner.style.display = "none";
        sendBtn.disabled = false;
        sendBtn.innerHTML = "<span>Send via WhatsApp</span>";
        popover.classList.remove("open");
        isOpen = false;
      }, 1600);
    } catch (err) {
      console.error("[SORA SPHERE] Send failed:", err);
      alert("Send failed: " + err.message);
      sendBtn.disabled = false;
      sendBtn.innerHTML = "<span>Send via WhatsApp</span>";
    }
  });

  // Make Sphere Draggable
  makeDraggable(sphereBtn, root);
}

function makeDraggable(handle, container) {
  let isDragging = false;
  let startX, startY;
  let initialRight = 24, initialBottom = 24;

  handle.addEventListener("mousedown", (e) => {
    if (e.target.closest("#sora-popover")) return;
    isDragging = false;
    startX = e.clientX;
    startY = e.clientY;

    function onMouseMove(moveEvent) {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        isDragging = true;
        const newRight = Math.max(10, Math.min(window.innerWidth - 70, initialRight - dx));
        const newBottom = Math.max(10, Math.min(window.innerHeight - 70, initialBottom - dy));
        container.style.right = `${newRight}px`;
        container.style.bottom = `${newBottom}px`;
      }
    }

    function onMouseUp(upEvent) {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);

      if (isDragging) {
        // Update stored positions
        const rect = container.getBoundingClientRect();
        initialRight = window.innerWidth - rect.right;
        initialBottom = window.innerHeight - rect.bottom;
      }
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
}
