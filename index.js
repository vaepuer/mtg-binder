import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  get,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import {
  initializeApp,
  getApps
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

import { firebaseConfig } from "./firebaseConfig.js";

// ✅ Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);
const auth = getAuth(app);

// ✅ Run when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById("logoutBtn");

  // ✅ Logout event listener
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      signOut(auth)
        .then(() => {
          console.log("User signed out.");
          window.location.href = "login.html";
        })
        .catch((error) => {
          console.error("Logout error:", error);
        });
    });
  }

  // ✅ Wait for auth state
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      console.log("Not logged in. Staying on login page.");
      return;
    }

    console.log("Logged in as:", user.uid);

    // Setup form listener
    setupAddCardForm(user);

    // Load cards into table
    displayCards(user.uid);
  });
});

// ✅ Add card form logic
function setupAddCardForm(user) {
  const cardsRef = ref(db, `cards/${user.uid}`);
  const addCardForm = document.getElementById('cardForm');

  if (!addCardForm) {
    console.warn('Card form not found.');
    return;
  }

  // 🔒 Remove any existing listeners to prevent duplicates
  const newForm = addCardForm.cloneNode(true);
  addCardForm.parentNode.replaceChild(newForm, addCardForm);

  newForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const rawInput = document.getElementById('cardNameInput')?.value.trim();
    let cardName = rawInput;
    let cardQuantity = 1;

    // Parse quantity from beginning of input like "3 Sol Ring"
    const match = rawInput.match(/^(\d+)\s+(.+)/);
    if (match) {
      cardQuantity = parseInt(match[1], 10);
      cardName = match[2];
    }

    const cardTreatment = document.getElementById('treatmentSelect')?.value || "";
    const cardSetCode = document.getElementById('setCodeInput')?.value || "";
    const cardCollectorNumber = document.getElementById('collectorNumberInput')?.value || "";

    if (!cardName || isNaN(cardQuantity)) {
      alert('Please enter a valid card name and quantity.');
      return;
    }

    // 🔍 Check for existing card before adding new
    onValue(cardsRef, (snapshot) => {
      let found = false;

      snapshot.forEach((childSnapshot) => {
        const card = childSnapshot.val();
        const cardId = childSnapshot.key;

        const isSameCard =
          card.name === cardName &&
          card.setCode === cardSetCode &&
          card.treatment === cardTreatment &&
          card.collectorNumber === cardCollectorNumber;

        if (isSameCard) {
          found = true;
          const newQty = (parseInt(card.quantity) || 0) + cardQuantity;
          const cardRef = ref(db, `cards/${user.uid}/${cardId}`);

          set(cardRef, {
            ...card,
            quantity: newQty
          }).then(() => {
            console.log("✅ Quantity updated!");
            newForm.reset();
            displayCards(user.uid); // Refresh the table after update
          }).catch((error) => {
            console.error("❌ Error updating card:", error);
          });

          return true; // exit early
        }
      });

      if (!found) {
        const newCardRef = push(cardsRef);
        const newCard = {
          name: cardName,
          quantity: cardQuantity,
          treatment: cardTreatment,
          setCode: cardSetCode,
          collectorNumber: cardCollectorNumber,
          userId: user.uid
        };

        set(newCardRef, newCard)
          .then(() => {
            console.log("✅ New card added!");
            newForm.reset();
            displayCards(user.uid); // Refresh the table after adding new card
          })
          .catch((error) => {
            console.error("❌ Error adding card:", error);
          });
      }
    }, { onlyOnce: true }); // only grab the data once
  });
}

