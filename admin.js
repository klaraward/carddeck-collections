// Admin page functionality
let editingCreatorId = null;
let creatorToDelete = null;
let deckToDelete = null;

// Show password modal on page load
document.getElementById('admin-password-input').focus();

// Admin password verification
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
            document.getElementById('admin-password-modal').classList.remove('active');
            document.getElementById('admin-content').style.display = 'block';
            loadCreators();
            loadDecks();
        } else {
            alert('Fel lösenord.');
        }
    } catch (error) {
        console.error('Error verifying password:', error);
        alert('Kunde inte verifiera lösenordet.');
    }
}

// Handle Enter key in password modal
document.getElementById('admin-password-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        verifyAdminPassword();
    }
});

// Load and display creators
async function loadCreators() {
    const listEl = document.getElementById('creators-list');

    try {
        const snapshot = await db.collection('creators').get();

        if (snapshot.empty) {
            listEl.innerHTML = '<p class="empty-message">Inga creators ännu. Skapa den första!</p>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const creator = doc.data();
            const deckCount = creator.deckCount || 0;
            html += `
                <div class="creator-item">
                    <div class="creator-info">
                        <span class="creator-name">${creator.name}</span>
                        <span class="creator-decks">${deckCount} kortlek${deckCount !== 1 ? 'ar' : ''}</span>
                    </div>
                    <div class="creator-actions">
                        <button class="btn-edit" onclick="openEditCreatorModal('${doc.id}', '${creator.name}')">Redigera</button>
                        <button class="btn-delete" onclick="openDeleteCreatorModal('${doc.id}', '${creator.name}')">Ta bort</button>
                    </div>
                </div>
            `;
        });

        listEl.innerHTML = html;
    } catch (error) {
        console.error('Error loading creators:', error);
        listEl.innerHTML = '<p class="error-message">Kunde inte ladda creators.</p>';
    }
}

// Create/Edit creator modal
function openCreateCreatorModal() {
    editingCreatorId = null;
    document.getElementById('creator-modal-title').textContent = 'Ny creator';
    document.getElementById('creator-name-input').value = '';
    document.getElementById('creator-password-input').value = '';
    document.getElementById('creator-modal').classList.add('active');
    document.getElementById('creator-name-input').focus();
}

function openEditCreatorModal(id, name) {
    editingCreatorId = id;
    document.getElementById('creator-modal-title').textContent = 'Redigera creator';
    document.getElementById('creator-name-input').value = name;
    document.getElementById('creator-password-input').value = '';
    document.getElementById('creator-password-input').placeholder = 'Lämna tomt för att behålla';
    document.getElementById('creator-modal').classList.add('active');
    document.getElementById('creator-name-input').focus();
}

function closeCreatorModal() {
    document.getElementById('creator-modal').classList.remove('active');
    document.getElementById('creator-password-input').placeholder = 'Lösenord för inloggning';
    editingCreatorId = null;
}

async function saveCreator() {
    const name = document.getElementById('creator-name-input').value.trim();
    const password = document.getElementById('creator-password-input').value;

    if (!name) {
        alert('Du måste ange ett namn.');
        return;
    }

    if (!editingCreatorId && !password) {
        alert('Du måste ange ett lösenord för nya creators.');
        return;
    }

    try {
        if (editingCreatorId) {
            // Update existing creator
            const updateData = { name: name };
            if (password) {
                updateData.password = password;
            }
            await db.collection('creators').doc(editingCreatorId).update(updateData);
        } else {
            // Create new creator
            await db.collection('creators').add({
                name: name,
                password: password,
                deckCount: 0,
                createdAt: new Date().toISOString()
            });
        }

        closeCreatorModal();
        loadCreators();
    } catch (error) {
        console.error('Error saving creator:', error);
        alert('Kunde inte spara creator: ' + error.message);
    }
}

// Delete creator modal
function openDeleteCreatorModal(id, name) {
    creatorToDelete = id;
    document.getElementById('delete-creator-text').textContent = `Är du säker på att du vill ta bort "${name}"? Kortlekar skapade av denna creator kommer inte att tas bort.`;
    document.getElementById('delete-creator-modal').classList.add('active');
}

function closeDeleteCreatorModal() {
    document.getElementById('delete-creator-modal').classList.remove('active');
    creatorToDelete = null;
}

async function confirmDeleteCreator() {
    if (!creatorToDelete) return;

    try {
        await db.collection('creators').doc(creatorToDelete).delete();
        closeDeleteCreatorModal();
        loadCreators();
    } catch (error) {
        console.error('Error deleting creator:', error);
        alert('Kunde inte ta bort creator: ' + error.message);
    }
}

// Handle Enter key in creator modal
document.getElementById('creator-name-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        document.getElementById('creator-password-input').focus();
    }
});

document.getElementById('creator-password-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        saveCreator();
    }
});

// Load and display all decks
async function loadDecks() {
    const listEl = document.getElementById('decks-list');

    try {
        const snapshot = await db.collection('decks').get();

        if (snapshot.empty) {
            listEl.innerHTML = '<p class="empty-message">Inga kortlekar ännu.</p>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const deck = doc.data();
            const cardCount = deck.cards ? deck.cards.length : 0;
            const publicBadge = deck.public ? '<span class="public-badge">Publik</span>' : '<span class="private-badge">Privat</span>';
            const creatorName = deck.creatorName || 'Okänd';
            html += `
                <div class="deck-item">
                    <div class="deck-icon">${deck.icon || '🃏'}</div>
                    <div class="deck-info">
                        <span class="deck-name">${deck.name} ${publicBadge}</span>
                        <span class="deck-meta">${cardCount} kort · ID: ${doc.id} · av ${creatorName}</span>
                    </div>
                    <div class="deck-actions">
                        <a href="index.html?deck=${doc.id}" class="btn-view" title="Visa">👁️</a>
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

async function confirmDeleteDeck() {
    if (!deckToDelete) return;

    try {
        // Get deck info to update creator's deck count
        const deckDoc = await db.collection('decks').doc(deckToDelete).get();
        const creatorId = deckDoc.exists ? deckDoc.data().creatorId : null;

        // Delete the deck
        await db.collection('decks').doc(deckToDelete).delete();

        // Update creator's deck count if we know the creator
        if (creatorId) {
            const snapshot = await db.collection('decks')
                .where('creatorId', '==', creatorId)
                .get();

            await db.collection('creators').doc(creatorId).update({
                deckCount: snapshot.size
            });
        }

        closeDeleteDeckModal();
        loadDecks();
        loadCreators(); // Refresh to update deck counts
    } catch (error) {
        console.error('Error deleting deck:', error);
        alert('Kunde inte ta bort kortleken: ' + error.message);
    }
}
