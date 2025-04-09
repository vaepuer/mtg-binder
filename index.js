import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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
//const app = initializeApp(firebaseConfig);
//const db = getDatabase(app);
const cardsRef = ref(db, 'cards');

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
  const addCardForm = document.getElementById('cardForm');
  const cardTable = document.getElementById('cardTable').getElementsByTagName('tbody')[0];

  // Check if form and table are present
  if (!addCardForm || !cardTable) {
    console.error("Form or Table elements are missing!");
    return;
  }

  console.log("Form and Table elements found");

  // Form submission handler
  addCardForm.addEventListener('submit', (event) => {
    event.preventDefault(); // Prevent form submission

    // Get form data
    const cardName = document.getElementById('cardNameInput').value;
    const cardQuantity = 1; // Default quantity to 1 for simplicity
    const cardTreatment = document.getElementById('treatmentSelect').value;
    const cardSetCode = document.getElementById('setCodeInput').value;
    const cardCollectorNumber = document.getElementById('collectorNumberInput').value;

    console.log(`Card Name: ${cardName}, Set: ${cardSetCode}, Collector: ${cardCollectorNumber}`);

    if (cardName && cardSetCode) {
      // Create a new card object
      const newCard = {
        name: cardName,
        quantity: cardQuantity,
        treatment: cardTreatment,
        setCode: cardSetCode,
        collectorNumber: cardCollectorNumber
      };

      // 1. Add card to Firebase
      const newCardRef = push(cardsRef);
      set(newCardRef, newCard)
        .then(() => {
          console.log("Card added to Firebase successfully!");
          addCardToTable(newCard); // Add card to the table immediately
          addCardForm.reset(); // Reset form after adding card
        })
        .catch(error => {
          console.error("Error adding card to Firebase: ", error);
        });
    } else {
      console.log("Card Name and Set Code are required.");
    }
  });

  // Function to add a card to the table
  function addCardToTable(card) {
    console.log("Adding card to table:", card); // Debug log
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
      // Remove card from both the table and Firebase
      const rowIndex = row.rowIndex;
      cardTable.deleteRow(rowIndex);
      remove(ref(db, `cards/${newCardRef.key}`)); // This deletes from Firebase
    };
    row.insertCell(6).appendChild(deleteButton);
  }

  // Listen for changes in Firebase and update the table
  onValue(cardsRef, (snapshot) => {
    const data = snapshot.val();
    console.log("Firebase Data:", data); // Debug log
    if (!data) return;

    // Clear the table before re-rendering
    cardTable.innerHTML = ''; 

    // Render all the cards in Firebase to the table
    Object.entries(data).forEach(([cardId, card]) => {
      addCardToTable(card); // Add each card to the table
    });
  });
});