// ✅ Show user’s cards in the table
function displayCards(userId) {
  const cardsRef = ref(db, `cards/${userId}`); // 🔥 Only get this user's cards
  const tableBody = document.getElementById('cardTableBody');

  if (!tableBody) {
    console.warn("Table body with ID 'cardTableBody' not found.");
    return;
  }

  onValue(cardsRef, (snapshot) => {
    tableBody.innerHTML = ''; // Clear existing rows

    snapshot.forEach((childSnapshot) => {
      const card = childSnapshot.val();
      const cardId = childSnapshot.key;

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${card.name}</td>
        <td>
          <div class="qty-control">
            <button class="minus-btn" data-id="${cardId}">-</button>
            <span class="qty-label">${card.quantity}</span>
            <button class="plus-btn" data-id="${cardId}">+</button>
          </div>
        </td>
        <td>${card.treatment || ''}</td>
        <td>${card.setCode || ''}</td>
        <td>${card.collectorNumber || ''}</td>
        <td>
          <button
            class="search-btn"
            data-name="${card.name}"
            data-set="${card.setCode || ''}"
            data-num="${card.collectorNumber || ''}"
            data-treatment="${card.treatment || ''}">🔍
          </button>
        </td>
        <td>
          <button class="edit-btn" data-id="${cardId}">✏️</button>
        </td>
        <td>
          <button class="delete-btn" data-id="${cardId}">🗑️</button>
        </td>
      `;

      tableBody.appendChild(row);
    });

    attachDeleteHandlers(userId); // ✅ pass UID to delete
    attachEditHandlers(userId);
    attachQuantityHandlers(userId);
  });
}

// Function to handle delete button
function attachDeleteHandlers(userId) {
  document.querySelectorAll('.delete-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      const cardId = e.target.getAttribute('data-id');
      if (confirm("Are you sure you want to delete this card?")) {
        const cardRef = ref(db, `cards/${userId}/${cardId}`);
        set(cardRef, null).then(() => {
          console.log("✅ Card deleted");
          displayCards(userId); // Refresh the table
        }).catch(err => console.error("❌ Error deleting card", err));
      }
    });
  });
}

// Function to handle edit button
function attachEditHandlers(userId) {
  document.querySelectorAll('.edit-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      const cardId = e.target.getAttribute('data-id');
      const cardRef = ref(db, `cards/${userId}/${cardId}`);
      
      // Show overlay modal for editing
      const modal = document.getElementById('editModal');
      const modalCardNameInput = document.getElementById('modalCardNameInput');
      const modalSetCodeInput = document.getElementById('modalSetCodeInput');
      const modalCollectorNumberInput = document.getElementById('modalCollectorNumberInput');
      const modalTreatmentSelect = document.getElementById('modalTreatmentSelect');
      const modalQuantityInput = document.getElementById('modalQuantityInput'); // Quantity input

      // Get card data from Firebase
      get(cardRef).then(snapshot => {
        const card = snapshot.val();
        if (card) {
          // Pre-fill modal with current card details
          modalCardNameInput.value = card.name;
          modalSetCodeInput.value = card.setCode;
          modalCollectorNumberInput.value = card.collectorNumber;
          modalTreatmentSelect.value = card.treatment;
          modalQuantityInput.value = card.quantity; // Set current quantity value

          // Open modal
          modal.style.display = 'block';

          // Handle save changes in the modal
		  // ~~~ Edited Code: detach any previous click listener on the Save button before attaching a new one.
		  const oldSaveBtn = document.getElementById('saveEditBtn');
		  const newSaveBtn = oldSaveBtn.cloneNode(true);
		  oldSaveBtn.replaceWith(newSaveBtn);
		  
		  // ~~ and line below
          newSaveBtn.addEventListener('click', () => {
            let updatedQuantity = parseInt(modalQuantityInput.value, 10);

            // Validate quantity: Ensure it is a number and at least 1
            if (isNaN(updatedQuantity) || updatedQuantity < 1) {
              alert("Quantity must be a valid number and at least 1.");
              modalQuantityInput.value = 1; // Reset to minimum value
              updatedQuantity = 1; // Ensure that the quantity is set to 1 if invalid
            }

            const updatedCard = {
              name: modalCardNameInput.value,
              setCode: modalSetCodeInput.value,
              collectorNumber: modalCollectorNumberInput.value,
              treatment: modalTreatmentSelect.value,
              quantity: updatedQuantity // Save updated quantity
            };
            
            set(cardRef, updatedCard)
              .then(() => {
                console.log("✅ Card updated!");
                modal.style.display = 'none';
                displayCards(userId); // Refresh the table
              })
              .catch(error => {
                console.error("❌ Error updating card:", error);
              });
          });
        }
      });
    });
  });
}

// Function to close the edit modal
document.getElementById('closeModalBtn').addEventListener('click', () => {
  const modal = document.getElementById('editModal');
  modal.style.display = 'none';
});

// Function to handle quantity increase and decrease
function attachQuantityHandlers(userId) {
  document.querySelectorAll('.minus-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      const cardId = e.target.getAttribute('data-id');
      const qtyLabel = e.target.nextElementSibling;

      // Decrease quantity
      updateQuantity(userId, cardId, -1, qtyLabel);
    });
  });

  document.querySelectorAll('.plus-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      const cardId = e.target.getAttribute('data-id');
      const qtyLabel = e.target.previousElementSibling;

      // Increase quantity
      updateQuantity(userId, cardId, 1, qtyLabel);
    });
  });
}

// Function to update quantity in Firebase
function updateQuantity(userId, cardId, delta, qtyLabel) {
  const cardRef = ref(db, `cards/${userId}/${cardId}`);

  get(cardRef).then(snapshot => {
    const card = snapshot.val();
    const newQuantity = card.quantity + delta;

    if (newQuantity >= 0) { // Prevent negative quantities
      set(cardRef, { ...card, quantity: newQuantity }).then(() => {
        qtyLabel.textContent = newQuantity; // Update quantity in the table
      });
    }
  });
}

// ======================================================
// CARDMARKET SEARCH HELPERS
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
// STRIXHAVEN MYSTICAL ARCHIVE VERSION HANDLING
// ======================================================

/*
 * STA #1-63
 *
 * Non-Foil         -> V1
 * Traditional Foil -> V1
 * Foil-Etched      -> V3
 *
 *
 * STA #64-126
 *
 * Non-Foil         -> V2
 * Traditional Foil -> V2
 * Foil-Etched      -> V4
 */

function getStaCardmarketVersion(
  collectorNumber,
  treatment
) {
  const number =
    Number(
      normalizeCollectorNumber(
        collectorNumber
      )
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
// RESOLVE CARDMARKET URL
// ======================================================

function resolveCardmarketUrl(
  scryfallCard,
  firebaseCard
) {
  if (!scryfallCard) {
    return null;
  }


  const setCode =
    String(
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


  console.log(
    "Resolving Cardmarket:",
    {
      name:
        scryfallCard.name,

      set:
        setCode,

      collector:
        collectorNumber,

      treatment:
        treatment || "NONFOIL",

      finishes:
        scryfallCard.finishes,

      cardmarketId:
        scryfallCard.cardmarket_id
    }
  );


  // ==================================================
  // SPECIAL CASE:
  // STRIXHAVEN MYSTICAL ARCHIVE
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

  if (scryfallCard.cardmarket_id) {
    return (
      `https://www.cardmarket.com/en/Magic/Products?idProduct=${encodeURIComponent(
        scryfallCard.cardmarket_id
      )}`
    );
  }


  // ==================================================
  // FALLBACK:
  // SCRYFALL'S CARDMARKET PURCHASE URL
  // ==================================================

  const purchaseUrl =
    scryfallCard
      ?.purchase_uris
      ?.cardmarket;


  if (purchaseUrl) {
    try {
      const url =
        new URL(purchaseUrl);


      /*
       * Prefer Cardmarket's actual idProduct
       * and strip Scryfall tracking parameters.
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
        "Could not parse Scryfall Cardmarket URL:",
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
// SCRYFALL LOOKUP
// ======================================================

async function getScryfallCardForSearch(
  card
) {
  const name =
    String(
      card.name || ""
    ).trim();


  const set =
    String(
      card.setCode || ""
    )
      .trim()
      .toLowerCase();


  const collector =
    normalizeCollectorNumber(
      card.collectorNumber
    );


  // ==================================================
  // BEST LOOKUP:
  // EXACT SET + COLLECTOR NUMBER
  // ==================================================

  if (
    set &&
    collector
  ) {
    const exactUrl =
      `https://api.scryfall.com/cards/${encodeURIComponent(
        set
      )}/${encodeURIComponent(
        collector
      )}`;


    console.log(
      "Search button Scryfall lookup:",
      exactUrl
    );


    const response =
      await fetch(
        exactUrl,
        {
          headers: {
            Accept:
              "application/json;q=0.9,*/*;q=0.8"
          }
        }
      );


    if (response.ok) {
      return response.json();
    }


    console.warn(
      "Exact Scryfall lookup failed:",
      response.status
    );
  }


  // ==================================================
  // FALLBACK:
  // NAME + SET
  // ==================================================

  if (name) {
    const fallbackUrl =
      new URL(
        "https://api.scryfall.com/cards/named"
      );


    fallbackUrl.searchParams.set(
      "exact",
      name
    );


    if (set) {
      fallbackUrl.searchParams.set(
        "set",
        set
      );
    }


    const response =
      await fetch(
        fallbackUrl.toString(),
        {
          headers: {
            Accept:
              "application/json;q=0.9,*/*;q=0.8"
          }
        }
      );


    if (response.ok) {
      return response.json();
    }


    console.warn(
      "Scryfall name fallback failed:",
      response.status
    );
  }


  return null;
}


// ======================================================
// MAGNIFYING GLASS SEARCH BUTTON
// ======================================================

function attachSearchHandlers() {
  document
    .querySelectorAll(
      '.search-btn'
    )
    .forEach(button => {

      button.addEventListener(
        'click',
        async () => {

          const card = {
            name:
              button.getAttribute(
                'data-name'
              ) || "",

            setCode:
              button.getAttribute(
                'data-set'
              ) || "",

            collectorNumber:
              button.getAttribute(
                'data-num'
              ) || "",

            treatment:
              button.getAttribute(
                'data-treatment'
              ) || ""
          };


          if (
            !card.name ||
            !card.setCode
          ) {
            console.error(
              "Missing card name or setCode for search."
            );

            return;
          }


          /*
           * Open a blank tab immediately.
           *
           * This keeps the browser from blocking the
           * Cardmarket tab while we wait for Scryfall.
           *
           * about:blank does NOT contact Cardmarket.
           */

          const newTab =
            window.open(
              "about:blank",
              "_blank"
            );


          try {

            // ==========================================
            // GET EXACT PRINTING FROM SCRYFALL
            // ==========================================

            const scryfallCard =
              await getScryfallCardForSearch(
                card
              );


            // ==========================================
            // DIRECT CARDMARKET PRODUCT
            // ==========================================

            if (scryfallCard) {
              const cardmarketUrl =
                resolveCardmarketUrl(
                  scryfallCard,
                  card
                );


              if (cardmarketUrl) {

                console.log(
                  "INDEX SEARCH -> CARDMARKET:",
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
                        scryfallCard.name,

                      set:
                        scryfallCard.set,

                      setName:
                        scryfallCard.set_name,

                      collector:
                        scryfallCard.collector_number,

                      finishes:
                        scryfallCard.finishes,

                      cardmarketId:
                        scryfallCard.cardmarket_id
                    },

                    url:
                      cardmarketUrl
                  }
                );


                if (newTab) {
                  newTab.location.href =
                    cardmarketUrl;
                } else {
                  window.location.href =
                    cardmarketUrl;
                }


                return;
              }
            }


            // ==========================================
            // LAST RESORT:
            // CARDMARKET SEARCH
            // ==========================================

            const searchUrl =
              buildCardmarketSearchUrl(
                scryfallCard,
                card
              );


            console.warn(
              "No direct Cardmarket product found. Using search:",
              searchUrl
            );


            if (newTab) {
              newTab.location.href =
                searchUrl;
            } else {
              window.location.href =
                searchUrl;
            }


          } catch (error) {

            console.error(
              "Cardmarket search failed:",
              error
            );


            /*
             * If something goes wrong, close the blank
             * tab rather than leave it sitting there.
             */

            if (newTab) {
              newTab.close();
            }
          }
        }
      );
    });
}