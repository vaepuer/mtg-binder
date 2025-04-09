import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// Initialize Firebase app and get a reference to the database
const db = getDatabase();

function addRow() {
  const nameInput = document.getElementById('cardNameInput').value.trim();
  const setCode = document.getElementById('setCodeInput').value.trim();
  const treatment = document.getElementById('treatmentSelect').value;
  const collectorNumber = document.getElementById('collectorNumberInput').value.trim();

  if (!nameInput || !setCode) {
    alert("Card name and set code are required.");
    return;
  }

  const match = nameInput.match(/^(\d+)\s+(.*)$/);
  let quantity = 1;
  let name = nameInput;

  if (match) {
    quantity = parseInt(match[1]);
    name = match[2];
  }

  const existingCard = cardList.find(card =>
    card.name === name &&
    card.setCode === setCode &&
    card.treatment === treatment &&
    card.collectorNumber === collectorNumber
  );

  if (existingCard) {
    existingCard.quantity += quantity;
  } else {
    cardList.push({
      id: Date.now(),
      name,
      setCode,
      treatment,
      collectorNumber,
      quantity
    });
  }

  // Save data to Firebase
  const cardRef = ref(db, 'cards/' + Date.now());
  set(cardRef, {
    name,
    setCode,
    treatment,
    collectorNumber,
    quantity
  });

  renderCards();
  resetForm();
}
