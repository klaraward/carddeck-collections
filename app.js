let cards = [];
let availableCards = [];
let currentCard = null;
let currentCollection = 'all';
let currentDeckId = null;
let collections = {};
let editingCollection = null;
let collectionToDelete = null;
let menuOpen = false;
let sequentialIndex = 0;

// Get deck ID from URL parameter
function getDeckIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('deck');
}

// Load deck from Firebase
async function loadDeck(deckId) {
    showLoading();

    try {
        const doc = await db.collection('decks').doc(deckId).get();

        if (!doc.exists) {
            showError('Kortleken hittades inte');
            return false;
        }

        const deckData = doc.data();

        // Set deck config
        document.getElementById('page-title').textContent = deckData.name + ' - Kortlek';
        document.getElementById('app-name').textContent = deckData.name;

        // Build subtitle with creator info
        let subtitleText = deckData.subtitle || '';
        if (deckData.creatorName) {
            subtitleText += (subtitleText ? ' · ' : '') + 'av ' + deckData.creatorName;
        }
        document.getElementById('app-subtitle').textContent = subtitleText;

        // Set background color if specified
        if (deckData.backgroundColor) {
            document.documentElement.style.setProperty('--bg-gradient', deckData.backgroundColor);
        }

        // Set text color if specified
        if (deckData.textColor) {
            document.documentElement.style.setProperty('--text-color', deckData.textColor);
        }

        // Load cards
        cards = deckData.cards || [];
        currentDeckId = deckId;

        // Load collections for this deck from localStorage
        const savedCollections = localStorage.getItem('collections_' + deckId);
        collections = savedCollections ? JSON.parse(savedCollections) : {};

        hideLoading();
        return true;
    } catch (error) {
        console.error('Error loading deck:', error);
        showError('Kunde inte ladda kortleken');
        return false;
    }
}

function showLoading() {
    document.getElementById('card-display').innerHTML = '<div class="placeholder">Laddar kortlek...</div>';
    document.getElementById('collection-selector').style.display = 'none';
    document.querySelector('.deck').style.display = 'none';
    document.querySelector('.shuffle-btn').style.display = 'none';
}

function hideLoading() {
    document.getElementById('collection-selector').style.display = 'flex';
    document.querySelector('.deck').style.display = 'block';
    document.querySelector('.shuffle-btn').style.display = 'block';
    document.getElementById('back-link').style.display = 'block';
}

function showError(message) {
    document.getElementById('app-name').textContent = 'Fel';
    document.getElementById('app-subtitle').textContent = '';
    document.getElementById('card-display').innerHTML = `<div class="placeholder">${message}</div>`;
}

// Load and display public decks for selection
async function loadPublicDecks() {
    document.getElementById('app-name').textContent = 'Välj kortlek';
    document.getElementById('app-subtitle').textContent = 'Välj en kortlek att dra kort ur';
    document.getElementById('page-title').textContent = 'Välj kortlek';

    document.getElementById('deck-selector').style.display = 'block';
    document.querySelector('.card-area').style.display = 'none';

    try {
        const snapshot = await db.collection('decks')
            .where('public', '==', true)
            .get();

        const deckList = document.getElementById('deck-list');

        if (snapshot.empty) {
            deckList.innerHTML = '<p class="no-decks">Inga publika kortlekar hittades.</p>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const deck = doc.data();
            const cardCount = deck.cards ? deck.cards.length : 0;
            const creatorInfo = deck.creatorName ? `<span class="deck-item-creator">av ${deck.creatorName}</span>` : '';
            html += `
                <a href="?deck=${doc.id}" class="deck-item">
                    <span class="deck-item-icon">${deck.icon || '🃏'}</span>
                    <div class="deck-item-info">
                        <span class="deck-item-name">${deck.name}</span>
                        <span class="deck-item-subtitle">${deck.subtitle || ''}${deck.subtitle && deck.creatorName ? ' · ' : ''}${creatorInfo}</span>
                    </div>
                    <span class="deck-item-count">${cardCount} kort</span>
                </a>
            `;
        });

        deckList.innerHTML = html;
    } catch (error) {
        console.error('Error loading public decks:', error);
        document.getElementById('deck-list').innerHTML = '<p class="no-decks">Kunde inte ladda kortlekar.</p>';
    }
}

function getCardId(card) {
    return card.title;
}

