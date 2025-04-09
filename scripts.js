import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, push, set, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAia2iO0Qx7AmJxXlbG5BK60VRJSZ2Srh8",
  authDomain: "tgbinder-8e3c6.firebaseapp.com",
  databaseURL: "https://tgbinder-8e3c6-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "tgbinder-8e3c6",
  storageBucket: "tgbinder-8e3c6.appspot.com",
  messagingSenderId: "903450561301",
  appId: "1:903450561301:web:df2407af369db0895bb71c",
};

// Initialize Firebase
import { getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);
const auth = getAuth(app);
const cardsRef = ref(db, 'cards');

document.addEventListener('DOMContentLoaded', () => {
  const addCardForm = document.getElementById('cardForm');
  const cardTableBody = document.querySelector('#cardTable tbody');

  // 💾 Load cards from Firebase and populate the table
  onValue(cardsRef, (snapshot) => {
    const data = snapshot.val();
    cardTableBody.innerHTML = ''; // Clear current rows

    if (data) {
      Object.entries(data).forEach(([cardId, card]) => {
        addNewCardToTable(card, cardId);
      });
    }
  });

  // ➕ Handle form submission
  addCardForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const nameInput = document.getElementById('cardNameInput').value.trim();
    const cardSetCode = document.getElementById('setCodeInput').value.trim();
    const cardCollectorNumber = document.getElementById('collectorNumberInput').value.trim();
    const cardTreatment = document.getElementById('treatmentSelect').value;
    const cardQuantity = parseInt(nameInput.split(' ')[0]) || 1;
    const nameWithoutQty = cardQuantity > 1 ? nameInput.split(' ').slice(1).join(' ') : nameInput;

    

    if (!cardName || !cardSetCode) {
      alert('Please provide at least the card name and set code.');
      return;
    }

    const newCard = {
      name: nameWithoutQty,
      quantity: cardQuantity,
      treatment: cardTreatment,
      setCode: cardSetCode,
      collectorNumber: cardCollectorNumber,
    };
    

    const newCardRef = push(cardsRef);
    set(newCardRef, newCard)
      .then(() => {
        console.log("✅ Card added successfully!");
        addCardForm.reset();
      })
      .catch(error => {
        console.error("❌ Error adding card:", error);
      });
  });

  // ❌ Delete a card
  function deleteCard(cardId) {
    const cardRef = ref(db, `cards/${cardId}`);
    remove(cardRef)
      .then(() => {
        console.log("🗑️ Card deleted!");
      })
      .catch(error => {
        console.error("❌ Error deleting card:", error);
      });
  }

  // 🧱 Add new card row to the table
  function addNewCardToTable(card, cardId) {
    const row = cardTableBody.insertRow();
    row.setAttribute('data-id', cardId);

    row.innerHTML = `
      <td>${card.name}</td>
      <td>${card.setCode}</td>
      <td>${card.treatment || 'Non-Foil'}</td>
      <td>${card.quantity || 1}</td>
      <td>${card.collectorNumber || 'N/A'}</td>
      <td><button class="search-btn">Search</button></td>
      <td><button class="delete-btn">Delete</button></td>
    `;

    // 🔍 Search button
    row.querySelector('.search-btn').addEventListener('click', () => {
      const searchURL = `https://www.cardmarket.com/en/Magic/Products/Search?searchString=${encodeURIComponent(card.name)}&setName=${encodeURIComponent(card.setCode)}`;
      window.open(searchURL, '_blank');
    });

    // 🗑️ Delete button
    row.querySelector('.delete-btn').addEventListener('click', () => {
      deleteCard(cardId);
    });
  }
});