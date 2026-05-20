/* ============================================================
   AUTH.JS — Autenticazione condivisa per tutto il sito
   Convitto 2025
   
   USO: aggiungere in ogni pagina protetta:
     <script type="module" src="js/auth.js"></script>
   
   La pagina viene nascosta finché Firebase non conferma
   che l'utente è autenticato. Se non lo è, redirect a login.html.
   ============================================================ */

import { initializeApp, getApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

// ── Inizializza (usa la stessa app se già avviata) ────────────
let app;
try {
    app = initializeApp(firebaseConfig);
} catch (e) {
    // App già inizializzata in un altro modulo — la recuperiamo
    app = getApp();
}

export const auth = getAuth(app);
export const db = getDatabase(app);

// ── Nasconde il body finché non c'è conferma auth (solo se non è login) ────────────
// Evita di nascondere la pagina di login
if (!window.location.pathname.includes("login.html")) {
    document.body.style.visibility = "hidden";
}

// ── Controlla autenticazione ─────────────────────────────────
export function initAuth(redirectOnUnauth = true, redirectUrl = "login.html") {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                if (!window.location.pathname.includes("login.html")) {
                    document.body.style.visibility = "visible";
                }
                window._currentUser = user;
                
                // Dispatch evento custom
                document.dispatchEvent(new CustomEvent("authReady", { detail: { user } }));
                resolve(user);
            } else {
                if (redirectOnUnauth && !window.location.pathname.includes("login.html")) {
                    const current = encodeURIComponent(window.location.pathname.split("/").pop() || "index.html");
                    window.location.href = `${redirectUrl}?redirect=${current}`;
                } else {
                    if (!window.location.pathname.includes("login.html")) {
                        document.body.style.visibility = "visible";
                    }
                    resolve(null);
                }
            }
        });
    });
}

// ── Helper: logout ──────────────────────────────────────────
export async function logout() {
    await signOut(auth);
    window.location.href = "login.html";
}

// ── Helper: carica i dati dal DB una volta sola ───────────────
let _cachedData = null;

export async function getConvittoData() {
    if (_cachedData) return _cachedData;
    const snap = await get(ref(db, "convitto-data"));
    if (!snap.exists()) throw new Error("Dati non trovati su Firebase");
    _cachedData = snap.val();
    return _cachedData;
}

// ── Helper: carica studenti dal DB ───────────────────────────
let _cachedStudenti = null;

export async function getStudenti() {
    if (_cachedStudenti) return _cachedStudenti;
    
    console.log("Caricamento studenti da Firebase...");
    const snap = await get(ref(db, "studenti"));
    
    if (!snap.exists()) {
        console.warn("Nessuno studente trovato nel database");
        return [];
    }
    
    const studentiData = snap.val();
    const studentiList = [];
    
    for (let id in studentiData) {
        const s = studentiData[id];
        // Normalizza i campi supportando sia italiano che inglese
        const nome = s.nome || s.firstName || "";
        const cognome = s.cognome || s.lastName || "";
        const nomeCompleto = `${nome} ${cognome}`.trim();
        
        studentiList.push({
            id: id,
            nome: nome,
            cognome: cognome,
            nomeCompleto: nomeCompleto || s.name || s.fullName || "Sconosciuto",
            stanza: s.room || s.stanza || s.numeroStanza || "",
            classe: s.classe || s.className || s.grade || "",
            busMattina8: s.busMattina8 === true || s.bus8 === true || s.busOre8 === true,
            note: s.note || ""
        });
    }
    
    console.log(`Caricati ${studentiList.length} studenti`);
    _cachedStudenti = studentiList;
    return studentiList;
}

// ── Helper: filtra convittori (room 101-221) ──────────────────
export function getConvittori(tuttiStudenti) {
    if (!tuttiStudenti) return [];
    return tuttiStudenti.filter(s => {
        const n = parseInt(s.stanza, 10);
        return !isNaN(n) && n >= 101 && n <= 221;
    });
}

// ── Helper: filtra studenti bus 8:00 ─────────────────────────
export function getStudentiBus8(tuttiStudenti) {
    if (!tuttiStudenti) return [];
    return tuttiStudenti.filter(s => s.busMattina8 === true);
}

// ── Helper: invalida cache (utile dopo modifiche) ────────────
export function invalidateCache() {
    _cachedData = null;
    _cachedStudenti = null;
    console.log("Cache invalidata");
}

// ── Avvia automaticamente per le pagine che non chiamano initAuth ────────
// Se vuoi che la protezione sia automatica, decommenta:
// initAuth(true, "login.html");