function isInCollection(card, collectionId) {
    if (!collections[collectionId]) return false;
    return collections[collectionId].cards.includes(getCardId(card));
}

function toggleCardInCollection(card, collectionId) {
    if (!collections[collectionId]) return;

    const cardId = getCardId(card);
    const idx = collections[collectionId].cards.indexOf(cardId);

    if (idx > -1) {
        collections[collectionId].cards.splice(idx, 1);
    } else {
        collections[collectionId].cards.push(cardId);
    }

    saveCollections();
    updateDisplay();
    renderCollectionSelector();
}

function getCollectionCards(collectionId) {
    if (!collections[collectionId]) return [];
    return cards.filter(card => isInCollection(card, collectionId));
}

// Favorite functions
const FAVORITES_ID = 'favorites';

function ensureFavoritesCollection() {
    if (!collections[FAVORITES_ID]) {
        collections[FAVORITES_ID] = { name: 'Favoriter', cards: [] };
        saveCollections();
        renderCollectionSelector();
    }
}

function isFavorite(card) {
    return isInCollection(card, FAVORITES_ID);
}

function toggleFavorite(card) {
    ensureFavoritesCollection();
    toggleCardInCollection(card, FAVORITES_ID);
}

function saveCollections() {
    if (currentDeckId) {
        localStorage.setItem('collections_' + currentDeckId, JSON.stringify(collections));
    }
}

