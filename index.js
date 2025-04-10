// index.js
import {
  getDatabase,
  ref,
  onValue,
  remove
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import {
  initializeApp,
  getApps
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

// Firebase config (same as scripts.js)
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
const cardsRef = ref(db, 'cards');

document.addEventListener('DOMContentLoaded', () => {
  const cardTable = document.getElementById('cardTable').getElementsByTagName('tbody')[0];

  if (!cardTable) {
    console.error("Card table not found!");
    return;
  }

  onValue(cardsRef, (snapshot) => {
    const data = snapshot.val();
    cardTable.innerHTML = ''; // Clear previous table

    if (!data) return;

    Object.entries(data).forEach(([cardId, card]) => {
      const row = cardTable.insertRow();

      row.innerHTML = `
        <td>${card.name}</td>
        <td>${card.setCode}</td>
        <td>${card.treatment || 'Non-Foil'}</td>
        <td>${card.quantity}</td>
        <td>${card.collectorNumber || 'N/A'}</td>
        <td></td>
        <td><button class="delete-button" data-id="${cardId}">Delete</button></td>
      `;

      row.querySelector('.delete-button').addEventListener('click', () => {
        const cardRef = ref(db, `cards/${cardId}`);
        remove(cardRef)
          .then(() => console.log(`Card ${cardId} deleted.`))
          .catch((err) => console.error("Delete failed:", err));
      });
    });
  });
});
