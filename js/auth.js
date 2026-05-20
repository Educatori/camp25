/* ============================================================
   AUTH.JS — Autenticazione condivisa per tutto il sito
   Convitto 2025
   ============================================================ */

import { initializeApp, getApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get, update, set, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

// ── Inizializza Firebase ────────────
let app;
try {
    app = initializeApp(firebaseConfig);
} catch (e) {
    app = getApp();
}

export const auth = getAuth(app);
export const db = getDatabase(app);

// Cache per dati frequentemente usati
let _cachedStudenti = null;
let _cachedAuthorizedUsers = null;
let _cachedPermessi = null;
let _cachedRoomCloud = null;

// ── Nasconde il body finché non c'è conferma auth ────────────
const publicPages = ["login.html", "index.html"]; // index mostrato ma poi filtrato
if (!publicPages.includes(window.location.pathname.split("/").pop())) {
    document.body.style.visibility = "hidden";
}

// ── Verifica se un utente è autorizzato ──────────────────────
export async function isUserAuthorized(userId) {
    if (!userId) return false;
    
    try {
        const authUsersRef = ref(db, "authorizedUsers");
        const snapshot = await get(authUsersRef);
        
        if (snapshot.exists()) {
            const authorizedUsers = snapshot.val();
            return authorizedUsers[userId] === true;
        }
        return false;
    } catch (error) {
        console.error("Errore verifica autorizzazione:", error);
        return false;
    }
}

// ── Controlla autenticazione e autorizzazione ─────────────────
export function initAuth(redirectOnUnauth = true, redirectUrl = "login.html") {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Verifica se l'utente è nella lista authorizedUsers
                const isAuthorized = await isUserAuthorized(user.uid);
                
                if (isAuthorized) {
                    // Utente autorizzato
                    if (!publicPages.includes(window.location.pathname.split("/").pop())) {
                        document.body.style.visibility = "visible";
                    }
                    window._currentUser = user;
                    document.dispatchEvent(new CustomEvent("authReady", { detail: { user } }));
                    resolve(user);
                } else {
                    // Utente autenticato ma NON autorizzato
                    console.warn("Utente non autorizzato:", user.uid);
                    await signOut(auth);
                    
                    if (redirectOnUnauth) {
                        window.location.href = `${redirectUrl}?error=unauthorized`;
                    }
                    resolve(null);
                }
            } else {
                // Utente non autenticato
                if (redirectOnUnauth && !publicPages.includes(window.location.pathname.split("/").pop())) {
                    const current = encodeURIComponent(window.location.pathname.split("/").pop() || "index.html");
                    window.location.href = `${redirectUrl}?redirect=${current}`;
                } else {
                    if (!publicPages.includes(window.location.pathname.split("/").pop())) {
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
export async function getStudenti(forceReload = false) {
    if (_cachedStudenti && !forceReload) return _cachedStudenti;
    
    console.log("Caricamento studenti da Firebase...");
    const snap = await get(ref(db, "studenti"));
    
    if (!snap.exists()) {
        console.warn("Nessuno studente trovato nel database");
        return [];
    }
    
    const studentiData = snap.val();
    let studentiList = [];
    
    for (let id in studentiData) {
        const s = studentiData[id];
        studentiList.push({
            id: s.id || id,
            nome: s.nome || "",
            cognome: s.cognome || "",
            nomeCompleto: `${s.nome || ""} ${s.cognome || ""}`.trim(),
            stanza: s.room || s.stanza || "-",
            classe: s.classe || "",
            busMattina8: s.busMattina8 === true,
            percorso: s.percorso || "",
            note: s.note || ""
        });
    }
    
    // Ordina per cognome
    studentiList.sort((a, b) => a.cognome.localeCompare(b.cognome));
    
    console.log(`Caricati ${studentiList.length} studenti`);
    _cachedStudenti = studentiList;
    return studentiList;
}

// ── Helper: carica permessi dal DB ───────────────────────────
export async function getPermessi(forceReload = false) {
    if (_cachedPermessi && !forceReload) return _cachedPermessi;
    
    const snap = await get(ref(db, "permessi"));
    if (snap.exists()) {
        _cachedPermessi = snap.val();
        return _cachedPermessi;
    }
    return {};
}

// ── Helper: carica roomcloud ─────────────────────────────────
export async function getRoomCloud(forceReload = false) {
    if (_cachedRoomCloud && !forceReload) return _cachedRoomCloud;
    
    const snap = await get(ref(db, "roomcloud"));
    if (snap.exists()) {
        _cachedRoomCloud = snap.val();
        return _cachedRoomCloud;
    }
    return { stanze_speciali: {} };
}

// ── Verifica se uno studente è convittore (ha stanza valida e non speciale) ──
export async function isConvittore(studente) {
    const stanza = studente.stanza;
    if (!stanza || stanza === "-") return false;
    
    // Verifica se è una stanza speciale (educatori, foresteria)
    const roomCloud = await getRoomCloud();
    const stanzeSpeciali = roomCloud.stanze_speciali || {};
    
    if (stanzeSpeciali[`r${stanza}`]) return false;
    
    const n = parseInt(stanza, 10);
    return !isNaN(n) && n >= 101 && n <= 221;
}

// ── Classi che usano il bus 8:00 (dal tuo database) ──────────
const CLASSI_BUS8 = ["1A", "1B", "3A", "3B", "3C", "4A", "4B", "5A"];

export function isClasseBus8(classe) {
    return CLASSI_BUS8.includes(classe);
}

// ── Filtra studenti bus 8:00 (convittori + classe giusta) ──
export async function getStudentiBus8(tuttiStudenti = null) {
    const studenti = tuttiStudenti || await getStudenti();
    
    const results = [];
    for (const s of studenti) {
        const èConvittore = await isConvittore(s);
        const èClasseBus8 = isClasseBus8(s.classe);
        
        if (èConvittore && èClasseBus8) {
            results.push(s);
        }
    }
    return results;
}

// ── Filtra tutti i convittori ─────────────────────────────────
export async function getConvittori(tuttiStudenti = null) {
    const studenti = tuttiStudenti || await getStudenti();
    
    const results = [];
    for (const s of studenti) {
        if (await isConvittore(s)) {
            results.push(s);
        }
    }
    return results;
}

// ── Filtra studenti per classe (per transfer.html) ───────────
export async function getStudentiByClass(tuttiStudenti = null) {
    const studenti = tuttiStudenti || await getStudenti();
    const classiMap = new Map();
    
    for (const s of studenti) {
        if (!classiMap.has(s.classe)) {
            classiMap.set(s.classe, []);
        }
        classiMap.get(s.classe).push(s);
    }
    
    // Ordina le classi
    const sortedClasses = Array.from(classiMap.keys()).sort();
    const result = {};
    for (const classe of sortedClasses) {
        result[classe] = classiMap.get(classe);
    }
    return result;
}

// ── Ottiene i turni cena per una data ─────────────────────────
export async function getDinnerTurns(date = null) {
    const permessi = await getPermessi();
    const turniDinner = permessi.TURNI_DINNER || [];
    
    if (!date) {
        // Formato data YYYYMMDD
        const oggi = new Date();
        date = oggi.toISOString().slice(0, 10).replace(/-/g, "");
    }
    
    // Verifica se c'è un calendario gruppi per questa data
    const calendarioGruppi = permessi.CALENDARIO_GRUPPI_DINNER || {};
    const gruppoForDate = calendarioGruppi[date];
    
    let turni = { gr1: [], gr2: [] };
    
    if (turniDinner[1] && Array.isArray(turniDinner[1])) {
        turni.gr1 = turniDinner[1];
    }
    if (turniDinner[2] && Array.isArray(turniDinner[2])) {
        turni.gr2 = turniDinner[2];
    }
    
    // Se c'è un gruppo specifico per questa data, restituisci solo quello
    if (gruppoForDate === "gr1") {
        return { gr1: turni.gr1 };
    } else if (gruppoForDate === "gr2") {
        return { gr2: turni.gr2 };
    }
    
    return turni;
}

// ── Ottiene override turni per studenti specifici ────────────
export async function getOverrideTurni() {
    const permessi = await getPermessi();
    return permessi.OVERRIDE_TURNI_DINNER || {};
}

// ── Ottiene orari permessi studenti ──────────────────────────
export async function getOrariPP() {
    const permessi = await getPermessi();
    return permessi.ORARI_PP || {};
}

// ── Ottiene lab dinner assegnazioni ───────────────────────────
export async function getLabDinner() {
    const permessi = await getPermessi();
    return permessi.LAB_DINNER || [];
}

// ── Ottiene lab pranzo assegnazioni ───────────────────────────
export async function getLabPranzo() {
    const permessi = await getPermessi();
    return permessi.LAB_PRANZO || [];
}

// ── Ottiene assenti per permesso ──────────────────────────────
export async function getAssentiPermesso() {
    const permessi = await getPermessi();
    return permessi.ASSENTI_PERMESSO || [];
}

// ── Aggiorna i dati di uno studente ──────────────────────────
export async function updateStudente(studentId, data) {
    const studentRef = ref(db, `studenti/${studentId}`);
    await update(studentRef, data);
    _cachedStudenti = null; // Invalida cache
    console.log(`Studente ${studentId} aggiornato`);
}

// ── Aggiorna i permessi ──────────────────────────────────────
export async function updatePermessi(permessiPath, data) {
    const permessiRef = ref(db, `permessi/${permessiPath}`);
    await set(permessiRef, data);
    _cachedPermessi = null; // Invalida cache
    console.log(`Permessi ${permessiPath} aggiornati`);
}

// ── Invalida tutte le cache ───────────────────────────────────
export function invalidateAllCache() {
    _cachedStudenti = null;
    _cachedPermessi = null;
    _cachedRoomCloud = null;
    console.log("Tutte le cache invalidate");
}

// ── Helper: ottieni informazioni stanza speciale ──────────────
export async function getStanzaSpeciale(roomNumber) {
    const roomCloud = await getRoomCloud();
    const stanzeSpeciali = roomCloud.stanze_speciali || {};
    return stanzeSpeciali[`r${roomNumber}`] || null;
}