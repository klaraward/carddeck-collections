// Creator page functionality
let parsedCsvCards = [];

// Show password modal on page load
document.getElementById('admin-password-modal').classList.add('active');
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
            document.getElementById('creator-form').style.display = 'block';
            document.getElementById('deck-id-input').focus();
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

// CSV file input handler
document.getElementById('deck-csv-input').addEventListener('change', function(e) {
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

        // Redirect to the new deck
        window.location.href = `index.html?deck=${deckId}`;
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
