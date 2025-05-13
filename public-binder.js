import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { firebaseConfig } from "./firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const params = new URLSearchParams(window.location.search);
const username = params.get('username');
const uid = params.get('uid');

async function resolveUid() {
  if (uid) return uid;
  if (username) {
    const snap = await get(ref(db, `usernames/${username.toLowerCase()}`));
    return snap.exists() ? snap.val() : null;
  }
  return null;
}

document.addEventListener("DOMContentLoaded", async () => {
  const resolvedUid = await resolveUid();
  if (!resolvedUid) {
    document.body.innerHTML = "<p>User not found.</p>";
    return;
  }

  const cardsSnap = await get(ref(db, `cards/${resolvedUid}`));
  if (!cardsSnap.exists()) {
    document.body.innerHTML = "<p>No cards found.</p>";
    return;
  }

  const cards = cardsSnap.val();
  const container = document.getElementById("binderContainer");

  Object.entries(cards).forEach(([cardId, card]) => {
    // Build UI elements (same as your binder.js)
    const cardBox = document.createElement('div');
    cardBox.className = 'card-box';

    const quantity = document.createElement('div');
    quantity.className = 'quantity-badge';
    quantity.textContent = `x${card.quantity}`;

    const treatment = document.createElement('div');
    treatment.className = 'foil-badge';
    treatment.textContent = card.treatment === 'F' ? 'Foil' : 
                             card.treatment === 'PF' ? 'Piss Foil' : 'Non-Foil';

    const img = document.createElement('img');
    img.alt = card.name;
    const fetchUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}&set=${card.setCode}`;
    fetch(fetchUrl)
      .then(r => r.json())
      .then(d => {
        img.src = d.image_uris?.normal || d.card_faces?.[0]?.image_uris?.normal || '';
      });

    cardBox.appendChild(quantity);
    cardBox.appendChild(treatment);
    cardBox.appendChild(img);
    container.appendChild(cardBox);
  });
});
