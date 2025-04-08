document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('binderContainer');
    const cardList = JSON.parse(localStorage.getItem('cardList')) || [];
  
    cardList.forEach(card => {
      const cardBox = document.createElement('div');
      cardBox.className = 'card-box';
  
      // Quantity badge
      const quantity = document.createElement('div');
      quantity.className = 'quantity-badge';
      quantity.textContent = `x${card.quantity}`;
  
      // Treatment badge
      const treatment = document.createElement('div');
      treatment.className = 'foil-badge';
      if (card.treatment === 'F') {
        treatment.textContent = 'Foil';
        treatment.classList.add('f');
      } else if (card.treatment === 'PF') {
        treatment.textContent = 'Piss Foil';
        treatment.classList.add('pf');
      } else {
        treatment.textContent = 'Non-Foil';
      }
  
      // Only show Collector Number if it exists
      if (card.collectorNumber) {
        const collectorBadge = document.createElement('div');
        collectorBadge.className = 'collector-badge';
        collectorBadge.textContent = `#${card.collectorNumber}`;
        cardBox.appendChild(collectorBadge);  // Append only if it exists
      }
  
      // Card Image
      const img = document.createElement('img');
      const name = card.name;
      const set = card.setCode?.toLowerCase();
      const rawCollector = card.collectorNumber;

      // Normalize the collector number by removing leading zeros (if any)
      const normalizedCollector = rawCollector ? rawCollector.replace(/^0+/, '') : null;
  
      const fallbackUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}&set=${set}`;
  
      const fetchCardImage = () => {
        if (normalizedCollector && set) {
          const url = `https://api.scryfall.com/cards/${set}/${normalizedCollector}`;
          fetch(url)
            .then(res => {
              if (!res.ok) throw new Error('Fallback');
              return res.json();
            })
            .then(data => {
              img.src = data.image_uris?.normal || data.card_faces?.[0]?.image_uris?.normal || '';
            })
            .catch(() => {
              fetch(fallbackUrl)
                .then(res => res.json())
                .then(data => {
                  img.src = data.image_uris?.normal || data.card_faces?.[0]?.image_uris?.normal || '';
                });
            });
        } else {
          fetch(fallbackUrl)
            .then(res => res.json())
            .then(data => {
              img.src = data.image_uris?.normal || data.card_faces?.[0]?.image_uris?.normal || '';
            });
        }
      };
  
      fetchCardImage();
      img.alt = name;
  
      // Search Button
      const button = document.createElement('button');
      button.textContent = 'Search';
      button.classList.add('button');
      button.onclick = () => {
        const url = `https://www.cardmarket.com/en/Magic/Products/Search?searchString=${encodeURIComponent(name)}&setName=${encodeURIComponent(card.setCode)}`;
        window.open(url, '_blank');
      };
  
      // Append everything
      cardBox.appendChild(quantity);
      cardBox.appendChild(treatment);
      cardBox.appendChild(img);
      cardBox.appendChild(button);
      container.appendChild(cardBox);
    });
});
