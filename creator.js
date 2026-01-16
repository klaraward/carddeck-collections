// Creator page functionality
let parsedCsvCards = [];
let currentCreator = null; // { id, name, email }
let editingDeckId = null;
let deckToDelete = null;

// Check auth state on page load
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // User is signed in - load their profile
        try {
            const creatorDoc = await db.collection('creators').doc(user.uid).get();
            if (creatorDoc.exists) {
                currentCreator = {
                    id: user.uid,
                    name: creatorDoc.data().name,
                    email: user.email
                };
                showDashboard();
            } else {
                // User exists in Auth but not in creators collection
                alert('Ditt konto är inte registrerat som creator.');
                auth.signOut();
            }
        } catch (error) {
            console.error('Error loading creator profile:', error);
        }
    } else {
        // User is signed out - show login
        showLogin();
    }
});

function showLogin() {
    document.getElementById('login-modal').classList.add('active');
    document.getElementById('creator-dashboard').style.display = 'none';
    document.getElementById('creator-email-input').focus();
}

function showDashboard() {
    document.getElementById('login-modal').classList.remove('active');
    document.getElementById('creator-dashboard').style.display = 'block';
    document.getElementById('logged-in-name').textContent = currentCreator.name;
    document.getElementById('creator-subtitle').textContent = 'Hantera dina kortlekar';
    loadMyDecks();
}

// Creator login with Firebase Auth
async function loginCreator() {
    const email = document.getElementById('creator-email-input').value.trim();
    const password = document.getElementById('creator-password-input').value;

    if (!email || !password) {
        alert('Ange både e-post och lösenord.');
        return;
    }

    try {
        await auth.signInWithEmailAndPassword(email, password);
        // onAuthStateChanged will handle the rest
    } catch (error) {
        console.error('Error logging in:', error);
        if (error.code === 'auth/user-not-found') {
            alert('Ingen användare med denna e-postadress hittades.');
        } else if (error.code === 'auth/wrong-password') {
            alert('Fel lösenord.');
        } else if (error.code === 'auth/invalid-email') {
            alert('Ogiltig e-postadress.');
        } else {
            alert('Kunde inte logga in: ' + error.message);
        }
    }
}

// Logout
function logoutCreator() {
    auth.signOut();
}

// Load creator's decks
async function loadMyDecks() {
    const listEl = document.getElementById('my-decks-list');

    try {
        const snapshot = await db.collection('decks')
            .where('creatorId', '==', currentCreator.id)
            .get();

        if (snapshot.empty) {
            listEl.innerHTML = '<p class="empty-message">Du har inga kortlekar ännu. Skapa din första!</p>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const deck = doc.data();
            const cardCount = deck.cards ? deck.cards.length : 0;
            const publicBadge = deck.public ? '' : '<span class="private-badge">Privat</span>';
            html += `
                <div class="my-deck-item">
                    <div class="my-deck-icon">${deck.icon || '🃏'}</div>
                    <div class="my-deck-info">
                        <span class="my-deck-name">${deck.name} ${publicBadge}</span>
                        <span class="my-deck-meta">${cardCount} kort · ID: ${doc.id}</span>
                    </div>
                    <div class="my-deck-actions">
                        <a href="index.html?deck=${doc.id}" class="btn-view" title="Visa">👁️</a>
                        <button class="btn-edit" onclick="editDeck('${doc.id}')">Redigera</button>
                        <button class="btn-delete" onclick="openDeleteDeckModal('${doc.id}', '${deck.name}')">Ta bort</button>
                    </div>
                </div>
            `;
        });

        listEl.innerHTML = html;
    } catch (error) {
        console.error('Error loading decks:', error);
        listEl.innerHTML = '<p class="error-message">Kunde inte ladda kortlekar.</p>';
    }
}

// Show create form
function showCreateForm() {
    editingDeckId = null;
    parsedCsvCards = [];

    document.getElementById('deck-form-title').textContent = 'Ny kortlek';
    document.getElementById('deck-id-group').style.display = 'block';
    document.getElementById('deck-id-input').value = '';
    document.getElementById('deck-id-input').disabled = false;
    document.getElementById('deck-name-input').value = '';
    document.getElementById('deck-subtitle-input').value = '';
    document.getElementById('deck-icon-input').value = '🃏';
    document.getElementById('deck-color-input').value = '#669e6a';
    document.getElementById('deck-textcolor-input').value = '#ffffff';
    document.getElementById('deck-public-input').checked = true;
    document.getElementById('deck-csv-input').value = '';
    document.getElementById('save-deck-btn').textContent = 'Skapa kortlek';

    // Initialize empty cards table with one row
    clearCardsTable();
    addCardRow();

    document.getElementById('deck-form-card').style.display = 'block';
    document.getElementById('deck-name-input').focus();
}

