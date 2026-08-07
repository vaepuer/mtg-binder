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

// ---------------- Initialize Firebase ----------------
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// ---------------- Small Utilities ----------------
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

  if (!code || !map[code]) {
    return {
      text: "Non-Foil",
      className: "",
      show: false,
    };
  }

  const [text, className] = map[code];

  return {
    text,
    className,
    show: true,
  };
}

// ---------------- Cache Key ----------------
function cacheKeyFor(card) {
  const setCode = (card.setCode || "").toLowerCase();

  const collectorNumber = card.collectorNumber
    ? String(card.collectorNumber).replace(/^0+/, "")
    : "";

  return collectorNumber && setCode
    ? `set:${setCode}|num:${collectorNumber}`
    : `name:${card.name}|set:${setCode}`;
}

// ---------------- Scryfall Identifier ----------------
function buildIdentifier(card) {
  const setCode = (card.setCode || "").toLowerCase();

  const collectorNumber = card.collectorNumber
    ? String(card.collectorNumber).replace(/^0+/, "")
    : "";

  if (setCode && collectorNumber) {
    return {
      set: setCode,
      collector_number: collectorNumber,
    };
  }

  const identifier = {
    name: card.name,
  };

  if (setCode) {
    identifier.set = setCode;
  }

  return identifier;
}

// ---------------- Scryfall Image ----------------
function getBestImage(cardObj) {
  return (
    cardObj?.image_uris?.normal ||
    cardObj?.card_faces?.[0]?.image_uris?.normal ||
    cardObj?.image_uris?.large ||
    cardObj?.card_faces?.[0]?.image_uris?.large ||
    ""
  );
}

// ---------------- Cache ----------------
const cardCacheMem = new Map();

function cacheGet(key) {
  if (cardCacheMem.has(key)) {
    return cardCacheMem.get(key);
  }

  try {
    const raw = localStorage.getItem("scryfall:" + key);

    if (raw) {
      const value = JSON.parse(raw);

      cardCacheMem.set(key, value);

      return value;
    }
  } catch (error) {
    console.warn("Could not read Scryfall cache:", error);
  }

  return null;
}

function cacheSet(key, value) {
  cardCacheMem.set(key, value);

  try {
    localStorage.setItem(
      "scryfall:" + key,
      JSON.stringify(value)
    );
  } catch (error) {
    console.warn("Could not write Scryfall cache:", error);
  }
}

// ---------------- Cardmarket Utilities ----------------
function cardmarketSlug(text) {
  if (!text) {
    return "";
  }

  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getCardmarketSetName(sf, firebaseCard) {
  const setCode = (
    sf?.set ||
    firebaseCard?.setCode ||
    ""
  ).toLowerCase();

  const rawCollector =
    sf?.collector_number ||
    firebaseCard?.collectorNumber ||
    "";

  const collectorNumber = parseInt(
    String(rawCollector).replace(/^0+/, ""),
    10
  );

  /*
    Cardmarket naming overrides.

    HOB cards in the higher collector-number range
    can belong to "The Hobbit Extras" on Cardmarket.

    HOB 0297:
    The Master of Lake-town
    -> The-Hobbit-Extras
  */
  if (
    setCode === "hob" &&
    Number.isFinite(collectorNumber) &&
    collectorNumber >= 200
  ) {
    return "The-Hobbit-Extras";
  }

  /*
    Default:
    use Scryfall set_name if available.
  */
  if (sf?.set_name) {
    return cardmarketSlug(sf.set_name);
  }

  /*
    Last-resort fallback.
  */
  return cardmarketSlug(firebaseCard?.setCode || "");
}

// ---------------- Batched Scryfall Fetcher ----------------
async function fetchScryfallBatches(identifiers) {
  const CHUNK = 75;
  const output = new Map();

  const chunks = [];

  for (let i = 0; i < identifiers.length; i += CHUNK) {
    chunks.push(
      identifiers.slice(i, i + CHUNK)
    );
  }

  for (let index = 0; index < chunks.length; index++) {
    const body = {
      identifiers: chunks[index],
    };

    while (true) {
      const response = await fetch(
        "https://api.scryfall.com/cards/collection",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (response.status === 429) {
        const retryAfter = Number(
          response.headers.get("Retry-After") || 1
        );

        console.warn(
          `Scryfall rate limited. Waiting ${retryAfter}s`
        );

        await sleep(retryAfter * 1000);

        continue;
      }

      if (!response.ok) {
        console.error(
          "Scryfall error:",
          response.status,
          await response.text()
        );

        break;
      }

      const data = await response.json();

      console.log(
        "Full Scryfall batch response:",
        data
      );

      for (const card of data.data || []) {
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
          border_color: card.border_color,
        });

        const cleanCollector = String(
          card.collector_number || ""
        ).replace(/^0+/, "");

        if (
          card.set?.toLowerCase() === "hob" &&
          cleanCollector === "297"
        ) {
          console.log(
            "FOUND HOB 0297 FULL OBJECT:",
            card
          );
        }

        const key =
          card.collector_number && card.set
            ? `set:${card.set.toLowerCase()}|num:${cleanCollector}`
            : `name:${card.name}|set:${(
                card.set || ""
              ).toLowerCase()}`;

        output.set(key, card);
      }

      await sleep(150);

      break;
    }
  }

  return output;
}

