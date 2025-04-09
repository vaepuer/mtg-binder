import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// 🔥 Your Firebase config (replace these with your actual values)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('binderContainer');

  // Add a loading message
  const loadingMessage = document.createElement('p');
  loadingMessage.textContent = 'Loading cards...';
  loadingMessage.style.fontWeight = 'bold';
  loadingMessage.style.marginTop = '20px';
  container.appendChild(loadingMessage);

  const cardsRef = ref(db, 'cards');

  // Listen for card data from Firebase
  onValue(cardsRef, (snapshot) => {
    container.innerHTML = ''; // Clear any existing content (including loading)
    const data = snapshot.val();

    if (!data) {
      const emptyMessage = document.createElement('p');
      emptyMessage.textContent = 'No cards yet!';
      emptyMessage.style.fontStyle = 'italic';
      emptyMessage.style.marginTop = '20px';
      container.appendChild(emptyMessage);
      return;
    }

    Object.values(data).forEach(card => {
      const cardBox = document.createElement('div');
      cardBox.className = 'card-box';

      const quantity = document.createElement('div');
      quantity.className = 'quantity-badge';
      quantity.textContent = `x${card.quantity}`;

      const treatment = document.createElement('div');
      treatment.className = 'foil-badge';
      if (card.treatment === 'F') {
        treatment.textContent = 'Foil';
        treatment.classList.add('f');
      } else if (card.treatment === 'PF') {
        treatment.textContent = 'Piss Foil';
        treatment.classList.add('pf');
      } else {
        treatment.textContent = 'Non-Foil';
      }

      if (card.collectorNumber) {
        const collectorBadge = document.createElement('div');
        collectorBadge.className = 'collector-badge';
        collectorBadge.textContent = `#${card.collectorNumber}`;
        cardBox.appendChild(collectorBadge);
      }

      const img = document.createElement('img');
      const name = card.name;
      const set = card.setCode?.toLowerCase();
      const rawCollector = card.collectorNumber;
      const normalizedCollector = rawCollector ? rawCollector.replace(/^0+/, '') : null;
      const fallbackUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}&set=${set}`;

      const fetchCardImage = () => {
        if (normalizedCollector && set) {
          const url = `https://api.scryfall.com/cards/${set}/${normalizedCollector}`;
          fetch(url)
            .then(res => {
              if (!res.ok) throw new Error('Fallback');
              return res.json();
            })
            .then(data => {
              img.src = data.image_uris?.normal || data.card_faces?.[0]?.image_uris?.normal || '';
            })
            .catch(() => {
              fetch(fallbackUrl)
                .then(res => res.json())
                .then(data => {
                  img.src = data.image_uris?.normal || data.card_faces?.[0]?.image_uris?.normal || '';
                });
            });
        } else {
          fetch(fallbackUrl)
            .then(res => res.json())
            .then(data => {
              img.src = data.image_uris?.normal || data.card_faces?.[0]?.image_uris?.normal || '';
            });
        }
      };

      fetchCardImage();
      img.alt = name;

      const button = document.createElement('button');
      button.textContent = 'Search';
      button.classList.add('button');
      button.onclick = () => {
        const url = `https://www.cardmarket.com/en/Magic/Products/Search?searchString=${encodeURIComponent(name)}&setName=${encodeURIComponent(card.setCode)}`;
        window.open(url, '_blank');
      };

      cardBox.appendChild(quantity);
      cardBox.appendChild(treatment);
      cardBox.appendChild(img);
      cardBox.appendChild(button);
      container.appendChild(cardBox);
    });
  });
});
