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


const app =
  initializeApp(
    firebaseConfig
  );


const db =
  getDatabase(
    app
  );


const auth =
  getAuth(
    app
  );


// ======================================================
// CONSTANTS
// ======================================================

const BINDER_SLOTS_PER_PAGE =
  9;


const SCRYFALL_HEADERS = {
  Accept: "application/json;q=0.9,*/*;q=0.8"
};


const sleep =
  (ms) =>
    new Promise(
      (
        resolve
      ) => {
        setTimeout(
          resolve,
          ms
        );
      }
    );


// ======================================================
// NORMALISATION
// ======================================================

function normalizeSetCode(
  value
) {

  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}


function normalizeCollectorNumber(
  value
) {

  return String(
    value || ""
  )
    .trim()
    .replace(
      /^0+(?=\d)/,
      ""
    );
}


function normalizeTreatment(
  value
) {

  return String(
    value || ""
  )
    .trim()
    .toUpperCase();
}


// ======================================================
// TREATMENTS
// ======================================================

function mapTreatment(
  code
) {

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
// SCRYFALL CACHE KEY
// ======================================================

function cacheKeyFor(
  card
) {

  const scryfallId =
    String(
      card?.scryfallId || ""
    ).trim();


  if (
    scryfallId
  ) {

    return (
      `scryfall-id:${scryfallId}`
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
// SCRYFALL IDENTIFIER
// ======================================================

function buildIdentifier(
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


  if (
    scryfallId
  ) {

    return {
      id:
        scryfallId
    };
  }


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


  if (
    name
  ) {

    return {
      name
    };
  }


  return null;
}


// ======================================================
// CARD IMAGE
// ======================================================

function getBestImage(
  cardObj
) {

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


function cacheGet(
  key
) {

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
        "scryfall:" +
        key
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
      "scryfall:" +
      key,
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

    const chunk =
      identifiers.slice(
        i,
        i + CHUNK_SIZE
      );


    const body = {
      identifiers:
        chunk
    };


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


        continue;
      }


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
// SINGLE SCRYFALL FALLBACK
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


  const urls =
    [];


  if (
    scryfallId
  ) {

    urls.push(
      `https://api.scryfall.com/cards/${encodeURIComponent(
        scryfallId
      )}`
    );

  } else {

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


    if (
      name
    ) {

      const fallback =
        new URL(
          "https://api.scryfall.com/cards/named"
        );


      fallback
        .searchParams
        .set(
          "exact",
          name
        );


      if (
        setCode
      ) {

        fallback
          .searchParams
          .set(
            "set",
            setCode
          );
      }


      urls.push(
        fallback.toString()
      );
    }
  }


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
  }


  return null;
}


// ======================================================
// CARDMARKET UTILITIES
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
// VERIFIED CARDMARKET OVERRIDES
// ======================================================

const CARDMARKET_EXACT_OVERRIDES = {

};


// ======================================================
// STRIXHAVEN MYSTICAL ARCHIVE
// ======================================================

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
// CLEAN CARDMARKET PURCHASE URL
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
// CARDMARKET URL
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


  const exactKey =
    `${setCode}:${collectorNumber}:${treatment || "NONFOIL"}`;


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
  // STA SPECIAL CASE
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
  // PREFERRED NORMAL CASE
  // --------------------------------------------------

  if (
    scryfallCard.cardmarket_id
  ) {

    return (
      `https://www.cardmarket.com/en/Magic/Products?idProduct=${encodeURIComponent(
        scryfallCard.cardmarket_id
      )}`
    );
  }


  // --------------------------------------------------
  // SCRYFALL PURCHASE URI FALLBACK
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

    scryfallCard?.name ||
      firebaseCard?.name,

    scryfallCard?.set ||
      firebaseCard?.setCode,

    scryfallCard?.collector_number ||
      firebaseCard?.collectorNumber

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
// MAIN PAGE
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


    //const basePath =
    //  `${window.location.origin}/mtg-binder`;


    // ==================================================
    // RESOLVE USER UID
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

          return Promise.resolve(
            queryUid
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
                  "Not logged in and no username or uid supplied."
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
            "Redirecting to login:",
            error
          );


          location.href =
            "login.html";
        }
      );
  }
);


