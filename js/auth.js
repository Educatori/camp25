/* ============================================================
   AUTH.JS — Autenticazione condivisa per tutto il sito
   Convitto 2025
   
   USO: aggiungere in ogni pagina protetta:
     <script type="module" src="js/auth.js"></script>
   
   La pagina viene nascosta finché Firebase non conferma
   che l'utente è autenticato. Se non lo è, redirect a login.html.
   ============================================================ */

import { initializeApp }           from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get }   from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { firebaseConfig }          from "js/firebase-config.js";

// ── Inizializza (usa la stessa app se già avviata) ────────────
let app;
try {
    app = initializeApp(firebaseConfig);
} catch (e) {
    // App già inizializzata in un altro modulo — la recuperiamo
    const { getApp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
    app = getApp();
}

export const auth = getAuth(app);
export const db   = getDatabase(app);

// ── Nasconde il body finché non c'è conferma auth ────────────
document.body.style.visibility = "hidden";

// ── Controlla autenticazione ─────────────────────────────────
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.body.style.visibility = "visible";
        // Espone l'utente globalmente per gli script che ne hanno bisogno
        window._currentUser = user;
        // Dispatcha evento custom così gli script possono reagire
        document.dispatchEvent(new CustomEvent("authReady", { detail: { user } }));
    } else {
        // Non autenticato → redirect al login
        const current = encodeURIComponent(window.location.pathname.split("/").pop());
        window.location.href = `login.html?redirect=${current}`;
    }
});

// ── Helper: carica i dati dal DB una volta sola ───────────────
let _cachedData = null;

export async function getConvittoData() {
    if (_cachedData) return _cachedData;
    const snap = await get(ref(db, "convitto-data"));
    if (!snap.exists()) throw new Error("Dati non trovati su Firebase");
    _cachedData = snap.val();
    return _cachedData;
}

// ── Helper: filtra convittori (room 101-221) ──────────────────
export function getConvittori(tuttiStudenti) {
    return tuttiStudenti.filter(s => {
        const n = parseInt(s.room, 10);
        return !isNaN(n) && n >= 101 && n <= 221;
    });
}
