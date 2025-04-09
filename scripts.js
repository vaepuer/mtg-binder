import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, push, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAia2iO0Qx7AmJxXlbG5BK60VRJSZ2Srh8",
  authDomain: "tgbinder-8e3c6.firebaseapp.com",
  databaseURL: "https://tgbinder-8e3c6-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "tgbinder-8e3c6",
  storageBucket: "tgbinder-8e3c6.firebasestorage.app",
  messagingSenderId: "903450561301",
  appId: "1:903450561301:web:df2407af369db0895bb71c",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const cardsRef = ref(db, 'cards');

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('binderContainer');
  const addCardForm = document.getElementById('cardForm');
  const cardTable = document.getElementById('cardTable').getElementsByTagName('tbody')[0];

  // Ensure the container element is available before proceeding
  if (!container) {
    console.error('binderContainer not found!');
    return;
  }

  // Listen for card data from Firebase
  onValue(cardsRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      container.innerHTML = 'No cards found.';
      return;
    }

    container.innerHTML = '';  // Clear old entries if data exists

    Object.entries(data).forEach(([cardId, card]) => {
      const row = cardTable.insertRow();
      row.insertCell(0).textContent = card.name;
      row.insertCell(1).textContent = card.setCode;
      row.insertCell(2).textContent = card.treatment || 'Non-Foil';
      row.insertCell(3).textContent = card.quantity || 1;
      row.insertCell(4).textContent = card.collectorNumber || '';

      // Create Search Button
      const searchButton = document.createElement('button');
      searchButton.textContent = 'Search';
      searchButton.onclick = () => {
        const url = `https://www.cardmarket.com/en/Magic/Products/Search?searchString=${encodeURIComponent(card.name)}&setName=${encodeURIComponent(card.setCode)}`;
        window.open(url, '_blank');
      };
      row.insertCell(5).appendChild(searchButton);

      // Create Delete Button
      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'Delete';
      deleteButton.onclick = () => {
        remove(ref(db, `cards/${cardId}`));
      };
      row.insertCell(6).appendChild(deleteButton);
    });
  });

  // Form submission to add new card
  addCardForm.addEventListener('submit', (event) => {
    event.preventDefault(); // Prevent form submission

    const cardName = document.getElementById('cardNameInput').value;
    const cardQuantity = parseInt(document.getElementById('cardQuantityInput').value, 10);
    const cardTreatment = document.getElementById('treatmentSelect').value;
    const cardSetCode = document.getElementById('setCodeInput').value;
    const cardCollectorNumber = document.getElementById('collectorNumberInput').value;

    if (cardName && cardQuantity) {
      const newCard = {
        name: cardName,
        quantity: cardQuantity,
        treatment: cardTreatment,
        setCode: cardSetCode,
        collectorNumber: cardCollectorNumber
      };

      // Add card to Firebase
      const newCardRef = push(cardsRef);
      set(newCardRef, newCard)
        .then(() => {
          console.log("Card added successfully!");

          // Optionally, reset the form fields after adding the card
          addCardForm.reset();
        })
        .catch(error => {
          console.error("Error adding card: ", error);
        });
    }
  });
});
