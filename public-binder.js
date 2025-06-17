import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { firebaseConfig } from "./firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const params = new URLSearchParams(window.location.search);
const username = params.get('username');
const uid = params.get('uid');

// Resolve the UID from the username or UID query parameter
async function resolveUid() {
  if (uid) return uid;
  if (username) {
    const snap = await get(ref(db, `usernames/${username}`));
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

  // Fetch username for the banner display
  const usernameRef = ref(db, `users/${resolvedUid}/username`);
  const usernameSnap = await get(usernameRef);
  const usernameToDisplay = usernameSnap.exists() ? usernameSnap.val() : "Unknown User";
  document.getElementById('username').textContent = usernameToDisplay;

  // Load and display cards
  loadBinderForUser(resolvedUid);
});

// Load the user's cards from Firebase
function loadBinderForUser(uid) {
  const cardsRef = ref(db, `cards/${uid}`);
  const container = document.getElementById('binderContainer');

  if (!container) {
    console.error('❌ binderContainer not found!');
    return;
  }

  container.innerHTML = 'Loading cards...';

  get(cardsRef).then(snapshot => {
    const data = snapshot.val();
    container.innerHTML = '';

    if (!data) {
      container.innerHTML = 'No cards found.';
      return;
    }

    // Loop through the cards and display them
    Object.entries(data).forEach(([cardId, card]) => {
      const cardBox = document.createElement('div');
      cardBox.className = 'card-box';

      const quantity = document.createElement('div');
      quantity.className = 'quantity-badge';
      quantity.textContent = `x${card.quantity}`;

      const treatment = document.createElement('div');
      treatment.className = 'foil-badge';
      let treatmentText = 'Non-Foil';
      let treatmentClass = '';
      let treatmentDisplay = true;  // A flag to control whether we show the treatment or not

      // Map treatment to class and text
      switch (card.treatment) {
        case 'PRM':
          treatmentText = 'Pre-Modern';
          treatmentClass = 'PRM';
          break;
        case 'TRA':
          treatmentText = 'Traditional';
          treatmentClass = 'TRA';
          break;
        case 'FTV':
          treatmentText = 'From the Vault';
          treatmentClass = 'FTV';
          break;
        case 'FET':
          treatmentText = 'Foil-Etched';
          treatmentClass = 'FET';
          break;
        case 'GET':
          treatmentText = 'Gold-Etched';
          treatmentClass = 'GET';
          break;
        case 'TEX':
          treatmentText = 'Textured Foil';
          treatmentClass = 'TEX';
          break;
        case 'AMP':
          treatmentText = 'Ampersand Foil';
          treatmentClass = 'AMP';
          break;
        case 'SIL':
          treatmentText = 'Silverscreen Foil';
          treatmentClass = 'SIL';
          break;
        case 'NEON':
          treatmentText = 'Neon Ink';
          treatmentClass = 'NEON';
          break;
        case 'GIL':
          treatmentText = 'Gilded Foil';
          treatmentClass = 'GIL';
          break;
        case 'GAL':
          treatmentText = 'Galaxy Foil';
          treatmentClass = 'GAL';
          break;
        case 'SUR':
          treatmentText = 'Surge Foil';
          treatmentClass = 'SUR';
          break;
        case 'DBR':
          treatmentText = 'Double Rainbow';
          treatmentClass = 'DBR';
          break;
        case 'SCT':
          treatmentText = 'Step-and-Compleat Foil';
          treatmentClass = 'SCT';
          break;
        case 'OSR':
          treatmentText = 'Oil Slick Raised Foil';
          treatmentClass = 'OSR';
          break;
        case 'HAL':
          treatmentText = 'Halo Foil';
          treatmentClass = 'HAL';
          break;
        case 'RAI':
          treatmentText = 'Rainbow Foil';
          treatmentClass = 'RAI';
          break;
        case 'RIP':
          treatmentText = 'Ripple Foil';
          treatmentClass = 'RIP';
          break;
        case 'FRA':
          treatmentText = 'Fracture Foil';
          treatmentClass = 'FRA';
          break;
        case 'MAN':
          treatmentText = 'Mana Foil';
          treatmentClass = 'MAN';
          break;
        case 'FIR':
          treatmentText = 'First Place Foil';
          treatmentClass = 'FIR';
          break;
        default:
          treatmentText = 'Non-Foil';
          treatmentClass = '';
          treatmentDisplay = false;  // Hide Non-Foil badge
          break;
      }

      treatment.textContent = treatmentText;
      if (treatmentClass) {
        treatment.classList.add(treatmentClass);
      }

      // If the treatment is Non-Foil, don't add it to the card display
      if (treatmentDisplay) {
        cardBox.appendChild(treatment);
      }

      const img = document.createElement('img');
      const name = card.name;
      const set = card.setCode?.toLowerCase();
      const collector = card.collectorNumber?.toString().replace(/^0+/, '');
      const fallbackUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}&set=${set}`;

      if (collector && set) {
        fetch(`https://api.scryfall.com/cards/${set}/${collector}`)
          .then(res => res.ok ? res.json() : fetch(fallbackUrl).then(r => r.json()))
          .then(data => {
            img.src = data.image_uris?.normal || data.card_faces?.[0]?.image_uris?.normal || '';
          });
      } else {
        fetch(fallbackUrl).then(r => r.json()).then(data => {
          img.src = data.image_uris?.normal || data.card_faces?.[0]?.image_uris?.normal || '';
        });
      }

      img.alt = name;

      // Create the Search button
      const searchButton = document.createElement('button');
      searchButton.className = 'button';
      searchButton.textContent = 'Search';
      
      // When the search button is clicked, open Cardmarket in a new tab
      searchButton.onclick = () => {
        const url = `https://www.cardmarket.com/en/Magic/Products/Search?searchString=${encodeURIComponent(name)}&setName=${encodeURIComponent(card.setCode)}`;
        window.open(url, '_blank');
      };

      // Append the search button to the card
      cardBox.appendChild(quantity);
      cardBox.appendChild(img);
      cardBox.appendChild(searchButton);

      // Append the cardBox to the container
      container.appendChild(cardBox);
    });
  }).catch(err => {
    console.error("Error loading cards:", err);
    container.innerHTML = "Error loading cards.";
  });
}
