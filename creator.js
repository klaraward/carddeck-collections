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
    document.getElementById('csv-preview').innerHTML = '';
    document.getElementById('current-cards-hint').style.display = 'none';
    document.getElementById('save-deck-btn').textContent = 'Skapa kortlek';

    document.getElementById('deck-form-card').style.display = 'block';
    document.getElementById('deck-name-input').focus();
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
        document.getElementById('csv-preview').innerHTML = '';

        // Show current cards hint
        const hint = document.getElementById('current-cards-hint');
        hint.textContent = `Nuvarande: ${parsedCsvCards.length} kort. Ladda upp ny CSV för att ersätta.`;
        hint.style.display = 'block';

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
        parsedCsvCards = parseCSV(csvText);
        showCsvPreview(parsedCsvCards);
        document.getElementById('current-cards-hint').style.display = 'none';
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

// Save deck via Cloud Function
async function saveDeck() {
    if (!currentCreator) {
        alert('Du måste vara inloggad för att spara kortlekar.');
        return;
    }

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

    if (parsedCsvCards.length === 0) {
        alert('Du måste ladda upp en CSV-fil med kort.');
        return;
    }

    // Validate ID format for new decks
    if (!editingDeckId && !/^[a-z0-9-]+$/.test(deckId)) {
        alert('ID får bara innehålla små bokstäver, siffror och bindestreck.');
        return;
    }

    try {
        const saveDeckFn = functions.httpsCallable('saveDeck');
        await saveDeckFn({
            deckId: deckId,
            isEdit: !!editingDeckId,
            deckData: {
                name: name,
                subtitle: subtitle,
                icon: icon,
                backgroundColor: `linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -20)} 100%)`,
                textColor: textColor,
                public: isPublic,
                cards: parsedCsvCards
            }
        });

        alert(editingDeckId ? 'Kortleken har uppdaterats!' : 'Kortleken har skapats!');

        // Hide form and reload list
        hideCreateForm();
        loadMyDecks();

    } catch (error) {
        console.error('Error saving deck:', error);
        const message = error.message || error.code || 'Okänt fel';
        alert('Kunde inte spara kortleken: ' + message);
    }
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

// Delete deck via Cloud Function
async function confirmDeleteDeck() {
    if (!deckToDelete) return;

    try {
        const deleteDeckFn = functions.httpsCallable('deleteDeck');
        await deleteDeckFn({ deckId: deckToDelete });

        closeDeleteDeckModal();
        loadMyDecks();
    } catch (error) {
        console.error('Error deleting deck:', error);
        const message = error.message || error.code || 'Okänt fel';
        alert('Kunde inte ta bort kortleken: ' + message);
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
