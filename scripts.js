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

// 🔁 Wait for DOM to be ready
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
    const cardTableBody = document.getElementById('cardTable')?.getElementsByTagName('tbody')[0];

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

      // Prepare the new card object
      const newCard = {
        name: cardName,
        quantity: cardQuantity,
        treatment: cardTreatment,
        setCode: cardSetCode,
        collectorNumber: cardCollectorNumber,
        userId: user.uid
      };

      console.log("Sending this card to Firebase:", newCard); // Debugging line to check the card object

      // Add the card to Firebase
      const newCardRef = push(cardsRef); // This should add a new card to the cards collection
      set(newCardRef, newCard)
        .then(() => {
          console.log("✅ Card added successfully!");
          addCardForm.reset();
        })
        .catch((error) => {
          console.error("❌ Error adding card:", error);
        });
    });

    // ✅ Fetch and display the cards
    onValue(cardsRef, (snapshot) => {
      const data = snapshot.val();
      console.log('Fetched card data:', data); // Added to inspect fetched data

      if (!cardTableBody) {
        console.error('Table body not found!');
        return;
      }

      cardTableBody.innerHTML = ""; // Clear the current table data

      if (data) {
        // Loop through each card and render it in the table
        Object.entries(data).forEach(([cardId, card]) => {
          console.log('Card Data:', card); // Log each card data

          if (card.userId === user.uid) {  // Show only cards belonging to the logged-in user
            const row = cardTableBody.insertRow();
            row.innerHTML = `
              <td>${card.name}</td>
              <td>${card.setCode}</td>
              <td>${card.treatment || "Non-Foil"}</td>
              <td>${card.quantity}</td>
              <td>${card.collectorNumber || "N/A"}</td>
              <td><button class="delete-button" data-id="${cardId}">Delete</button></td>
            `;

            // Add delete functionality
            row.querySelector(".delete-button").addEventListener("click", () => {
              remove(ref(db, `cards/${cardId}`))
                .then(() => {
                  console.log("✅ Card deleted successfully!");
                })
                .catch((error) => {
                  console.error("❌ Error deleting card:", error);
                });
            });
          }
        });
      }
    });
  });
});
