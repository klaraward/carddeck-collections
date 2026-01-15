# Firebase-kommandon

## Deploy

```bash
# Deploya allt (functions + firestore rules)
firebase deploy --only functions,firestore:rules

# Deploya bara functions
firebase deploy --only functions

# Deploya bara Firestore-regler
firebase deploy --only firestore:rules
```

## Functions

```bash
# Installera dependencies (kör från functions-mappen)
cd functions && npm install

# Visa loggar för alla functions
firebase functions:log

# Visa loggar för en specifik function
firebase functions:log --only deleteCreator

# Starta lokal emulator för testning
cd functions && npm run serve
```

## Lokal utveckling

```bash
# Starta alla emulatorer
firebase emulators:start

# Starta bara functions-emulator
firebase emulators:start --only functions
```

För att använda emulatorer lokalt, avkommentera i `firebase-config.js`:
```javascript
functions.useEmulator('localhost', 5001);
auth.useEmulator('http://localhost:9099');
```

## Felsökning

```bash
# Kontrollera inloggad användare
firebase login:list

# Logga in på nytt
firebase login

# Visa aktuellt projekt
firebase projects:list

# Byt projekt
firebase use <project-id>
```

## Länkar

- [Firebase Console](https://console.firebase.google.com/project/carddeck-collections/overview)
- [Authentication](https://console.firebase.google.com/project/carddeck-collections/authentication/users)
- [Firestore](https://console.firebase.google.com/project/carddeck-collections/firestore)
- [Functions](https://console.firebase.google.com/project/carddeck-collections/functions)
