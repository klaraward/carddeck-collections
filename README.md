# Kortlek

En interaktiv webbapp för att visa och dra kort från olika kortlekar. Perfekt för övningar, samtal, eller pedagogiska syften.

**Live demo:** https://klaraward.github.io/carddeck-collections/

## Funktioner

- **Flera kortlekar** - Stöd för flera olika kortlekar, varje med egen design
- **Dra kort** - Slumpa eller dra kort i ordning
- **Favoriter** - Markera kort med hjärta för snabb åtkomst
- **Samlingar** - Skapa egna samlingar av kort
- **Konfigurerbar design** - Varje kortlek kan ha egen bakgrundsfärg, textfärg och ikon
- **Publika/privata lekar** - Kortlekar kan vara publika (visas i listan) eller dolda (kräver direktlänk)
- **Creator-system** - Creators kan logga in och hantera sina egna kortlekar
- **Admin-panel** - Administratör kan hantera creators och alla kortlekar

## Användning

1. Öppna `index.html` i en webbläsare (eller besök GitHub Pages-länken)
2. Välj en kortlek från listan, eller använd `?deck=ID` i URL:en för direktlänk
3. Klicka på kortleken för att dra ett kort
4. Använd hjärtat för att favoritmarkera kort
5. Skapa egna samlingar via +-knappen

## För Creators

1. Be admin att skapa ett creator-konto åt dig
2. Gå till `creator.html` och logga in med ditt namn och lösenord
3. Se dina befintliga kortlekar eller skapa nya
4. Redigera eller ta bort dina kortlekar

### Skapa en kortlek

1. Klicka "+ Ny kortlek"
2. Fyll i ID (används i URL), namn, undertitel
3. Välj ikon, bakgrundsfärg och textfärg
4. Ladda upp en CSV-fil med kort
5. Välj om kortleken ska vara publik eller privat

### CSV-format

```csv
category,icon,title,description,tip
Andning,🌬️,Djupandning,"Andas in i 4 sekunder, ut i 8 sekunder","Fokusera på utandningen"
```

Se `example-breakfast.csv` för ett exempel.

## För Administratörer

1. Gå till `admin.html`
2. Ange admin-lösenordet
3. Hantera creators (skapa, redigera, ta bort)
4. Se och ta bort kortlekar

## Firestore-struktur

### Kortlekar (`decks`)

```javascript
{
  name: "Kortlekens namn",
  subtitle: "Beskrivning",
  icon: "🎴",
  backgroundColor: "linear-gradient(135deg, #669e6a 0%, #367b62 100%)",
  textColor: "#ffffff",
  public: true,
  creatorId: "abc123",
  creatorName: "Anna",
  createdAt: "2024-01-15T10:00:00.000Z",
  updatedAt: "2024-01-15T12:00:00.000Z",
  cards: [
    {
      category: "Kategori",
      icon: "🎯",
      title: "Kortets titel",
      description: "Beskrivning",
      tip: "Tips"
    }
  ]
}
```

### Creators (`creators`)

```javascript
{
  name: "Anna",
  password: "creator-lösenord",
  deckCount: 3,
  createdAt: "2024-01-10T08:00:00.000Z"
}
```

### Admin-inställningar (`settings/admin`)

```javascript
{
  password: "admin-lösenord"
}
```

## Enhetstester

Öppna `tests.html` i en webbläsare för att köra enhetstester för de rena funktionerna.

## Teknologi

- Vanilla HTML, CSS, JavaScript
- Firebase Firestore för datalagring
- Inga byggverktyg eller externa beroenden

## Filstruktur

```
├── index.html          # Huvudsida för att visa/spela kortlekar
├── creator.html        # Creator-sida för att hantera egna kortlekar
├── admin.html          # Admin-sida för att hantera creators och kortlekar
├── tests.html          # Enhetstester
├── app.js              # Huvudlogik för kortspelet
├── creator.js          # Logik för creator-sidan
├── admin.js            # Logik för admin-sidan
├── icons.js            # Ikoner/emojis
├── firebase-config.js  # Firebase-konfiguration
├── styles.css          # Huvudstilar
├── creator.css         # Stilar för creator-sidan
├── admin.css           # Stilar för admin-sidan
├── decks/              # Lokala JSON-filer (backup/exempel)
└── example-*.csv       # Exempel på CSV-filer
```

## Lokal utveckling

1. Klona repot
2. Konfigurera Firebase i `firebase-config.js`
3. Skapa `settings/admin` i Firestore med ett `password`-fält
4. Öppna `index.html` i en webbläsare (eller använd en lokal server)

## Licens

MIT
