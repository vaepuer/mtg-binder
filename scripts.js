// Global card list (for simplicity, stored in memory)
let cardList = JSON.parse(localStorage.getItem('cardList')) || [];

const users = [
    { username: 'admin', password: 'adminpassword', role: 'admin' },
    { username: 'spectator', password: 'spectatorpassword', role: 'spectator' },
];

// Handle login form submission
document.getElementById('loginForm')?.addEventListener('submit', function (e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const user = users.find(user => user.username === username && user.password === password);
    
    if (user) {
        localStorage.setItem('userRole', user.role);
        window.location.href = 'main.html';  // Redirect to the main page after login
    } else {
        document.getElementById('errorMessage').textContent = 'Invalid credentials';
    }
});

// Check the user role when rendering the collection page
const userRole = localStorage.getItem('userRole');

if (userRole === 'spectator') {
    document.getElementById('addCardButton').disabled = true; // Disable adding cards
} else if (userRole !== 'admin') {
    window.location.href = 'login.html';  // Redirect to login if no role is found
}

// Function to render cards in the table
function renderCards() {
    const tableBody = document.querySelector('#cardTable tbody');
    tableBody.innerHTML = ''; // Clear existing rows

    cardList.forEach(card => {
        const row = document.createElement('tr');

        // Card Name
        const nameCell = document.createElement('td');
        let displayName = card.name.replace(/\[.*?\]\s*/g, '').trim();
        nameCell.textContent = displayName;
        row.appendChild(nameCell);

        // Set Code
        const setCodeCell = document.createElement('td');
        setCodeCell.textContent = card.setCode;
        row.appendChild(setCodeCell);

        // Treatment
        const treatmentCell = document.createElement('td');
        treatmentCell.textContent = card.treatment === 'F' ? 'Foil' : card.treatment === 'PF' ? 'Piss Foil' : 'Non-Foil';
        row.appendChild(treatmentCell);

        // Quantity with buttons
        const quantityCell = document.createElement('td');
        quantityCell.innerHTML = `
            <button onclick="updateQuantity(${card.id}, -1)">-</button>
            ${card.quantity}
            <button onclick="updateQuantity(${card.id}, 1)">+</button>
        `;
        row.appendChild(quantityCell);

        // Collector Number
        const collectorCell = document.createElement('td');
        collectorCell.textContent = card.collectorNumber || 'N/A';
        row.appendChild(collectorCell);

        // Search Button
        const searchCell = document.createElement('td');
        const searchButton = document.createElement('button');
        searchButton.textContent = 'Search';
        searchButton.onclick = () => searchCard(card.name, card.setCode);
        searchCell.appendChild(searchButton);
        row.appendChild(searchCell);

        // Actions (Delete button)
        const removeCell = document.createElement('td');
        const removeButton = document.createElement('button');
        removeButton.textContent = 'Delete';
        if (userRole === 'spectator') {
            removeButton.disabled = true;  // Disable for spectators
        } else {
            removeButton.onclick = () => confirmDeleteRow(card.id);
        }
        removeCell.appendChild(removeButton);
        row.appendChild(removeCell);

        tableBody.appendChild(row);
    });
}

// Function to add or update quantity
function updateQuantity(cardId, change) {
    const card = cardList.find(card => card.id === cardId);
    card.quantity += change;
    if (card.quantity <= 0) card.quantity = 1;
    localStorage.setItem('cardList', JSON.stringify(cardList));
    renderCards();
}

// Search for card on CardMarket
function searchCard(cardName, setCode) {
    const url = `https://www.cardmarket.com/en/Magic/Products/Search?searchString=${encodeURIComponent(cardName)}&setName=${encodeURIComponent(setCode)}`;
    window.open(url, '_blank');
}

// Confirm delete row
function confirmDeleteRow(cardId) {
    const confirmation = confirm("Are you sure you want to delete this card?");
    if (confirmation) {
        cardList = cardList.filter(card => card.id !== cardId);
        localStorage.setItem('cardList', JSON.stringify(cardList));
        renderCards();
}

// Add card functionality (for admin only)
document.getElementById('addCardButton')?.addEventListener('click', () => {
    const cardName = prompt("Enter card name:");
    const setCode = prompt("Enter set code:");
    const treatment = prompt("Enter treatment (F = Foil, PF = Piss Foil, leave empty for Non-Foil):");
    const collectorNumber = prompt("Enter collector number:");

    if (cardName && setCode) {
        const card = {
            name: cardName,
            setCode: setCode,
            quantity: 1,
            treatment: treatment || '',
            collectorNumber: collectorNumber,
            id: Date.now(),
        };
        cardList.push(card);
        localStorage.setItem('cardList', JSON.stringify(cardList));
        renderCards();
    } else {
        alert('Card name and set code are required!');
    }
});

// Initial render of cards
document.addEventListener('DOMContentLoaded', renderCards);
}
