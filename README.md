# Kortlek

En interaktiv webbapp för att visa och dra kort från olika kortlekar. Perfekt för övningar, samtal, eller pedagogiska syften.

**Live demo:** https://klaraward.github.io/carddeck-collections/

> **OBS:** Om repot är privat måste du antingen göra det publikt eller ha GitHub Pro/Team för att GitHub Pages ska fungera.

## Funktioner

- **Flera kortlekar** - Stöd för flera olika kortlekar, varje med egen design
- **Dra kort** - Slumpa eller dra kort i ordning
- **Favoriter** - Markera kort med hjärta för snabb åtkomst
- **Samlingar** - Skapa egna samlingar av kort
- **Konfigurerbar design** - Varje kortlek kan ha egen bakgrundsfärg och textfärg
- **Publika/privata lekar** - Kortlekar kan vara publika (visas i listan) eller dolda (kräver direktlänk)

## Användning

1. Öppna `index.html` i en webbläsare (eller besök GitHub Pages-länken)
2. Välj en kortlek från listan, eller använd `?deck=ID` i URL:en för direktlänk
3. Klicka på kortleken för att dra ett kort
4. Använd hjärtat för att favoritmarkera kort
5. Skapa egna samlingar via +-knappen

## Skapa nya kortlekar

1. Gå till `creator.html`
2. Ange admin-lösenord
3. Fyll i kortlekens uppgifter (ID, namn, färger, ikon)
4. Ladda upp en CSV-fil med kort

### CSV-format

```csv
category,icon,title,description,tip
Andning,🌬️,Djupandning,"Andas in i 4 sekunder, ut i 8 sekunder","Fokusera på utandningen"
```

Se `example-breakfast.csv` för ett exempel.

## Firestore-struktur

Kortlekar lagras i Firestore under `decks`-collectionen:

```javascript
{
  name: "Kortlekens namn",
  subtitle: "Beskrivning",
  icon: "🎴",
  backgroundColor: "linear-gradient(135deg, #669e6a 0%, #367b62 100%)",
  textColor: "#ffffff",
  public: true,  // true = visas i listan
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

Admin-lösenordet lagras i `settings/admin`:

```javascript
{
  password: "ditt-lösenord"
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
├── creator.html        # Admin-sida för att skapa kortlekar
├── tests.html          # Enhetstester
├── app.js              # Huvudlogik för kortspelet
├── creator.js          # Logik för att skapa kortlekar
├── icons.js            # Ikoner/emojis
├── firebase-config.js  # Firebase-konfiguration
├── styles.css          # Huvudstilar
├── creator.css         # Stilar för creator-sidan
├── decks/              # Lokala JSON-filer (backup/exempel)
└── example-*.csv       # Exempel på CSV-filer
```

## Lokal utveckling

1. Klona repot
2. Konfigurera Firebase i `firebase-config.js`
3. Öppna `index.html` i en webbläsare (eller använd en lokal server)

## Licens

MIT
