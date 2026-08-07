// ---------------- Firebase Imports ----------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
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

// ---------------- Treatment Mapping ----------------
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
  const set = (card.setCode || "").toLowerCase();

  const number = card.collectorNumber
    ? String(card.collectorNumber).replace(/^0+/, "")
    : "";

  return number && set
    ? `set:${set}|num:${number}`
    : `name:${card.name}|set:${set}`;
}

// ---------------- Scryfall Identifier ----------------
function buildIdentifier(card) {
  const setCode = String(card?.setCode || "")
    .trim()
    .toLowerCase();

  const collectorNumber = String(card?.collectorNumber || "")
    .trim()
    .replace(/^0+/, "");

  const name = String(card?.name || "").trim();

  // BEST OPTION:
  // exact printing using set + collector number
  if (setCode && collectorNumber) {
    return {
      set: setCode,
      collector_number: collectorNumber,
    };
  }

  // SECOND OPTION:
  // name + set
  if (name && setCode) {
    return {
      name: name,
      set: setCode,
    };
  }

  // LAST OPTION:
  // name only
  if (name) {
    return {
      name: name,
    };
  }

  // Invalid card - don't send it to Scryfall
  console.warn("Cannot build Scryfall identifier:", card);

  return null;
}

// ---------------- Best Card Image ----------------
function getBestImage(cardObj) {
  return (
    cardObj?.image_uris?.normal ||
    cardObj?.card_faces?.[0]?.image_uris?.normal ||
    cardObj?.image_uris?.large ||
    cardObj?.card_faces?.[0]?.image_uris?.large ||
    ""
  );
}

// ======================================================
// CARDMARKET UTILITIES
// ======================================================

