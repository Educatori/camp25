/* ============================================================
   AUTH.JS — Autenticazione condivisa per tutto il sito
   Convitto 2025
   ============================================================ */

import { initializeApp, getApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

// ── Inizializza ────────────
let app;
try {
    app = initializeApp(firebaseConfig);
} catch (e) {
    app = getApp();
}

export const auth = getAuth(app);
export const db = getDatabase(app);

// ── Nasconde il body finché non c'è conferma auth ────────────
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

// ── Helper: carica studenti dal DB (array) ───────────────────
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
    let studentiList = [];
    
    if (Array.isArray(studentiData)) {
        studentiList = studentiData.map((s, index) => ({
            id: s.id || index,
            nome: s.nome || "",
            cognome: s.cognome || "",
            nomeCompleto: `${s.nome || ""} ${s.cognome || ""}`.trim(),
            stanza: s.room || s.stanza || "",
            classe: s.classe || "",
            busMattina8: s.busMattina8 === true,
            note: s.note || ""
        }));
    } else {
        for (let id in studentiData) {
            const s = studentiData[id];
            studentiList.push({
                id: id,
                nome: s.nome || "",
                cognome: s.cognome || "",
                nomeCompleto: `${s.nome || ""} ${s.cognome || ""}`.trim(),
                stanza: s.room || s.stanza || "",
                classe: s.classe || "",
                busMattina8: s.busMattina8 === true,
                note: s.note || ""
            });
        }
    }
    
    console.log(`Caricati ${studentiList.length} studenti`);
    _cachedStudenti = studentiList;
    return studentiList;
}

// ── Helper: verifica se uno studente è convittore (ha stanza valida) ──
export function isConvittore(studente) {
    const stanza = studente.stanza;
    if (!stanza || stanza === "-") return false;
    const n = parseInt(stanza, 10);
    return !isNaN(n) && n >= 101 && n <= 221;
}

// ── Helper: classi che usano il bus 8:00 ─────────────────────
const CLASSI_BUS8 = ["1A", "1B", "3A", "3B", "3C", "4A", "4B", "5A"];

export function isClasseBus8(classe) {
    return CLASSI_BUS8.includes(classe);
}

// ── Helper: filtra studenti bus 8:00 (in base a classe + convittore) ──
export function getStudentiBus8(tuttiStudenti) {
    if (!tuttiStudenti) return [];
    
    return tuttiStudenti.filter(s => {
        // Deve essere convittore (avere stanza valida)
        const èConvittore = isConvittore(s);
        // Deve essere in una delle classi che usano il bus
        const èClasseBus8 = isClasseBus8(s.classe);
        
        return èConvittore && èClasseBus8;
    });
}

// ── Helper: filtra convittori (tutti quelli con stanza 101-221) ──
export function getConvittori(tuttiStudenti) {
    if (!tuttiStudenti) return [];
    return tuttiStudenti.filter(s => isConvittore(s));
}

// ── Helper: invalida cache ───────────────────────────────────
export function invalidateCache() {
    _cachedStudenti = null;
    console.log("Cache invalidata");
}

// ── Helper: ottieni statistiche (utile per debug) ────────────
export function getStatistiche(tuttiStudenti) {
    if (!tuttiStudenti) return { totale: 0, convittori: 0, bus8: 0, perClasse: {} };
    
    const convittori = getConvittori(tuttiStudenti);
    const bus8 = getStudentiBus8(tuttiStudenti);
    
    const perClasse = {};
    CLASSI_BUS8.forEach(classe => {
        perClasse[classe] = convittori.filter(s => s.classe === classe).length;
    });
    
    return {
        totale: tuttiStudenti.length,
        convittori: convittori.length,
        bus8: bus8.length,
        perClasse: perClasse
    };
}