// ---------------- Main Page Flow ----------------
document.addEventListener(
  "DOMContentLoaded",
  () => {
    const urlParams = new URLSearchParams(
      window.location.search
    );

    const queryUsername =
      urlParams.get("username");

    const queryUid =
      urlParams.get("uid");

    const basePath =
      `${window.location.origin}/mtg-binder`;

    const resolveUid = () => {
      if (queryUsername) {
        return get(
          ref(db, `usernames/${queryUsername}`)
        ).then((snapshot) => {
          if (!snapshot.exists()) {
            throw new Error(
              "Username not found."
            );
          }

          return snapshot.val();
        });
      }

      if (queryUid) {
        return Promise.resolve(queryUid);
      }

      return new Promise(
        (resolve, reject) => {
          onAuthStateChanged(
            auth,
            (user) => {
              if (user) {
                resolve(user.uid);
                return;
              }

              reject(
                "Not logged in, and no username or uid provided."
              );
            }
          );
        }
      );
    };

    resolveUid()
      .then(async (targetUid) => {
        let usernameToDisplay =
          queryUsername;

        if (!usernameToDisplay) {
          try {
            const snapshot = await get(
              ref(
                db,
                `users/${targetUid}/username`
              )
            );

            if (snapshot.exists()) {
              usernameToDisplay =
                snapshot.val();
            } else {
              console.error(
                "Username not found in database."
              );
            }
          } catch (error) {
            console.error(
              "Error fetching username:",
              error
            );
          }
        }

        const usernameElement =
          document.getElementById(
            "username"
          );

        if (usernameElement) {
          usernameElement.textContent =
            usernameToDisplay || "";
        }

        loadBinderForUser(targetUid);

        onAuthStateChanged(
          auth,
          (user) => {
            if (
              user &&
              user.uid === targetUid
            ) {
              enableShareControls(user);
            }
          }
        );
      })
      .catch((error) => {
        console.warn(
          "Redirecting to login due to:",
          error
        );

        location.href =
          `${basePath}/login.html`;
      });
  }
);