// Cards table functions
function clearCardsTable() {
    document.getElementById('cards-table-body').innerHTML = '';
}

function addCardRow(card = null) {
    const tbody = document.getElementById('cards-table-body');
    const row = document.createElement('tr');

    row.innerHTML = `
        <td><input type="text" class="card-category" value="${card?.category || ''}" placeholder="Kategori"></td>
        <td><input type="text" class="card-icon icon-input" value="${card?.icon || ''}" placeholder="🎯"></td>
        <td><input type="text" class="card-title" value="${card?.title || ''}" placeholder="Titel"></td>
        <td><input type="text" class="card-description" value="${card?.description || ''}" placeholder="Beskrivning"></td>
        <td><button type="button" class="btn-remove-row" onclick="removeCardRow(this)">✕</button></td>
    `;

    tbody.appendChild(row);
}

function removeCardRow(button) {
    const row = button.closest('tr');
    row.remove();
}

function populateCardsTable(cards) {
    clearCardsTable();
    if (cards.length === 0) {
        addCardRow();
    } else {
        cards.forEach(card => addCardRow(card));
    }
}

function getCardsFromTable() {
    const rows = document.querySelectorAll('#cards-table-body tr');
    const cards = [];

    rows.forEach(row => {
        const category = row.querySelector('.card-category').value.trim();
        const icon = row.querySelector('.card-icon').value.trim();
        const title = row.querySelector('.card-title').value.trim();
        const description = row.querySelector('.card-description').value.trim();

        // Only include rows that have at least a title
        if (title) {
            cards.push({ category, icon, title, description });
        }
    });

    return cards;
}

// Hide create form
function hideCreateForm() {
    document.getElementById('deck-form-card').style.display = 'none';
    editingDeckId = null;
    parsedCsvCards = [];
}

// Edit deck
async function editDeck(deckId) {
    try {
        const doc = await db.collection('decks').doc(deckId).get();

        if (!doc.exists) {
            alert('Kortleken hittades inte.');
            return;
        }

        const deck = doc.data();
        editingDeckId = deckId;
        parsedCsvCards = deck.cards || [];

        document.getElementById('deck-form-title').textContent = 'Redigera kortlek';
        document.getElementById('deck-id-group').style.display = 'none';
        document.getElementById('deck-name-input').value = deck.name;
        document.getElementById('deck-subtitle-input').value = deck.subtitle || '';
        document.getElementById('deck-icon-input').value = deck.icon || '🃏';

        // Extract color from gradient
        const colorMatch = deck.backgroundColor?.match(/#[a-fA-F0-9]{6}/);
        document.getElementById('deck-color-input').value = colorMatch ? colorMatch[0] : '#669e6a';

        document.getElementById('deck-textcolor-input').value = deck.textColor || '#ffffff';
        document.getElementById('deck-public-input').checked = deck.public !== false;
        document.getElementById('deck-csv-input').value = '';

        // Populate the cards table with existing cards
        populateCardsTable(parsedCsvCards);

        document.getElementById('save-deck-btn').textContent = 'Spara ändringar';

        document.getElementById('deck-form-card').style.display = 'block';
        document.getElementById('deck-name-input').focus();

    } catch (error) {
        console.error('Error loading deck:', error);
        alert('Kunde inte ladda kortleken: ' + error.message);
    }
}

// Handle Enter key in login modal
document.getElementById('creator-email-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        document.getElementById('creator-password-input').focus();
    }
});

document.getElementById('creator-password-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        loginCreator();
    }
});

