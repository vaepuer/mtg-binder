import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

import {
  getDatabase,
  ref,
  get
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

import {
  firebaseConfig
} from "./firebaseConfig.js";


// ======================================================
// FIREBASE
// ======================================================

const app =
  initializeApp(
    firebaseConfig
  );


const db =
  getDatabase(
    app
  );


// ======================================================
// URL PARAMETERS
// ======================================================

const params =
  new URLSearchParams(
    window.location.search
  );


const username =
  params.get(
    "username"
  );


const uid =
  params.get(
    "uid"
  );


// ======================================================
// CONSTANTS
// ======================================================

const BINDER_SLOTS_PER_PAGE =
  9;


const SCRYFALL_HEADERS = {
  Accept:
    "application/json;q=0.9,*/*;q=0.8"
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
// TREATMENT DISPLAY
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
      text:
        "Non-Foil",

      className:
        "",

      show:
        false
    };
  }


  const [
    text,
    className
  ] = map[code];


  return {
    text,
    className,
    show:
      true
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


  const collector =
    normalizeCollectorNumber(
      card?.collectorNumber
    );


  if (
    set &&
    collector
  ) {

    return (
      `set:${set}|num:${collector}`
    );
  }


  return (
    `name:${card?.name || ""}|set:${set}`
  );
}


// ======================================================
// BUILD SCRYFALL IDENTIFIER
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
// BEST SCRYFALL IMAGE
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
// SCRYFALL COLLECTION FETCH
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
        i +
        CHUNK_SIZE
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
          "Scryfall collection error:",
          response.status,
          await response.text()
        );


        break;
      }


      const data =
        await response.json();


      // ----------------------------------------------
      // CACHE RESULTS BY USEFUL KEYS
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


  // ==================================================
  // SCRYFALL ID
  // ==================================================

  if (
    scryfallId
  ) {

    urls.push(
      `https://api.scryfall.com/cards/${encodeURIComponent(
        scryfallId
      )}`
    );

  } else {

    // ==================================================
    // EXACT SET + COLLECTOR
    // ==================================================

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


    // ==================================================
    // NAME FALLBACK
    // ==================================================

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


  // ==================================================
  // TRY LOOKUPS
  // ==================================================

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
// CARDMARKET HELPERS
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
// STA CARDMARKET VERSION HANDLING
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


  // ==================================================
  // STA SPECIAL CASE
  // ==================================================

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


  // ==================================================
  // NORMAL CARDMARKET PRODUCT ID
  // ==================================================

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
  // SCRYFALL PURCHASE URI
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
// RESOLVE USER
// ======================================================

async function resolveUid() {

  if (
    uid
  ) {

    return uid;
  }


  if (
    username
  ) {

    const snapshot =
      await get(
        ref(
          db,
          `usernames/${username}`
        )
      );


    return (
      snapshot.exists()

        ? snapshot.val()

        : null
    );
  }


  return null;
}


// ======================================================
// PAGE LOAD
// ======================================================

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    try {

      const resolvedUid =
        await resolveUid();


      if (
        !resolvedUid
      ) {

        document.body.innerHTML =
          "User not found.";


        return;
      }


      // ==================================================
      // USERNAME
      // ==================================================

      const usernameSnapshot =
        await get(
          ref(
            db,
            `users/${resolvedUid}/username`
          )
        );


      const usernameToDisplay =

        usernameSnapshot.exists()

          ? usernameSnapshot.val()

          : "Unknown User";


      const usernameElement =
        document.getElementById(
          "username"
        );


      if (
        usernameElement
      ) {

        usernameElement.textContent =
          usernameToDisplay;
      }


      // ==================================================
      // LOAD PUBLIC BINDER
      // ==================================================

      await loadPublicBinder(
        resolvedUid
      );

    } catch (
      error
    ) {

      console.error(
        "Could not load public binder:",
        error
      );


      const container =
        document.getElementById(
          "binderContainer"
        );


      if (
        container
      ) {

        container.innerHTML =
          "This binder is private or unavailable.";
      }
    }
  }
);


// ======================================================
// PUBLIC BINDER
// ======================================================

