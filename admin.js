// Admin page functionality
let creatorToDelete = null;
let deckToDelete = null;

// Check auth state on page load
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // User is signed in - check if admin
        try {
            const creatorDoc = await db.collection('creators').doc(user.uid).get();
            if (creatorDoc.exists && creatorDoc.data().isAdmin === true) {
                showAdminContent();
            } else {
                alert('Du har inte admin-behörighet.');
                auth.signOut();
            }
        } catch (error) {
            console.error('Error checking admin status:', error);
            alert('Kunde inte verifiera admin-behörighet.');
            auth.signOut();
        }
    } else {
        // User is signed out - show login
        showLoginModal();
    }
});

function showLoginModal() {
    document.getElementById('admin-password-modal').classList.add('active');
    document.getElementById('admin-content').style.display = 'none';
    document.getElementById('admin-email-input').focus();
}

function showAdminContent() {
    document.getElementById('admin-password-modal').classList.remove('active');
    document.getElementById('admin-content').style.display = 'block';
    loadCreators();
    loadDecks();
}

// Admin login with Firebase Auth
async function loginAdmin() {
    const email = document.getElementById('admin-email-input').value.trim();
    const password = document.getElementById('admin-password-input').value;

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

// Handle Enter key in login modal
document.getElementById('admin-email-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        document.getElementById('admin-password-input').focus();
    }
});

document.getElementById('admin-password-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        loginAdmin();
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
            const adminBadge = creator.isAdmin ? '<span class="admin-badge">Admin</span>' : '';
            html += `
                <div class="creator-item">
                    <div class="creator-info">
                        <span class="creator-name">${creator.name} ${adminBadge}</span>
                        <span class="creator-email">${creator.email || ''}</span>
                        <span class="creator-decks">${deckCount} kortlek${deckCount !== 1 ? 'ar' : ''}</span>
                    </div>
                    <div class="creator-actions">
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

// Create creator modal
function openCreateCreatorModal() {
    document.getElementById('creator-modal-title').textContent = 'Ny creator';
    document.getElementById('creator-name-input').value = '';
    document.getElementById('creator-email-input').value = '';
    document.getElementById('creator-password-input').value = '';
    document.getElementById('creator-modal').classList.add('active');
    document.getElementById('creator-name-input').focus();
}

function closeCreatorModal() {
    document.getElementById('creator-modal').classList.remove('active');
}

// Create creator via Cloud Function
async function saveCreator() {
    const name = document.getElementById('creator-name-input').value.trim();
    const email = document.getElementById('creator-email-input').value.trim();
    const password = document.getElementById('creator-password-input').value;

    if (!name) {
        alert('Du måste ange ett namn.');
        return;
    }

    if (!email) {
        alert('Du måste ange en e-postadress.');
        return;
    }

    if (!password || password.length < 6) {
        alert('Lösenordet måste vara minst 6 tecken.');
        return;
    }

    try {
        const createCreatorFn = functions.httpsCallable('createCreator');
        await createCreatorFn({
            name: name,
            email: email,
            password: password
        });

        alert('Creator skapad!');
        closeCreatorModal();
        loadCreators();
    } catch (error) {
        console.error('Error creating creator:', error);
        // Show more details about the error
        let message = error.message || 'Okänt fel';
        if (error.details) {
            message = error.details;
        }
        if (error.code) {
            message += ' (' + error.code + ')';
        }
        alert('Kunde inte skapa creator: ' + message);
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

// Delete creator via Cloud Function
async function confirmDeleteCreator() {
    if (!creatorToDelete) return;

    try {
        const deleteCreatorFn = functions.httpsCallable('deleteCreator');
        await deleteCreatorFn({ creatorId: creatorToDelete });

        closeDeleteCreatorModal();
        loadCreators();
    } catch (error) {
        console.error('Error deleting creator:', error);
        const message = error.message || error.code || 'Okänt fel';
        alert('Kunde inte ta bort creator: ' + message);
    }
}

// Handle Enter key in creator modal
document.getElementById('creator-name-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        document.getElementById('creator-email-input').focus();
    }
});

document.getElementById('creator-email-input').addEventListener('keypress', function(e) {
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

// Delete deck via Cloud Function
async function confirmDeleteDeck() {
    if (!deckToDelete) return;

    try {
        const deleteDeckFn = functions.httpsCallable('deleteDeck');
        await deleteDeckFn({ deckId: deckToDelete });

        closeDeleteDeckModal();
        loadDecks();
        loadCreators(); // Refresh to update deck counts
    } catch (error) {
        console.error('Error deleting deck:', error);
        const message = error.message || error.code || 'Okänt fel';
        alert('Kunde inte ta bort kortleken: ' + message);
    }
}
