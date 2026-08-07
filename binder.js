// ======================================================
// FIREBASE IMPORTS
// ======================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

import {
  getDatabase,
  ref,
  onValue,
  get
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";


// ======================================================
// FIREBASE CONFIG
// ======================================================

const firebaseConfig = {
  apiKey: "AIzaSyAia2iO0Qx7AmJxXlbG5BK60VRJSZ2Srh8",
  authDomain: "tgbinder-8e3c6.firebaseapp.com",
  databaseURL: "https://tgbinder-8e3c6-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "tgbinder-8e3c6",
  storageBucket: "tgbinder-8e3c6.appspot.com",
  messagingSenderId: "903450561301",
  appId: "1:903450561301:web:df2407af369db0895bb71c",
};


// ======================================================
// INITIALIZE FIREBASE
// ======================================================

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);


// ======================================================
// GENERAL UTILITIES
// ======================================================

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));


const SCRYFALL_HEADERS = {
  Accept: "application/json;q=0.9,*/*;q=0.8"
};


// ======================================================
// TREATMENT MAPPING
// ======================================================

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
    FIR: ["First Place Foil", "FIR"]
  };


  if (!code || !map[code]) {

    return {
      text: "Non-Foil",
      className: "",
      show: false
    };
  }


  const [
    text,
    className
  ] = map[code];


  return {
    text,
    className,
    show: true
  };
}


// ======================================================
// NORMALIZATION
// ======================================================

function normalizeSetCode(value) {

  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}


function normalizeCollectorNumber(value) {

  return String(
    value || ""
  )
    .trim()
    .replace(
      /^0+(?=\d)/,
      ""
    );
}


function normalizeTreatment(value) {

  return String(
    value || ""
  )
    .trim()
    .toUpperCase();
}


// ======================================================
// CACHE KEY
// ======================================================

function cacheKeyFor(card) {

  /*
   * Future-proofing:
   *
   * If you eventually save Scryfall IDs in Firebase,
   * this script will automatically prefer them.
   */

  if (card?.scryfallId) {

    return (
      `scryfall-id:${card.scryfallId}`
    );
  }


  const set =
    normalizeSetCode(
      card?.setCode
    );


  const number =
    normalizeCollectorNumber(
      card?.collectorNumber
    );


  if (
    set &&
    number
  ) {

    return (
      `set:${set}|num:${number}`
    );
  }


  return (
    `name:${card?.name || ""}|set:${set}`
  );
}


// ======================================================
// BUILD VALID SCRYFALL IDENTIFIER
// ======================================================

function buildIdentifier(card) {

  const scryfallId =
    String(
      card?.scryfallId || ""
    ).trim();


  const setCode =
    normalizeSetCode(
      card?.setCode
    );


  const collectorNumber =
    normalizeCollectorNumber(
      card?.collectorNumber
    );


  const name =
    String(
      card?.name || ""
    ).trim();


  // --------------------------------------------------
  // BEST: Scryfall ID
  // --------------------------------------------------

  if (scryfallId) {

    return {
      id: scryfallId
    };
  }


  // --------------------------------------------------
  // EXACT PRINTING: set + collector number
  // --------------------------------------------------

  if (
    setCode &&
    collectorNumber
  ) {

    return {
      set: setCode,
      collector_number:
        collectorNumber
    };
  }


  // --------------------------------------------------
  // FALLBACK: name + set
  // --------------------------------------------------

  if (
    name &&
    setCode
  ) {

    return {
      name,
      set: setCode
    };
  }


  // --------------------------------------------------
  // LAST RESORT: name
  // --------------------------------------------------

  if (name) {

    return {
      name
    };
  }


  console.warn(
    "Cannot build Scryfall identifier:",
    card
  );


  return null;
}


// ======================================================
// CARD IMAGE
// ======================================================

