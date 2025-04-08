// Global card list
let cardList = JSON.parse(localStorage.getItem('cardList')) || [];

function addRow() {
    const cardNameInput = document.getElementById('cardNameInput').value.trim();
    const setCode = document.getElementById('setCodeInput').value.trim();
    const treatment = document.getElementById('treatmentSelect').value; // Get selected treatment value
    const collectorNumber = document.getElementById('collectorNumberInput').value.trim(); // Collector number input

    if (!cardNameInput || !setCode) {
        alert('Card name and set code are required');
        return;
    }

    // Parse the card name and quantity (if the name starts with a number)
    const regex = /^(\d+)\s+(.*)$/; // Matches number followed by space and the rest of the name
    let cardName = cardNameInput;
    let quantity = 1; // Default to 1 if no quantity is specified

    const match = cardNameInput.match(regex);
    if (match) {
        quantity = parseInt(match[1], 10); // Extract the number as quantity
        cardName = match[2]; // Extract the actual card name
    }

    // Check if the card already exists in the list
    const existingCard = cardList.find(card => card.name === cardName && card.setCode === setCode && card.treatment === treatment && card.collectorNumber === collectorNumber);
    
    if (existingCard) {
        // If the card already exists, update its quantity
        existingCard.quantity += quantity;
    } else {
        // If the card doesn't exist, create a new entry
        const card = {
            name: cardName,
            setCode: setCode,
            quantity: quantity, // Use the parsed quantity
            treatment: treatment || '', // Set treatment value, empty string if none selected
            collectorNumber: collectorNumber,
            id: Date.now() // Unique ID for this card entry
        };
        cardList.push(card);
    }

    localStorage.setItem('cardList', JSON.stringify(cardList));
    renderCards();
    resetForm();
}




function renderCards() {
    const tableBody = document.querySelector('#cardTable tbody');
    tableBody.innerHTML = ''; // Clear existing rows

    cardList.forEach(card => {
        const row = document.createElement('tr');

        // Card Name Cell (Remove prefix for display)
        const nameCell = document.createElement('td');
        let displayName = card.name;

        // Remove any bracketed prefix for display
        displayName = displayName.replace(/\[.*?\]\s*/g, '').trim();

        nameCell.textContent = displayName;
        row.appendChild(nameCell);

        // Set Code Cell
        const setCodeCell = document.createElement('td');
        setCodeCell.textContent = card.setCode;
        row.appendChild(setCodeCell);

        // Treatment Cell (Display "Foil" or "Non-Foil")
        const treatmentCell = document.createElement('td');
        if (card.treatment === 'F') {
            treatmentCell.textContent = 'Foil';
        } else if (card.treatment === 'PF') {
            treatmentCell.textContent = 'Piss Foil';
        } else {
            treatmentCell.textContent = 'Non-Foil';
        }
        row.appendChild(treatmentCell);

        // Quantity Cell with buttons
        const quantityCell = document.createElement('td');
        quantityCell.innerHTML = `
            <button class="adjust-quantity" onclick="updateQuantity(${card.id}, -1)">-</button>
            ${card.quantity}
            <button class="adjust-quantity" onclick="updateQuantity(${card.id}, 1)">+</button>
        `;
        row.appendChild(quantityCell);

        // Collector Number Cell
        const collectorCell = document.createElement('td');
        collectorCell.textContent = card.collectorNumber || 'N/A'; // Display the collector number or 'N/A' if not available
        row.appendChild(collectorCell);

        // Search Button Cell
        const searchCell = document.createElement('td');
        const searchButton = document.createElement('button');
        searchButton.textContent = 'Search';
        searchButton.onclick = () => searchCard(card.name, card.setCode);
        searchCell.appendChild(searchButton);
        row.appendChild(searchCell);

        // Remove Button Cell
        const removeCell = document.createElement('td');
        const removeButton = document.createElement('button');
        removeButton.textContent = 'Delete';
        removeButton.onclick = () => confirmDeleteRow(card.id);
        removeCell.appendChild(removeButton);
        row.appendChild(removeCell);

        // Hover event to show the card preview
        row.addEventListener('mouseenter', () => showPreview(card));

        // Add a data attribute for the card ID to the preview container
        const previewContainer = document.createElement('td');
        previewContainer.classList.add('preview-container');
        previewContainer.setAttribute('data-card-id', card.id); // Attach the card ID for selection
        row.appendChild(previewContainer);

        // Append row to table body
        tableBody.appendChild(row);
    });

    // Now add the event listener for the preview container (tap-to-select preview)
    document.querySelectorAll('.preview-container').forEach(item => {
        item.addEventListener('click', function() {
            const cardId = this.getAttribute('data-card-id'); // Get the card ID
            showCardPreview(cardId); // Call the preview function
        });
    });
}

// Function to handle the preview of a card when clicked
function showCardPreview(cardId) {
    const card = cardList.find(c => c.id === cardId); // Find the card using its ID
    if (card) {
        console.log('Previewing card with ID:', cardId);
        // You can expand this function to show the detailed preview (image, effects, etc.)
        // E.g., call `showPreview(card)` here to display the card preview
        showPreview(card); // Assuming this function is defined elsewhere to show the preview
    } else {
        console.warn('Card not found for preview:', cardId);
    }
}