async function loadPublicBinder(
  userId
) {

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


  container.innerHTML =
    '<div class="binder-loading">Loading binder...</div>';


  // ==================================================
  // LOAD CARDS + BINDER LAYOUT
  // ==================================================

  const [
    cardsSnapshot,
    layoutSnapshot
  ] = await Promise.all([

    get(
      ref(
        db,
        `cards/${userId}`
      )
    ),

    get(
      ref(
        db,
        `binderLayouts/${userId}`
      )
    )

  ]);


  const cardsData =
    cardsSnapshot.val() ||
    {};


  const entries =
    Object.entries(
      cardsData
    );


  if (
    entries.length ===
    0
  ) {

    container.innerHTML =
      '<div class="binder-loading">No cards found.</div>';


    return;
  }


  // ==================================================
  // RESPONSIVE MODE
  // ==================================================

  const desktopSpreadQuery =
    window.matchMedia(
      "(min-width: 1180px)"
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
  // READ LAYOUT
  // ==================================================

  const rawLayout =
    layoutSnapshot.val() ||
    {};


  const rawPositions =

    rawLayout.positions &&
    typeof rawLayout.positions ===
      "object"

      ? rawLayout.positions

      : {};


  /*
   * If binderLayouts doesn't exist at all,
   * this is an older / not-yet-arranged binder.
   *
   * In that case we preserve old behaviour by
   * laying the collection sequentially into pages
   * rather than showing an empty binder.
   */

  const hasSavedLayout =
    layoutSnapshot.exists();


  const positions =
    {};


  const usedPositions =
    new Set();


  // ==================================================
  // SAVED LAYOUT
  // ==================================================

  if (
    hasSavedLayout
  ) {

    for (
      const [
        cardId,
        rawPosition
      ] of
      Object.entries(
        rawPositions
      )
    ) {

      /*
       * Ignore layout records for cards that no
       * longer exist.
       */

      if (
        !Object.prototype.hasOwnProperty.call(
          cardsData,
          cardId
        )
      ) {

        continue;
      }


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


      /*
       * Protect against accidentally-corrupt layouts
       * containing two cards in one physical pocket.
       *
       * First one wins; the duplicate becomes
       * publicly visible under Unsorted Cards.
       */

      if (
        usedPositions.has(
          position
        )
      ) {

        continue;
      }


      positions[
        cardId
      ] = position;


      usedPositions.add(
        position
      );
    }

  } else {

    // ==================================================
    // LEGACY COLLECTION FALLBACK
    // ==================================================

    entries.forEach(
      (
        [
          cardId
        ],
        index
      ) => {

        positions[
          cardId
        ] = index;
      }
    );
  }


  // ==================================================
  // PAGE COUNT
  // ==================================================

  let highestPosition =
    -1;


  for (
    const position of
    Object.values(
      positions
    )
  ) {

    if (
      position >
      highestPosition
    ) {

      highestPosition =
        position;
    }
  }


  const pagesNeeded =

    highestPosition >=
    0

      ? Math.floor(
          highestPosition /
          BINDER_SLOTS_PER_PAGE
        ) + 1

      : 1;


  let pageCount;


  if (
    hasSavedLayout
  ) {

    pageCount =
      Math.max(
        Number(
          rawLayout.pageCount
        ) || 1,
        pagesNeeded,
        1
      );

  } else {

    pageCount =
      Math.max(
        Math.ceil(
          entries.length /
          BINDER_SLOTS_PER_PAGE
        ),
        1
      );
  }


  // ==================================================
  // CARD -> POSITION LOOKUP
  // ==================================================

  const positionToCard =
    new Map();


  for (
    const [
      cardId,
      position
    ] of
    Object.entries(
      positions
    )
  ) {

    positionToCard.set(
      Number(
        position
      ),
      cardId
    );
  }


  // ==================================================
  // UNSORTED CARD IDS
  // ==================================================

  const unsortedCardIds =
    entries

      .map(
        (
          [
            cardId
          ]
        ) => cardId
      )

      .filter(
        (
          cardId
        ) => {

          return (
            !Object.prototype.hasOwnProperty.call(
              positions,
              cardId
            )
          );
        }
      );


  // ==================================================
  // SCRYFALL PRELOAD
  // ==================================================

  const identifiers =
    [];


  const metadata =
    [];


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


    metadata.push({
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


  if (
    identifiers.length
  ) {

    try {

      const fetched =
        await fetchScryfallBatches(
          identifiers
        );


      for (
        const {
          card,
          key
        } of
        metadata
      ) {

        if (
          cacheGet(
            key
          )
        ) {

          continue;
        }


        if (
          fetched.has(
            key
          )
        ) {

          cacheSet(
            key,
            fetched.get(
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
            fetched.has(
              idKey
            )
          ) {

            cacheSet(
              key,
              fetched.get(
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


        const collector =
          normalizeCollectorNumber(
            card.collectorNumber
          );


        const printKey =
          `set:${set}|num:${collector}`;


        if (
          fetched.has(
            printKey
          )
        ) {

          cacheSet(
            key,
            fetched.get(
              printKey
            )
          );
        }
      }

    } catch (
      error
    ) {

      console.error(
        "Public binder Scryfall batch failed:",
        error
      );
    }
  }


  // ==================================================
  // BUILD CARD ELEMENTS
  // ==================================================

  const cardElements =
    new Map();


  for (
    const {
      cardId,
      card,
      key
    } of
    metadata
  ) {

    const cardElement =
      await createPublicCardElement(
        card,
        key
      );


    cardElements.set(
      cardId,
      cardElement
    );
  }


  // ==================================================
  // BUILD PUBLIC BINDER UI
  // ==================================================

  container.innerHTML = `

    <div
      class="binder-workspace public-binder-workspace"
      id="publicBinderWorkspace"
    >

      <section
        class="binder-stage public-binder-stage"
        aria-label="Public binder"
      >

        <div class="binder-page-toolbar">

          <button
            type="button"
            id="publicPreviousPageBtn"
          >
            ◀ Previous
          </button>


          <div
            class="page-indicator"
            id="publicPageIndicator"
          >
            Page 1 of ${pageCount}
          </div>


          <button
            type="button"
            id="publicNextPageBtn"
          >
            Next ▶
          </button>

        </div>


        <div
          class="binder-spread"
          id="publicBinderSpread"
        >
        </div>


        <p
          class="binder-status"
          id="publicBinderStatus"
          aria-live="polite"
        >
        </p>


        <section
          class="public-unsorted-section"
          id="publicUnsortedSection"
          hidden
        >

          <h2>
            Unsorted Cards
          </h2>


          <p class="public-unsorted-description">
            These cards are part of the collection but have not yet been placed into a binder pocket.
          </p>


          <div
            class="public-unsorted-grid"
            id="publicUnsortedGrid"
          >
          </div>

        </section>

      </section>

    </div>
  `;


  const binderWorkspace =
    document.getElementById(
      "publicBinderWorkspace"
    );


  const binderSpread =
    document.getElementById(
      "publicBinderSpread"
    );


  const pageIndicator =
    document.getElementById(
      "publicPageIndicator"
    );


  const previousPageBtn =
    document.getElementById(
      "publicPreviousPageBtn"
    );


  const nextPageBtn =
    document.getElementById(
      "publicNextPageBtn"
    );


  const binderStatus =
    document.getElementById(
      "publicBinderStatus"
    );


  const unsortedSection =
    document.getElementById(
      "publicUnsortedSection"
    );


  const unsortedGrid =
    document.getElementById(
      "publicUnsortedGrid"
    );


  // ==================================================
  // PUBLIC STATE
  // ==================================================

  let currentPage =
    0;


  let isPageTurning =
    false;


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


  function getSpreadStart() {

    if (
      !isDoublePageMode()
    ) {

      return currentPage;
    }


    return (
      Math.floor(
        currentPage /
        2
      ) * 2
    );
  }


  function getCardAtPosition(
    position
  ) {

    return (
      positionToCard.get(
        position
      ) ||
      null
    );
  }


  // ==================================================
  // CREATE READ-ONLY BINDER PAGE
  // ==================================================

  function createBinderPage(
    pageIndex,
    side
  ) {

    const pageShell =
      document.createElement(
        "article"
      );


    pageShell.className =
      "binder-page-shell public-binder-page-shell";


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
      "binder-page-header public-binder-page-header";


    const title =
      document.createElement(
        "div"
      );


    title.className =
      "binder-page-title";


    title.textContent =
      `Page ${pageIndex + 1}`;


    pageHeader.appendChild(
      title
    );


    pageShell.appendChild(
      pageHeader
    );


    // ==================================================
    // PAGE BODY
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
    // NINE POCKETS
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
        "binder-slot public-binder-slot";


      slot.dataset.position =
        String(
          position
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

        const element =
          cardElements.get(
            cardId
          );


        if (
          element
        ) {

          slot.classList.add(
            "binder-slot-filled"
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
  // END-OF-BINDER BLANK SIDE
  // ==================================================

  function createBlankBinderSide() {

    const blankSide =
      document.createElement(
        "div"
      );


    blankSide.className =
      "binder-blank-side public-binder-blank-side";


    blankSide.innerHTML = `

      <div class="binder-blank-side-inner">

        <div class="blank-page-drop-message">

          <strong>
            End of Binder
          </strong>

        </div>

      </div>
    `;


    return blankSide;
  }


  // ==================================================
  // RENDER UNSORTED CARDS
  // ==================================================

  function renderUnsortedCards() {

    unsortedGrid.innerHTML =
      "";


    if (
      unsortedCardIds.length ===
      0
    ) {

      unsortedSection.hidden =
        true;


      return;
    }


    unsortedSection.hidden =
      false;


    for (
      const cardId of
      unsortedCardIds
    ) {

      const element =
        cardElements.get(
          cardId
        );


      if (
        element
      ) {

        unsortedGrid.appendChild(
          element
        );
      }
    }
  }


  // ==================================================
  // RENDER PUBLIC BINDER
  // ==================================================

  function renderLayout() {

    currentPage =
      Math.min(
        Math.max(
          currentPage,
          0
        ),
        pageCount - 1
      );


    binderSpread.innerHTML =
      "";


    const doublePage =
      isDoublePageMode();


    binderSpread.className =

      doublePage

        ? "binder-spread binder-spread-double"

        : "binder-spread binder-spread-single";


    // ==================================================
    // DOUBLE PAGE DESKTOP
    // ==================================================

    if (
      doublePage
    ) {

      const spreadStart =
        getSpreadStart();


      // LEFT PAGE

      binderSpread.appendChild(
        createBinderPage(
          spreadStart,
          "left"
        )
      );


      // RIGHT PAGE OR END-OF-BINDER

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
          createBlankBinderSide()
        );
      }


      // PAGE INDICATOR

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
    }


    // ==================================================
    // SINGLE PAGE MOBILE / TABLET
    // ==================================================

    else {

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


    renderUnsortedCards();
  }


  // ==================================================
  // PAGE-TURN HELPERS
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
         * Failsafe.
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
    // FIND CURRENT TURNING PAGE
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


    // ==================================================
    // CLONE CURRENT PAGE
    // ==================================================

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
    // RENDER DESTINATION UNDERNEATH
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
    // FIND REVERSE FACE
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
    // KEEP OLD COMPANION PAGE VISIBLE
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
    // BUILD TURNING SHEET
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


    /*
     * Same geometry/classes as the owner binder.
     *
     * Your corrected CSS therefore makes this
     * rotate around the centre spine as well.
     */

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
     * These clones are visual only.
     */

    oldTurningClone
      .querySelectorAll(
        "button, a"
      )
      .forEach(
        (
          element
        ) => {

          element.tabIndex =
            -1;
        }
      );


    newBackClone
      .querySelectorAll(
        "button, a"
      )
      .forEach(
        (
          element
        ) => {

          element.tabIndex =
            -1;
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
     * Force the initial state to render first.
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


    renderLayout();
  }


  // ==================================================
  // CONTROLS
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


  // ==================================================
  // RESPONSIVE MODE CHANGE
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


  // ==================================================
  // INITIAL RENDER
  // ==================================================

  if (
    !hasSavedLayout
  ) {

    setStatus(
      "This collection has not been manually arranged yet, so its cards are being displayed in collection order."
    );

  } else {

    setStatus(
      ""
    );
  }


  renderLayout();
}


// ======================================================
// CREATE PUBLIC CARD
// ======================================================

async function createPublicCardElement(
  card,
  key
) {

  const cardBox =
    document.createElement(
      "div"
    );


  cardBox.className =
    "card-box public-card-box";


  /*
   * Public binder cards cannot be dragged.
   */

  cardBox.draggable =
    false;


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
  // IMAGE WRAPPER
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
    card.name ||
    "Magic card";


  image.draggable =
    false;


  let scryfallCard =
    cacheGet(
      key
    );


  // ==================================================
  // FALLBACK IF BATCH LOOKUP MISSED
  // ==================================================

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
        "Public card Scryfall lookup failed:",
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
  // CARDMARKET / SEARCH BUTTON
  // ==================================================

  const searchButton =
    document.createElement(
      "button"
    );


  searchButton.className =
    "button";


  /*
   * Keep the existing public-binder wording.
   */

  searchButton.textContent =
    "Search";


  searchButton.draggable =
    false;


  searchButton.addEventListener(
    "click",
    (
      event
    ) => {

      event.stopPropagation();


      /*
       * IMPORTANT:
       *
       * Cardmarket itself is never fetched.
       *
       * This click only navigates the visitor to
       * the resolved Cardmarket product/search URL.
       */

      if (
        scryfallCard
      ) {

        const cardmarketUrl =
          resolveCardmarketUrl(
            scryfallCard,
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


      const fallbackUrl =
        buildCardmarketSearchUrl(
          scryfallCard,
          card
        );


      window.open(
        fallbackUrl,
        "_blank"
      );
    }
  );


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
    searchButton
  );


  return cardBox;
}