function getBestImage(cardObj) {

  return (
    cardObj?.image_uris?.normal ||

    cardObj
      ?.card_faces
      ?.[0]
      ?.image_uris
      ?.normal ||

    cardObj?.image_uris?.large ||

    cardObj
      ?.card_faces
      ?.[0]
      ?.image_uris
      ?.large ||

    ""
  );
}


// ======================================================
// SCRYFALL CACHE
// ======================================================

const cardCacheMem =
  new Map();


function cacheGet(key) {

  if (
    cardCacheMem.has(key)
  ) {

    return (
      cardCacheMem.get(
        key
      )
    );
  }


  try {

    const raw =
      localStorage.getItem(
        "scryfall:" + key
      );


    if (raw) {

      const value =
        JSON.parse(raw);


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


function cacheSet(
  key,
  value
) {

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
// SCRYFALL BATCH FETCH
// ======================================================

async function fetchScryfallBatches(
  identifiers
) {

  const CHUNK = 75;

  const output =
    new Map();


  const chunks = [];


  for (
    let i = 0;
    i < identifiers.length;
    i += CHUNK
  ) {

    chunks.push(
      identifiers.slice(
        i,
        i + CHUNK
      )
    );
  }


  for (
    let index = 0;
    index < chunks.length;
    index++
  ) {

    const body = {

      identifiers:
        chunks[index]
    };


    console.log(
      "SENDING TO SCRYFALL:",
      JSON.stringify(
        body,
        null,
        2
      )
    );


    while (true) {

      const response =
        await fetch(
          "https://api.scryfall.com/cards/collection",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              ...SCRYFALL_HEADERS
            },

            body:
              JSON.stringify(
                body
              )
          }
        );


      // ------------------------------------------------
      // RATE LIMIT
      // ------------------------------------------------

      if (
        response.status === 429
      ) {

        const retryAfter =
          Number(
            response.headers.get(
              "Retry-After"
            ) || 1
          );


        console.warn(
          `Scryfall rate limit. Waiting ${retryAfter}s`
        );


        await sleep(
          retryAfter * 1000
        );


        continue;
      }


      // ------------------------------------------------
      // ERROR
      // ------------------------------------------------

      if (!response.ok) {

        console.error(
          "Scryfall error:",
          response.status,
          await response.text()
        );


        break;
      }


      const data =
        await response.json();


      // ------------------------------------------------
      // STORE RESULTS
      // ------------------------------------------------

      for (
        const card of
        data.data || []
      ) {

        const set =
          normalizeSetCode(
            card.set
          );


        const collector =
          normalizeCollectorNumber(
            card.collector_number
          );


        // Exact Scryfall ID key

        if (card.id) {

          output.set(
            `scryfall-id:${card.id}`,
            card
          );
        }


        // Set + collector key

        if (
          set &&
          collector
        ) {

          output.set(
            `set:${set}|num:${collector}`,
            card
          );
        }


        // Name + set key

        if (card.name) {

          output.set(
            `name:${card.name}|set:${set}`,
            card
          );
        }


        console.log(
          "SCRYFALL CARD:",
          {
            id:
              card.id,

            name:
              card.name,

            set:
              card.set,

            set_name:
              card.set_name,

            collector_number:
              card.collector_number,

            finishes:
              card.finishes,

            cardmarket_id:
              card.cardmarket_id
          }
        );
      }


      // Small pause between batches

      await sleep(150);


      break;
    }
  }


  return output;
}


// ======================================================
// EXACT SCRYFALL FALLBACK LOOKUP
// ======================================================

async function fetchExactScryfallCard(
  card
) {

  const scryfallId =
    String(
      card?.scryfallId || ""
    ).trim();


  const setCode =
    normalizeSetCode(
      card?.setCode
    );


  const collectorNumber =
    normalizeCollectorNumber(
      card?.collectorNumber
    );


  let url = null;


  // --------------------------------------------------
  // Scryfall ID
  // --------------------------------------------------

  if (scryfallId) {

    url =
      `https://api.scryfall.com/cards/${encodeURIComponent(
        scryfallId
      )}`;
  }


  // --------------------------------------------------
  // Set + collector
  // --------------------------------------------------

  else if (
    setCode &&
    collectorNumber
  ) {

    url =
      `https://api.scryfall.com/cards/${encodeURIComponent(
        setCode
      )}/${encodeURIComponent(
        collectorNumber
      )}`;
  }


  if (!url) {

    return null;
  }


  const response =
    await fetch(
      url,
      {
        headers:
          SCRYFALL_HEADERS
      }
    );


  if (
    response.status === 404
  ) {

    return null;
  }


  if (!response.ok) {

    throw new Error(
      `Scryfall exact lookup failed: ${response.status}`
    );
  }


  return (
    response.json()
  );
}


// ======================================================
// CARDMARKET HELPERS
// ======================================================

function cardmarketSlug(text) {

  if (!text) {

    return "";
  }


  return String(text)

    .normalize("NFD")

    .replace(
      /[\u0300-\u036f]/g,
      ""
    )

    .replace(
      /[’']/g,
      ""
    )

    .replace(
      /&/g,
      "and"
    )

    .replace(
      /[^a-zA-Z0-9]+/g,
      "-"
    )

    .replace(
      /^-+|-+$/g,
      ""
    );
}


// ======================================================
// EXACT CARDMARKET OVERRIDES
// ======================================================

/*
 * This is intentionally kept small.
 *
 * Do NOT put guessed set mappings here.
 *
 * This table is only for confirmed cases where:
 *
 * Scryfall printing + treatment
 *
 * needs a different Cardmarket product.
 *
 *
 * Format:
 *
 * "set:collector:treatment": "FULL CARDMARKET URL"
 *
 *
 * Examples:
 *
 * "abc:123:FET": "https://..."
 *
 *
 * Empty treatment can be represented by:
 *
 * "abc:123:NONFOIL"
 */

const CARDMARKET_EXACT_OVERRIDES = {

};


// ======================================================
// STRIXHAVEN MYSTICAL ARCHIVE VERSION RESOLVER
// ======================================================

/*
 * Cardmarket separates Mystical Archive into
 * V1 / V2 / V3 / V4 products.
 *
 *
 * STA 1-63:
 *
 *   Non-Foil            -> V1
 *   Traditional Foil    -> V1
 *   Foil-Etched         -> V3
 *
 *
 * STA 64-126:
 *
 *   Non-Foil            -> V2
 *   Traditional Foil    -> V2
 *   Foil-Etched         -> V4
 *
 *
 * We ONLY apply this rule to STA.
 */

function getStaCardmarketVersion(
  collectorNumber,
  treatment
) {

  const number =
    Number(
      collectorNumber
    );


  if (
    !Number.isFinite(number)
  ) {

    return null;
  }


  // --------------------------------------------------
  // Global artwork
  // --------------------------------------------------

  if (
    number >= 1 &&
    number <= 63
  ) {

    if (
      treatment === "FET"
    ) {

      return 3;
    }


    if (
      treatment === "" ||
      treatment === "TRA"
    ) {

      return 1;
    }


    return null;
  }


  // --------------------------------------------------
  // Japanese alternate artwork
  // --------------------------------------------------

  if (
    number >= 64 &&
    number <= 126
  ) {

    if (
      treatment === "FET"
    ) {

      return 4;
    }


    if (
      treatment === "" ||
      treatment === "TRA"
    ) {

      return 2;
    }


    return null;
  }


  return null;
}


// ======================================================
// CLEAN SCRYFALL CARDMARKET URL
// ======================================================

function cleanScryfallCardmarketUrl(
  rawUrl
) {

  if (!rawUrl) {

    return null;
  }


  try {

    const url =
      new URL(rawUrl);


    /*
     * If Scryfall gave us:
     *
     * ?idProduct=401049
     *
     * use only that ID.
     *
     * This removes all:
     *
     * referrer=scryfall
     * utm_source
     * utm_medium
     * utm_campaign
     */

    const productId =
      url.searchParams.get(
        "idProduct"
      );


    if (productId) {

      return (
        `https://www.cardmarket.com/en/Magic/Products?idProduct=${encodeURIComponent(
          productId
        )}`
      );
    }


    // Remove tracking parameters

    url.searchParams.delete(
      "referrer"
    );

    url.searchParams.delete(
      "utm_source"
    );

    url.searchParams.delete(
      "utm_medium"
    );

    url.searchParams.delete(
      "utm_campaign"
    );


    return (
      url.toString()
    );

  } catch (error) {

    console.warn(
      "Could not parse Cardmarket URL:",
      error
    );


    return rawUrl;
  }
}


// ======================================================
// CARDMARKET URL RESOLVER
// ======================================================

function resolveCardmarketUrl(
  scryfallCard,
  firebaseCard
) {

  if (!scryfallCard) {

    return null;
  }


  const setCode =
    normalizeSetCode(
      scryfallCard.set ||
      firebaseCard?.setCode
    );


  const collectorNumber =
    normalizeCollectorNumber(
      scryfallCard.collector_number ||
      firebaseCard?.collectorNumber
    );


  const treatment =
    normalizeTreatment(
      firebaseCard?.treatment
    );


  const treatmentKey =
    treatment || "NONFOIL";


  const exactKey =
    `${setCode}:${collectorNumber}:${treatmentKey}`;


  console.log(
    "Resolving Cardmarket:",
    {
      name:
        scryfallCard.name,

      set:
        setCode,

      collectorNumber,

      treatment:
        treatmentKey,

      finishes:
        scryfallCard.finishes,

      cardmarket_id:
        scryfallCard.cardmarket_id
    }
  );


  // ==================================================
  // 1. EXACT VERIFIED OVERRIDE
  // ==================================================

  if (
    Object.prototype
      .hasOwnProperty
      .call(
        CARDMARKET_EXACT_OVERRIDES,
        exactKey
      )
  ) {

    console.log(
      "Using exact Cardmarket override:",
      exactKey
    );


    return (
      CARDMARKET_EXACT_OVERRIDES[
        exactKey
      ]
    );
  }


  // ==================================================
  // 2. STRIXHAVEN MYSTICAL ARCHIVE
  // ==================================================

  if (
    setCode === "sta"
  ) {

    const version =
      getStaCardmarketVersion(
        collectorNumber,
        treatment
      );


    if (version) {

      const cardName =
        cardmarketSlug(
          scryfallCard.name
        );


      const url =
        `https://www.cardmarket.com/en/Magic/Products/Singles/Mystical-Archive/${cardName}-V${version}`;


      console.log(
        "STA treatment resolution:",
        {
          name:
            scryfallCard.name,

          collector:
            collectorNumber,

          treatment:
            treatmentKey,

          version:
            `V${version}`,

          url
        }
      );


      return url;
    }
  }


  // ==================================================
  // 3. SCRYFALL CARDMARKET PRODUCT ID
  // ==================================================

  /*
   * This is now the NORMAL method.
   *
   * We do not guess:
   *
   * Cardmarket set slug
   * Cardmarket expansion name
   * Card name URL
   *
   * We use Scryfall's Cardmarket product mapping.
   */

  if (
    scryfallCard.cardmarket_id
  ) {

    return (
      `https://www.cardmarket.com/en/Magic/Products?idProduct=${encodeURIComponent(
        scryfallCard.cardmarket_id
      )}`
    );
  }


  // ==================================================
  // 4. SCRYFALL purchase_uris CARDMARKET URL
  // ==================================================

  if (
    scryfallCard
      ?.purchase_uris
      ?.cardmarket
  ) {

    return (
      cleanScryfallCardmarketUrl(
        scryfallCard
          .purchase_uris
          .cardmarket
      )
    );
  }


  // ==================================================
  // 5. NO SAFE DIRECT PRODUCT AVAILABLE
  // ==================================================

  return null;
}


// ======================================================
// CARDMARKET SEARCH FALLBACK
// ======================================================

function buildCardmarketSearchUrl(
  scryfallCard,
  firebaseCard
) {

  const query = [

    scryfallCard?.name ||
      firebaseCard?.name,

    scryfallCard?.set ||
      firebaseCard?.setCode,

    scryfallCard?.collector_number ||
      firebaseCard?.collectorNumber

  ]
    .filter(Boolean)
    .join(" ");


  return (
    `https://www.cardmarket.com/en/Magic/Products/Search?searchString=${encodeURIComponent(
      query
    )}`
  );
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


    // ==================================================
    // RESOLVE UID
    // ==================================================

    const resolveUid = () => {

      // ----------------------------------------------
      // Username in URL
      // ----------------------------------------------

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


            return (
              snapshot.val()
            );
          }
        );
      }


      // ----------------------------------------------
      // UID in URL
      // ----------------------------------------------

      if (queryUid) {

        return (
          Promise.resolve(
            queryUid
          )
        );
      }


      // ----------------------------------------------
      // Current logged-in user
      // ----------------------------------------------

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


    // ==================================================
    // RESOLVE USER
    // ==================================================

    resolveUid()

      .then(
        async (
          targetUid
        ) => {

          let usernameToDisplay =
            queryUsername;


          // --------------------------------------------
          // Find username from UID
          // --------------------------------------------

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

            } catch (error) {

              console.error(
                "Error fetching username:",
                error
              );
            }
          }


          // --------------------------------------------
          // Display username
          // --------------------------------------------

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


          // --------------------------------------------
          // Load binder
          // --------------------------------------------

          loadBinderForUser(
            targetUid
          );


          // --------------------------------------------
          // Share controls
          // --------------------------------------------

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

function loadBinderForUser(
  uid
) {

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
      // PREPARE SCRYFALL IDENTIFIERS
      // ==================================================

      for (
        const [
          cardId,
          card
        ] of entries
      ) {

        const key =
          cacheKeyFor(
            card
          );


        keyForIndex.push({
          cardId,
          card,
          key
        });


        const cached =
          cacheGet(
            key
          );


        if (!cached) {

          /*
           * IMPORTANT:
           *
           * Do NOT:
           *
           * identifiers.push(card)
           *
           * That sends Firebase's object schema
           * directly to Scryfall.
           *
           * Instead send a valid Scryfall
           * identifier object.
           */

          const identifier =
            buildIdentifier(
              card
            );


          if (identifier) {

            identifiers.push(
              identifier
            );
          }
        }
      }


      // ==================================================
      // FETCH SCRYFALL DATA
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
              card,
              key
            } of keyForIndex
          ) {

            if (
              cacheGet(key)
            ) {

              continue;
            }


            // ------------------------------------------
            // Exact current cache key
            // ------------------------------------------

            if (
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


              continue;
            }


            // ------------------------------------------
            // Scryfall ID fallback
            // ------------------------------------------

            if (
              card.scryfallId
            ) {

              const idKey =
                `scryfall-id:${card.scryfallId}`;


              if (
                fetchedMap.has(
                  idKey
                )
              ) {

                cacheSet(
                  key,
                  fetchedMap.get(
                    idKey
                  )
                );


                continue;
              }
            }


            // ------------------------------------------
            // Set + collector fallback
            // ------------------------------------------

            const set =
              normalizeSetCode(
                card.setCode
              );


            const number =
              normalizeCollectorNumber(
                card.collectorNumber
              );


            const printKey =
              `set:${set}|num:${number}`;


            if (
              fetchedMap.has(
                printKey
              )
            ) {

              cacheSet(
                key,
                fetchedMap.get(
                  printKey
                )
              );
            }
          }

        } catch (error) {

          console.error(
            "Scryfall batch fetch failed:",
            error
          );
        }
      }


      // ==================================================
      // RENDER EACH CARD
      // ==================================================

      for (
        const {
          card,
          key
        } of keyForIndex
      ) {

        const cardBox =
          document.createElement(
            "div"
          );


        cardBox.className =
          "card-box";


        // ==================================================
        // QUANTITY
        // ==================================================

        const quantity =
          document.createElement(
            "div"
          );


        quantity.className =
          "quantity-badge";


        quantity.textContent =
          `x${card.quantity ?? 1}`;


        // ==================================================
        // TREATMENT BADGE
        // ==================================================

        const {
          text:
            treatmentText,

          className:
            treatmentClass,

          show
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


        let scryfallCard =
          cacheGet(
            key
          );


        // ----------------------------------------------
        // Cached
        // ----------------------------------------------

        if (scryfallCard) {

          image.src =
            getBestImage(
              scryfallCard
            );
        }


        // ----------------------------------------------
        // Exact fallback
        // ----------------------------------------------

        else {

          try {

            await sleep(120);


            const fetchedCard =
              await fetchExactScryfallCard(
                card
              );


            if (fetchedCard) {

              scryfallCard =
                fetchedCard;


              cacheSet(
                key,
                fetchedCard
              );


              image.src =
                getBestImage(
                  fetchedCard
                );
            }

          } catch (error) {

            console.warn(
              "Exact Scryfall fallback failed:",
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
          async () => {

            /*
             * IMPORTANT:
             *
             * We NEVER fetch Cardmarket here.
             *
             * No:
             *
             * fetch(cardmarket...)
             *
             * No scraping.
             *
             * No testing URL existence.
             *
             * We only calculate the URL locally,
             * then open it after this user click.
             */


            let sf =
              cacheGet(
                key
              );


            // ------------------------------------------
            // Scryfall card somehow wasn't cached
            // ------------------------------------------

            if (!sf) {

              try {

                sf =
                  await fetchExactScryfallCard(
                    card
                  );


                if (sf) {

                  cacheSet(
                    key,
                    sf
                  );
                }

              } catch (error) {

                console.error(
                  "Could not retrieve exact Scryfall card:",
                  error
                );
              }
            }


            // ------------------------------------------
            // Resolve direct Cardmarket product
            // ------------------------------------------

            if (sf) {

              const cardmarketUrl =
                resolveCardmarketUrl(
                  sf,
                  card
                );


              if (cardmarketUrl) {

                console.log(
                  "OPENING CARDMARKET:",
                  {
                    firebase: {
                      name:
                        card.name,

                      set:
                        card.setCode,

                      collector:
                        card.collectorNumber,

                      treatment:
                        card.treatment ||
                        "NONFOIL"
                    },

                    scryfall: {
                      name:
                        sf.name,

                      set:
                        sf.set,

                      collector:
                        sf.collector_number,

                      cardmarket_id:
                        sf.cardmarket_id
                    },

                    url:
                      cardmarketUrl
                  }
                );


                window.open(
                  cardmarketUrl,
                  "_blank"
                );


                return;
              }
            }


            // ------------------------------------------
            // Last resort: Cardmarket search
            // ------------------------------------------

            const searchUrl =
              buildCardmarketSearchUrl(
                sf,
                card
              );


            console.warn(
              "No direct Cardmarket product mapping found. Using search:",
              searchUrl
            );


            window.open(
              searchUrl,
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

    } catch (error) {

      console.error(
        "Clipboard fallback failed:",
        error
      );


      alert(
        "❌ Copy failed."
      );
    }


    document.body.removeChild(
      textarea
    );
  }
}