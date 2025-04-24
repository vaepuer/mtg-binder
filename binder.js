import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAia2iO0Qx7AmJxXlbG5BK60VRJSZ2Srh8",
  authDomain: "tgbinder-8e3c6.firebaseapp.com",
  databaseURL: "https://tgbinder-8e3c6-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "tgbinder-8e3c6",
  storageBucket: "tgbinder-8e3c6.appspot.com",
  messagingSenderId: "903450561301",
  appId: "1:903450561301:web:df2407af369db0895bb71c",
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// ✅ Wait for DOM & Auth to be ready
document.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      console.log("User not logged in.");
      return;
    }
  
    // ✅ SHARE BUTTON LOGIC
    const shareBtn = document.getElementById("shareBinderBtn");
    if (shareBtn) {
      shareBtn.addEventListener("click", () => {
        const shareUrl = `${window.location.origin}/public-binder.html?uid=${user.uid}`;
        navigator.clipboard.writeText(shareUrl)
          .then(() => alert("📎 Shareable binder link copied to clipboard!"))
          .catch(() => alert("❌ Could not copy link"));
      });
    }
  
    const cardsRef = ref(db, `cards/${user.uid}`);
    const container = document.getElementById('binderContainer');
  
    if (!container) {
      console.error('binderContainer not found!');
      return;
    }
  
    console.log('binderContainer found!', container);
  
    // ✅ Firebase onValue listener
    onValue(cardsRef, (snapshot) => {
      const data = snapshot.val();
      container.innerHTML = '';
      console.log('Firebase data:', data);
  
      if (!data) {
        container.innerHTML = 'No cards found.';
        return;
      }
  
      Object.entries(data).forEach(([cardId, card]) => {
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
        const normalizedCollector = rawCollector ? rawCollector.toString().replace(/^0+/, '') : null;
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
  
});