// ---------------- Binder Rendering ----------------
function loadBinderForUser(uid) {
  const cardsRef = ref(
    db,
    `cards/${uid}`
  );

  const container =
    document.getElementById(
      "binderContainer"
    );

  if (!container) {
    console.error(
      "binderContainer not found!"
    );

    return;
  }

  container.innerHTML =
    "Loading cards...";

  onValue(
    cardsRef,
    async (snapshot) => {
      const data = snapshot.val();

      container.innerHTML = "";

      if (!data) {
        container.innerHTML =
          "No cards found.";

        return;
      }

      const entries =
        Object.entries(data);

      const identifiers = [];

      const keyForIndex = [];

      // ---------------- Prepare Fetches ----------------
      for (
        const [cardId, card] of entries
      ) {
        const key =
          cacheKeyFor(card);

        keyForIndex.push({
          cardId,
          card,
          key,
        });

        const cached =
          cacheGet(key);

        console.log(
          "Card cache check:",
          {
            name: card.name,
            key,
            cached: !!cached,
          }
        );

        if (!cached) {
          identifiers.push(
            buildIdentifier(card)
          );
        }
      }

      console.log(
        "Scryfall identifiers to fetch:",
        identifiers
      );

      // ---------------- Fetch Missing Cards ----------------
      if (identifiers.length) {
        try {
          const fetchedMap =
            await fetchScryfallBatches(
              identifiers
            );

          for (
            const { key } of keyForIndex
          ) {
            if (
              !cacheGet(key) &&
              fetchedMap.has(key)
            ) {
              cacheSet(
                key,
                fetchedMap.get(key)
              );
            }
          }
        } catch (error) {
          console.error(
            "Batch fetch failed:",
            error
          );
        }
      } else {
        console.log(
          "No Scryfall fetch needed because every card is already cached."
        );
      }

      // ---------------- Render Cards ----------------
      for (
        const {
          card,
          key,
        } of keyForIndex
      ) {
        const cardBox =
          document.createElement(
            "div"
          );

        cardBox.className =
          "card-box";

        // ---------------- Quantity ----------------
        const quantity =
          document.createElement(
            "div"
          );

        quantity.className =
          "quantity-badge";

        quantity.textContent =
          `x${card.quantity ?? 1}`;

        // ---------------- Treatment ----------------
        const {
          text: treatmentText,
          className:
            treatmentClass,
          show,
        } = mapTreatment(
          card.treatment
        );

        if (show) {
          const treatment =
            document.createElement(
              "div"
            );

          treatment.className =
            "foil-badge";

          treatment.textContent =
            treatmentText;

          if (treatmentClass) {
            treatment.classList.add(
              treatmentClass
            );
          }

          cardBox.appendChild(
            treatment
          );
        }

        // ---------------- Image ----------------
        const image =
          document.createElement(
            "img"
          );

        image.alt = card.name;

        let sf = cacheGet(key);

        console.log(
          "Cached Scryfall object for:",
          card.name,
          sf
        );

        if (sf) {
          image.src =
            getBestImage(sf);
        } else {
          // Very rare fallback
          const setCode = (
            card.setCode || ""
          ).toLowerCase();

          const collectorNumber =
            card.collectorNumber
              ? String(
                  card.collectorNumber
                ).replace(
                  /^0+/,
                  ""
                )
              : "";

          const url =
            collectorNumber &&
            setCode
              ? `https://api.scryfall.com/cards/${setCode}/${collectorNumber}`
              : (() => {
                  const fallbackUrl =
                    new URL(
                      "https://api.scryfall.com/cards/named"
                    );

                  fallbackUrl.searchParams.set(
                    "exact",
                    card.name
                  );

                  if (setCode) {
                    fallbackUrl.searchParams.set(
                      "set",
                      setCode
                    );
                  }

                  return fallbackUrl.toString();
                })();

          try {
            await sleep(120);

            let response =
              await fetch(url);

            if (
              response.status ===
              429
            ) {
              const retryAfter =
                Number(
                  response.headers.get(
                    "Retry-After"
                  ) || 1
                );

              await sleep(
                retryAfter * 1000
              );

              response =
                await fetch(url);
            }

            if (response.ok) {
              const fetchedCard =
                await response.json();

              console.log(
                "Fallback Scryfall object:",
                fetchedCard
              );

              image.src =
                getBestImage(
                  fetchedCard
                );

              cacheSet(
                key,
                fetchedCard
              );

              sf = fetchedCard;
            }
          } catch (error) {
            console.warn(
              "Fallback fetch failed:",
              error
            );
          }
        }

        // ---------------- Cardmarket Button ----------------
        const button =
          document.createElement(
            "button"
          );

        button.textContent =
          "Cardmarket";

        button.classList.add(
          "button"
        );

        button.onclick = () => {
          const scryfallCard =
            cacheGet(key);

          console.log(
            "Cardmarket click - Firebase:",
            card
          );

          console.log(
            "Cardmarket click - Scryfall:",
            scryfallCard
          );

          if (!scryfallCard) {
            console.warn(
              "No Scryfall data available. Falling back to Cardmarket search."
            );

            const search =
              `${card.setCode} ${card.collectorNumber}`;

            const searchUrl =
              `https://www.cardmarket.com/en/Magic/Products/Search?searchString=${encodeURIComponent(
                search
              )}`;

            window.open(
              searchUrl,
              "_blank"
            );

            return;
          }

          const cardmarketSet =
            getCardmarketSetName(
              scryfallCard,
              card
            );

          const cardmarketCard =
            cardmarketSlug(
              scryfallCard.name ||
              card.name
            );

          const cardmarketUrl =
            `https://www.cardmarket.com/en/Magic/Products/Singles/${cardmarketSet}/${cardmarketCard}`;

          console.log(
            "CARDMARKET RESULT:",
            {
              firebaseName:
                card.name,
              firebaseSet:
                card.setCode,
              firebaseCollector:
                card.collectorNumber,

              scryfallName:
                scryfallCard.name,
              scryfallSet:
                scryfallCard.set,
              scryfallSetName:
                scryfallCard.set_name,
              scryfallCollector:
                scryfallCard.collector_number,

              cardmarketSet,
              cardmarketCard,
              cardmarketUrl,
            }
          );

          window.open(
            cardmarketUrl,
            "_blank"
          );
        };

        // ---------------- Append ----------------
        cardBox.appendChild(
          quantity
        );

        cardBox.appendChild(
          image
        );

        cardBox.appendChild(
          button
        );

        container.appendChild(
          cardBox
        );
      }
    }
  );
}

