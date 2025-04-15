import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, onValue, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

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
const auth = getAuth(app);
const cardsRef = ref(db, 'cards');

// DOM elements
const loginForm = document.getElementById('loginForm');
const cardContent = document.getElementById('cardContent');
const cardTable = document.getElementById('cardTable').getElementsByTagName('tbody')[0];
const loginButton = document.getElementById('loginButton');
const errorMessage = document.getElementById('errorMessage');
const openBinderButton = document.getElementById('openBinderButton');

// Login event listener
loginButton.addEventListener('click', (e) => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      console.log("Logged in as:", user.email);

      // Hide login form and show card content
      loginForm.style.display = 'none';
      cardContent.style.display = 'block';
      openBinderButton.style.display = 'block';  // Show the "Go to Binder" button

      // Fetch cards
      fetchCards(user.uid);
    })
    .catch((error) => {
      errorMessage.textContent = error.message;
    });
});

// Handle authentication state change
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User is logged in:", user.uid);
    // Hide login form and show card content
    loginForm.style.display = 'none';
    cardContent.style.display = 'block';
    openBinderButton.style.display = 'block'; // Show the "Go to Binder" button
    fetchCards(user.uid);  // Pass the logged-in user's UID
  } else {
    console.log("No user logged in");
    loginForm.style.display = 'block';
    cardContent.style.display = 'none';
    openBinderButton.style.display = 'none'; // Hide the "Go to Binder" button when logged out
  }
});

// Fetch cards and display them
function fetchCards(userId) {
  onValue(cardsRef, (snapshot) => {
    const data = snapshot.val();
    cardTable.innerHTML = ''; // Clear previous table

    if (!data) {
      console.log("No cards found for user:", userId);
      return;
    }

    // Iterate over all cards and display those belonging to the logged-in user
    Object.entries(data).forEach(([cardId, card]) => {
      if (card.userId === userId) { // Only show the logged-in user's cards
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
      }
    });
  });
}
