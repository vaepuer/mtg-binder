import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, push, set, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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
  const container = document.getElementById('cardTableWrapper');
  const addCardForm = document.getElementById('cardForm');
  const cardTable = document.getElementById('cardTable').getElementsByTagName('tbody')[0];

  // Ensure the table is available before proceeding
  if (!container) {
    console.error('cardTableWrapper not found!');
    return;
  }

  // Listen for card data from Firebase
  onValue(cardsRef, (snapshot) => {
    const data = snapshot.val();
    console.log('Firebase Data:', data);  // Debugging: Check the data from Firebase

    // Clear the table before re-populating
    cardTable.innerHTML = '';

    if (!data) {
      console.log('No data found.');
      return;
    }

    Object.entries(data).forEach(([cardId, card]) => {
      // Create a row for the card
      const row = cardTable.insertRow();
      const nameCell = row.insertCell(0);
      const setCell = row.insertCell(1);
      const treatmentCell = row.insertCell(2);
      const quantityCell = row.insertCell(3);
      const collectorCell = row.insertCell(4);
      const searchCell = row.insertCell(5);
      const deleteCell = row.insertCell(6);

      // Set cell contents
      nameCell.textContent = card.name;
      setCell.textContent = card.setCode;
      treatmentCell.textContent = card.treatment || 'Non-Foil';
      quantityCell.textContent = card.quantity;
      collectorCell.textContent = card.collectorNumber || 'N/A';

      // Create and append the delete button
      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'Delete';
      deleteButton.classList.add('delete-button');
      deleteButton.onclick = () => {
        deleteCard(cardId);  // Delete the card from Firebase
      };
      deleteCell.appendChild(deleteButton);
    });
  });

  // Form submission to add new card
  addCardForm.addEventListener('submit', (event) => {
    event.preventDefault(); // Prevent form submission

    const cardName = document.getElementById('cardNameInput').value;
    const cardQuantity = parseInt(document.getElementById('cardQuantityInput').value, 10);
    const cardTreatment = document.getElementById('treatmentSelect').value;
    const cardSetCode = document.getElementById('setCodeInput').value; // Assuming this input is present in the form
    const cardCollectorNumber = document.getElementById('collectorNumberInput').value; // Assuming this input is present in the form
    const auth = getAuth();
    const user = auth.currentUser;
    const userId = user ? user.uid : null;

    if (cardName && cardQuantity) {
      const newCard = {
        name: cardName,
        quantity: cardQuantity,
        treatment: cardTreatment,
        setCode: cardSetCode,
        collectorNumber: cardCollectorNumber,
        userId: auth.currentUser.uid  // Add the userId to the card data
      };

      // Add card to Firebase
      const newCardRef = push(cardsRef);
      set(newCardRef, newCard)
        .then(() => {
          console.log("Card added successfully!");
          addNewCardToTable(newCard, newCardRef.key); // Add the card to the table with its unique ID
          addCardForm.reset();
        })
        .catch(error => {
          console.error("Error adding card: ", error);
        });
    }
  });

  // Function to delete card from Firebase
  function deleteCard(cardId) {
    const cardRef = ref(db, 'cards/' + cardId);
    remove(cardRef)
      .then(() => {
        console.log('Card deleted successfully!');
        removeCardFromTable(cardId); // Remove the card row from the table
      })
      .catch((error) => {
        console.error('Error deleting card:', error);
      });
  }

  // Function to remove the card from the table
  function removeCardFromTable(cardId) {
    const rows = cardTable.getElementsByTagName('tr');
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const firstCell = row.cells[0];
      if (firstCell && firstCell.textContent === cardId) {
        row.remove();
        break;
      }
    }
  }

  // Function to update the table with a new card
  function addNewCardToTable(card, cardId) {
    const row = cardTable.insertRow();
    const nameCell = row.insertCell(0);
    const setCell = row.insertCell(1);
    const treatmentCell = row.insertCell(2);
    const quantityCell = row.insertCell(3);
    const collectorCell = row.insertCell(4);
    const searchCell = row.insertCell(5);
    const deleteCell = row.insertCell(6);

    // Set cell contents
    nameCell.textContent = card.name;
    setCell.textContent = card.setCode;
    treatmentCell.textContent = card.treatment || 'Non-Foil';
    quantityCell.textContent = card.quantity;
    collectorCell.textContent = card.collectorNumber || 'N/A';

    // Create and append the delete button
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.classList.add('delete-button');
    deleteButton.onclick = () => {
      deleteCard(cardId);  // Delete the card from Firebase
    };
    deleteCell.appendChild(deleteButton);
  }
});