function setCollection(collectionId) {
    currentCollection = collectionId;
    renderCollectionSelector();
    resetDeck();
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function resetDeck() {
    const sourceCards = currentCollection === 'all' ? cards : getCollectionCards(currentCollection);
    availableCards = shuffleArray([...sourceCards]);
    sequentialIndex = 0;
    currentCard = null;
    updateDisplay();
    updateRemaining();
}

function shuffleDeck() {
    resetDeck();
}

function drawCard() {
    drawRandomCard();
}

function drawRandomCard() {
    const sourceCards = currentCollection === 'all' ? cards : getCollectionCards(currentCollection);

    if (sourceCards.length === 0) {
        return;
    }

    if (availableCards.length === 0) {
        availableCards = shuffleArray([...sourceCards]);
    }

    currentCard = availableCards.pop();
    updateDisplay();
    updateRemaining();
}

function drawNextCard() {
    const sourceCards = currentCollection === 'all' ? cards : getCollectionCards(currentCollection);

    if (sourceCards.length === 0) {
        return;
    }

    currentCard = sourceCards[sequentialIndex];
    sequentialIndex = (sequentialIndex + 1) % sourceCards.length;
    availableCards = sourceCards.slice(sequentialIndex);

    updateDisplay();
    updateRemaining();
}

function toggleCollectionMenu(event) {
    event.stopPropagation();
    menuOpen = !menuOpen;
    updateDisplay();
}

function closeMenuOnClickOutside() {
    if (menuOpen) {
        menuOpen = false;
        updateDisplay();
    }
}

function updateDisplay() {
    const display = document.getElementById('card-display');

    if (currentCollection !== 'all') {
        const collectionCards = getCollectionCards(currentCollection);
        if (collectionCards.length === 0) {
            display.innerHTML = `<div class="placeholder">Samlingen är tom. Dra kort från "Alla kort" och lägg till dem i samlingen.</div>`;
            return;
        }
    }

    if (currentCard) {
        const collectionIds = Object.keys(collections);
        let menuHtml = '';

        if (collectionIds.length > 0) {
            menuHtml = `
                <div class="collection-menu ${menuOpen ? 'active' : ''}" onclick="event.stopPropagation()">
                    <div class="collection-menu-header">Lägg till i samling</div>
                    ${collectionIds.map(id => {
                const inCollection = isInCollection(currentCard, id);
                return `
                            <div class="collection-menu-item ${inCollection ? 'in-collection' : ''}"
                                 onclick="toggleCardInCollection(currentCard, '${id}')">
                                ${inCollection ? icons.inCollection : ''} ${collections[id].name}
                            </div>
                        `;
            }).join('')}
                </div>
            `;
        }

        const isFav = isFavorite(currentCard);
        display.innerHTML = `
            <div class="drawn-card">
                <button class="add-to-collection-btn" onclick="toggleCollectionMenu(event)" title="Lägg till i samling">
                    ${icons.addToCollection}
                </button>
                <button class="favorite-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite(currentCard)" title="${isFav ? 'Ta bort från favoriter' : 'Lägg till i favoriter'}">
                    ${isFav ? '❤️' : '🤍'}
                </button>
                ${menuHtml}
                <span class="card-category">${currentCard.category}</span>
                <span class="card-icon">${currentCard.icon}</span>
                <h2 class="card-title">${currentCard.title}</h2>
                <p class="card-description">${currentCard.description}</p>
            </div>
        `;
    } else {
        display.innerHTML = `<div class="placeholder">Klicka på kortleken för att dra ett kort</div>`;
    }
}

function updateRemaining() {
    const remaining = document.getElementById('remaining');
    remaining.textContent = `${availableCards.length} kort kvar i leken`;
}

function renderCollectionSelector() {
    const selector = document.getElementById('collection-selector');
    const collectionIds = Object.keys(collections);

    let html = `
        <button class="collection-btn ${currentCollection === 'all' ? 'active' : ''}"
                onclick="setCollection('all')">
            Alla kort
            <span class="count">${cards.length}</span>
        </button>
    `;

    collectionIds.forEach(id => {
        const col = collections[id];
        const count = col.cards.length;
        html += `
            <button class="collection-btn ${currentCollection === id ? 'active' : ''}"
                    onclick="setCollection('${id}')"
                    oncontextmenu="event.preventDefault(); openManageModal('${id}')">
                ${col.name}
                <span class="count">${count}</span>
            </button>
        `;
    });

    html += `
        <button class="add-collection-btn" onclick="openCreateModal()" title="Skapa ny samling">
            ${icons.addCollection}
        </button>
    `;

    selector.innerHTML = html;
}

// Modal functions
function openCreateModal() {
    editingCollection = null;
    document.getElementById('modal-title').textContent = 'Ny samling';
    document.getElementById('collection-name-input').value = '';
    document.getElementById('create-modal').classList.add('active');
    document.getElementById('collection-name-input').focus();
}

function closeModal() {
    document.getElementById('create-modal').classList.remove('active');
    editingCollection = null;
}

function saveCollection() {
    const name = document.getElementById('collection-name-input').value.trim();
    if (!name) return;

    if (editingCollection) {
        collections[editingCollection].name = name;
    } else {
        const id = 'col_' + Date.now();
        collections[id] = { name: name, cards: [] };
    }

    saveCollections();
    renderCollectionSelector();
    closeModal();
}

function openManageModal(collectionId) {
    editingCollection = collectionId;
    document.getElementById('manage-modal-title').textContent = collections[collectionId].name;
    document.getElementById('manage-modal').classList.add('active');
}

function closeManageModal() {
    document.getElementById('manage-modal').classList.remove('active');
}

function editCollectionName() {
    closeManageModal();
    document.getElementById('modal-title').textContent = 'Byt namn';
    document.getElementById('collection-name-input').value = collections[editingCollection].name;
    document.getElementById('create-modal').classList.add('active');
    document.getElementById('collection-name-input').focus();
}

function showDeleteModal() {
    collectionToDelete = editingCollection;
    document.getElementById('delete-confirm-text').textContent = `Är du säker på att du vill ta bort "${collections[collectionToDelete].name}"?`;
    closeManageModal();
    document.getElementById('delete-modal').classList.add('active');
}

function closeDeleteModal() {
    document.getElementById('delete-modal').classList.remove('active');
    collectionToDelete = null;
}

function confirmDeleteCollection() {
    if (collectionToDelete) {
        delete collections[collectionToDelete];
        if (currentCollection === collectionToDelete) {
            currentCollection = 'all';
        }
        saveCollections();
        renderCollectionSelector();
        shuffleDeck();
    }
    closeDeleteModal();
}

// Handle Enter key in modal
document.getElementById('collection-name-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        saveCollection();
    }
});

// Fan view functions
let fanViewCollection = null;
let fanSelectedCard = null;

function openFanView(collectionId) {
    closeManageModal();
    fanViewCollection = collectionId;
    fanSelectedCard = null;

    const collectionCards = getCollectionCards(collectionId);
    const collectionName = collections[collectionId]?.name || 'Samling';

    document.getElementById('fan-title').textContent = `${collectionName} (${collectionCards.length} kort)`;

    renderFanCards(collectionCards);
    document.getElementById('fan-selected-card').innerHTML = '';
    document.getElementById('fan-selected-card').classList.remove('active');

    document.getElementById('fan-overlay').classList.add('active');
}

