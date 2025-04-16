import {
  getDatabase,
  ref,
  push,
  set,
  onValue
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

import { firebaseConfig } from "./firebaseConfig.js";

// ✅ Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);
const auth = getAuth(app);

// ✅ Run when DOM is ready
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

    // Setup form listener
    setupAddCardForm(user);

    // Load cards into table
    displayCards(user.uid);
  });
});

// ✅ Add card form logic
function setupAddCardForm(user) {
  const cardsRef = ref(db, 'cards');
  const addCardForm = document.getElementById('cardForm');

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
}

// ✅ Show user’s cards in the table
function displayCards(userId) {
  const cardsRef = ref(db, 'cards');
  const tableBody = document.getElementById('cardTableBody');

  if (!tableBody) {
    console.warn("Table body with ID 'cardTableBody' not found.");
    return;
  }

  onValue(cardsRef, (snapshot) => {
    tableBody.innerHTML = ''; // Clear existing rows

    snapshot.forEach((childSnapshot) => {
      const card = childSnapshot.val();

      if (card.userId === userId) {
        const row = document.createElement('tr');

        row.innerHTML = `
          <td>${card.name}</td>
          <td>${card.quantity}</td>
          <td>${card.treatment || ''}</td>
          <td>${card.setCode || ''}</td>
          <td>${card.collectorNumber || ''}</td>
        `;

        tableBody.appendChild(row);
      }
    });
  }, {
    onlyOnce: false
  });
}