function updateQuantity(cardId, change) {
    const card = cardList.find(card => card.id === cardId);
    card.quantity += change;

    if (card.quantity <= 0) {
        card.quantity = 1;
    }

    localStorage.setItem('cardList', JSON.stringify(cardList));
    renderCards();
}

function searchCard(cardName, setCode) {
    const url = `https://www.cardmarket.com/en/Magic/Products/Search?searchString=${encodeURIComponent(cardName)}&setName=${encodeURIComponent(setCode)}`;
    window.open(url, '_blank');
}

function resetForm() {
    document.getElementById('cardNameInput').value = '';
    document.getElementById('setCodeInput').value = '';
    document.getElementById('treatmentSelect').selectedIndex = 0;
    document.getElementById('collectorNumberInput').value = ''; // Reset the collector number
}

// Show card preview function
function showPreview(card) {
    const previewBox = document.getElementById('previewBox');
    const previewContainer = document.getElementById('previewContainer');
    const previewImage = document.getElementById('previewImage');
    const foilOverlay = document.getElementById('foilOverlay');

    const setCode = card.setCode.toLowerCase();
    let collectorNumber = card.collectorNumber?.padStart(3, '0');

    // Normalize the collector number to handle both padded and non-padded versions
    const normalizedCollectorNumber = collectorNumber ? collectorNumber.replace(/^0+/, '') : '';

    const applyFoilEffect = () => {
        // Check the treatment and apply the corresponding foil overlay
        if (card.treatment === 'F') {
            previewContainer.classList.add('rainbow-foil');
            previewContainer.classList.remove('piss-foil');
        } else if (card.treatment === 'PF') {
            previewContainer.classList.add('piss-foil');
            previewContainer.classList.remove('rainbow-foil');
        } else {
            previewContainer.classList.remove('rainbow-foil', 'piss-foil');
            foilOverlay.style.display = 'none';  // Hide foil overlay when treatment is not foil
        }
    };

    let url;
    if (normalizedCollectorNumber) {
        // Try collector number-based lookup
        url = `https://api.scryfall.com/cards/${setCode}/${normalizedCollectorNumber}`;
    } else {
        // Fall back to name + set
        const cleanName = card.rawName || card.name.replace(/\[.*?\]\s*/, '');
        url = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cleanName)}&set=${setCode}`;
    }

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error('Collector number lookup failed');
            return response.json();
        })
        .then(data => {
            // Set the image of the card based on the data fetched
            previewImage.src = data.image_uris?.normal || data.card_faces?.[0]?.image_uris?.normal;
            previewImage.alt = card.name;
            previewBox.style.display = 'flex';  // Ensure the preview box is displayed

            applyFoilEffect();  // Apply the foil effect

            // Add the shadow and tilt effect
            previewContainer.classList.add('tilted');

            // Reset tilt on initial load (centered position)
            previewContainer.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
        })
        .catch(error => {
            console.warn('Collector number lookup failed, trying fallback:', error);
            const fallbackName = card.rawName || card.name.replace(/\[.*?\]\s*/, '');
            const fallbackUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(fallbackName)}&set=${setCode}`;

            fetch(fallbackUrl)
                .then(res => res.json())
                .then(data => {
                    // Set the image of the card based on the data fetched
                    previewImage.src = data.image_uris?.normal || data.card_faces?.[0]?.image_uris?.normal;
                    previewImage.alt = card.name;
                    previewBox.style.display = 'flex';  // Ensure the preview box is displayed
                    applyFoilEffect();  // Apply the foil effect

                    // Add the shadow and tilt effect
                    previewContainer.classList.add('tilted');

                    // Reset tilt on initial load (centered position)
                    previewContainer.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
                })
                .catch(err => {
                    console.error('Fallback failed:', err);
                    previewBox.style.display = 'none';
                });
        });
}




previewContainer.addEventListener('mousemove', (event) => {
    const { width, height, left, top } = previewContainer.getBoundingClientRect();
    const offsetX = event.clientX - left;
    const offsetY = event.clientY - top;

    const centerX = width / 2;
    const centerY = height / 2;

    const deltaX = (offsetX - centerX) / centerX; // X axis movement
    const deltaY = (offsetY - centerY) / centerY; // Y axis movement

    // Adjust the tilt effect based on mouse movement
    const tiltX = deltaY * 10;  
    const tiltY = deltaX * -10; 

    previewContainer.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
});

// Reset tilt when mouse leaves the card container
previewContainer.addEventListener('mouseleave', () => {
    previewContainer.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
});

// Delete a card row
function confirmDeleteRow(cardId) {
    const confirmation = confirm("Are you sure you want to delete this card?");
    if (confirmation) {
        cardList = cardList.filter(card => card.id !== cardId);
        localStorage.setItem('cardList', JSON.stringify(cardList));
        renderCards();
    }
}
// On page load, render cards
document.addEventListener('DOMContentLoaded', renderCards);