function cardmarketSlug(text) {
  if (!text) return "";

  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/*
 * Exact-print Cardmarket overrides.
 *
 * Only put entries here when a specific Scryfall printing
 * maps to a differently named Cardmarket expansion.
 *
 * Key format:
 *
 *   "setcode:collectorNumber"
 *
 * Collector number is stored without leading zeroes.
 */
const CARDMARKET_PRINT_OVERRIDES = {
  // Verified example:
  //
  // HOB 0297
  // The Master of Lake-town
  // Cardmarket expansion:
  // The Hobbit Extras
  "hob:297": "The-Hobbit-Extras",
};

/*
 * Whole-set overrides.
 *
 * Only use this if EVERY printing in the Scryfall set
 * maps to a differently named Cardmarket expansion.
 */
const CARDMARKET_SET_OVERRIDES = {
  // Example:
  //
  // "abc": "Different-Cardmarket-Set-Name"
};

/*
 * Determine the Cardmarket expansion name.
 *
 * Priority:
 *
 * 1. Exact printing override
 * 2. Whole-set override
 * 3. Scryfall set_name
 * 4. No safe direct URL
 */
function getCardmarketSetName(sf, firebaseCard) {
  const setCode = String(
    sf?.set ||
    firebaseCard?.setCode ||
    ""
  ).toLowerCase();

  const rawCollector =
    sf?.collector_number ||
    firebaseCard?.collectorNumber ||
    "";

  const collectorNumber =
    String(rawCollector).replace(/^0+/, "") || "0";

  const printKey =
    `${setCode}:${collectorNumber}`;

  // ---------------- Exact Print Override ----------------
  if (
    Object.prototype.hasOwnProperty.call(
      CARDMARKET_PRINT_OVERRIDES,
      printKey
    )
  ) {
    const result =
      CARDMARKET_PRINT_OVERRIDES[printKey];

    console.log(
      "Cardmarket exact print override:",
      printKey,
      "->",
      result
    );

    return result;
  }

  // ---------------- Whole Set Override ----------------
  if (
    Object.prototype.hasOwnProperty.call(
      CARDMARKET_SET_OVERRIDES,
      setCode
    )
  ) {
    const result =
      CARDMARKET_SET_OVERRIDES[setCode];

    console.log(
      "Cardmarket whole-set override:",
      setCode,
      "->",
      result
    );

    return result;
  }

  // ---------------- Default: Scryfall Set Name ----------------
  if (sf?.set_name) {
    const result =
      cardmarketSlug(sf.set_name);

    console.log(
      "Using Scryfall set name:",
      sf.set_name,
      "->",
      result
    );

    return result;
  }

  console.warn(
    "Could not safely determine Cardmarket expansion:",
    {
      setCode,
      collectorNumber,
      scryfall: sf,
      firebaseCard,
    }
  );

  return null;
}

// ======================================================
// CACHE
// ======================================================

const cardCacheMem = new Map();

function cacheGet(key) {
  if (cardCacheMem.has(key)) {
    return cardCacheMem.get(key);
  }

  try {
    const raw =
      localStorage.getItem("scryfall:" + key);

    if (raw) {
      const value = JSON.parse(raw);

      cardCacheMem.set(
        key,
        value
      );

      return value;
    }
  } catch (error) {
    console.warn(
      "Could not read Scryfall cache:",
      error
    );
  }

  return null;
}

function cacheSet(key, value) {
  cardCacheMem.set(
    key,
    value
  );

  try {
    localStorage.setItem(
      "scryfall:" + key,
      JSON.stringify(value)
    );
  } catch (error) {
    console.warn(
      "Could not write Scryfall cache:",
      error
    );
  }
}

// ======================================================
// SCRYFALL BATCH FETCHER
// ======================================================

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

    console.log(
      "SENDING TO SCRYFALL:",
      JSON.stringify(body, null, 2)
    );

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

      for (const card of data.data || []) {
        const cleanCollector =
          String(card.collector_number || "")
            .replace(/^0+/, "");

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

// ======================================================
// MAIN PAGE FLOW
// ======================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {
    const urlParams =
      new URLSearchParams(
        window.location.search
      );

    const queryUsername =
      urlParams.get(
        "username"
      );

    const queryUid =
      urlParams.get(
        "uid"
      );

    const basePath =
      `${window.location.origin}/mtg-binder`;

    const resolveUid = () => {
      // ---------------- Username ----------------
      if (queryUsername) {
        return get(
          ref(
            db,
            `usernames/${queryUsername}`
          )
        ).then(
          (snapshot) => {
            if (
              !snapshot.exists()
            ) {
              throw new Error(
                "Username not found."
              );
            }

            return snapshot.val();
          }
        );
      }

      // ---------------- UID ----------------
      if (queryUid) {
        return Promise.resolve(
          queryUid
        );
      }

      // ---------------- Logged-in User ----------------
      return new Promise(
        (
          resolve,
          reject
        ) => {
          onAuthStateChanged(
            auth,
            (user) => {
              if (user) {
                resolve(
                  user.uid
                );

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
      .then(
        async (
          targetUid
        ) => {
          let usernameToDisplay =
            queryUsername;

          // ---------------- Resolve username from UID ----------------
          if (
            !usernameToDisplay
          ) {
            try {
              const snapshot =
                await get(
                  ref(
                    db,
                    `users/${targetUid}/username`
                  )
                );

              if (
                snapshot.exists()
              ) {
                usernameToDisplay =
                  snapshot.val();
              } else {
                console.error(
                  "Username not found in database."
                );
              }
            } catch (
              error
            ) {
              console.error(
                "Error fetching username:",
                error
              );
            }
          }

          // ---------------- Display Username ----------------
          const usernameElement =
            document.getElementById(
              "username"
            );

          if (
            usernameElement
          ) {
            usernameElement.textContent =
              usernameToDisplay ||
              "";
          }

          // ---------------- Load Binder ----------------
          loadBinderForUser(
            targetUid
          );

          // ---------------- Share Controls ----------------
          onAuthStateChanged(
            auth,
            (user) => {
              if (
                user &&
                user.uid ===
                  targetUid
              ) {
                enableShareControls(
                  user
                );
              }
            }
          );
        }
      )
      .catch(
        (error) => {
          console.warn(
            "Redirecting to login due to:",
            error
          );

          location.href =
            `${basePath}/login.html`;
        }
      );
  }
);

// ======================================================
// BINDER RENDERING
// ======================================================

function loadBinderForUser(uid) {
  const cardsRef =
    ref(
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
    async (
      snapshot
    ) => {
      const data =
        snapshot.val();

      container.innerHTML =
        "";

      if (!data) {
        container.innerHTML =
          "No cards found.";

        return;
      }

      const entries =
        Object.entries(
          data
        );

      const identifiers =
        [];

      const keyForIndex =
        [];

      // ==================================================
      // PREPARE IDENTIFIERS
      // ==================================================

      for (
        const [
          cardId,
          card,
        ] of entries
      ) {
        const key =
          cacheKeyFor(
            card
          );

        keyForIndex.push(
          {
            cardId,
            card,
            key,
          }
        );

        const cached =
          cacheGet(
            key
          );

        console.log(
          "Card cache check:",
          {
            name:
              card.name,

            setCode:
              card.setCode,

            collectorNumber:
              card.collectorNumber,

            key,

            cached:
              !!cached,
          }
        );

        if (!cached) {
          const identifier = buildIdentifier(card);

          if (identifier) {
            identifiers.push(identifier);
          }
        }
      }

      console.log(
        "Scryfall identifiers to fetch:",
        identifiers
      );

      // ==================================================
      // FETCH UNCACHED CARDS
      // ==================================================

      if (
        identifiers.length
      ) {
        try {
          const fetchedMap =
            await fetchScryfallBatches(
              identifiers
            );

          for (
            const {
              key,
            } of keyForIndex
          ) {
            if (
              !cacheGet(
                key
              ) &&
              fetchedMap.has(
                key
              )
            ) {
              cacheSet(
                key,
                fetchedMap.get(
                  key
                )
              );
            }
          }
        } catch (
          error
        ) {
          console.error(
            "Batch fetch failed:",
            error
          );
        }
      } else {
        console.log(
          "No Scryfall fetch needed because all cards are cached."
        );
      }

      // ==================================================
      // RENDER CARDS
      // ==================================================

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

        // ---------------- Treatment Badge ----------------
        const {
          text:
            treatmentText,

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

          if (
            treatmentClass
          ) {
            treatment.classList.add(
              treatmentClass
            );
          }

          cardBox.appendChild(
            treatment
          );
        }

        // ==================================================
        // IMAGE
        // ==================================================

        const image =
          document.createElement(
            "img"
          );

        image.alt =
          card.name;

        let sf =
          cacheGet(
            key
          );

        console.log(
          "Cached Scryfall object:",
          {
            firebaseCard:
              card,

            scryfall:
              sf,
          }
        );

        if (sf) {
          image.src =
            getBestImage(
              sf
            );
        } else {
          // ----------------------------------------------
          // Fallback Scryfall request
          // ----------------------------------------------

          const set =
            (
              card.setCode ||
              ""
            ).toLowerCase();

          const number =
            card.collectorNumber
              ? String(
                  card.collectorNumber
                ).replace(
                  /^0+/,
                  ""
                )
              : "";

          const url =
            number &&
            set
              ? `https://api.scryfall.com/cards/${set}/${number}`
              : (() => {
                  const fallbackUrl =
                    new URL(
                      "https://api.scryfall.com/cards/named"
                    );

                  fallbackUrl
                    .searchParams
                    .set(
                      "exact",
                      card.name
                    );

                  if (set) {
                    fallbackUrl
                      .searchParams
                      .set(
                        "set",
                        set
                      );
                  }

                  return fallbackUrl.toString();
                })();

          try {
            await sleep(
              120
            );

            let response =
              await fetch(
                url
              );

            if (
              response.status ===
              429
            ) {
              const retryAfter =
                Number(
                  response
                    .headers
                    .get(
                      "Retry-After"
                    ) || 1
                );

              await sleep(
                retryAfter *
                  1000
              );

              response =
                await fetch(
                  url
                );
            }

            if (
              response.ok
            ) {
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

              sf =
                fetchedCard;
            }
          } catch (
            error
          ) {
            console.warn(
              "Fallback Scryfall fetch failed:",
              error
            );
          }
        }

        // ==================================================
        // CARDMARKET BUTTON
        // ==================================================

        const button =
          document.createElement(
            "button"
          );

        button.textContent =
          "Cardmarket";

        button.classList.add(
          "button"
        );

        button.onclick =
          () => {
            const scryfallCard =
              cacheGet(
                key
              );

            console.log(
              "Cardmarket click - Firebase:",
              card
            );

            console.log(
              "Cardmarket click - Scryfall:",
              scryfallCard
            );

            // ------------------------------------------
            // No Scryfall object:
            // use Cardmarket search instead of guessing
            // ------------------------------------------

            if (
              !scryfallCard
            ) {
              console.warn(
                "No Scryfall data available. Falling back to Cardmarket search."
              );

              const query =
                `${card.setCode} ${card.collectorNumber}`;

              const searchUrl =
                `https://www.cardmarket.com/en/Magic/Products/Search?searchString=${encodeURIComponent(
                  query
                )}`;

              window.open(
                searchUrl,
                "_blank"
              );

              return;
            }

            // ------------------------------------------
            // Determine Cardmarket Expansion
            // ------------------------------------------

            const cardmarketSet =
              getCardmarketSetName(
                scryfallCard,
                card
              );

            // ------------------------------------------
            // Cannot determine safely:
            // use search
            // ------------------------------------------

            if (
              !cardmarketSet
            ) {
              const query =
                `${scryfallCard.set} ${scryfallCard.collector_number}`;

              const searchUrl =
                `https://www.cardmarket.com/en/Magic/Products/Search?searchString=${encodeURIComponent(
                  query
                )}`;

              console.warn(
                "Could not determine safe direct Cardmarket URL. Using search:",
                searchUrl
              );

              window.open(
                searchUrl,
                "_blank"
              );

              return;
            }

            // ------------------------------------------
            // Cardmarket Card Name
            // ------------------------------------------

            const cardmarketCard =
              cardmarketSlug(
                scryfallCard.name ||
                card.name
              );

            // ------------------------------------------
            // Direct Cardmarket URL
            // ------------------------------------------

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

        // ==================================================
        // APPEND
        // ==================================================

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

// ======================================================
// SHARE CONTROLS
// ======================================================

function enableShareControls(
  user
) {
  const shareBtn =
    document.getElementById(
      "shareBinderBtn"
    );

  if (!shareBtn) {
    return;
  }

  shareBtn.addEventListener(
    "click",
    async () => {
      const usernameSnap =
        await get(
          ref(
            db,
            `users/${user.uid}/username`
          )
        );

      const basePath =
        `${window.location.origin}/mtg-binder`;

      const shareUrl =
        usernameSnap.exists()
          ? `${basePath}/public-binder.html?username=${usernameSnap.val()}`
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

    textarea.value =
      text;

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
    } catch (
      error
    ) {
      alert(
        "❌ Copy failed."
      );
    }

    document.body.removeChild(
      textarea
    );
  }
}