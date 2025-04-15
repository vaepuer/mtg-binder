import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  initializeApp,
  getApps
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  remove
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { firebaseConfig } from "./firebaseConfig.js";

// Init Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getDatabase(app);

// ✅ LOGOUT BUTTON FUNCTIONALITY
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      signOut(auth)
        .then(() => {
          console.log("User signed out.");
          window.location.href = "login.html";
        })
        .catch((error) => {
          console.error("Logout error:", error);
        });
    });
  } else {
    console.warn("Logout button not found.");
  }
});
// Fetch & display cards
function fetchCards(uid) {
  const cardTable = document.getElementById("cardTable")?.getElementsByTagName("tbody")[0];
  if (!cardTable) return;

  onValue(cardsRef, (snapshot) => {
    const data = snapshot.val();
    cardTable.innerHTML = ""; // Clear previous table content

    if (!data) {
      console.log("No cards found for user:", uid);
      return;
    }

    // Iterate over all cards and display those belonging to the logged-in user
    Object.entries(data || {}).forEach(([cardId, card]) => {
      console.log("Card Data:", card);  // Log the card data
    
      if (card.userId === uid) {
        const row = cardTable.insertRow();
        row.innerHTML = `
          <td>${card.name}</td>
          <td>${card.setCode}</td>
          <td>${card.treatment || "Non-Foil"}</td>
          <td>${card.quantity}</td>
          <td>${card.collectorNumber || "N/A"}</td>
          <td><button class="delete-button" data-id="${cardId}">Delete</button></td>
        `;
    
        row.querySelector(".delete-button").addEventListener("click", () => {
          remove(ref(db, `cards/${cardId}`));
        });
      }
    });    
  });
}
