
  // ---------------- Firebase Imports ----------------
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
  import { getDatabase, ref, onValue, set, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
  import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

  // ---------------- Firebase Config ----------------
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

  // ---------------- Small Utilities ----------------
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // map treatment codes → {text, class, show}
  function mapTreatment(code) {
    const map = {
      PRM: ["Pre-Modern", "PRM"],
      TRA: ["Traditional", "TRA"],
      FTV: ["From the Vault", "FTV"],
      FET: ["Foil-Etched", "FET"],
      GET: ["Gold-Etched", "GET"],
      TEX: ["Textured Foil", "TEX"],
      AMP: ["Ampersand Foil", "AMP"],
      SIL: ["Silverscreen Foil", "SIL"],
      NEON: ["Neon Ink", "NEON"],
      GIL: ["Gilded Foil", "GIL"],
      GAL: ["Galaxy Foil", "GAL"],
      SUR: ["Surge Foil", "SUR"],
      DBR: ["Double Rainbow", "DBR"],
      SCT: ["Step-and-Compleat Foil", "SCT"],
      OSR: ["Oil Slick Raised Foil", "OSR"],
      HAL: ["Halo Foil", "HAL"],
      RAI: ["Rainbow Foil", "RAI"],
      RIP: ["Ripple Foil", "RIP"],
      FRA: ["Fracture Foil", "FRA"],
      MAN: ["Mana Foil", "MAN"],
      FIR: ["First Place Foil", "FIR"],
    };
    if (!code || !map[code]) return { text: "Non-Foil", className: "", show: false };
    const [text, className] = map[code];
    return { text, className, show: true };
  }

  // Build a consistent cache key for a binder card entry
  function cacheKeyFor(card) {
    const set = (card.setCode || "").toLowerCase();
    const number = card.collectorNumber ? String(card.collectorNumber).replace(/^0+/, "") : "";
    return number && set ? `set:${set}|num:${number}` : `name:${card.name}|set:${set}`;
  }

  // Build a Scryfall "identifier" for /cards/collection
  function buildIdentifier(card) {
    const set = (card.setCode || "").toLowerCase();
    const number = card.collectorNumber ? String(card.collectorNumber).replace(/^0+/, "") : "";
    if (set && number) return { set, number };      // precise print
    const ident = { name: card.name };              // fallback
    if (set) ident.set = set;
    return ident;
  }

  function getBestImage(cardObj) {
    return (
      cardObj?.image_uris?.normal ||
      cardObj?.card_faces?.[0]?.image_uris?.normal ||
      cardObj?.image_uris?.large ||
      cardObj?.card_faces?.[0]?.image_uris?.large ||
      ""
    );
  }

  // ---------------- Simple Cache (mem + localStorage) ----------------
  const cardCacheMem = new Map();
  function cacheGet(key) {
    if (cardCacheMem.has(key)) return cardCacheMem.get(key);
    try {
      const raw = localStorage.getItem("scryfall:" + key);
      if (raw) {
        const val = JSON.parse(raw);
        cardCacheMem.set(key, val);
        return val;
      }
    } catch {}
    return null;
  }
  function cacheSet(key, val) {
    cardCacheMem.set(key, val);
    try { localStorage.setItem("scryfall:" + key, JSON.stringify(val)); } catch {}
  }

  // ---------------- Batched Scryfall Fetcher ----------------
async function fetchScryfallBatches(identifiers) {
  const CHUNK = 75;
  const out = new Map();

  const chunks = [];

  for (let i = 0; i < identifiers.length; i += CHUNK) {
    chunks.push(identifiers.slice(i, i + CHUNK));
  }

  for (let idx = 0; idx < chunks.length; idx++) {
    const body = {
      identifiers: chunks[idx]
    };

    while (true) {
      const res = await fetch(
        "https://api.scryfall.com/cards/collection",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        }
      );

      // Rate limited
      if (res.status === 429) {
        const retryAfter = Number(
          res.headers.get("Retry-After") || 1
        );

        await sleep(retryAfter * 1000);
        continue;
      }

      // Other error
      if (!res.ok) {
        console.error(
          "Scryfall error:",
          res.status,
          await res.text()
        );

        break;
      }

      const data = await res.json();

      for (const card of data.data || []) {

        // ---------------------------------------
        // DEBUG: See exactly what Scryfall returns
        // ---------------------------------------
        console.log("SCRYFALL CARD:", {
          id: card.id,
          name: card.name,
          set: card.set,
          set_name: card.set_name,
          collector_number: card.collector_number,
          finishes: card.finishes,
          promo: card.promo,
          promo_types: card.promo_types,
          frame_effects: card.frame_effects,
          border_color: card.border_color
        });

        // Specifically highlight HOB 0297
        if (
          card.set?.toLowerCase() === "hob" &&
          String(card.collector_number).replace(/^0+/, "") === "297"
        ) {
          console.log(
            "FOUND HOB 0297:",
            card
          );
        }

        const key =
          card.collector_number && card.set
            ? `set:${card.set.toLowerCase()}|num:${String(
                card.collector_number
              ).replace(/^0+/, "")}`
            : `name:${card.name}|set:${(
                card.set || ""
              ).toLowerCase()}`;

        out.set(key, card);
      }

      // Gentle pacing between Scryfall requests
      await sleep(150);

      break;
    }
  }

  return out;
}

  // ---------------- Main Page Flow ----------------
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

    resolveUid().then(async (targetUid) => {
      // Display username
      let usernameToDisplay = queryUsername;
      if (!usernameToDisplay) {
        try {
          const snapshot = await get(ref(db, `users/${targetUid}/username`));
          if (snapshot.exists()) {
            usernameToDisplay = snapshot.val();
          } else {
            console.error("Username not found in database.");
          }
        } catch (err) {
          console.error("Error fetching username:", err);
        }
      }
      const usernameEl = document.getElementById('username');
      if (usernameEl) usernameEl.textContent = usernameToDisplay || "";

      // Load binder for this user
      loadBinderForUser(targetUid);

      // Enable share controls only if viewing your own binder
      onAuthStateChanged(auth, (user) => {
        if (user && user.uid === targetUid) {
          enableShareControls(user);
        }
      });
    }).catch((err) => {
      console.warn("Redirecting to login due to:", err);
      location.href = `${basePath}/login.html`;
    });
  });

  // ---------------- Binder Rendering (BATCHED) ----------------
  function loadBinderForUser(uid) {
    const cardsRef = ref(db, `cards/${uid}`);
    const container = document.getElementById('binderContainer');

    if (!container) {
      console.error('❌ binderContainer not found!');
      return;
    }

    container.innerHTML = 'Loading cards...';

    onValue(cardsRef, async (snapshot) => {
      const data = snapshot.val();
      container.innerHTML = '';

      if (!data) {
        container.innerHTML = 'No cards found.';
        return;
      }

      // Prepare identifiers & determine what we need to fetch
      const entries = Object.entries(data);
      const identifiers = [];
      const keyForIndex = []; // ordered mapping for render

      for (const [cardId, card] of entries) {
        const key = cacheKeyFor(card);
        keyForIndex.push({ cardId, card, key });
        if (!cacheGet(key)) identifiers.push(buildIdentifier(card));
      }

      // Fetch batches for uncached ones
      if (identifiers.length) {
        try {
          const fetchedMap = await fetchScryfallBatches(identifiers);
          // Persist fetched into cache
          for (const { key } of keyForIndex) {
            if (!cacheGet(key) && fetchedMap.has(key)) {
              cacheSet(key, fetchedMap.get(key));
            }
          }
        } catch (e) {
          console.error("Batch fetch failed", e);
        }
      }

      // Render cards
      for (const { card, key } of keyForIndex) {
        const cardBox = document.createElement('div');
        cardBox.className = 'card-box';

        const quantity = document.createElement('div');
        quantity.className = 'quantity-badge';
        quantity.textContent = `x${card.quantity ?? 1}`;

        // treatment badge
        const { text: tText, className: tClass, show } = mapTreatment(card.treatment);
        if (show) {
          const treatment = document.createElement('div');
          treatment.className = 'foil-badge';
          treatment.textContent = tText;
          if (tClass) treatment.classList.add(tClass);
          cardBox.appendChild(treatment);
        }

        // image
        const img = document.createElement('img');
        img.alt = card.name;

        const sf = cacheGet(key);
        if (sf) {
          img.src = getBestImage(sf);
        } else {
          // Very rare fallback if batch missed
          const set = (card.setCode || "").toLowerCase();
          const number = card.collectorNumber ? String(card.collectorNumber).replace(/^0+/, "") : "";
          const url = number && set
            ? `https://api.scryfall.com/cards/${set}/${number}`
            : (() => {
                const u = new URL("https://api.scryfall.com/cards/named");
                u.searchParams.set("exact", card.name);
                if (set) u.searchParams.set("set", set);
                return u.toString();
              })();
          try {
            await sleep(120); // spacing
            const res = await fetch(url);
            if (res.status === 429) {
              const retryAfter = Number(res.headers.get("Retry-After") || 1);
              await sleep(retryAfter * 1000);
              const res2 = await fetch(url);
              if (res2.ok) {
                const data2 = await res2.json();
                img.src = getBestImage(data2);
                cacheSet(key, data2);
              }
            } else if (res.ok) {
              const data = await res.json();
              img.src = getBestImage(data);
              cacheSet(key, data);
            }
          } catch (e) {
            console.warn("Fallback fetch failed", e);
          }
        }

      // cardmarket button
const button = document.createElement('button');
button.textContent = 'Search';
button.classList.add('button');

button.onclick = () => {
  const sf = cacheGet(key);

  if (!sf) {
    console.warn("No Scryfall data available");
    return;
  }

  const slugify = (text) =>
    text
      .replace(/'/g, "")
      .replace(/,/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  let cardmarketSet = slugify(sf.set_name);

  // Cardmarket exceptions
  if (
    sf.set?.toLowerCase() === "hob" &&
    Number(sf.collector_number) >= 200
  ) {
    cardmarketSet = "The-Hobbit-Extras";
  }

  const url =
    `https://www.cardmarket.com/en/Magic/Products/Singles/${cardmarketSet}/${slugify(sf.name)}`;

  console.log(url);

  window.open(url, "_blank");
};
             
        cardBox.appendChild(quantity);
        cardBox.appendChild(img);
        cardBox.appendChild(button);
        container.appendChild(cardBox);
      }
    });
  }

  // ---------------- Share Controls (unchanged) ----------------
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
  }
