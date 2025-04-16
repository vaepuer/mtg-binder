import {
  getDatabase,
  ref,
  push,
  set,
  remove
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import {
  initializeApp,
  getApps
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";



document.addEventListener('DOMContentLoaded', () => {
  const addCardForm = document.getElementById('cardForm');
  const logoutBtn = document.getElementById("logoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      signOut(auth)
        .then(() => {
          console.log("User signed out.");
          window.location.href = "login.html";
        })
        .catch((error) => {
          console.error("Logout error:", error);
        });
    });
  }

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      console.log("Not logged in. Redirecting to login.");
      window.location.href = "login.html";
      return;
    }

    console.log("Logged in as:", user.uid);

    if (!addCardForm) {
      console.warn('Card form not found.');
      return;
    }

    addCardForm.addEventListener('submit', (event) => {
      event.preventDefault();

      const cardName = document.getElementById('cardNameInput')?.value.trim();
      const cardQuantity = parseInt(document.getElementById('cardQuantityInput')?.value || "1", 10);
      const cardTreatment = document.getElementById('treatmentSelect')?.value || "";
      const cardSetCode = document.getElementById('setCodeInput')?.value || "";
      const cardCollectorNumber = document.getElementById('collectorNumberInput')?.value || "";

      if (!cardName || isNaN(cardQuantity)) {
        alert('Please enter a valid card name and quantity.');
        return;
      }

      const newCard = {
        name: cardName,
        quantity: cardQuantity,
        treatment: cardTreatment,
        setCode: cardSetCode,
        collectorNumber: cardCollectorNumber,
        userId: user.uid
      };

      const newCardRef = push(ref(db, 'cards'));

      set(newCardRef, newCard)
        .then(() => {
          console.log("✅ Card added successfully!");
          addCardForm.reset();
        })
        .catch((error) => {
          console.error("❌ Error adding card:", error);
        });
    });
  });
});