// CSV file input handler
document.getElementById('deck-csv-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const csvText = event.target.result;
        const cards = parseCSV(csvText);
        populateCardsTable(cards);
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

        if (fields.length >= 4) {
            cards.push({
                category: fields[0].trim(),
                icon: fields[1].trim(),
                title: fields[2].trim(),
                description: fields[3].trim()
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

// Save deck - supports both client-side and server-side modes
async function saveDeck() {
    if (!currentCreator) {
        alert('Du måste vara inloggad för att spara kortlekar.');
        return;
    }

    const saveBtn = document.getElementById('save-deck-btn');

    // Prevent double-clicks
    if (saveBtn.disabled) return;

    const deckId = editingDeckId || document.getElementById('deck-id-input').value.trim();
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

    // Get cards from table
    const cards = getCardsFromTable();

    if (cards.length === 0) {
        alert('Du måste lägga till minst ett kort.');
        return;
    }

    // Validate ID format for new decks
    if (!editingDeckId && !/^[a-z0-9-]+$/.test(deckId)) {
        alert('ID får bara innehålla små bokstäver, siffror och bindestreck.');
        return;
    }

    const deckData = {
        name: name,
        subtitle: subtitle,
        icon: icon,
        backgroundColor: `linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -20)} 100%)`,
        textColor: textColor,
        public: isPublic,
        cards: cards
    };

    // Show loading state
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Sparar...';

    try {
        if (appConfig.createUserMode === 'client') {
            await saveDeckClientSide(deckId, deckData, !!editingDeckId);
        } else {
            await saveDeckServerSide(deckId, deckData, !!editingDeckId);
        }

        alert(editingDeckId ? 'Kortleken har uppdaterats!' : 'Kortleken har skapats!');

        // Hide form and reload list
        hideCreateForm();
        loadMyDecks();

    } catch (error) {
        console.error('Error saving deck:', error);
        const message = error.message || error.code || 'Okänt fel';
        alert('Kunde inte spara kortleken: ' + message);
    } finally {
        // Restore button state
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}

// Save deck via client-side Firestore
async function saveDeckClientSide(deckId, deckData, isEdit) {
    // For new decks, check ID doesn't exist
    if (!isEdit) {
        const existingDeck = await db.collection('decks').doc(deckId).get();
        if (existingDeck.exists) {
            throw new Error('En kortlek med detta ID finns redan');
        }
    }

    // For edits, verify ownership
    if (isEdit) {
        const existingDeck = await db.collection('decks').doc(deckId).get();
        if (!existingDeck.exists) {
            throw new Error('Kortleken hittades inte');
        }
        if (existingDeck.data().creatorId !== currentCreator.id) {
            throw new Error('Du kan bara redigera dina egna kortlekar');
        }
    }

    // Build deck object
    const deck = {
        ...deckData,
        creatorId: currentCreator.id,
        creatorName: currentCreator.name,
        updatedAt: new Date().toISOString()
    };

    if (!isEdit) {
        deck.createdAt = new Date().toISOString();
    }

    await db.collection('decks').doc(deckId).set(deck, { merge: true });
    await updateMyDeckCount();
}

// Save deck via Cloud Function (server-side)
async function saveDeckServerSide(deckId, deckData, isEdit) {
    const saveDeckFn = functions.httpsCallable('saveDeck');
    await saveDeckFn({
        deckId: deckId,
        isEdit: isEdit,
        deckData: deckData
    });
}

// Update own deck count in Firestore
async function updateMyDeckCount() {
    const snapshot = await db.collection('decks')
        .where('creatorId', '==', currentCreator.id)
        .get();
    await db.collection('creators').doc(currentCreator.id).update({
        deckCount: snapshot.size
    });
}

// Delete deck modal
function openDeleteDeckModal(deckId, deckName) {
    deckToDelete = deckId;
    document.getElementById('delete-deck-text').textContent = `Är du säker på att du vill ta bort "${deckName}"? Detta kan inte ångras.`;
    document.getElementById('delete-deck-modal').classList.add('active');
}

function closeDeleteDeckModal() {
    document.getElementById('delete-deck-modal').classList.remove('active');
    deckToDelete = null;
}

// Delete deck - supports both client-side and server-side modes
async function confirmDeleteDeck() {
    if (!deckToDelete) return;

    try {
        if (appConfig.createUserMode === 'client') {
            await deleteDeckClientSide(deckToDelete);
        } else {
            await deleteDeckServerSide(deckToDelete);
        }

        closeDeleteDeckModal();
        loadMyDecks();
    } catch (error) {
        console.error('Error deleting deck:', error);
        const message = error.message || error.code || 'Okänt fel';
        alert('Kunde inte ta bort kortleken: ' + message);
    }
}

// Delete deck via client-side Firestore
async function deleteDeckClientSide(deckId) {
    // Verify ownership before deleting
    const deckDoc = await db.collection('decks').doc(deckId).get();
    if (!deckDoc.exists) {
        throw new Error('Kortleken hittades inte');
    }
    if (deckDoc.data().creatorId !== currentCreator.id) {
        throw new Error('Du kan bara ta bort dina egna kortlekar');
    }

    await db.collection('decks').doc(deckId).delete();
    await updateMyDeckCount();
}

// Delete deck via Cloud Function (server-side)
async function deleteDeckServerSide(deckId) {
    const deleteDeckFn = functions.httpsCallable('deleteDeck');
    await deleteDeckFn({ deckId: deckId });
}

// Helper function to darken/lighten a color
function adjustColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + percent));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
    return '#' + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