// ======================================================
// BINDER ORGANISER
// ======================================================

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
      "binderContainer not found."
    );


    return;
  }


  // ==================================================
  // RESPONSIVE MODES
  // ==================================================

  const desktopSpreadQuery =
    window.matchMedia(
      "(min-width: 1180px)"
    );


  const stackedTrayQuery =
    window.matchMedia(
      "(min-width: 901px)"
    );


  const reducedMotionQuery =
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );


  function isDoublePageMode() {

    return (
      desktopSpreadQuery.matches
    );
  }


  // ==================================================
  // BUILD INTERFACE
  // ==================================================

  container.innerHTML = `

    <div
      class="binder-workspace"
      id="binderWorkspace"
    >

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
          Return selected card to Cards to Place
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


        <div
          class="binder-spread"
          id="binderSpread"
        >
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
  // DOM
  // ==================================================

  const binderWorkspace =
    document.getElementById(
      "binderWorkspace"
    );


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


  const binderStage =
    container.querySelector(
      ".binder-stage"
    );


  const binderSpread =
    document.getElementById(
      "binderSpread"
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


  const returnUnsortedBtn =
    document.getElementById(
      "returnUnsortedBtn"
    );


  const binderStatus =
    document.getElementById(
      "binderStatus"
    );


  // ==================================================
  // STATE
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


  let isPageTurning =
    false;


  let layout = {
    pageCount: 1,
    positions: {}
  };


  // ==================================================
  // STATUS
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


    const pagesNeeded =

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
      pagesNeeded,
      1
    );
  }


  function getSpreadStart() {

    if (
      !isDoublePageMode()
    ) {

      return currentPage;
    }


    return (
      Math.floor(
        currentPage / 2
      ) * 2
    );
  }


  // ==================================================
  // CLEAR UNSORTED INLINE POSITION
  // ==================================================

  function clearUnsortedStackStyles(
    card
  ) {

    if (
      !card
    ) {

      return;
    }


    card.style.removeProperty(
      "position"
    );


    card.style.removeProperty(
      "top"
    );


    card.style.removeProperty(
      "left"
    );


    card.style.removeProperty(
      "transform"
    );


    card.style.removeProperty(
      "z-index"
    );
  }


  // ==================================================
  // CARDS TO PLACE PHYSICAL STACK
  // ==================================================

  function layoutUnsortedStack() {

    const cards =
      Array.from(
        unsortedCards.querySelectorAll(
          ":scope > .card-box"
        )
      );


    if (
      !stackedTrayQuery.matches
    ) {

      cards.forEach(
        (
          card
        ) => {

          clearUnsortedStackStyles(
            card
          );
        }
      );


      return;
    }


    if (
      cards.length ===
      0
    ) {

      return;
    }


    const availableHeight =
      unsortedCards.clientHeight;


    const cardHeight =
      cards[0]
        .getBoundingClientRect()
        .height;


    // Preferred exposed portion.

    let stackGap =
      50;


    if (
      cards.length >
      1
    ) {

      const fittingGap =
        (
          availableHeight -
          cardHeight
        ) /
        (
          cards.length -
          1
        );


      stackGap =
        Math.min(
          50,
          Math.max(
            8,
            fittingGap
          )
        );
    }


    cards.forEach(
      (
        card,
        index
      ) => {

        /*
         * Reverse the visible order.
         *
         * First card in the collection becomes
         * the fully-visible card at the bottom.
         */

        const reversedIndex =
          cards.length -
          1 -
          index;


        card.style.position =
          "absolute";


        card.style.left =
          "50%";


        card.style.top =
          `${reversedIndex * stackGap}px`;


        card.style.transform =
          "translateX(-50%)";


        card.style.zIndex =
          String(
            cards.length -
            reversedIndex
          );
      }
    );
  }


  // ==================================================
  // MATCH CARDS-TO-PLACE HEIGHT TO BINDER
  // ==================================================

  function syncUnsortedPanelHeight() {

    if (
      !stackedTrayQuery.matches
    ) {

      unsortedPanel.style.height =
        "";


      layoutUnsortedStack();


      return;
    }


    if (
      !binderStage
    ) {

      return;
    }


    const binderHeight =
      binderStage
        .getBoundingClientRect()
        .height;


    if (
      binderHeight >
      0
    ) {

      unsortedPanel.style.height =
        `${Math.ceil(
          binderHeight
        )}px`;
    }


    requestAnimationFrame(
      layoutUnsortedStack
    );
  }


  if (
    binderStage &&
    "ResizeObserver" in window
  ) {

    const binderStageObserver =
      new ResizeObserver(
        () => {

          syncUnsortedPanelHeight();
        }
      );


    binderStageObserver.observe(
      binderStage
    );
  }


  // ==================================================
  // SELECTION
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
      isPageTurning
    ) {

      return;
    }


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
        "Selection cleared."
      );
    }
  }


  // ==================================================
  // SAVE MOVE
  // ==================================================

  async function saveMove(
    cardId,
    targetPosition
  ) {

    if (
      isPageTurning
    ) {

      return;
    }


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


    const updates =
      {};


    updates[
      `binderLayouts/${uid}/positions/${cardId}`
    ] = targetPosition;


    updates[
      `binderLayouts/${uid}/pageCount`
    ] = getEffectivePageCount();


    if (
      occupyingCardId &&
      occupyingCardId !==
        cardId
    ) {

      if (
        oldPosition !==
        null
      ) {

        updates[
          `binderLayouts/${uid}/positions/${occupyingCardId}`
        ] = oldPosition;

      } else {

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


      const page =
        Math.floor(
          targetPosition /
          BINDER_SLOTS_PER_PAGE
        ) + 1;


      const pocket =
        (
          targetPosition %
          BINDER_SLOTS_PER_PAGE
        ) + 1;


      setStatus(
        `${card?.name || "Card"} placed in Page ${page}, Pocket ${pocket}.`
      );

    } catch (
      error
    ) {

      console.error(
        "Could not save binder position:",
        error
      );


      setStatus(
        "Could not save that binder move."
      );
    }
  }


  // ==================================================
  // RETURN TO UNSORTED
  // ==================================================

  async function returnCardToUnsorted(
    cardId
  ) {

    if (
      isPageTurning
    ) {

      return;
    }


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
        "Could not return card:",
        error
      );


      setStatus(
        "Could not return that card."
      );
    }
  }


  // ==================================================
  // ADD PAGE
  // ==================================================

  async function addBinderPage() {

    if (
      isPageTurning
    ) {

      return;
    }


    const nextPageCount =
      getEffectivePageCount() +
      1;


    try {

      const updates =
        {};


      updates[
        `binderLayouts/${uid}/pageCount`
      ] = nextPageCount;


      await update(
        ref(
          db
        ),
        updates
      );


      layout.pageCount =
        nextPageCount;


      currentPage =
        nextPageCount -
        1;


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
        "Could not add a binder page."
      );
    }
  }


  // ==================================================
  // ADD PAGE BY DROPPING CARD ON BLANK SIDE
  // ==================================================

  async function addPageAndPlaceCard(
    cardId
  ) {

    if (
      isPageTurning
    ) {

      return;
    }


    if (
      !cardId ||
      !currentCards.has(
        cardId
      )
    ) {

      return;
    }


    const oldPageCount =
      getEffectivePageCount();


    const nextPageCount =
      oldPageCount +
      1;


    const targetPosition =
      oldPageCount *
      BINDER_SLOTS_PER_PAGE;


    const updates =
      {};


    updates[
      `binderLayouts/${uid}/pageCount`
    ] = nextPageCount;


    updates[
      `binderLayouts/${uid}/positions/${cardId}`
    ] = targetPosition;


    try {

      await update(
        ref(
          db
        ),
        updates
      );


      layout.pageCount =
        nextPageCount;


      if (
        !layout.positions ||
        typeof layout.positions !==
          "object"
      ) {

        layout.positions =
          {};
      }


      layout.positions[
        cardId
      ] = targetPosition;


      /*
       * Keep the same spread visible.
       *
       * Example:
       *
       * Page 3 | blank
       *
       * becomes:
       *
       * Page 3 | Page 4
       */

      currentPage =
        Math.max(
          0,
          oldPageCount - 1
        );


      selectedCardId =
        null;


      refreshSelectionStyles();


      renderLayout();


      const card =
        currentCards.get(
          cardId
        );


      setStatus(
        `Page ${nextPageCount} created. ${card?.name || "Card"} placed in Pocket 1.`
      );

    } catch (
      error
    ) {

      console.error(
        "Could not create page from dropped card:",
        error
      );


      setStatus(
        "Could not create the new binder page."
      );
    }
  }


  // ==================================================
  // DELETE PAGE
  // ==================================================

  async function deleteBinderPage(
    pageToDelete
  ) {

    if (
      isPageTurning
    ) {

      return;
    }


    const pageCount =
      getEffectivePageCount();


    if (
      pageCount <=
      1
    ) {

      setStatus(
        "The binder must always have at least one page."
      );


      return;
    }


    if (
      pageToDelete < 0 ||
      pageToDelete >=
        pageCount
    ) {

      return;
    }


    const pageNumber =
      pageToDelete + 1;


    const pageStart =
      pageToDelete *
      BINDER_SLOTS_PER_PAGE;


    const pageEnd =
      pageStart +
      BINDER_SLOTS_PER_PAGE;


    const cardsOnDeletedPage =
      [];


    for (
      const [
        cardId,
        card
      ] of
      currentCards
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


    let message =
      `Delete Page ${pageNumber}?`;


    if (
      cardsOnDeletedPage.length >
      0
    ) {

      message +=
        `\n\n${cardsOnDeletedPage.length} card${cardsOnDeletedPage.length === 1 ? "" : "s"} will be returned to Cards to Place.`;
    }


    if (
      pageToDelete <
      pageCount - 1
    ) {

      message +=
        "\n\nPages after this one will move back by one page.";
    }


    if (
      !window.confirm(
        message
      )
    ) {

      return;
    }


    const updates =
      {};


    const nextPositions =
      {};


    for (
      const [
        cardId,
        rawPosition
      ] of
      Object.entries(
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


      // Card was on deleted page.

      if (
        position >= pageStart &&
        position < pageEnd
      ) {

        updates[
          `binderLayouts/${uid}/positions/${cardId}`
        ] = null;


        continue;
      }


      // Card comes after deleted page.

      if (
        position >=
        pageEnd
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


      nextPositions[
        cardId
      ] = position;
    }


    const nextPageCount =
      Math.max(
        pageCount - 1,
        1
      );


    updates[
      `binderLayouts/${uid}/pageCount`
    ] = nextPageCount;


    try {

      await update(
        ref(
          db
        ),
        updates
      );


      layout.pageCount =
        nextPageCount;


      layout.positions =
        nextPositions;


      currentPage =
        Math.min(
          pageToDelete,
          nextPageCount - 1
        );


      selectedCardId =
        null;


      refreshSelectionStyles();


      renderLayout();


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
        "Could not delete that binder page."
      );
    }
  }


  // ==================================================
  // CREATE BINDER PAGE
  // ==================================================

  function createBinderPage(
    pageIndex,
    side
  ) {

    const pageCount =
      getEffectivePageCount();


    const pageShell =
      document.createElement(
        "article"
      );


    pageShell.className =
      "binder-page-shell";


    pageShell.dataset.pageIndex =
      String(
        pageIndex
      );


    if (
      side ===
      "left"
    ) {

      pageShell.classList.add(
        "binder-page-left"
      );

    } else if (
      side ===
      "right"
    ) {

      pageShell.classList.add(
        "binder-page-right"
      );

    } else {

      pageShell.classList.add(
        "binder-page-single"
      );
    }


    // ==================================================
    // HEADER
    // ==================================================

    const pageHeader =
      document.createElement(
        "div"
      );


    pageHeader.className =
      "binder-page-header";


    const title =
      document.createElement(
        "div"
      );


    title.className =
      "binder-page-title";


    title.textContent =
      `Page ${pageIndex + 1}`;


    const deleteButton =
      document.createElement(
        "button"
      );


    deleteButton.type =
      "button";


    deleteButton.className =
      "delete-binder-page-button";


    deleteButton.textContent =
      "🗑 Delete Page";


    deleteButton.disabled =
      pageCount <=
      1;


    deleteButton.addEventListener(
      "click",
      () => {

        deleteBinderPage(
          pageIndex
        );
      }
    );


    pageHeader.appendChild(
      title
    );


    pageHeader.appendChild(
      deleteButton
    );


    pageShell.appendChild(
      pageHeader
    );


    // ==================================================
    // PAGE
    // ==================================================

    const page =
      document.createElement(
        "div"
      );


    page.className =
      "binder-page";


    const slots =
      document.createElement(
        "div"
      );


    slots.className =
      "binder-slots";


    const pageStart =
      pageIndex *
      BINDER_SLOTS_PER_PAGE;


    const pageEnd =
      pageStart +
      BINDER_SLOTS_PER_PAGE;


    // ==================================================
    // 9 POCKETS
    // ==================================================

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
        `Page ${pageIndex + 1}, pocket ${(position % BINDER_SLOTS_PER_PAGE) + 1}`
      );


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

          /*
           * Remove physical Cards-to-Place stack
           * positioning before putting it in a pocket.
           */

          clearUnsortedStackStyles(
            element
          );


          slot.appendChild(
            element
          );
        }

      } else {

        const emptyLabel =
          document.createElement(
            "span"
          );


        emptyLabel.className =
          "empty-pocket-label";


        emptyLabel.textContent =
          "Empty Pocket";


        slot.appendChild(
          emptyLabel
        );
      }


      // ==================================================
      // DRAG OVER
      // ==================================================

      slot.addEventListener(
        "dragover",
        (
          event
        ) => {

          if (
            isPageTurning
          ) {

            return;
          }


          event.preventDefault();


          slot.classList.add(
            "binder-slot-dragover"
          );
        }
      );


      slot.addEventListener(
        "dragleave",
        () => {

          slot.classList.remove(
            "binder-slot-dragover"
          );
        }
      );


      // ==================================================
      // DROP
      // ==================================================

      slot.addEventListener(
        "drop",
        (
          event
        ) => {

          if (
            isPageTurning
          ) {

            return;
          }


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


      // ==================================================
      // TAP EMPTY SLOT
      // ==================================================

      slot.addEventListener(
        "click",
        (
          event
        ) => {

          if (
            isPageTurning
          ) {

            return;
          }


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


      slots.appendChild(
        slot
      );
    }


    page.appendChild(
      slots
    );


    pageShell.appendChild(
      page
    );


    return pageShell;
  }


  // ==================================================
  // CREATE BLANK / ADD PAGE SIDE
  // ==================================================

  function createBlankBinderSide(
    pageCount
  ) {

    const blankSide =
      document.createElement(
        "div"
      );


    blankSide.className =
      "binder-blank-side";


    const newPageNumber =
      pageCount + 1;


    blankSide.innerHTML = `

      <div class="binder-blank-side-inner">

        <div class="blank-page-drop-message">

          <span class="blank-page-plus">
            ＋
          </span>

          <strong>
            Create Page ${newPageNumber}
          </strong>

          <span>
            Drag a card here to create the page
            and place it in Pocket 1.
          </span>

        </div>

      </div>
    `;


    blankSide.addEventListener(
      "dragover",
      (
        event
      ) => {

        if (
          isPageTurning
        ) {

          return;
        }


        event.preventDefault();


        if (
          event.dataTransfer
        ) {

          event.dataTransfer.dropEffect =
            "move";
        }


        blankSide.classList.add(
          "binder-blank-side-dragover"
        );
      }
    );


    blankSide.addEventListener(
      "dragleave",
      (
        event
      ) => {

        if (
          !blankSide.contains(
            event.relatedTarget
          )
        ) {

          blankSide.classList.remove(
            "binder-blank-side-dragover"
          );
        }
      }
    );


    blankSide.addEventListener(
      "drop",
      (
        event
      ) => {

        if (
          isPageTurning
        ) {

          return;
        }


        event.preventDefault();


        blankSide.classList.remove(
          "binder-blank-side-dragover"
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

          addPageAndPlaceCard(
            cardId
          );
        }
      }
    );


    blankSide.addEventListener(
      "click",
      () => {

        if (
          isPageTurning
        ) {

          return;
        }


        if (
          selectedCardId
        ) {

          addPageAndPlaceCard(
            selectedCardId
          );
        }
      }
    );


    return blankSide;
  }


  // ==================================================
  // RENDER
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
        pageCount - 1
      );


    // ==================================================
    // UNSORTED
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
        ) ===
        null
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

      const empty =
        document.createElement(
          "div"
        );


      empty.className =
        "unsorted-empty";


      empty.textContent =
        "Everything is in the binder.";


      unsortedCards.appendChild(
        empty
      );
    }


    // ==================================================
    // BINDER
    // ==================================================

    binderSpread.innerHTML =
      "";


    const doublePage =
      isDoublePageMode();


    binderSpread.className =
      doublePage

        ? "binder-spread binder-spread-double"

        : "binder-spread binder-spread-single";


    if (
      doublePage
    ) {

      const spreadStart =
        getSpreadStart();


      if (
        spreadStart <
        pageCount
      ) {

        binderSpread.appendChild(
          createBinderPage(
            spreadStart,
            "left"
          )
        );
      }


      if (
        spreadStart + 1 <
        pageCount
      ) {

        binderSpread.appendChild(
          createBinderPage(
            spreadStart + 1,
            "right"
          )
        );

      } else {

        binderSpread.appendChild(
          createBlankBinderSide(
            pageCount
          )
        );
      }


      if (
        spreadStart + 1 <
        pageCount
      ) {

        pageIndicator.textContent =
          `Pages ${spreadStart + 1}–${spreadStart + 2} of ${pageCount}`;

      } else {

        pageIndicator.textContent =
          `Page ${spreadStart + 1} of ${pageCount}`;
      }


      previousPageBtn.disabled =
        spreadStart <=
        0;


      nextPageBtn.disabled =
        spreadStart + 2 >=
        pageCount;

    } else {

      binderSpread.appendChild(
        createBinderPage(
          currentPage,
          "single"
        )
      );


      pageIndicator.textContent =
        `Page ${currentPage + 1} of ${pageCount}`;


      previousPageBtn.disabled =
        currentPage <=
        0;


      nextPageBtn.disabled =
        currentPage >=
        pageCount - 1;
    }


    refreshSelectionStyles();


    requestAnimationFrame(
      () => {

        syncUnsortedPanelHeight();

        layoutUnsortedStack();
      }
    );
  }


  // ==================================================
  // 3D PAGE TURN HELPERS
  // ==================================================

  function getRelativeRect(
    element,
    parent
  ) {

    const elementRect =
      element
        .getBoundingClientRect();


    const parentRect =
      parent
        .getBoundingClientRect();


    return {
      left:
        elementRect.left -
        parentRect.left,

      top:
        elementRect.top -
        parentRect.top,

      width:
        elementRect.width,

      height:
        elementRect.height
    };
  }


  function applyOverlayRect(
    element,
    rect
  ) {

    element.style.left =
      `${rect.left}px`;


    element.style.top =
      `${rect.top}px`;


    element.style.width =
      `${rect.width}px`;


    element.style.height =
      `${rect.height}px`;
  }


  function waitForPageTurn(
    element
  ) {

    return new Promise(
      (
        resolve
      ) => {

        let finished =
          false;


        const finish =
          () => {

            if (
              finished
            ) {

              return;
            }


            finished =
              true;


            element.removeEventListener(
              "animationend",
              finish
            );


            resolve();
          };


        element.addEventListener(
          "animationend",
          finish,
          {
            once:
              true
          }
        );


        /*
         * Fallback in case a browser fails to
         * dispatch animationend.
         */

        setTimeout(
          finish,
          900
        );
      }
    );
  }


  // ==================================================
  // 3D PAGE TURN
  // ==================================================

  async function turnPage(
    direction
  ) {

    if (
      isPageTurning
    ) {

      return;
    }


    const pageCount =
      getEffectivePageCount();


    const doublePage =
      isDoublePageMode();


    let targetPage;


    // ==================================================
    // DETERMINE DESTINATION
    // ==================================================

    if (
      doublePage
    ) {

      const spreadStart =
        getSpreadStart();


      if (
        direction ===
        "next"
      ) {

        if (
          spreadStart + 2 >=
          pageCount
        ) {

          return;
        }


        targetPage =
          spreadStart + 2;

      } else {

        if (
          spreadStart <=
          0
        ) {

          return;
        }


        targetPage =
          Math.max(
            0,
            spreadStart - 2
          );
      }

    } else {

      if (
        direction ===
        "next"
      ) {

        if (
          currentPage >=
          pageCount - 1
        ) {

          return;
        }


        targetPage =
          currentPage + 1;

      } else {

        if (
          currentPage <=
          0
        ) {

          return;
        }


        targetPage =
          currentPage - 1;
      }
    }


    // ==================================================
    // REDUCED MOTION
    // ==================================================

    if (
      reducedMotionQuery.matches
    ) {

      currentPage =
        targetPage;


      renderLayout();


      return;
    }


    // ==================================================
    // CAPTURE OLD PAGE(S)
    // ==================================================

    let oldTurningPage;
    let oldCompanionPage;


    if (
      doublePage
    ) {

      oldTurningPage =

        direction ===
        "next"

          ? binderSpread.querySelector(
              ".binder-page-right"
            )

          : binderSpread.querySelector(
              ".binder-page-left"
            );


      oldCompanionPage =

        direction ===
        "next"

          ? binderSpread.children[0]

          : binderSpread.children[1];

    } else {

      oldTurningPage =
        binderSpread.querySelector(
          ".binder-page-shell"
        );


      oldCompanionPage =
        null;
    }


    if (
      !oldTurningPage
    ) {

      currentPage =
        targetPage;


      renderLayout();


      return;
    }


    const oldTurningClone =
      oldTurningPage.cloneNode(
        true
      );


    const oldTurningRect =
      getRelativeRect(
        oldTurningPage,
        binderSpread
      );


    let oldCompanionClone =
      null;


    let oldCompanionRect =
      null;


    if (
      oldCompanionPage
    ) {

      oldCompanionClone =
        oldCompanionPage.cloneNode(
          true
        );


      oldCompanionRect =
        getRelativeRect(
          oldCompanionPage,
          binderSpread
        );
    }


    // ==================================================
    // RENDER FINAL SPREAD UNDERNEATH
    // ==================================================

    isPageTurning =
      true;


    binderWorkspace.classList.add(
      "binder-is-turning"
    );


    currentPage =
      targetPage;


    renderLayout();


    // ==================================================
    // CAPTURE NEW BACK FACE
    // ==================================================

    let newBackPage;


    if (
      doublePage
    ) {

      newBackPage =

        direction ===
        "next"

          ? binderSpread.querySelector(
              ".binder-page-left"
            )

          : binderSpread.querySelector(
              ".binder-page-right"
            );

    } else {

      newBackPage =
        binderSpread.querySelector(
          ".binder-page-shell"
        );
    }


    if (
      !newBackPage
    ) {

      isPageTurning =
        false;


      binderWorkspace.classList.remove(
        "binder-is-turning"
      );


      renderLayout();


      return;
    }


    const newBackClone =
      newBackPage.cloneNode(
        true
      );


    // ==================================================
    // STATIC OLD COMPANION PAGE
    // ==================================================

    let staticOverlay =
      null;


    if (
      oldCompanionClone &&
      oldCompanionRect
    ) {

      staticOverlay =
        oldCompanionClone;


      staticOverlay.classList.add(
        "binder-static-page-overlay"
      );


      applyOverlayRect(
        staticOverlay,
        oldCompanionRect
      );


      binderSpread.appendChild(
        staticOverlay
      );
    }


    // ==================================================
    // TURNING SHEET
    // ==================================================

    const turner =
      document.createElement(
        "div"
      );


    turner.className =
      "binder-page-turner";


    turner.classList.add(

      direction ===
        "next"

        ? "binder-page-turner-next"

        : "binder-page-turner-previous"
    );


    applyOverlayRect(
      turner,
      oldTurningRect
    );


    oldTurningClone.classList.add(
      "binder-page-turn-face",
      "binder-page-turn-front"
    );


    newBackClone.classList.add(
      "binder-page-turn-face",
      "binder-page-turn-back"
    );


    /*
     * These are visual clones only.
     */

    oldTurningClone
      .querySelectorAll(
        "button"
      )
      .forEach(
        (
          button
        ) => {

          button.disabled =
            true;
        }
      );


    newBackClone
      .querySelectorAll(
        "button"
      )
      .forEach(
        (
          button
        ) => {

          button.disabled =
            true;
        }
      );


    turner.appendChild(
      oldTurningClone
    );


    turner.appendChild(
      newBackClone
    );


    binderSpread.appendChild(
      turner
    );


    /*
     * Force layout so the browser sees the
     * unturned state before animation starts.
     */

    void turner.offsetWidth;


    turner.classList.add(

      direction ===
        "next"

        ? "binder-page-turn-animate-next"

        : "binder-page-turn-animate-previous"
    );


    await waitForPageTurn(
      turner
    );


    // ==================================================
    // CLEAN UP
    // ==================================================

    turner.remove();


    if (
      staticOverlay
    ) {

      staticOverlay.remove();
    }


    isPageTurning =
      false;


    binderWorkspace.classList.remove(
      "binder-is-turning"
    );


    /*
     * Final clean render restores real event
     * handlers and control states.
     */

    renderLayout();
  }


  // ==================================================
  // CARD EVENTS
  // ==================================================

  function attachCardOrganiserEvents(
    cardBox,
    cardId
  ) {

    cardBox.dataset.cardId =
      cardId;


    cardBox.draggable =
      true;


    cardBox.addEventListener(
      "dragstart",
      (
        event
      ) => {

        if (
          isPageTurning
        ) {

          event.preventDefault();


          return;
        }


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


    cardBox.addEventListener(
      "click",
      (
        event
      ) => {

        if (
          isPageTurning
        ) {

          return;
        }


        if (
          event.target.closest(
            "button, a"
          )
        ) {

          return;
        }


        event.stopPropagation();


        /*
         * Selected card + another binder card
         * = swap.
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
  // CREATE CARD
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
    // TREATMENT
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
    // IMAGE
    // ==================================================

    const imageWrap =
      document.createElement(
        "div"
      );


    imageWrap.className =
      "card-image-wrap";


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


    imageWrap.appendChild(
      image
    );


    // ==================================================
    // CARDMARKET
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

        event.stopPropagation();


        /*
         * Cardmarket is never fetched.
         *
         * We only construct/open a link after
         * this human click.
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


        window.open(
          buildCardmarketSearchUrl(
            sf,
            card
          ),
          "_blank"
        );
      };


    // ==================================================
    // BUILD CARD
    // ==================================================

    cardBox.appendChild(
      quantity
    );


    cardBox.appendChild(
      imageWrap
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
  // PREVIOUS / NEXT
  // ==================================================

  previousPageBtn.addEventListener(
    "click",
    () => {

      turnPage(
        "previous"
      );
    }
  );


  nextPageBtn.addEventListener(
    "click",
    () => {

      turnPage(
        "next"
      );
    }
  );


  addPageBtn.addEventListener(
    "click",
    addBinderPage
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
  // UNSORTED DROP TARGET
  // ==================================================

  unsortedPanel.addEventListener(
    "dragover",
    (
      event
    ) => {

      if (
        isPageTurning
      ) {

        return;
      }


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

      if (
        isPageTurning
      ) {

        return;
      }


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
  // RESPONSIVE CHANGES
  // ==================================================

  desktopSpreadQuery.addEventListener(
    "change",
    () => {

      if (
        !isPageTurning
      ) {

        renderLayout();
      }
    }
  );


  stackedTrayQuery.addEventListener(
    "change",
    syncUnsortedPanelHeight
  );


  window.addEventListener(
    "resize",
    syncUnsortedPanelHeight
  );


  // ==================================================
  // FIREBASE LAYOUT
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


      if (
        !isPageTurning
      ) {

        renderLayout();
      }
    },

    (
      error
    ) => {

      console.error(
        "Could not read binder layout:",
        error
      );


      layout = {
        pageCount: 1,
        positions: {}
      };


      layoutReady =
        true;


      renderLayout();
    }
  );


  // ==================================================
  // FIREBASE CARDS
  // ==================================================

  onValue(
    cardsRef,

    async (
      snapshot
    ) => {

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


      const cardMetadata =
        [];


      // ==================================================
      // BUILD REQUESTS
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


        cardMetadata.push({
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
      // SCRYFALL BATCH
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
            cardMetadata
          ) {

            if (
              cacheGet(
                key
              )
            ) {

              continue;
            }


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


      if (
        thisLoad !==
        cardsLoadVersion
      ) {

        return;
      }


      // ==================================================
      // BUILD CARD ELEMENTS
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
        cardMetadata
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

        const shareUrl =
  new URL(
    "public-binder.html",
    window.location.href
  );


if (
  usernameSnap.exists()
) {

  shareUrl.searchParams.set(
    "username",
    usernameSnap.val()
  );

} else {

  shareUrl.searchParams.set(
    "uid",
    user.uid
  );
}


const shareUrlText =
  shareUrl.toString();
      
      try {

        await navigator
  .clipboard
  .writeText(
    shareUrlText
  );


        alert(
          "📎 Shareable binder link copied to clipboard!"
        );

      } catch (
        error
      ) {

        fallbackCopyToClipboard(
          shareUrlText
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

          ? "📎 Link copied!"

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