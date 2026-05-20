/* FIREBASE-CRUSCOTTO-CONFIG.JS */
// Configurazione Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA2CZmgpuWsaLXiKoSQmnigf67MJI44Rus",
  authDomain: "anagrafica25.firebaseapp.com",
  databaseURL: "https://anagrafica25-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "anagrafica25",
  storageBucket: "anagrafica25.firebasestorage.app",
  messagingSenderId: "724474113103",
  appId: "1:724474113103:web:065ae533efb97d7a080e3a",
  measurementId: "G-MBZW81SSH6"
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
