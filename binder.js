import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, set, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
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

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const queryUsername = urlParams.get('username');
  const queryUid = urlParams.get('uid');

  const basePath = `${window.location.origin}/mtg-binder`;

  const resolveUid = () => {
    if (queryUsername) {
      return get(ref(db, `usernames/${queryUsername}`)).then(snap => {
        if (!snap.exists()) throw new Error("Username not found.");
        return snap.val();
      });
    } else if (queryUid) {
      return Promise.resolve(queryUid);
    } else {
      return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, (user) => {
          if (user) return resolve(user.uid);
          reject("Not logged in, and no username or uid provided.");
        });
      });
    }
  };

  resolveUid().then((targetUid) => {
  // Fetch the username for display in the banner
  let usernameToDisplay = queryUsername; // Fallback to username from URL if provided

  if (!usernameToDisplay) {
    // Fetch the username if the user is logged in
    get(ref(db, `users/${targetUid}/username`)).then((snapshot) => {
      if (snapshot.exists()) {
        usernameToDisplay = snapshot.val();
      } else {
        console.error("Username not found in database.");
      }

      // Update the banner
      document.getElementById('username').textContent = usernameToDisplay;
    }).catch(err => {
      console.error("Error fetching username:", err);
    });
  } else {
    // If username was passed in URL, update banner directly
    document.getElementById('username').textContent = usernameToDisplay;
  }

  // Load and display cards
  loadBinderForUser(targetUid);

  // If logged in and viewing own binder, enable share functionality
  onAuthStateChanged(auth, (user) => {
    if (user && user.uid === targetUid) {
      enableShareControls(user);
    }
  });
}).catch((err) => {
  console.warn("Redirecting to login due to:", err);
  location.href = `${basePath}/login.html`;
});


// Load user's binder data from Firebase
function loadBinderForUser(uid) {
  const cardsRef = ref(db, `cards/${uid}`);
  const container = document.getElementById('binderContainer');

  if (!container) {
    console.error('❌ binderContainer not found!');
    return;
  }

  container.innerHTML = 'Loading cards...';

  onValue(cardsRef, (snapshot) => {
    const data = snapshot.val();
    container.innerHTML = '';

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
      treatment.textContent = card.treatment === 'F' ? 'Foil' :
                              card.treatment === 'PF' ? 'Piss Foil' : 'Non-Foil';
      if (card.treatment === 'F') treatment.classList.add('f');
      if (card.treatment === 'PF') treatment.classList.add('pf');

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
}

// Enable share functionality for logged-in users
function enableShareControls(user) {
  const shareBtn = document.getElementById("shareBinderBtn");
  if (!shareBtn) return;

  shareBtn.addEventListener("click", async () => {
    const usernameSnap = await get(ref(db, `users/${user.uid}/username`));
    const basePath = `${window.location.origin}/mtg-binder`;
    const shareUrl = usernameSnap.exists()
      ? `${basePath}/public-binder.html?username=${usernameSnap.val()}`
      : `${basePath}/public-binder.html?uid=${user.uid}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("📎 Shareable binder link copied to clipboard!");
    } catch {
      fallbackCopyToClipboard(shareUrl);
    }
  });

  function fallbackCopyToClipboard(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      const successful = document.execCommand("copy");
      alert(successful ? "📎 Link copied (fallback)!" : "❌ Copy failed.");
    } catch (err) {
      alert("❌ Copy failed.");
    }
    document.body.removeChild(textarea);
  }
}})
