import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, push, set, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Firebase config
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
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);
const auth = getAuth(app);
const cardsRef = ref(db, 'cards');

document.addEventListener('DOMContentLoaded', () => {
  const addCardForm = document.getElementById('cardForm');
  const cardTable = document.getElementById('cardTable')?.getElementsByTagName('tbody')[0];

  // Load existing cards from Firebase
  onValue(cardsRef, (snapshot) => {
    const data = snapshot.val();
    if (!data || !cardTable) return;

    // Clear and rebuild the table
    cardTable.innerHTML = '';
    Object.entries(data).forEach(([cardId, card]) => addCardToTable(card, cardId));
  });

  // Form submission handler
  addCardForm?.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('cardNameInput')?.value;
    const quantity = parseInt(document.getElementById('cardQuantityInput')?.value, 10);
    const treatment = document.getElementById('treatmentSelect')?.value || 'Non-Foil';
    const setCode = document.getElementById('setCodeInput')?.value || '';
    const collectorNumber = document.getElementById('collectorNumberInput')?.value || '';

    if (!name || isNaN(quantity)) return;

    const newCard = {
      name,
      quantity,
      treatment,
      setCode,
      collectorNumber,
      userId: auth.currentUser?.uid || 'anonymous'
    };

    const newCardRef = push(cardsRef);
    set(newCardRef, newCard)
      .then(() => {
        console.log("Card added.");
        addCardForm.reset();
      })
      .catch((err) => console.error("Error adding card:", err));
  });

  // Add a card row to the table
  function addCardToTable(card, cardId) {
    if (!cardTable) return;

    const row = cardTable.insertRow();
    row.insertCell(0).textContent = card.name;
    row.insertCell(1).textContent = card.setCode;
    row.insertCell(2).textContent = card.treatment || 'Non-Foil';
    row.insertCell(3).textContent = card.quantity;
    row.insertCell(4).textContent = card.collectorNumber || 'N/A';
    row.insertCell(5).innerHTML = ''; // Optional: Add link/search/etc.

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = () => remove(ref(db, `cards/${cardId}`));
    row.insertCell(6).appendChild(deleteBtn);
  }
});
