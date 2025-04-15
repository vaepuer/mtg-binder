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

// ✅ Initialize Firebase
const app = getApps().length === 0 ? initializeApp("./firebaseConfig") : getApps()[0];
const db = getDatabase(app);
const auth = getAuth(app);

// 🔁 Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  const addCardForm = document.getElementById('cardForm');

  if (!addCardForm) {
    console.warn('Card form not found.');
    return;
  }

  addCardForm.addEventListener('submit', (event) => {
    event.preventDefault();

    console.log("Form submitted");

    const cardName = document.getElementById('cardNameInput')?.value.trim();
    const cardQuantity = parseInt(document.getElementById('cardQuantityInput')?.value || "1", 10);
    const cardTreatment = document.getElementById('treatmentSelect')?.value || "";
    const cardSetCode = document.getElementById('setCodeInput')?.value || "";
    const cardCollectorNumber = document.getElementById('collectorNumberInput')?.value || "";

    if (!cardName || isNaN(cardQuantity)) {
      alert('Please enter a valid card name and quantity.');
      return;
    }

    // Prepare the card data
    const newCard = {
      name: cardName,
      quantity: cardQuantity,
      treatment: cardTreatment,
      setCode: cardSetCode,
      collectorNumber: cardCollectorNumber,
      userId: user.uid
    };

    console.log("Card data:", newCard); // Log card data to check if it's correct

    // Create the reference for the new card
    const newCardRef = push(ref(db, 'cards'));  // Correctly create the reference for new card

    // Now, push the data to Firebase
    set(newCardRef, newCard)
      .then(() => {
        console.log("✅ Card added successfully!");
        addCardForm.reset();  // Reset the form
      })
      .catch((error) => {
        console.error("❌ Error adding card:", error);  // Log any error that occurs
      });
  });
});
