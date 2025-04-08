let cardList = JSON.parse(localStorage.getItem('cardList')) || [];

document.getElementById('cardForm').addEventListener('submit', (e) => {
  e.preventDefault();
  addRow();
});

function addRow() {
  const cardNameInput = document.getElementById('cardNameInput').value.trim();
  const setCode = document.getElementById('setCodeInput').value.trim();
  const treatment = document.getElementById('treatmentSelect').value;
  const collectorNumber = document.getElementById('collectorNumberInput').value.trim();

  if (!cardNameInput || !setCode) {
    alert('Card name and set code are required');
    return;
  }

  let quantity = 1;
  let cardName = cardNameInput;
  const match = cardNameInput.match(/^(\d+)\s+(.*)$/);
  if (match) {
    quantity = parseInt(match[1], 10);
    cardName = match[2];
  }

  const existing = cardList.find(c =>
    c.name === cardName &&
    c.setCode === setCode &&
    c.treatment === treatment &&
    c.collectorNumber === collectorNumber
  );

  if (existing) {
    existing.quantity += quantity;
  } else {
    cardList.push({
      id: Date.now(),
      name: cardName,
      setCode,
      quantity,
      treatment,
      collectorNumber
    });
  }

  localStorage.setItem('cardList', JSON.stringify(cardList));
  renderCards();
  resetForm();
}

function renderCards() {
  const tableBody = document.querySelector('#cardTable tbody');
  tableBody.innerHTML = '';

  cardList.forEach(card => {
    const row = document.createElement('tr');

    row.innerHTML = `
      <td>${card.name}</td>
      <td>${card.setCode}</td>
      <td>${card.treatment === 'F' ? 'Foil' : card.treatment === 'PF' ? 'Piss Foil' : 'Non-Foil'}</td>
      <td>
        <button onclick="updateQuantity(${card.id}, -1)">-</button>
        ${card.quantity}
        <button onclick="updateQuantity(${card.id}, 1)">+</button>
      </td>
      <td>${card.collectorNumber || 'N/A'}</td>
      <td><button onclick="searchCard('${card.name}', '${card.setCode}')">Search</button></td>
      <td><button onclick="confirmDeleteRow(${card.id})">Delete</button></td>
    `;

    tableBody.appendChild(row);
  });
}

function updateQuantity(id, change) {
  const card = cardList.find(c => c.id === id);
  card.quantity += change;
  if (card.quantity < 1) card.quantity = 1;
  localStorage.setItem('cardList', JSON.stringify(cardList));
  renderCards();
}

function searchCard(name, setCode) {
  const url = `https://www.cardmarket.com/en/Magic/Products/Search?searchString=${encodeURIComponent(name)}&setName=${encodeURIComponent(setCode)}`;
  window.open(url, '_blank');
}

function confirmDeleteRow(id) {
  if (confirm('Delete this card?')) {
    cardList = cardList.filter(c => c.id !== id);
    localStorage.setItem('cardList', JSON.stringify(cardList));
    renderCards();
  }
}

function resetForm() {
  document.getElementById('cardNameInput').value = '';
  document.getElementById('setCodeInput').value = '';
  document.getElementById('treatmentSelect').selectedIndex = 0;
  document.getElementById('collectorNumberInput').value = '';
}

document.addEventListener('DOMContentLoaded', renderCards);
