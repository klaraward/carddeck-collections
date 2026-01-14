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
        document.getElementById('app-subtitle').textContent = deckData.subtitle || '';

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
}

function showError(message) {
    document.getElementById('app-name').textContent = 'Fel';
    document.getElementById('app-subtitle').textContent = '';
    document.getElementById('card-display').innerHTML = `<div class="placeholder">${message}</div>`;
}

// Load and display public decks for selection
async function loadPublicDecks() {
    document.getElementById('app-name').textContent = 'Välj kortlek';
    document.getElementById('app-subtitle').textContent = 'Välj en kortlek att spela med';
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
            html += `
                <a href="?deck=${doc.id}" class="deck-item">
                    <span class="deck-item-icon">${deck.icon || '🃏'}</span>
                    <div class="deck-item-info">
                        <span class="deck-item-name">${deck.name}</span>
                        <span class="deck-item-subtitle">${deck.subtitle || ''}</span>
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

        display.innerHTML = `
            <div class="drawn-card">
                <button class="add-to-collection-btn" onclick="toggleCollectionMenu(event)" title="Lägg till i samling">
                    ${icons.addToCollection}
                </button>
                ${menuHtml}
                <span class="card-category">${currentCard.category}</span>
                <span class="card-icon">${currentCard.icon}</span>
                <h2 class="card-title">${currentCard.title}</h2>
                <p class="card-description">${currentCard.description}</p>
                <p class="card-tip">${currentCard.tip}</p>
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

// Create deck modal functions
let parsedCsvCards = [];
let isAdminAuthenticated = false;

// Admin password modal functions
function openAdminPasswordModal() {
    document.getElementById('admin-password-modal').classList.add('active');
    document.getElementById('admin-password-input').value = '';
    document.getElementById('admin-password-input').focus();
}

function closeAdminPasswordModal() {
    document.getElementById('admin-password-modal').classList.remove('active');
}

async function verifyAdminPassword() {
    const enteredPassword = document.getElementById('admin-password-input').value;

    try {
        const doc = await db.collection('settings').doc('admin').get();

        if (!doc.exists) {
            alert('Admin-inställningar saknas i databasen.');
            return;
        }

        const adminSettings = doc.data();

        if (enteredPassword === adminSettings.password) {
            isAdminAuthenticated = true;
            closeAdminPasswordModal();
            openCreateDeckModalDirectly();
        } else {
            alert('Fel lösenord.');
        }
    } catch (error) {
        console.error('Error verifying password:', error);
        alert('Kunde inte verifiera lösenordet.');
    }
}

// Handle Enter key in admin password modal
document.getElementById('admin-password-input')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        verifyAdminPassword();
    }
});

function openCreateDeckModal() {
    // Check if already authenticated this session
    if (isAdminAuthenticated) {
        openCreateDeckModalDirectly();
    } else {
        openAdminPasswordModal();
    }
}

function openCreateDeckModalDirectly() {
    document.getElementById('create-deck-modal').classList.add('active');
    document.getElementById('deck-id-input').value = '';
    document.getElementById('deck-name-input').value = '';
    document.getElementById('deck-subtitle-input').value = '';
    document.getElementById('deck-icon-input').value = '🃏';
    document.getElementById('deck-color-input').value = '#669e6a';
    document.getElementById('deck-textcolor-input').value = '#ffffff';
    document.getElementById('deck-public-input').checked = true;
    document.getElementById('deck-csv-input').value = '';
    document.getElementById('csv-preview').innerHTML = '';
    parsedCsvCards = [];
    document.getElementById('deck-id-input').focus();
}

function closeCreateDeckModal() {
    document.getElementById('create-deck-modal').classList.remove('active');
    parsedCsvCards = [];
}

// CSV file input handler
document.getElementById('deck-csv-input')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const csvText = event.target.result;
        parsedCsvCards = parseCSV(csvText);
        showCsvPreview(parsedCsvCards);
    };
    reader.readAsText(file);
});

function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    const cards = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip header row if it looks like headers
        if (i === 0 && line.toLowerCase().includes('category')) {
            continue;
        }

        // Parse CSV line (handle quoted fields)
        const fields = parseCSVLine(line);

        if (fields.length >= 5) {
            cards.push({
                category: fields[0].trim(),
                icon: fields[1].trim(),
                title: fields[2].trim(),
                description: fields[3].trim(),
                tip: fields[4].trim()
            });
        }
    }

    return cards;
}

function parseCSVLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            fields.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    fields.push(current);

    return fields;
}

function showCsvPreview(cards) {
    const preview = document.getElementById('csv-preview');

    if (cards.length === 0) {
        preview.innerHTML = '<p class="csv-error">Inga kort kunde läsas från filen.</p>';
        return;
    }

    preview.innerHTML = `
        <p class="csv-success">${cards.length} kort hittades</p>
        <div class="csv-cards-preview">
            ${cards.slice(0, 3).map(card => `
                <div class="csv-card-preview">
                    <span class="csv-card-icon">${card.icon}</span>
                    <span class="csv-card-title">${card.title}</span>
                </div>
            `).join('')}
            ${cards.length > 3 ? `<div class="csv-card-more">+${cards.length - 3} till...</div>` : ''}
        </div>
    `;
}

async function saveDeck() {
    const deckId = document.getElementById('deck-id-input').value.trim();
    const name = document.getElementById('deck-name-input').value.trim();
    const subtitle = document.getElementById('deck-subtitle-input').value.trim();
    const icon = document.getElementById('deck-icon-input').value.trim() || '🃏';
    const color = document.getElementById('deck-color-input').value;
    const textColor = document.getElementById('deck-textcolor-input').value;
    const isPublic = document.getElementById('deck-public-input').checked;

    // Validate required fields
    if (!deckId) {
        alert('Du måste ange ett ID för kortleken.');
        return;
    }

    if (!name) {
        alert('Du måste ange ett namn för kortleken.');
        return;
    }

    if (parsedCsvCards.length === 0) {
        alert('Du måste ladda upp en CSV-fil med kort.');
        return;
    }

    // Validate ID format (only lowercase letters, numbers, hyphens)
    if (!/^[a-z0-9-]+$/.test(deckId)) {
        alert('ID får bara innehålla små bokstäver, siffror och bindestreck.');
        return;
    }

    try {
        // Check if deck already exists
        const existing = await db.collection('decks').doc(deckId).get();
        if (existing.exists) {
            if (!confirm('En kortlek med detta ID finns redan. Vill du skriva över den?')) {
                return;
            }
        }

        // Save to Firestore
        await db.collection('decks').doc(deckId).set({
            name: name,
            subtitle: subtitle,
            icon: icon,
            backgroundColor: `linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -20)} 100%)`,
            textColor: textColor,
            public: isPublic,
            cards: parsedCsvCards,
            createdAt: new Date().toISOString()
        });

        alert('Kortleken har skapats!');
        closeCreateDeckModal();

        // Redirect to the new deck
        window.location.href = `?deck=${deckId}`;
    } catch (error) {
        console.error('Error saving deck:', error);
        alert('Kunde inte spara kortleken: ' + error.message);
    }
}

// Helper function to darken/lighten a color
function adjustColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + percent));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
    return '#' + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Handle Enter key in modal
document.getElementById('collection-name-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        saveCollection();
    }
});

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
