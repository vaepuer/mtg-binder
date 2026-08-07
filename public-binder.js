import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { firebaseConfig } from "./firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const params = new URLSearchParams(window.location.search);
const username = params.get('username');
const uid = params.get('uid');


// ======================================================
// SMALL HELPERS
// ======================================================

function normalizeCollectorNumber(value) {
  return String(value || "")
    .trim()
    .replace(/^0+(?=\d)/, "");
}


function normalizeTreatment(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}


function cardmarketSlug(text) {
  if (!text) {
    return "";
  }

  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}


// ======================================================
// STA CARDMARKET VERSION HANDLING
// ======================================================

/*
 * Strixhaven Mystical Archive:
 *
 * STA 1-63
 *   Non-Foil / Traditional -> V1
 *   Foil-Etched            -> V3
 *
 * STA 64-126
 *   Non-Foil / Traditional -> V2
 *   Foil-Etched            -> V4
 */

function getStaCardmarketVersion(
  collectorNumber,
  treatment
) {
  const number = Number(
    collectorNumber
  );

  if (!Number.isFinite(number)) {
    return null;
  }

  // Global artwork
  if (
    number >= 1 &&
    number <= 63
  ) {
    if (treatment === "FET") {
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
    if (treatment === "FET") {
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
// CARDMARKET URL RESOLVER
// ======================================================

function resolveCardmarketUrl(
  scryfallCard,
  firebaseCard
) {
  if (!scryfallCard) {
    return null;
  }

  const setCode = String(
    scryfallCard.set ||
    firebaseCard.setCode ||
    ""
  )
    .trim()
    .toLowerCase();

  const collectorNumber =
    normalizeCollectorNumber(
      scryfallCard.collector_number ||
      firebaseCard.collectorNumber
    );

  const treatment =
    normalizeTreatment(
      firebaseCard.treatment
    );


  // ==================================================
  // SPECIAL CASE: STRIXHAVEN MYSTICAL ARCHIVE
  // ==================================================

  if (setCode === "sta") {
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

      return (
        `https://www.cardmarket.com/en/Magic/Products/Singles/Mystical-Archive/${cardName}-V${version}`
      );
    }
  }


  // ==================================================
  // NORMAL CASE:
  // USE SCRYFALL'S CARDMARKET PRODUCT ID
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
  // FALLBACK:
  // USE SCRYFALL PURCHASE URI IF AVAILABLE
  // ==================================================

  const purchaseUrl =
    scryfallCard
      ?.purchase_uris
      ?.cardmarket;

  if (purchaseUrl) {
    try {
      const url =
        new URL(purchaseUrl);

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

      // Remove Scryfall tracking parameters
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

      return url.toString();

    } catch (error) {
      console.warn(
        "Could not parse Cardmarket purchase URL:",
        error
      );
    }
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
      firebaseCard.name,

    scryfallCard?.set ||
      firebaseCard.setCode,

    scryfallCard?.collector_number ||
      firebaseCard.collectorNumber
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
// RESOLVE UID
// ======================================================

// Resolve the UID from the username or UID query parameter
async function resolveUid() {
  if (uid) return uid;

  if (username) {
    const snap = await get(
      ref(
        db,
        `usernames/${username}`
      )
    );

    return snap.exists()
      ? snap.val()
      : null;
  }

  return null;
}


// ======================================================
// PAGE LOAD
// ======================================================

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    const resolvedUid =
      await resolveUid();

    if (!resolvedUid) {
      document.body.innerHTML =
        "User not found.";

      return;
    }

    // Fetch username for the banner display
    const usernameRef =
      ref(
        db,
        `users/${resolvedUid}/username`
      );

    const usernameSnap =
      await get(
        usernameRef
      );

    const usernameToDisplay =
      usernameSnap.exists()
        ? usernameSnap.val()
        : "Unknown User";

    document
      .getElementById(
        'username'
      )
      .textContent =
        usernameToDisplay;

    // Load and display cards
    loadBinderForUser(
      resolvedUid
    );
  }
);


// ======================================================
// LOAD USER BINDER
// ======================================================

// Load the user's cards from Firebase
function loadBinderForUser(uid) {
  const cardsRef =
    ref(
      db,
      `cards/${uid}`
    );

  const container =
    document.getElementById(
      'binderContainer'
    );

  if (!container) {
    console.error(
      '❌ binderContainer not found!'
    );

    return;
  }

  container.innerHTML =
    'Loading cards...';


  get(cardsRef)
    .then(snapshot => {
      const data =
        snapshot.val();

      container.innerHTML =
        '';

      if (!data) {
        container.innerHTML =
          'No cards found.';

        return;
      }


      // ==================================================
      // LOOP THROUGH CARDS
      // ==================================================

      Object.entries(data)
        .forEach(
          ([cardId, card]) => {

            const cardBox =
              document.createElement(
                'div'
              );

            cardBox.className =
              'card-box';


            // ==================================================
            // QUANTITY
            // ==================================================

            const quantity =
              document.createElement(
                'div'
              );

            quantity.className =
              'quantity-badge';

            quantity.textContent =
              `x${card.quantity}`;


            // ==================================================
            // TREATMENT BADGE
            // ==================================================

            const treatment =
              document.createElement(
                'div'
              );

            treatment.className =
              'foil-badge';


            let treatmentText =
              'Non-Foil';

            let treatmentClass =
              '';

            let treatmentDisplay =
              true;


            // Map treatment to class and text
            switch (card.treatment) {

              case 'PRM':
                treatmentText =
                  'Pre-Modern';

                treatmentClass =
                  'PRM';

                break;


              case 'TRA':
                treatmentText =
                  'Traditional';

                treatmentClass =
                  'TRA';

                break;


              case 'FTV':
                treatmentText =
                  'From the Vault';

                treatmentClass =
                  'FTV';

                break;


              case 'FET':
                treatmentText =
                  'Foil-Etched';

                treatmentClass =
                  'FET';

                break;


              case 'GET':
                treatmentText =
                  'Gold-Etched';

                treatmentClass =
                  'GET';

                break;


              case 'TEX':
                treatmentText =
                  'Textured Foil';

                treatmentClass =
                  'TEX';

                break;


              case 'AMP':
                treatmentText =
                  'Ampersand Foil';

                treatmentClass =
                  'AMP';

                break;


              case 'SIL':
                treatmentText =
                  'Silverscreen Foil';

                treatmentClass =
                  'SIL';

                break;


              case 'NEON':
                treatmentText =
                  'Neon Ink';

                treatmentClass =
                  'NEON';

                break;


              case 'GIL':
                treatmentText =
                  'Gilded Foil';

                treatmentClass =
                  'GIL';

                break;


              case 'GAL':
                treatmentText =
                  'Galaxy Foil';

                treatmentClass =
                  'GAL';

                break;


              case 'SUR':
                treatmentText =
                  'Surge Foil';

                treatmentClass =
                  'SUR';

                break;


              case 'DBR':
                treatmentText =
                  'Double Rainbow';

                treatmentClass =
                  'DBR';

                break;


              case 'SCT':
                treatmentText =
                  'Step-and-Compleat Foil';

                treatmentClass =
                  'SCT';

                break;


              case 'OSR':
                treatmentText =
                  'Oil Slick Raised Foil';

                treatmentClass =
                  'OSR';

                break;


              case 'HAL':
                treatmentText =
                  'Halo Foil';

                treatmentClass =
                  'HAL';

                break;


              case 'RAI':
                treatmentText =
                  'Rainbow Foil';

                treatmentClass =
                  'RAI';

                break;


              case 'RIP':
                treatmentText =
                  'Ripple Foil';

                treatmentClass =
                  'RIP';

                break;


              case 'FRA':
                treatmentText =
                  'Fracture Foil';

                treatmentClass =
                  'FRA';

                break;


              case 'MAN':
                treatmentText =
                  'Mana Foil';

                treatmentClass =
                  'MAN';

                break;


              case 'FIR':
                treatmentText =
                  'First Place Foil';

                treatmentClass =
                  'FIR';

                break;


              default:
                treatmentText =
                  'Non-Foil';

                treatmentClass =
                  '';

                treatmentDisplay =
                  false;

                break;
            }


            treatment.textContent =
              treatmentText;


            if (
              treatmentClass
            ) {
              treatment.classList.add(
                treatmentClass
              );
            }


            // If Non-Foil, don't display badge
            if (
              treatmentDisplay
            ) {
              cardBox.appendChild(
                treatment
              );
            }


            // ==================================================
            // CARD IMAGE / SCRYFALL LOOKUP
            // ==================================================

            const img =
              document.createElement(
                'img'
              );


            const name =
              card.name;


            const set =
              card.setCode
                ?.toLowerCase();


            const collector =
              normalizeCollectorNumber(
                card.collectorNumber
              );


            const fallbackUrl =
              `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(
                name
              )}&set=${encodeURIComponent(
                set || ""
              )}`;


            /*
             * Keep the Scryfall card object here.
             *
             * The Cardmarket button will reuse this
             * instead of performing another normal lookup.
             */

            let scryfallCard =
              null;


            let scryfallPromise =
              null;


            // ----------------------------------------------
            // Exact Scryfall printing
            // ----------------------------------------------

            if (
              collector &&
              set
            ) {

              const exactUrl =
                `https://api.scryfall.com/cards/${encodeURIComponent(
                  set
                )}/${encodeURIComponent(
                  collector
                )}`;


              scryfallPromise =
                fetch(exactUrl)

                  .then(async res => {

                    if (res.ok) {
                      return res.json();
                    }


                    console.warn(
                      "Exact Scryfall lookup failed. Using name fallback:",
                      name,
                      set,
                      collector
                    );


                    const fallbackResponse =
                      await fetch(
                        fallbackUrl
                      );


                    if (
                      !fallbackResponse.ok
                    ) {
                      throw new Error(
                        `Scryfall fallback failed: ${fallbackResponse.status}`
                      );
                    }


                    return (
                      fallbackResponse.json()
                    );
                  })

                  .then(data => {

                    scryfallCard =
                      data;


                    img.src =
                      data.image_uris
                        ?.normal ||

                      data.card_faces
                        ?.[0]
                        ?.image_uris
                        ?.normal ||

                      '';


                    return data;
                  })

                  .catch(error => {

                    console.error(
                      "Scryfall card lookup failed:",
                      error
                    );


                    return null;
                  });

            } else {

              // ----------------------------------------------
              // Name-only fallback
              // ----------------------------------------------

              scryfallPromise =
                fetch(
                  fallbackUrl
                )

                  .then(res => {

                    if (!res.ok) {
                      throw new Error(
                        `Scryfall lookup failed: ${res.status}`
                      );
                    }


                    return res.json();
                  })

                  .then(data => {

                    scryfallCard =
                      data;


                    img.src =
                      data.image_uris
                        ?.normal ||

                      data.card_faces
                        ?.[0]
                        ?.image_uris
                        ?.normal ||

                      '';


                    return data;
                  })

                  .catch(error => {

                    console.error(
                      "Scryfall card lookup failed:",
                      error
                    );


                    return null;
                  });
            }


            img.alt =
              name;


            // ==================================================
            // CARDMARKET SEARCH BUTTON
            // ==================================================

            const searchButton =
              document.createElement(
                'button'
              );


            searchButton.className =
              'button';


            /*
             * Keeping your original button text.
             */
            searchButton.textContent =
              'Search';


            // ==================================================
            // BUTTON CLICK
            // ==================================================

            searchButton.onclick =
              async () => {

                /*
                 * IMPORTANT:
                 *
                 * There is NO fetch() to Cardmarket here.
                 *
                 * We only open Cardmarket after
                 * the user physically clicks this button.
                 */


                let sf =
                  scryfallCard;


                // ------------------------------------------
                // Image request may still be loading.
                // Wait for it rather than making another
                // identical Scryfall request.
                // ------------------------------------------

                if (
                  !sf &&
                  scryfallPromise
                ) {

                  sf =
                    await scryfallPromise;
                }


                // ------------------------------------------
                // Resolve exact Cardmarket product
                // ------------------------------------------

                if (sf) {

                  const cardmarketUrl =
                    resolveCardmarketUrl(
                      sf,
                      card
                    );


                  if (
                    cardmarketUrl
                  ) {

                    console.log(
                      "PUBLIC BINDER CARDMARKET:",
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

                          setName:
                            sf.set_name,

                          collector:
                            sf.collector_number,

                          finishes:
                            sf.finishes,

                          cardmarketId:
                            sf.cardmarket_id
                        },

                        url:
                          cardmarketUrl
                      }
                    );


                    window.open(
                      cardmarketUrl,
                      '_blank'
                    );


                    return;
                  }
                }


                // ------------------------------------------
                // Last resort:
                // Cardmarket search instead of guessing
                // ------------------------------------------

                const searchUrl =
                  buildCardmarketSearchUrl(
                    sf,
                    card
                  );


                console.warn(
                  "No direct Cardmarket product found. Using search:",
                  searchUrl
                );


                window.open(
                  searchUrl,
                  '_blank'
                );
              };


            // ==================================================
            // APPEND CARD
            // ==================================================

            cardBox.appendChild(
              quantity
            );


            cardBox.appendChild(
              img
            );


            cardBox.appendChild(
              searchButton
            );


            container.appendChild(
              cardBox
            );
          }
        );
    })

    .catch(err => {

      console.error(
        "Error loading cards:",
        err
      );


      container.innerHTML =
        "Error loading cards.";
    });
}