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
  const cardsRef = ref(db, `cards/${user.uid}`);
  const addCardForm = document.getElementById('cardForm');

  if (!addCardForm) {
    console.warn('Card form not found.');
    return;
  }

  // 🔒 Remove any existing listeners to prevent duplicates
  const newForm = addCardForm.cloneNode(true);
  addCardForm.parentNode.replaceChild(newForm, addCardForm);

  newForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const rawInput = document.getElementById('cardNameInput')?.value.trim();
    let cardName = rawInput;
    let cardQuantity = 1;

    // Parse quantity from beginning of input like "3 Sol Ring"
    const match = rawInput.match(/^(\d+)\s+(.+)/);
    if (match) {
      cardQuantity = parseInt(match[1], 10);
      cardName = match[2];
    }

    const cardTreatment = document.getElementById('treatmentSelect')?.value || "";
    const cardSetCode = document.getElementById('setCodeInput')?.value || "";
    const cardCollectorNumber = document.getElementById('collectorNumberInput')?.value || "";

    if (!cardName || isNaN(cardQuantity)) {
      alert('Please enter a valid card name and quantity.');
      return;
    }

    // 🔍 Check for existing card before adding new
    onValue(cardsRef, (snapshot) => {
      let found = false;

      snapshot.forEach((childSnapshot) => {
        const card = childSnapshot.val();
        const cardId = childSnapshot.key;

        const isSameCard =
          card.name === cardName &&
          card.setCode === cardSetCode &&
          card.treatment === cardTreatment &&
          card.collectorNumber === cardCollectorNumber;

        if (isSameCard) {
          found = true;
          const newQty = (parseInt(card.quantity) || 0) + cardQuantity;
          const cardRef = ref(db, `cards/${user.uid}/${cardId}`);

          set(cardRef, {
            ...card,
            quantity: newQty
          }).then(() => {
            console.log("✅ Quantity updated!");
            newForm.reset();
          }).catch((error) => {
            console.error("❌ Error updating card:", error);
          });

          return true; // exit early
        }
      });

      if (!found) {
        const newCardRef = push(cardsRef);
        const newCard = {
          name: cardName,
          quantity: cardQuantity,
          treatment: cardTreatment,
          setCode: cardSetCode,
          collectorNumber: cardCollectorNumber,
          userId: user.uid
        };

        set(newCardRef, newCard)
          .then(() => {
            console.log("✅ New card added!");
            newForm.reset();
          })
          .catch((error) => {
            console.error("❌ Error adding card:", error);
          });
      }
    }, { onlyOnce: true }); // only grab the data once
  });
}



// ✅ Show user’s cards in the table
function displayCards(userId) {
  const cardsRef = ref(db, `cards/${userId}`); // 🔥 Only get this user's cards
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
    });

    attachDeleteHandlers(userId); // ✅ pass UID to delete
    attachSearchHandlers();
  });
}


function attachDeleteHandlers(userId) {
  document.querySelectorAll('.delete-btn').forEach(button => {
    button.addEventListener('click', () => {
      const cardId = button.getAttribute('data-id');
      if (confirm("Delete this card?")) {
        const cardRef = ref(db, `cards/${userId}/${cardId}`);
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
