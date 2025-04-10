import { getDatabase, ref, onValue, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

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
const cardsRef = ref(db, 'cards');

document.addEventListener('DOMContentLoaded', () => {
  const cardTable = document.getElementById('cardTable').getElementsByTagName('tbody')[0];

  if (!cardTable) {
    console.error("Card table not found!");
    return;
  }

  // Listen to changes in Firebase
  onValue(cardsRef, (snapshot) => {
    const data = snapshot.val();
    console.log("Firebase data updated:", data); // Log the data

    cardTable.innerHTML = ''; // Clear previous data

    if (!data) {
      console.log("No cards found.");
      return;
    }

    // Iterate over the cards from Firebase
    Object.entries(data).forEach(([cardId, card]) => {
      // Default fallback values for missing data
      const cardName = card.name || 'Unnamed Card';
      const cardSetCode = card.setCode || 'N/A';
      const cardTreatment = card.treatment || 'Non-Foil';
      const cardQuantity = card.quantity || 0; // default to 0 if no quantity
      const cardCollectorNumber = card.collectorNumber || 'N/A';

      const row = cardTable.insertRow();

      row.innerHTML = `
        <td>${cardName}</td>
        <td>${cardSetCode}</td>
        <td>${cardTreatment}</td>
        <td>${cardQuantity}</td>
        <td>${cardCollectorNumber}</td>
        <td></td> <!-- Placeholder for search -->
        <td><button class="delete-button" data-id="${cardId}">Delete</button></td>
      `;

      // Add event listener for the delete button
      row.querySelector('.delete-button').addEventListener('click', () => {
        const cardRef = ref(db, `cards/${cardId}`);
        remove(cardRef)
          .then(() => {
            console.log(`Card ${cardId} deleted.`);
            row.remove(); // Remove the row from the table after successful deletion
          })
          .catch((err) => {
            console.error("Delete failed:", err);
          });
      });
    });
  });
});