function closeFanView() {
    document.getElementById('fan-overlay').classList.remove('active');
    fanViewCollection = null;
    fanSelectedCard = null;
}

function closeFanViewOnBackground(event) {
    if (event.target.id === 'fan-overlay') {
        closeFanView();
    }
}

function renderFanCards(collectionCards) {
    const container = document.getElementById('fan-container');
    const totalCards = collectionCards.length;

    if (totalCards === 0) {
        container.innerHTML = '<p style="color: white; opacity: 0.7;">Samlingen är tom</p>';
        return;
    }

    // Calculate fan spread angles and positions
    const maxSpread = Math.min(totalCards * 8, 120); // Max 120 degrees spread
    const startAngle = -maxSpread / 2;
    const angleStep = totalCards > 1 ? maxSpread / (totalCards - 1) : 0;

    let html = '';
    collectionCards.forEach((card, index) => {
        const angle = totalCards > 1 ? startAngle + (index * angleStep) : 0;
        const zIndex = index + 1;

        html += `
            <div class="fan-card"
                 style="transform: rotate(${angle}deg); z-index: ${zIndex};"
                 data-index="${index}"
                 onclick="selectFanCard(${index})">
                <span class="fan-card-icon">${card.icon}</span>
                <span class="fan-card-title">${card.title}</span>
            </div>
        `;
    });

    container.innerHTML = html;
}

function selectFanCard(index) {
    const collectionCards = getCollectionCards(fanViewCollection);
    const card = collectionCards[index];

    if (!card) return;

    fanSelectedCard = index;

    // Update selected state on fan cards
    document.querySelectorAll('.fan-card').forEach((el, i) => {
        if (i === index) {
            el.classList.add('selected');
        } else {
            el.classList.remove('selected');
        }
    });

    // Show selected card details
    const selectedContainer = document.getElementById('fan-selected-card');
    selectedContainer.innerHTML = `
        <div class="drawn-card">
            <button class="fan-remove-btn" onclick="removeCardFromFan()" title="Ta bort från samling">Ta bort</button>
            <span class="card-category">${card.category}</span>
            <span class="card-icon">${card.icon}</span>
            <h2 class="card-title">${card.title}</h2>
            <p class="card-description">${card.description}</p>
        </div>
    `;
    selectedContainer.classList.add('active');
}

function removeCardFromFan() {
    const collectionCards = getCollectionCards(fanViewCollection);
    const card = collectionCards[fanSelectedCard];

    if (!card) return;

    // Remove card from collection
    toggleCardInCollection(card, fanViewCollection);

    // Refresh the fan view
    const updatedCards = getCollectionCards(fanViewCollection);
    document.getElementById('fan-title').textContent = `${collections[fanViewCollection]?.name || 'Samling'} (${updatedCards.length} kort)`;

    renderFanCards(updatedCards);

    // Clear selected card
    fanSelectedCard = null;
    document.getElementById('fan-selected-card').innerHTML = '';
    document.getElementById('fan-selected-card').classList.remove('active');
}

// Close menu when clicking outside
document.addEventListener('click', closeMenuOnClickOutside);

// Initialize icons
document.getElementById('btn-draw-random').textContent = icons.drawRandom;
document.getElementById('btn-draw-next').textContent = icons.drawNext;
document.getElementById('deck-icon').textContent = icons.deck;
document.getElementById('btn-reset').textContent = icons.reset + ' Börja om';

// Initialize modal buttons
document.getElementById('collection-name-input').placeholder = 'Namn på samlingen';
document.getElementById('btn-cancel-create').textContent = 'Avbryt';
document.getElementById('btn-save').textContent = 'Spara';
document.getElementById('delete-modal-title').textContent = 'Ta bort samling';
document.getElementById('btn-cancel-delete').textContent = 'Avbryt';
document.getElementById('btn-delete').textContent = 'Ta bort';
document.getElementById('btn-rename').textContent = 'Byt namn';
document.getElementById('btn-delete-collection').textContent = 'Ta bort samling';
document.getElementById('btn-close').textContent = 'Stäng';

// Initialize app
async function init() {
    const deckId = getDeckIdFromUrl();

    if (!deckId) {
        // No deck specified - show public decks to choose from
        await loadPublicDecks();
        return;
    }

    const loaded = await loadDeck(deckId);

    if (loaded) {
        renderCollectionSelector();
        resetDeck();
    }
}

init();
