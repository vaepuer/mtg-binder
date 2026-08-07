import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

import {
  getDatabase,
  ref,
  onValue,
  get,
  update
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";


// ======================================================
// FIREBASE
// ======================================================

const firebaseConfig = {
  apiKey: "AIzaSyAia2iO0Qx7AmJxXlbG5BK60VRJSZ2Srh8",
  authDomain: "tgbinder-8e3c6.firebaseapp.com",
  databaseURL: "https://tgbinder-8e3c6-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "tgbinder-8e3c6",
  storageBucket: "tgbinder-8e3c6.appspot.com",
  messagingSenderId: "903450561301",
  appId: "1:903450561301:web:df2407af369db0895bb71c"
};


const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);


// ======================================================
// GENERAL HELPERS
// ======================================================

const sleep = (ms) =>
  new Promise(
    (resolve) =>
      setTimeout(resolve, ms)
  );


const SCRYFALL_HEADERS = {
  Accept: "application/json;q=0.9,*/*;q=0.8"
};


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
// TREATMENTS
// ======================================================

function mapTreatment(code) {

  const map = {

    PRM: [
      "Pre-Modern",
      "PRM"
    ],

    TRA: [
      "Traditional",
      "TRA"
    ],

    FTV: [
      "From the Vault",
      "FTV"
    ],

    FET: [
      "Foil-Etched",
      "FET"
    ],

    GET: [
      "Gold-Etched",
      "GET"
    ],

    TEX: [
      "Textured Foil",
      "TEX"
    ],

    AMP: [
      "Ampersand Foil",
      "AMP"
    ],

    SIL: [
      "Silverscreen Foil",
      "SIL"
    ],

    NEON: [
      "Neon Ink",
      "NEON"
    ],

    GIL: [
      "Gilded Foil",
      "GIL"
    ],

    GAL: [
      "Galaxy Foil",
      "GAL"
    ],

    SUR: [
      "Surge Foil",
      "SUR"
    ],

    DBR: [
      "Double Rainbow",
      "DBR"
    ],

    SCT: [
      "Step-and-Compleat Foil",
      "SCT"
    ],

    OSR: [
      "Oil Slick Raised Foil",
      "OSR"
    ],

    HAL: [
      "Halo Foil",
      "HAL"
    ],

    RAI: [
      "Rainbow Foil",
      "RAI"
    ],

    RIP: [
      "Ripple Foil",
      "RIP"
    ],

    FRA: [
      "Fracture Foil",
      "FRA"
    ],

    MAN: [
      "Mana Foil",
      "MAN"
    ],

    FIR: [
      "First Place Foil",
      "FIR"
    ]
  };


  if (
    !code ||
    !map[code]
  ) {

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
// SCRYFALL CACHE / IDENTIFIERS
// ======================================================

function cacheKeyFor(card) {

  if (
    card?.scryfallId
  ) {

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


  // Best:
  // exact Scryfall printing ID

  if (
    scryfallId
  ) {

    return {
      id: scryfallId
    };
  }


  // Exact printing:
  // set + collector number

  if (
    setCode &&
    collectorNumber
  ) {

    return {

      set:
        setCode,

      collector_number:
        collectorNumber
    };
  }


  // Legacy fallback:
  // name + set

  if (
    name &&
    setCode
  ) {

    return {

      name,
      set:
        setCode
    };
  }


  // Final fallback:
  // name

  if (
    name
  ) {

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

    cardObj
      ?.image_uris
      ?.normal ||

    cardObj
      ?.card_faces
      ?.[0]
      ?.image_uris
      ?.normal ||

    cardObj
      ?.image_uris
      ?.large ||

    cardObj
      ?.card_faces
      ?.[0]
      ?.image_uris
      ?.large ||

    ""
  );
}


// ======================================================
// LOCAL SCRYFALL CACHE
// ======================================================

const cardCacheMem =
  new Map();


function cacheGet(key) {

  if (
    cardCacheMem.has(
      key
    )
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


    if (
      raw
    ) {

      const value =
        JSON.parse(
          raw
        );


      cardCacheMem.set(
        key,
        value
      );


      return value;
    }

  } catch (
    error
  ) {

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
      JSON.stringify(
        value
      )
    );

  } catch (
    error
  ) {

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

  const CHUNK_SIZE =
    75;


  const output =
    new Map();


  for (
    let i = 0;
    i < identifiers.length;
    i += CHUNK_SIZE
  ) {

    const identifiersChunk =
      identifiers.slice(
        i,
        i + CHUNK_SIZE
      );


    const body = {

      identifiers:
        identifiersChunk
    };


    console.log(
      "SENDING TO SCRYFALL:",
      JSON.stringify(
        body,
        null,
        2
      )
    );


    while (
      true
    ) {

      const response =
        await fetch(
          "https://api.scryfall.com/cards/collection",
          {

            method:
              "POST",

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


      // ----------------------------------------------
      // RATE LIMIT
      // ----------------------------------------------

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


        console.warn(
          `Scryfall rate limit. Waiting ${retryAfter}s`
        );


        await sleep(
          retryAfter *
          1000
        );


        continue;
      }


      // ----------------------------------------------
      // ERROR
      // ----------------------------------------------

      if (
        !response.ok
      ) {

        console.error(
          "Scryfall error:",
          response.status,
          await response.text()
        );


        break;
      }


      const data =
        await response.json();


      // ----------------------------------------------
      // STORE RESULTS
      // ----------------------------------------------

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


        if (
          card.id
        ) {

          output.set(
            `scryfall-id:${card.id}`,
            card
          );
        }


        if (
          set &&
          collector
        ) {

          output.set(
            `set:${set}|num:${collector}`,
            card
          );
        }


        if (
          card.name
        ) {

          output.set(
            `name:${card.name}|set:${set}`,
            card
          );
        }
      }


      await sleep(
        150
      );


      break;
    }
  }


  return output;
}


// ======================================================
// SCRYFALL SINGLE-CARD FALLBACK
// ======================================================

async function fetchScryfallCard(
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


  const name =
    String(
      card?.name || ""
    ).trim();


  const urls = [];


  // --------------------------------------------------
  // SCRYFALL ID
  // --------------------------------------------------

  if (
    scryfallId
  ) {

    urls.push(
      `https://api.scryfall.com/cards/${encodeURIComponent(
        scryfallId
      )}`
    );
  }


  else {

    // ------------------------------------------------
    // EXACT SET + COLLECTOR
    // ------------------------------------------------

    if (
      setCode &&
      collectorNumber
    ) {

      urls.push(
        `https://api.scryfall.com/cards/${encodeURIComponent(
          setCode
        )}/${encodeURIComponent(
          collectorNumber
        )}`
      );
    }


    // ------------------------------------------------
    // LEGACY NAME + SET FALLBACK
    // ------------------------------------------------
    //
    // This deliberately preserves the behaviour of
    // old cards which don't have collector numbers.
    // ------------------------------------------------

    if (
      name
    ) {

      const fallbackUrl =
        new URL(
          "https://api.scryfall.com/cards/named"
        );


      fallbackUrl
        .searchParams
        .set(
          "exact",
          name
        );


      if (
        setCode
      ) {

        fallbackUrl
          .searchParams
          .set(
            "set",
            setCode
          );
      }


      urls.push(
        fallbackUrl.toString()
      );
    }
  }


  // --------------------------------------------------
  // TRY EACH SAFE SCRYFALL LOOKUP
  // --------------------------------------------------

  for (
    const url of
    urls
  ) {

    let response =
      await fetch(
        url,
        {
          headers:
            SCRYFALL_HEADERS
        }
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
          url,
          {
            headers:
              SCRYFALL_HEADERS
          }
        );
    }


    if (
      response.ok
    ) {

      return (
        response.json()
      );
    }


    if (
      response.status !==
      404
    ) {

      console.warn(
        "Scryfall lookup failed:",
        response.status,
        url
      );
    }
  }


  return null;
}


// ======================================================
// CARDMARKET
// ======================================================

function cardmarketSlug(
  text
) {

  if (
    !text
  ) {

    return "";
  }


  return String(
    text
  )

    .normalize(
      "NFD"
    )

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
// VERIFIED EXACT CARDMARKET OVERRIDES
// ======================================================

/*
 * Keep this empty unless we verify a specific
 * printing/treatment that Scryfall cannot map
 * correctly to Cardmarket.
 *
 * Format:
 *
 * "set:collector:treatment": "FULL URL"
 *
 * Example:
 *
 * "abc:123:FET": "https://..."
 */

const CARDMARKET_EXACT_OVERRIDES = {

};


// ======================================================
// STA VERSION HANDLING
// ======================================================

/*
 * Strixhaven Mystical Archive
 *
 * STA #1-63:
 *
 * Non-Foil          = V1
 * Traditional Foil  = V1
 * Foil-Etched       = V3
 *
 *
 * STA #64-126:
 *
 * Non-Foil          = V2
 * Traditional Foil  = V2
 * Foil-Etched       = V4
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
    !Number.isFinite(
      number
    )
  ) {

    return null;
  }


  // Global artwork

  if (
    number >= 1 &&
    number <= 63
  ) {

    if (
      treatment ===
      "FET"
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


  // Japanese alternate artwork

  if (
    number >= 64 &&
    number <= 126
  ) {

    if (
      treatment ===
      "FET"
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

  if (
    !rawUrl
  ) {

    return null;
  }


  try {

    const url =
      new URL(
        rawUrl
      );


    const productId =
      url
        .searchParams
        .get(
          "idProduct"
        );


    if (
      productId
    ) {

      return (
        `https://www.cardmarket.com/en/Magic/Products?idProduct=${encodeURIComponent(
          productId
        )}`
      );
    }


    url
      .searchParams
      .delete(
        "referrer"
      );


    url
      .searchParams
      .delete(
        "utm_source"
      );


    url
      .searchParams
      .delete(
        "utm_medium"
      );


    url
      .searchParams
      .delete(
        "utm_campaign"
      );


    return (
      url.toString()
    );

  } catch (
    error
  ) {

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

  if (
    !scryfallCard
  ) {

    return null;
  }


  const setCode =
    normalizeSetCode(

      scryfallCard.set ||

      firebaseCard
        ?.setCode
    );


  const collectorNumber =
    normalizeCollectorNumber(

      scryfallCard
        .collector_number ||

      firebaseCard
        ?.collectorNumber
    );


  const treatment =
    normalizeTreatment(
      firebaseCard
        ?.treatment
    );


  const treatmentKey =
    treatment ||
    "NONFOIL";


  const exactKey =
    `${setCode}:${collectorNumber}:${treatmentKey}`;


  // --------------------------------------------------
  // EXACT VERIFIED OVERRIDE
  // --------------------------------------------------

  if (
    Object
      .prototype
      .hasOwnProperty
      .call(
        CARDMARKET_EXACT_OVERRIDES,
        exactKey
      )
  ) {

    return (
      CARDMARKET_EXACT_OVERRIDES[
        exactKey
      ]
    );
  }


  // --------------------------------------------------
  // STRIXHAVEN MYSTICAL ARCHIVE
  // --------------------------------------------------

  if (
    setCode ===
    "sta"
  ) {

    const version =
      getStaCardmarketVersion(
        collectorNumber,
        treatment
      );


    if (
      version
    ) {

      const cardName =
        cardmarketSlug(
          scryfallCard.name
        );


      return (
        `https://www.cardmarket.com/en/Magic/Products/Singles/Mystical-Archive/${cardName}-V${version}`
      );
    }
  }


  // --------------------------------------------------
  // NORMAL CASE:
  // SCRYFALL CARDMARKET PRODUCT ID
  // --------------------------------------------------

  if (
    scryfallCard
      .cardmarket_id
  ) {

    return (
      `https://www.cardmarket.com/en/Magic/Products?idProduct=${encodeURIComponent(
        scryfallCard.cardmarket_id
      )}`
    );
  }


  // --------------------------------------------------
  // SECONDARY SCRYFALL PURCHASE URL
  // --------------------------------------------------

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

    scryfallCard
      ?.name ||

      firebaseCard
        ?.name,


    scryfallCard
      ?.set ||

      firebaseCard
        ?.setCode,


    scryfallCard
      ?.collector_number ||

      firebaseCard
        ?.collectorNumber

  ]

    .filter(
      Boolean
    )

    .join(
      " "
    );


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

    const resolveUid =
      () => {

        if (
          queryUsername
        ) {

          return get(
            ref(
              db,
              `usernames/${queryUsername}`
            )
          )

            .then(
              (
                snapshot
              ) => {

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


        if (
          queryUid
        ) {

          return (
            Promise.resolve(
              queryUid
            )
          );
        }


        return new Promise(
          (
            resolve,
            reject
          ) => {

            onAuthStateChanged(
              auth,
              (
                user
              ) => {

                if (
                  user
                ) {

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


          loadBinderForUser(
            targetUid
          );


          onAuthStateChanged(
            auth,
            (
              user
            ) => {

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
        (
          error
        ) => {

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
// BINDER PAGE ORGANISER
// ======================================================

const BINDER_SLOTS_PER_PAGE =
  9;


function loadBinderForUser(
  uid
) {

  const cardsRef =
    ref(
      db,
      `cards/${uid}`
    );


  const layoutRef =
    ref(
      db,
      `binderLayouts/${uid}`
    );


  const container =
    document.getElementById(
      "binderContainer"
    );


  if (
    !container
  ) {

    console.error(
      "binderContainer not found!"
    );


    return;
  }


  /*
   * binder.html itself can stay intact.
   *
   * Everything below is built inside the
   * existing #binderContainer.
   */

  container.innerHTML = `

    <div class="binder-workspace">

      <aside
        class="unsorted-panel"
        id="unsortedPanel"
      >

        <div class="unsorted-header">

          <div>

            <h2>
              Cards to Place
            </h2>

            <p class="binder-help">
              Drag a card into a pocket, or tap a card and then tap a pocket.
            </p>

          </div>


          <span
            class="unsorted-count"
            id="unsortedCount"
          >
            0
          </span>

        </div>


        <button
          type="button"
          class="return-unsorted-button"
          id="returnUnsortedBtn"
          hidden
        >
          Return selected card to Unsorted
        </button>


        <div
          class="unsorted-cards"
          id="unsortedCards"
        >

          <div class="binder-loading">
            Loading cards...
          </div>

        </div>

      </aside>


      <section
        class="binder-stage"
        aria-label="Binder page organiser"
      >

        <div class="binder-page-toolbar">
          <button
            type="button"
            id="deletePageBtn"
          >
            🗑 Delete Page
          </button>

          <button
            type="button"
            id="previousPageBtn"
          >
            ◀ Previous
          </button>

          <div
            class="page-indicator"
            id="pageIndicator"
          >
            Page 1 of 1
          </div>


          <button
            type="button"
            id="nextPageBtn"
          >
            Next ▶
          </button>


          <button
            type="button"
            id="addPageBtn"
          >
            ＋ Add Page
          </button>

          

        </div>


        <div class="binder-page-shell">

          <div
            class="binder-page"
            id="binderPage"
          >

            <div
              class="binder-slots"
              id="binderSlots"
            >
            </div>

          </div>

        </div>


        <p
          class="binder-status"
          id="binderStatus"
          aria-live="polite"
        >
          New cards stay in Cards to Place until you put them in a pocket.
        </p>

      </section>

    </div>
  `;


  // ==================================================
  // DOM REFERENCES
  // ==================================================

  const unsortedPanel =
    document.getElementById(
      "unsortedPanel"
    );


  const unsortedCards =
    document.getElementById(
      "unsortedCards"
    );


  const unsortedCount =
    document.getElementById(
      "unsortedCount"
    );


  const binderSlots =
    document.getElementById(
      "binderSlots"
    );


  const pageIndicator =
    document.getElementById(
      "pageIndicator"
    );


  const previousPageBtn =
    document.getElementById(
      "previousPageBtn"
    );


  const nextPageBtn =
    document.getElementById(
      "nextPageBtn"
    );


  const addPageBtn =
    document.getElementById(
      "addPageBtn"
    );

  const deletePageBtn =
  document.getElementById(
    "deletePageBtn"
  );

  const returnUnsortedBtn =
    document.getElementById(
      "returnUnsortedBtn"
    );


  const binderStatus =
    document.getElementById(
      "binderStatus"
    );


  // ==================================================
  // LOCAL STATE
  // ==================================================

  let currentPage =
    0;


  let currentCards =
    new Map();


  let cardElements =
    new Map();


  let cardsReady =
    false;


  let layoutReady =
    false;


  let selectedCardId =
    null;


  let draggedCardId =
    null;


  let cardsLoadVersion =
    0;


  let layout = {

    pageCount:
      1,

    positions:
      {}
  };


  // ==================================================
  // STATUS MESSAGE
  // ==================================================

  function setStatus(
    message
  ) {

    if (
      binderStatus
    ) {

      binderStatus.textContent =
        message;
    }
  }


  // ==================================================
  // POSITION HELPERS
  // ==================================================

  function getPosition(
    cardId
  ) {

    const raw =
      layout
        .positions
        ?.[cardId];


    const value =
      Number(
        raw
      );


    return (
      Number.isInteger(
        value
      ) &&
      value >= 0
    )

      ? value

      : null;
  }


  function getCardAtPosition(
    position
  ) {

    for (
      const cardId of
      currentCards.keys()
    ) {

      if (
        getPosition(
          cardId
        ) ===
        position
      ) {

        return cardId;
      }
    }


    return null;
  }


  function getEffectivePageCount() {

    let highestPosition =
      -1;


    for (
      const cardId of
      currentCards.keys()
    ) {

      const position =
        getPosition(
          cardId
        );


      if (
        position !== null &&
        position >
          highestPosition
      ) {

        highestPosition =
          position;
      }
    }


    const pagesNeededForCards =
      highestPosition >= 0

        ? Math.floor(
            highestPosition /
            BINDER_SLOTS_PER_PAGE
          ) + 1

        : 1;


    return Math.max(

      Number(
        layout.pageCount
      ) || 1,

      pagesNeededForCards,

      1
    );
  }


  // ==================================================
  // CARD SELECTION
  // ==================================================

  function refreshSelectionStyles() {

    cardElements.forEach(
      (
        element,
        cardId
      ) => {

        element
          .classList
          .toggle(
            "binder-card-selected",
            cardId ===
              selectedCardId
          );
      }
    );


    returnUnsortedBtn.hidden =

      !selectedCardId ||

      getPosition(
        selectedCardId
      ) === null;
  }


  function selectCard(
    cardId
  ) {

    if (
      !cardId ||
      !currentCards.has(
        cardId
      )
    ) {

      selectedCardId =
        null;


      refreshSelectionStyles();


      return;
    }


    selectedCardId =

      selectedCardId ===
      cardId

        ? null

        : cardId;


    refreshSelectionStyles();


    if (
      selectedCardId
    ) {

      const card =
        currentCards.get(
          selectedCardId
        );


      setStatus(
        `${card?.name || "Card"} selected. Tap a binder pocket to place it.`
      );

    } else {

      setStatus(
        "Selection cleared. Drag a card into a pocket, or tap a card and then tap a pocket."
      );
    }
  }


  // ==================================================
  // SAVE CARD MOVE
  // ==================================================

  async function saveMove(
    cardId,
    targetPosition
  ) {

    if (
      !cardId ||

      !currentCards.has(
        cardId
      ) ||

      !Number.isInteger(
        targetPosition
      ) ||

      targetPosition < 0
    ) {

      return;
    }


    const oldPosition =
      getPosition(
        cardId
      );


    if (
      oldPosition ===
      targetPosition
    ) {

      selectedCardId =
        null;


      refreshSelectionStyles();


      return;
    }


    const occupyingCardId =
      getCardAtPosition(
        targetPosition
      );


    const updates = {};


    // Move selected card into target pocket.

    updates[
      `binderLayouts/${uid}/positions/${cardId}`
    ] = targetPosition;


    // This automatically creates binderLayouts/{uid}
    // the first time a card is placed.

    updates[
      `binderLayouts/${uid}/pageCount`
    ] = getEffectivePageCount();


    if (
      occupyingCardId &&
      occupyingCardId !==
        cardId
    ) {

      // ----------------------------------------------
      // BINDER CARD -> OCCUPIED POCKET
      //
      // Swap them.
      // ----------------------------------------------

      if (
        oldPosition !== null
      ) {

        updates[
          `binderLayouts/${uid}/positions/${occupyingCardId}`
        ] = oldPosition;
      }


      // ----------------------------------------------
      // UNSORTED CARD -> OCCUPIED POCKET
      //
      // Existing card returns to unsorted.
      // ----------------------------------------------

      else {

        updates[
          `binderLayouts/${uid}/positions/${occupyingCardId}`
        ] = null;
      }
    }


    try {

      await update(
        ref(
          db
        ),
        updates
      );


      selectedCardId =
        null;


      refreshSelectionStyles();


      const card =
        currentCards.get(
          cardId
        );


      const pocketOnPage =
        (
          targetPosition %
          BINDER_SLOTS_PER_PAGE
        ) + 1;


      const pageNumber =
        Math.floor(
          targetPosition /
          BINDER_SLOTS_PER_PAGE
        ) + 1;


      setStatus(
        `${card?.name || "Card"} placed in page ${pageNumber}, pocket ${pocketOnPage}.`
      );

    } catch (
      error
    ) {

      console.error(
        "Could not save binder position:",
        error
      );


      setStatus(
        "Could not save that binder move. Check the browser console for the Firebase error."
      );
    }
  }


  // ==================================================
  // RETURN CARD TO UNSORTED
  // ==================================================

  async function returnCardToUnsorted(
    cardId
  ) {

    if (
      !cardId ||

      !currentCards.has(
        cardId
      ) ||

      getPosition(
        cardId
      ) === null
    ) {

      return;
    }


    try {

      const updates =
        {};


      updates[
        `binderLayouts/${uid}/positions/${cardId}`
      ] = null;


      await update(
        ref(
          db
        ),
        updates
      );


      selectedCardId =
        null;


      refreshSelectionStyles();


      const card =
        currentCards.get(
          cardId
        );


      setStatus(
        `${card?.name || "Card"} returned to Cards to Place.`
      );

    } catch (
      error
    ) {

      console.error(
        "Could not return card to unsorted:",
        error
      );


      setStatus(
        "Could not return that card to the unsorted tray."
      );
    }
  }


// ======================================================
// ADD PAGE
// ======================================================

async function addBinderPage() {

  const nextPageCount =
    getEffectivePageCount() + 1;


  try {

    const updates = {};


    updates[
      `binderLayouts/${uid}/pageCount`
    ] = nextPageCount;


    await update(
      ref(db),
      updates
    );


    /*
     * IMPORTANT:
     *
     * Update our local copy immediately.
     *
     * Otherwise renderLayout() may still think
     * the old page count is active until Firebase's
     * onValue listener comes back.
     */

    layout.pageCount =
      nextPageCount;


    /*
     * Move directly onto the page we just created.
     */

    currentPage =
      nextPageCount - 1;


    /*
     * Render immediately instead of waiting for
     * the Firebase listener.
     */

    renderLayout();


    setStatus(
      `Page ${nextPageCount} added.`
    );

  } catch (
    error
  ) {

    console.error(
      "Could not add binder page:",
      error
    );


    setStatus(
      "Could not add a binder page. Check Firebase permissions."
    );
  }
}

// ======================================================
// DELETE PAGE
// ======================================================

async function deleteCurrentBinderPage() {

  const pageCount =
    getEffectivePageCount();


  // ==================================================
  // ALWAYS KEEP AT LEAST ONE PAGE
  // ==================================================

  if (
    pageCount <= 1
  ) {

    setStatus(
      "The binder must always have at least one page."
    );


    return;
  }


  const pageToDelete =
    currentPage;


  const pageNumber =
    pageToDelete + 1;


  const pageStart =
    pageToDelete *
    BINDER_SLOTS_PER_PAGE;


  const pageEnd =
    pageStart +
    BINDER_SLOTS_PER_PAGE;


  // ==================================================
  // FIND CARDS CURRENTLY ON THIS PAGE
  // ==================================================

  const cardsOnDeletedPage =
    [];


  for (
    const [
      cardId,
      card
    ] of currentCards
  ) {

    const position =
      getPosition(
        cardId
      );


    if (
      position !== null &&
      position >= pageStart &&
      position < pageEnd
    ) {

      cardsOnDeletedPage.push({
        cardId,
        card,
        position
      });
    }
  }


  // ==================================================
  // CONFIRM DELETION
  // ==================================================

  let confirmMessage =
    `Delete Page ${pageNumber}?`;


  if (
    cardsOnDeletedPage.length >
    0
  ) {

    confirmMessage +=
      `\n\n${cardsOnDeletedPage.length} card${cardsOnDeletedPage.length === 1 ? "" : "s"} on this page will be returned to Cards to Place.`;
  }


  if (
    pageToDelete <
    pageCount - 1
  ) {

    confirmMessage +=
      "\n\nPages after this one will move back by one page.";
  }


  if (
    !window.confirm(
      confirmMessage
    )
  ) {

    return;
  }


  // ==================================================
  // BUILD ONE FIREBASE UPDATE
  // ==================================================

  const updates =
    {};


  /*
   * This becomes our local copy of the
   * positions after deletion.
   */

  const nextPositions =
    {};


  // ==================================================
  // PROCESS ALL SAVED POSITIONS
  // ==================================================

  for (
    const [
      cardId,
      rawPosition
    ] of Object.entries(
      layout.positions ||
      {}
    )
  ) {

    const position =
      Number(
        rawPosition
      );


    if (
      !Number.isInteger(
        position
      ) ||
      position < 0
    ) {

      continue;
    }


    // ==================================================
    // CARD IS ON THE PAGE BEING DELETED
    //
    // Remove its binder position.
    // The card itself remains safely in cards/{uid}.
    // ==================================================

    if (
      position >= pageStart &&
      position < pageEnd
    ) {

      updates[
        `binderLayouts/${uid}/positions/${cardId}`
      ] = null;


      continue;
    }


    // ==================================================
    // CARD IS ON A LATER PAGE
    //
    // Move it backwards exactly one page.
    //
    // Example:
    //
    // Page 3 slot 1 = position 18
    //
    // Delete Page 2
    //
    // 18 - 9 = 9
    //
    // It is now Page 2 slot 1.
    // ==================================================

    if (
      position >= pageEnd
    ) {

      const shiftedPosition =
        position -
        BINDER_SLOTS_PER_PAGE;


      updates[
        `binderLayouts/${uid}/positions/${cardId}`
      ] = shiftedPosition;


      nextPositions[
        cardId
      ] = shiftedPosition;


      continue;
    }


    // ==================================================
    // CARD IS BEFORE THE DELETED PAGE
    //
    // Leave it exactly where it is.
    // ==================================================

    nextPositions[
      cardId
    ] = position;
  }


  // ==================================================
  // REDUCE PAGE COUNT
  // ==================================================

  const nextPageCount =
    Math.max(
      pageCount - 1,
      1
    );


  updates[
    `binderLayouts/${uid}/pageCount`
  ] = nextPageCount;


  // ==================================================
  // SAVE
  // ==================================================

  try {

    await update(
      ref(db),
      updates
    );


    // ==================================================
    // UPDATE LOCAL STATE IMMEDIATELY
    //
    // Same principle as the Add Page fix:
    // don't make the UI wait for Firebase's listener.
    // ==================================================

    layout.pageCount =
      nextPageCount;


    layout.positions =
      nextPositions;


    // ==================================================
    // DECIDE WHICH PAGE TO SHOW NEXT
    // ==================================================

    /*
     * If we deleted a middle page:
     *
     * Page 3 becomes Page 2, so remain on
     * the same currentPage index.
     *
     * If we deleted the final page:
     *
     * Go backwards onto the new final page.
     */

    currentPage =
      Math.min(
        pageToDelete,
        nextPageCount - 1
      );


    selectedCardId =
      null;


    refreshSelectionStyles();


    renderLayout();


    // ==================================================
    // STATUS MESSAGE
    // ==================================================

    if (
      cardsOnDeletedPage.length >
      0
    ) {

      setStatus(
        `Page ${pageNumber} deleted. ${cardsOnDeletedPage.length} card${cardsOnDeletedPage.length === 1 ? "" : "s"} returned to Cards to Place.`
      );

    } else {

      setStatus(
        `Page ${pageNumber} deleted.`
      );
    }

  } catch (
    error
  ) {

    console.error(
      "Could not delete binder page:",
      error
    );


    setStatus(
      "Could not delete that binder page. Check the browser console for the Firebase error."
    );
  }
}


  // ==================================================
  // RENDER LAYOUT
  // ==================================================

  function renderLayout() {

    if (
      !cardsReady ||
      !layoutReady
    ) {

      return;
    }


    const pageCount =
      getEffectivePageCount();


    currentPage =
      Math.min(

        Math.max(
          currentPage,
          0
        ),

        pageCount -
          1
      );


    const pageStart =
      currentPage *
      BINDER_SLOTS_PER_PAGE;


    const pageEnd =
      pageStart +
      BINDER_SLOTS_PER_PAGE;


    // ==================================================
    // UNSORTED / CARDS TO PLACE
    // ==================================================

    unsortedCards.innerHTML =
      "";


    let unsortedTotal =
      0;


    for (
      const [
        cardId
      ] of
      currentCards
    ) {

      if (
        getPosition(
          cardId
        ) === null
      ) {

        unsortedTotal +=
          1;


        const element =
          cardElements.get(
            cardId
          );


        if (
          element
        ) {

          unsortedCards.appendChild(
            element
          );
        }
      }
    }


    unsortedCount.textContent =
      String(
        unsortedTotal
      );


    if (
      unsortedTotal ===
      0
    ) {

      const emptyMessage =
        document.createElement(
          "div"
        );


      emptyMessage.className =
        "unsorted-empty";


      emptyMessage.textContent =
        "Everything is in the binder.";


      unsortedCards.appendChild(
        emptyMessage
      );
    }


    // ==================================================
    // CURRENT 3 x 3 PAGE
    // ==================================================

    binderSlots.innerHTML =
      "";


    for (
      let position =
        pageStart;

      position <
        pageEnd;

      position++
    ) {

      const slot =
        document.createElement(
          "div"
        );


      slot.className =
        "binder-slot";


      slot.dataset.position =
        String(
          position
        );


      slot.setAttribute(
        "aria-label",
        `Binder pocket ${position + 1}`
      );


      // Pocket number

      const pocketNumber =
        document.createElement(
          "span"
        );


      pocketNumber.className =
        "pocket-number";


      pocketNumber.textContent =
        String(
          (
            position %
            BINDER_SLOTS_PER_PAGE
          ) + 1
        );


      slot.appendChild(
        pocketNumber
      );


      // ----------------------------------------------
      // CARD IN THIS SLOT?
      // ----------------------------------------------

      const cardId =
        getCardAtPosition(
          position
        );


      if (
        cardId
      ) {

        slot.classList.add(
          "binder-slot-filled"
        );


        const element =
          cardElements.get(
            cardId
          );


        if (
          element
        ) {

          slot.appendChild(
            element
          );
        }

      } else {

        const pocketHint =
          document.createElement(
            "span"
          );


        pocketHint.className =
          "empty-pocket-label";


        pocketHint.textContent =
          "Empty Pocket";


        slot.appendChild(
          pocketHint
        );
      }


      // ----------------------------------------------
      // DRAG OVER
      // ----------------------------------------------

      slot.addEventListener(
        "dragover",
        (
          event
        ) => {

          event.preventDefault();


          slot.classList.add(
            "binder-slot-dragover"
          );
        }
      );


      // ----------------------------------------------
      // DRAG LEAVE
      // ----------------------------------------------

      slot.addEventListener(
        "dragleave",
        () => {

          slot.classList.remove(
            "binder-slot-dragover"
          );
        }
      );


      // ----------------------------------------------
      // DROP
      // ----------------------------------------------

      slot.addEventListener(
        "drop",
        (
          event
        ) => {

          event.preventDefault();


          slot.classList.remove(
            "binder-slot-dragover"
          );


          const cardIdFromDrop =

            event
              .dataTransfer
              ?.getData(
                "text/plain"
              ) ||

            draggedCardId;


          if (
            cardIdFromDrop
          ) {

            saveMove(
              cardIdFromDrop,
              position
            );
          }
        }
      );


      // ----------------------------------------------
      // TAP / CLICK POCKET
      // ----------------------------------------------

      slot.addEventListener(
        "click",
        (
          event
        ) => {

          /*
           * Clicking the card itself or its
           * Cardmarket button should not also
           * count as clicking the pocket.
           */

          if (
            event.target.closest(
              ".card-box"
            )
          ) {

            return;
          }


          if (
            selectedCardId
          ) {

            saveMove(
              selectedCardId,
              position
            );
          }
        }
      );


      binderSlots.appendChild(
        slot
      );
    }


    // ==================================================
    // PAGE CONTROLS
    // ==================================================

    pageIndicator.textContent =
      `Page ${currentPage + 1} of ${pageCount}`;


    previousPageBtn.disabled =
      currentPage <=
      0;


    nextPageBtn.disabled =
      currentPage >=
      pageCount - 1;

    deletePageBtn.disabled =
      pageCount <=
      1;
      
    refreshSelectionStyles();
  }


  // ==================================================
  // CARD DRAG / TAP EVENTS
  // ==================================================

  function attachCardOrganiserEvents(
    cardBox,
    cardId
  ) {

    cardBox.dataset.cardId =
      cardId;


    cardBox.draggable =
      true;


    // ----------------------------------------------
    // DRAG START
    // ----------------------------------------------

    cardBox.addEventListener(
      "dragstart",
      (
        event
      ) => {

        draggedCardId =
          cardId;


        cardBox.classList.add(
          "binder-card-dragging"
        );


        if (
          event.dataTransfer
        ) {

          event.dataTransfer.effectAllowed =
            "move";


          event.dataTransfer.setData(
            "text/plain",
            cardId
          );
        }
      }
    );


    // ----------------------------------------------
    // DRAG END
    // ----------------------------------------------

    cardBox.addEventListener(
      "dragend",
      () => {

        draggedCardId =
          null;


        cardBox.classList.remove(
          "binder-card-dragging"
        );


        document

          .querySelectorAll(
            ".binder-slot-dragover"
          )

          .forEach(
            (
              slot
            ) => {

              slot.classList.remove(
                "binder-slot-dragover"
              );
            }
          );
      }
    );


    // ----------------------------------------------
    // TAP / CLICK CARD
    // ----------------------------------------------

    cardBox.addEventListener(
      "click",
      (
        event
      ) => {

        /*
         * Search/Cardmarket links do their own thing.
         */

        if (
          event.target.closest(
            "button, a"
          )
        ) {

          return;
        }


        event.stopPropagation();


        /*
         * If a different card is already selected
         * and this clicked card is already in the
         * binder, use its pocket as the destination.
         *
         * This makes tap-to-swap work on phones.
         */

        if (
          selectedCardId &&
          selectedCardId !==
            cardId
        ) {

          const targetPosition =
            getPosition(
              cardId
            );


          if (
            targetPosition !==
            null
          ) {

            saveMove(
              selectedCardId,
              targetPosition
            );


            return;
          }
        }


        selectCard(
          cardId
        );
      }
    );
  }


  // ==================================================
  // CREATE CARD ELEMENT
  // ==================================================

  async function createCardElement(
    cardId,
    card,
    key
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


    if (
      show
    ) {

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
    // CARD IMAGE
    // ==================================================

    const image =
      document.createElement(
        "img"
      );


    image.alt =
      card.name;


    image.draggable =
      false;


    let scryfallCard =
      cacheGet(
        key
      );


    if (
      !scryfallCard
    ) {

      try {

        await sleep(
          120
        );


        scryfallCard =
          await fetchScryfallCard(
            card
          );


        if (
          scryfallCard
        ) {

          cacheSet(
            key,
            scryfallCard
          );
        }

      } catch (
        error
      ) {

        console.warn(
          "Scryfall fallback failed:",
          error
        );
      }
    }


    if (
      scryfallCard
    ) {

      image.src =
        getBestImage(
          scryfallCard
        );
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


    button.draggable =
      false;


    button.onclick =
      async (
        event
      ) => {

        /*
         * Prevent the Cardmarket button click
         * from selecting the binder card.
         */

        event.stopPropagation();


        /*
         * IMPORTANT:
         *
         * We NEVER fetch Cardmarket.
         *
         * We only resolve a URL using
         * Scryfall information and then
         * navigate there after the user click.
         */

        let sf =
          cacheGet(
            key
          );


        if (
          !sf
        ) {

          try {

            sf =
              await fetchScryfallCard(
                card
              );


            if (
              sf
            ) {

              cacheSet(
                key,
                sf
              );
            }

          } catch (
            error
          ) {

            console.error(
              "Could not retrieve Scryfall card:",
              error
            );
          }
        }


        // ----------------------------------------------
        // DIRECT CARDMARKET RESULT
        // ----------------------------------------------

        if (
          sf
        ) {

          const cardmarketUrl =
            resolveCardmarketUrl(
              sf,
              card
            );


          if (
            cardmarketUrl
          ) {

            window.open(
              cardmarketUrl,
              "_blank"
            );


            return;
          }
        }


        // ----------------------------------------------
        // SAFE SEARCH FALLBACK
        // ----------------------------------------------

        const searchUrl =
          buildCardmarketSearchUrl(
            sf,
            card
          );


        window.open(
          searchUrl,
          "_blank"
        );
      };


    // ==================================================
    // APPEND CARD PARTS
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


    attachCardOrganiserEvents(
      cardBox,
      cardId
    );


    return cardBox;
  }


  // ==================================================
  // PAGE CONTROL EVENTS
  // ==================================================

  previousPageBtn.addEventListener(
    "click",
    () => {

      if (
        currentPage >
        0
      ) {

        currentPage -=
          1;


        renderLayout();
      }
    }
  );


  nextPageBtn.addEventListener(
    "click",
    () => {

      if (
        currentPage <
        getEffectivePageCount() -
          1
      ) {

        currentPage +=
          1;


        renderLayout();
      }
    }
  );


  addPageBtn.addEventListener(
    "click",
    addBinderPage
  );

  deletePageBtn.addEventListener(
  "click",
  deleteCurrentBinderPage
  );


  returnUnsortedBtn.addEventListener(
    "click",
    () => {

      if (
        selectedCardId
      ) {

        returnCardToUnsorted(
          selectedCardId
        );
      }
    }
  );


  // ==================================================
  // UNSORTED PANEL DROP TARGET
  // ==================================================

  unsortedPanel.addEventListener(
    "dragover",
    (
      event
    ) => {

      event.preventDefault();


      unsortedPanel.classList.add(
        "unsorted-panel-dragover"
      );
    }
  );


  unsortedPanel.addEventListener(
    "dragleave",
    (
      event
    ) => {

      if (
        !unsortedPanel.contains(
          event.relatedTarget
        )
      ) {

        unsortedPanel.classList.remove(
          "unsorted-panel-dragover"
        );
      }
    }
  );


  unsortedPanel.addEventListener(
    "drop",
    (
      event
    ) => {

      event.preventDefault();


      unsortedPanel.classList.remove(
        "unsorted-panel-dragover"
      );


      const cardId =

        event
          .dataTransfer
          ?.getData(
            "text/plain"
          ) ||

        draggedCardId;


      if (
        cardId
      ) {

        returnCardToUnsorted(
          cardId
        );
      }
    }
  );


  // ==================================================
  // FIREBASE LAYOUT LISTENER
  // ==================================================

  onValue(
    layoutRef,

    (
      snapshot
    ) => {

      const value =
        snapshot.val() ||
        {};


      const positions =

        value.positions &&

        typeof value.positions ===
          "object"

          ? value.positions

          : {};


      layout = {

        pageCount:
          Math.max(
            Number(
              value.pageCount
            ) || 1,
            1
          ),

        positions
      };


      layoutReady =
        true;


      renderLayout();
    },


    (
      error
    ) => {

      console.error(
        "Could not read binder layout:",
        error
      );


      /*
       * A missing layout is absolutely fine.
       *
       * It means all cards start in
       * Cards to Place.
       */

      layout = {

        pageCount:
          1,

        positions:
          {}
      };


      layoutReady =
        true;


      renderLayout();
    }
  );


  // ==================================================
  // FIREBASE CARDS + SCRYFALL
  // ==================================================

  onValue(
    cardsRef,

    async (
      snapshot
    ) => {

      /*
       * Used to prevent an old asynchronous
       * Scryfall render from overwriting a
       * newer Firebase snapshot.
       */

      const thisLoad =
        ++cardsLoadVersion;


      const data =
        snapshot.val() ||
        {};


      const entries =
        Object.entries(
          data
        );


      cardsReady =
        false;


      unsortedCards.innerHTML =
        '<div class="binder-loading">Loading cards...</div>';


      const identifiers =
        [];


      const keyForIndex =
        [];


      // ==================================================
      // BUILD SCRYFALL REQUEST LIST
      // ==================================================

      for (
        const [
          cardId,
          card
        ] of
        entries
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


        if (
          !cacheGet(
            key
          )
        ) {

          const identifier =
            buildIdentifier(
              card
            );


          if (
            identifier
          ) {

            identifiers.push(
              identifier
            );
          }
        }
      }


      // ==================================================
      // FETCH UNCACHED SCRYFALL CARDS
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
            } of
            keyForIndex
          ) {

            if (
              cacheGet(
                key
              )
            ) {

              continue;
            }


            // ------------------------------------------
            // CURRENT CACHE KEY
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
            // SCRYFALL ID FALLBACK
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
            // SET + COLLECTOR FALLBACK
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

        } catch (
          error
        ) {

          console.error(
            "Scryfall batch fetch failed:",
            error
          );
        }
      }


      /*
       * A newer cards snapshot arrived
       * while Scryfall was loading.
       *
       * Ignore this old render.
       */

      if (
        thisLoad !==
        cardsLoadVersion
      ) {

        return;
      }


      // ==================================================
      // CREATE THE CARD ELEMENTS
      // ==================================================

      const nextCards =
        new Map();


      const nextElements =
        new Map();


      for (
        const {

          cardId,

          card,

          key

        } of
        keyForIndex
      ) {

        nextCards.set(
          cardId,
          card
        );


        const cardBox =
          await createCardElement(
            cardId,
            card,
            key
          );


        if (
          thisLoad !==
          cardsLoadVersion
        ) {

          return;
        }


        nextElements.set(
          cardId,
          cardBox
        );
      }


      currentCards =
        nextCards;


      cardElements =
        nextElements;


      if (
        selectedCardId &&

        !currentCards.has(
          selectedCardId
        )
      ) {

        selectedCardId =
          null;
      }


      cardsReady =
        true;


      if (
        entries.length ===
        0
      ) {

        setStatus(
          "No cards found in this collection yet."
        );
      }


      renderLayout();
    },


    (
      error
    ) => {

      console.error(
        "Could not load cards:",
        error
      );


      unsortedCards.innerHTML =
        '<div class="binder-loading">Error loading cards.</div>';
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


  if (
    !shareBtn
  ) {

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

        await navigator
          .clipboard
          .writeText(
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