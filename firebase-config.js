// Firebase configuration
// Replace with your own Firebase project settings
const firebaseConfig = {
    apiKey: "AIzaSyAi6Ol6ndQZL5nleCua4PCkGisX_hX--80",
    authDomain: "carddeck-collections.firebaseapp.com",
    projectId: "carddeck-collections",
    storageBucket: "carddeck-collections.firebasestorage.app",
    messagingSenderId: "202816103380",
    appId: "1:202816103380:web:5aa0582321e7e4a5ce6c41"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
