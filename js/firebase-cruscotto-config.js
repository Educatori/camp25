/* FIREBASE-CRUSCOTTO-CONFIG.JS */
// Configurazione Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCujVjW7Aorn0illq_2w50u8oAgWGJEBRY",
    authDomain: "cruscotto-722bc.firebaseapp.com",
    databaseURL: "https://cruscotto-722bc-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "cruscotto-722bc",
    storageBucket: "cruscotto-722bc.firebasestorage.app",
    messagingSenderId: "594198664103",
    appId: "1:594198664103:web:cc50982af1a9fc757b5c82",
    measurementId: "G-BVS9JG6HVC"
};

// Inizializza Firebase con la sintassi compat
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Variabili globali per la sincronizzazione
let isSyncing = false;
let currentDataListener = null;
let currentPermessiListener = null;
let currentNoteListener = null;
let currentAssenzeListener = null;