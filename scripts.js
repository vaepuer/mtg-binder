// scripts.js
import {  getDatabase,  ref,  push,  set,  remove} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import {  getAuth,  onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {  initializeApp,  getApps} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

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

// Initialize Firebase once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);
const auth = getAuth(app);

// Wait for auth state
onAuthStateChanged(auth, (user) => {
  if (!user) {
    // Not logged in
    window.location.href = "login.html"; // Or your login page
  } else {
    // Logged in
    console.log("User is logged in:", user.uid);
    window.location.href = "index.html"; // Redirect to your app
  }

  const cardsRef = ref(db, 'cards');

  document.addEventListener('DOMContentLoaded', () => {
    const addCardForm = document.getElementById('cardForm');

    if (!addCardForm) {
      console.error('Form not found!');
      return;
    }

    addCardForm.addEventListener('submit', (event) => {
      event.preventDefault();

      const cardName = document.getElementById('cardNameInput').value.trim();
      const cardQuantity = parseInt(document.getElementById('cardQuantityInput')?.value || "1", 10);
      const cardTreatment = document.getElementById('treatmentSelect')?.value || "";
      const cardSetCode = document.getElementById('setCodeInput')?.value || "";
      const cardCollectorNumber = document.getElementById('collectorNumberInput')?.value || "";

      if (!cardName || isNaN(cardQuantity)) {
        alert('Please enter a valid card name and quantity.');
        return;
      }

      const newCard = {
        name: cardName,
        quantity: cardQuantity,
        treatment: cardTreatment,
        setCode: cardSetCode,
        collectorNumber: cardCollectorNumber,
        userId: user.uid
      };

      const newCardRef = push(cardsRef);
      set(newCardRef, newCard)
        .then(() => {
          console.log("Card added!");
          addCardForm.reset();
        })
        .catch((error) => {
          console.error("Error adding card:", error);
        });
    });
  });
});
