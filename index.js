let cardList = JSON.parse(localStorage.getItem('cardList')) || [];

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

  localStorage.setItem('cardList', JSON.stringify(cardList));
  renderCards();
  resetForm();
}

function renderCards() {
  const tbody = document.querySelector("#cardTable tbody");
  tbody.innerHTML = "";

  cardList.forEach(card => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${card.name}</td>
      <td>${card.setCode}</td>
      <td>${card.treatment || "Non-Foil"}</td>
      <td>
        <button onclick="updateQuantity(${card.id}, -1)">-</button>
        ${card.quantity}
        <button onclick="updateQuantity(${card.id}, 1)">+</button>
      </td>
      <td>${card.collectorNumber || 'N/A'}</td>
      <td><button onclick="searchCard('${card.name}', '${card.setCode}')">Search</button></td>
      <td><button onclick="deleteCard(${card.id})">Delete</button></td>
    `;

    tbody.appendChild(row);
  });
}

function updateQuantity(id, change) {
  const card = cardList.find(c => c.id === id);
  card.quantity = Math.max(1, card.quantity + change);
  localStorage.setItem('cardList', JSON.stringify(cardList));
  renderCards();
}

function deleteCard(id) {
  cardList = cardList.filter(c => c.id !== id);
  localStorage.setItem('cardList', JSON.stringify(cardList));
  renderCards();
}

function resetForm() {
  document.getElementById('cardNameInput').value = '';
  document.getElementById('setCodeInput').value = '';
  document.getElementById('treatmentSelect').selectedIndex = 0;
  document.getElementById('collectorNumberInput').value = '';
}

function searchCard(name, set) {
  const url = `https://www.cardmarket.com/en/Magic/Products/Search?searchString=${encodeURIComponent(name)}&setName=${encodeURIComponent(set)}`;
  window.open(url, '_blank');
}

function goToBinder() {
  window.location.href = 'binder.html';
}

document.addEventListener('DOMContentLoaded', renderCards);
