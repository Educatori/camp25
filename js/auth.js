/* ============================================================
   AUTH.JS — Autenticazione condivisa per tutto il sito
   Convitto 2025
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
    
    // Se è un array (come nel tuo caso)
    let studentiList = [];
    
    if (Array.isArray(studentiData)) {
        studentiList = studentiData.map((s, index) => ({
            id: s.id || index,
            nome: s.nome || "",
            cognome: s.cognome || "",
            nomeCompleto: `${s.nome || ""} ${s.cognome || ""}`.trim(),
            stanza: s.room || s.stanza || "",
            classe: s.classe || "",
            busMattina8: s.busMattina8 === true || s.bus8 === true,
            note: s.note || ""
        }));
    } else {
        // Se è un oggetto (formato alternativo)
        for (let id in studentiData) {
            const s = studentiData[id];
            studentiList.push({
                id: id,
                nome: s.nome || "",
                cognome: s.cognome || "",
                nomeCompleto: `${s.nome || ""} ${s.cognome || ""}`.trim(),
                stanza: s.room || s.stanza || "",
                classe: s.classe || "",
                busMattina8: s.busMattina8 === true || s.bus8 === true,
                note: s.note || ""
            });
        }
    }
    
    console.log(`Caricati ${studentiList.length} studenti`);
    _cachedStudenti = studentiList;
    return studentiList;
}

// ── Helper: filtra convittori (room 101-221, esclude "-") ─────
export function getConvittori(tuttiStudenti) {
    if (!tuttiStudenti) return [];
    return tuttiStudenti.filter(s => {
        const stanza = s.stanza;
        if (!stanza || stanza === "-") return false;
        const n = parseInt(stanza, 10);
        return !isNaN(n) && n >= 101 && n <= 221;
    });
}

// ── Helper: filtra studenti bus 8:00 ─────────────────────────
export function getStudentiBus8(tuttiStudenti) {
    if (!tuttiStudenti) return [];
    return tuttiStudenti.filter(s => s.busMattina8 === true);
}

// ── Helper: invalida cache ───────────────────────────────────
export function invalidateCache() {
    _cachedStudenti = null;
    console.log("Cache invalidata");
}

// ── Helper: aggiorna campo busMattina8 per uno studente ──────
export async function setBusMattina8(studentId, value) {
    const studentRef = ref(db, `studenti/${studentId}`);
    await update(studentRef, { busMattina8: value });
    invalidateCache();
    console.log(`Studente ${studentId} busMattina8 = ${value}`);
}

// Nota: devi importare update da firebase-database
import { update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
