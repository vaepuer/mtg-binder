import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  get,
  child
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

  addCardForm.addEventListener('submit', async (event) => {
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

    try {
      const snapshot = await get(cardsRef);

      let matchedKey = null;
      let matchedCard = null;

      snapshot.forEach((childSnapshot) => {
        const existing = childSnapshot.val();
        const key = childSnapshot.key;

        const isSameUser = existing.userId === user.uid;
        const isSameCard =
          existing.name === cardName &&
          existing.setCode === cardSetCode &&
          existing.collectorNumber === cardCollectorNumber;

        if (isSameUser && isSameCard) {
          matchedKey = key;
          matchedCard = existing;
        }
      });

      if (matchedKey) {
        // 🔁 Update quantity on existing card
        const updatedQuantity = (parseInt(matchedCard.quantity) || 0) + cardQuantity;
        const cardRef = ref(db, `cards/${matchedKey}`);

        await set(cardRef, {
          ...matchedCard,
          quantity: updatedQuantity,
        });

        console.log("🟢 Updated existing card quantity!");
      } else {
        // ➕ Add as new card
        const newCardRef = push(cardsRef);
        await set(newCardRef, {
          name: cardName,
          quantity: cardQuantity,
          treatment: cardTreatment,
          setCode: cardSetCode,
          collectorNumber: cardCollectorNumber,
          userId: user.uid,
        });

        console.log("✅ Added new card!");
      }

      addCardForm.reset();
    } catch (error) {
      console.error("❌ Error processing card:", error);
    }
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
      const cardId = childSnapshot.key;

      if (card.userId === userId) {
        const row = document.createElement('tr');

        row.innerHTML = `
          <td>${card.name}</td>
          <td>${card.quantity}</td>
          <td>${card.treatment || ''}</td>
          <td>${card.setCode || ''}</td>
          <td>${card.collectorNumber || ''}</td>
          <td>
            <button class="search-btn" data-name="${card.name}" data-set="${card.setCode}" data-num="${card.collectorNumber}">
              🔍
            </button>
          </td>
          <td>
            <button class="delete-btn" data-id="${cardId}">🗑️</button>
          </td>
        `;

        tableBody.appendChild(row);
      }
    });

    // ✅ Attach event listeners after table is populated
    attachDeleteHandlers();
    attachSearchHandlers();
  });
}

function attachDeleteHandlers() {
  document.querySelectorAll('.delete-btn').forEach(button => {
    button.addEventListener('click', () => {
      const cardId = button.getAttribute('data-id');
      if (confirm("Delete this card?")) {
        const cardRef = ref(db, `cards/${cardId}`);
        set(cardRef, null)
          .then(() => console.log("Card deleted"))
          .catch(err => console.error("Delete failed:", err));
      }
    });
  });
}


function attachSearchHandlers() {
  document.querySelectorAll('.search-btn').forEach(button => {
    button.addEventListener('click', () => {
      const name = button.getAttribute('data-name');
      const set = button.getAttribute('data-set');

      if (!name || !set) {
        console.error("Missing card name or setCode for search.");
        return;
      }

      const url = `https://www.cardmarket.com/en/Magic/Products/Search?searchString=${encodeURIComponent(name)}&setName=${encodeURIComponent(set)}`;
      window.open(url, '_blank');
    });
  });
}
