import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
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

// Initialize Firebase (prevent duplicate app error)
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Your listener code below...
// Example:
document.addEventListener('DOMContentLoaded', () => {
  const cardTable = document.getElementById('cardTable').getElementsByTagName('tbody')[0];
  const cardsRef = ref(db, 'cards');

  onValue(cardsRef, (snapshot) => {
    const data = snapshot.val();
    console.log("Fetched data:", data);
    cardTable.innerHTML = '';

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
        <td><button class="delete-button" onclick="deleteCard('${cardId}')">Delete</button></td>
      `;
    });
  });
});
