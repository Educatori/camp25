// js/firebase-config.js
// Configurazione Firebase unificata per tutto il sito

export const firebaseConfig = {
    apiKey: "AIzaSyA2CZmgpuWsaLXiKoSQmnigf67MJI44Rus",
    authDomain: "anagrafica25.firebaseapp.com",
    databaseURL: "https://anagrafica25-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "anagrafica25",
    storageBucket: "anagrafica25.firebasestorage.app",
    messagingSenderId: "724474113103",
    appId: "1:724474113103:web:065ae533efb97d7a080e3a",
    measurementId: "G-MBZW81SSH6"
};

// Opzionale: esporta anche i path dei database per coerenza
export const DB_PATHS = {
    STUDENTI: 'studenti',
    CONVITTORI: 'convittori',
    PRESENZE: 'presenze',
    NOTE: 'note'
};
