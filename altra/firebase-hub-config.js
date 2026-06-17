// Configurazione Firebase (hub-config.js) del tuo progetto


const firebaseConfig = {
  apiKey: "AIzaSyCsI40TPF3XQjeJlsPmRKq4aFyO-4ceA1A",
  authDomain: "campushub-90d60.firebaseapp.com",
  databaseURL: "https://campushub-90d60-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "campushub-90d60",
  storageBucket: "campushub-90d60.firebasestorage.app",
  messagingSenderId: "318654288542",
  appId: "1:318654288542:web:069cf435aeab017481e18f",
  measurementId: "G-R5LPY2B2X5"
};



// Inizializzazione di Firebase
firebase.initializeApp(firebaseConfig);

// Riferimenti ai servizi
const auth = firebase.auth();
const db = firebase.database(); // In questo esempio usiamo il Realtime Database, perfetto per strutture JSON veloci

