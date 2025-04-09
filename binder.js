import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// Initialize Firebase app and get a reference to the database
const db = getDatabase();
const cardsRef = ref(db, 'cards');

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('binderContainer');

  // Listen for card data from Firebase
  onValue(cardsRef, (snapshot) => {
    container.innerHTML = ''; // Clear old entries
    const data = snapshot.val();
    if (!data) {
      container.innerHTML = 'No cards found.';
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
