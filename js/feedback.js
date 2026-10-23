// ==========================================================================
// Sora — Customer Feedback Form (Positive -> Google, Negative -> Private)
// ==========================================================================
import { db } from "./firebase-config.js";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const storeId = urlParams.get("store_id") || "demo-store";
  const customerNameParam = urlParams.get("customer_name") || "";

  // Elements
  const storeNameEl = document.getElementById("feedback-store-name");
  const starContainer = document.getElementById("star-rating-container");
  const positiveSection = document.getElementById("feedback-positive-section");
  const negativeSection = document.getElementById("feedback-negative-section");
  const googleReviewBtn = document.getElementById("btn-google-review");
  const feedbackForm = document.getElementById("private-feedback-form");
  const feedbackInput = document.getElementById("feedback-text");
  const feedbackSuccessEl = document.getElementById("feedback-success");
  const feedbackContent = document.getElementById("feedback-content");

  let selectedRating = 5;
  let storeData = null;

  // Fetch Store Details
  try {
    const storeSnap = await getDoc(doc(db, "stores", storeId));
    if (storeSnap.exists()) {
      storeData = storeSnap.data();
      if (storeNameEl) storeNameEl.textContent = storeData.store_name || "Our Business";
      if (googleReviewBtn) {
        googleReviewBtn.href = storeData.google_review_link || "https://google.com";
      }
    } else {
      if (storeNameEl) storeNameEl.textContent = "Welcome to Our Business";
    }
  } catch (err) {
    console.error("[SORA FEEDBACK] Error loading store:", err);
  }

  // Render Stars
  const stars = document.querySelectorAll(".star");
  stars.forEach((star) => {
    star.addEventListener("click", () => {
      selectedRating = parseInt(star.getAttribute("data-rating"), 10);
      updateStars(selectedRating);
      handleRatingSelected(selectedRating);
    });

    star.addEventListener("mouseenter", () => {
      const hoverVal = parseInt(star.getAttribute("data-rating"), 10);
      updateStars(hoverVal);
    });
  });

  if (starContainer) {
    starContainer.addEventListener("mouseleave", () => {
      updateStars(selectedRating);
    });
  }

  function updateStars(rating) {
    stars.forEach((s) => {
      const val = parseInt(s.getAttribute("data-rating"), 10);
      if (val <= rating) {
        s.classList.add("active");
        s.textContent = "★";
      } else {
        s.classList.remove("active");
        s.textContent = "☆";
      }
    });
  }

  function handleRatingSelected(rating) {
    if (rating >= 4) {
      // Positive Experience -> Direct to Google Review
      if (positiveSection) positiveSection.style.display = "block";
      if (negativeSection) negativeSection.style.display = "none";
      recordFeedback(rating, "Customer rated " + rating + " stars and viewed Google Review link.");
    } else {
      // Lower Experience -> Shield with Private Feedback
      if (positiveSection) positiveSection.style.display = "none";
      if (negativeSection) negativeSection.style.display = "block";
    }
  }

  // Handle Private Feedback submission
  if (feedbackForm) {
    feedbackForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = feedbackInput.value.trim();
      if (!text) return;

      const submitBtn = feedbackForm.querySelector("button[type='submit']");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting...";
      }

      await recordFeedback(selectedRating, text);

      if (feedbackContent) feedbackContent.style.display = "none";
      if (feedbackSuccessEl) feedbackSuccessEl.style.display = "block";
    });
  }

  async function recordFeedback(rating, text) {
    try {
      const feedbackColRef = collection(db, "stores", storeId, "feedback");
      await addDoc(feedbackColRef, {
        rating: rating,
        feedback_text: text,
        customer_name: customerNameParam || "Customer",
        created_at: serverTimestamp()
      });
    } catch (err) {
      console.error("[SORA] Error saving feedback:", err);
    }
  }

  // Default display 5 stars
  updateStars(5);
  handleRatingSelected(5);
});
