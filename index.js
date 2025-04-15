import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  remove
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { firebaseConfig } from "./firebaseConfig.js";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getDatabase(app);
const cardsRef = ref(db, "cards");

// 🔐 Auth state check
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  fetchCards(user.uid);
  setupCardForm(user.uid);

  const logoutBtn = document.getElementById("logoutButton");
  if (logoutBtn) {
    logoutBtn.style.display = "inline-block"; // optional
    logoutBtn.addEventListener("click", () => {
      signOut(auth)
        .then(() => {
          window.location.href = "login.html";
        })
        .catch((err) => console.error("Logout failed:", err));
    });
  }
});

// 🧾 Setup card form submission
function setupCardForm(uid) {
  const form = document.getElementById("cardForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("cardNameInput")?.value.trim();
    const quantity = parseInt(document.getElementById("cardQuantityInput")?.value || "1", 10);
    const treatment = document.getElementById("treatmentSelect")?.value || "";
    const setCode = document.getElementById("setCodeInput")?.value || "";
    const collectorNumber = document.getElementById("collectorNumberInput")?.value || "";

    if (!name || isNaN(quantity)) {
      alert("Please enter a valid card name and quantity.");
      return;
    }

    const newCard = {
      name,
      quantity,
      treatment,
      setCode,
      collectorNumber,
      userId: uid
    };

    const newCardRef = push(cardsRef);
    set(newCardRef, newCard)
      .then(() => {
        console.log("✅ Card added:", newCard.name);
        form.reset();
      })
      .catch((err) => {
        console.error("❌ Failed to add card:", err);
      });
  });
}

// 📦 Fetch & render cards
function fetchCards(uid) {
  const cardTable = document.getElementById("cardTable")?.getElementsByTagName("tbody")[0];
  if (!cardTable) return;

  onValue(cardsRef, (snapshot) => {
    const data = snapshot.val();
    cardTable.innerHTML = "";

    if (!data) {
      const row = cardTable.insertRow();
      row.innerHTML = `<td colspan="6">No cards found.</td>`;
      return;
    }

    Object.entries(data).forEach(([cardId, card]) => {
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

        row.querySelector(".delete-button")?.addEventListener("click", () => {
          remove(ref(db, `cards/${cardId}`))
            .then(() => console.log(`🗑️ Card ${card.name} deleted.`))
            .catch((err) => console.error("Failed to delete card:", err));
        });
      }
    });
  });
}