// ---------------- Share Controls ----------------
function enableShareControls(user) {
  const shareButton =
    document.getElementById(
      "shareBinderBtn"
    );

  if (!shareButton) {
    return;
  }

  shareButton.addEventListener(
    "click",
    async () => {
      const usernameSnapshot =
        await get(
          ref(
            db,
            `users/${user.uid}/username`
          )
        );

      const basePath =
        `${window.location.origin}/mtg-binder`;

      const shareUrl =
        usernameSnapshot.exists()
          ? `${basePath}/public-binder.html?username=${usernameSnapshot.val()}`
          : `${basePath}/public-binder.html?uid=${user.uid}`;

      try {
        await navigator.clipboard.writeText(
          shareUrl
        );

        alert(
          "📎 Shareable binder link copied to clipboard!"
        );
      } catch {
        fallbackCopyToClipboard(
          shareUrl
        );
      }
    }
  );

  function fallbackCopyToClipboard(
    text
  ) {
    const textarea =
      document.createElement(
        "textarea"
      );

    textarea.value = text;

    textarea.setAttribute(
      "readonly",
      ""
    );

    textarea.style.position =
      "fixed";

    textarea.style.top =
      "-9999px";

    document.body.appendChild(
      textarea
    );

    textarea.select();

    try {
      const successful =
        document.execCommand(
          "copy"
        );

      alert(
        successful
          ? "📎 Link copied (fallback)!"
          : "❌ Copy failed."
      );
    } catch (error) {
      alert(
        "❌ Copy failed."
      );
    }

    document.body.removeChild(
      textarea
    );
  }
}