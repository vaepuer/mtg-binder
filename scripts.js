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

// ✅ Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAia2iO0Qx7AmJxXlbG5BK60VRJSZ2Srh8",
  authDomain: "tgbinder-8e3c6.firebaseapp.com",
  databaseURL: "https://tgbinder-8e3c6-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "tgbinder-8e3c6",
  storageBucket: "tgbinder-8e3c6.appspot.com",
  messagingSenderId: "903450561301",
  appId: "1:903450561301:web:df2407af369db0895bb71c",
};

// ✅ Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);
const auth = getAuth(app);

// 🔁 Run when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById("logoutBtn");

  // ✅ Logout event listener
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

  // ✅ Wait for auth state
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      console.log("Not logged in. Staying on login page.");
      return;
    }

    console.log("Logged in as:", user.uid);

    const cardsRef = ref(db, 'cards');
    const addCardForm = document.getElementById('cardForm');

    if (!addCardForm) {
      console.warn('Card form not found.');
      return;
    }

    // ✅ Add card event listener
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

      const newCardRef = push(cardsRef);
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
