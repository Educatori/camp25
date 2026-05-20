import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, set, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Riferimento al file di configurazione esterno
import { firebaseConfig } from './js/firebase-config.js';

// Inizializzazione Firebase
const app  = initializeApp(firebaseConfig);
const db   = getDatabase(app);
const auth = getAuth(app);

// Stato dell'applicazione
let studentiData  = [];
let assenzeData   = {};
let pendingResolve = null;

// Riferimenti DOM Elementi della pagina
const loginScreen     = document.getElementById('loginScreen');
const appScreen       = document.getElementById('appScreen');
const loginError      = document.getElementById('loginError');
const roomsGrid       = document.getElementById('roomsGrid');
const statsForesteria = document.getElementById('statsForesteria');
const modal           = document.getElementById('actionModal');
const modalMessage    = document.getElementById('modalMessage');
const currentDateSpan = document.getElementById('currentDate');

// Bottoni Modale
const standbyBtn  = document.getElementById('modalStandbyBtn');
const assenteBtn  = document.getElementById('modalAssenteBtn');
const attivitaBtn = document.getElementById('modalAttivitaBtn');
const cancelBtn   = document.getElementById('modalCancelBtn');

// Bottoni Header
const loginBtn  = document.getElementById('loginBtn');
const stampaBtn = document.getElementById('stampaBtn');
const resetBtn  = document.getElementById('resetBtn');
const logoutBtn = document.getElementById('logoutBtn');

// Aggiornamento Data in lingua italiana nell'header
function updateCurrentDate() {
    const now = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const formatted = now.toLocaleDateString('it-IT', options);
    currentDateSpan.textContent = `| ${formatted.charAt(0).toUpperCase() + formatted.slice(1)}`;
}
updateCurrentDate();

// Gestione dei dialoghi d'azione tramite Promise
function showChoiceDialog(studentName) {
    modalMessage.textContent = `Scegli stato per ${studentName}`;
    modal.style.display = 'flex';
    return new Promise((resolve) => { pendingResolve = resolve; });
}

function closeModal(resolveValue = null) {
    modal.style.display = 'none';
    if (pendingResolve) { 
        pendingResolve(resolveValue); 
        pendingResolve = null; 
    }
}

// Event Listeners dei bottoni interni della Modale
standbyBtn.onclick  = () => closeModal('standby');
assenteBtn.onclick  = () => closeModal('assente');
attivitaBtn.onclick = () => closeModal('attivita');
cancelBtn.onclick   = () => closeModal(null);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(null); });

// Generazione ID standardizzato per Firebase
function getStudentId(studente, room) {
    return `${studente.cognome}_${studente.nome}_${room}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}

// Cambia o rimuove lo stato di un convittore su Firebase
async function setStatoStudente(id, scelta) {
    if (scelta === null) return;
    const statoCorrente = assenzeData[id] || {};
    let isAlreadyActive = false;
    
    if (scelta === 'standby'  && statoCorrente.assente)   isAlreadyActive = true;
    if (scelta === 'assente'  && statoCorrente.confermato) isAlreadyActive = true;
    if (scelta === 'attivita' && statoCorrente.attivita)   isAlreadyActive = true;
    
    let nuovoStato = isAlreadyActive ? null : { assente: false, confermato: false, attivita: false };
    if (!isAlreadyActive) {
        if (scelta === 'standby')  nuovoStato.assente   = true;
        if (scelta === 'assente')  nuovoStato.confermato = true;
        if (scelta === 'attivita') nuovoStato.attivita   = true;
    }
    await set(ref(db, `assenze/${id}`), nuovoStato);
}

// Salva informazioni della camera Foresteria
async function salvaForesteria(id, nome) {
    await set(ref(db, `assenze/${id}`), nome.trim()
        ? { occupato: true, nomeOccupante: nome.trim() }
        : null);
}

// Funzioni di Autenticazione ed Eventi di Controllo Principali
const eseguiLogin = async () => {
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    try { 
        await signInWithEmailAndPassword(auth, email, password); 
    } catch (e) { 
        loginError.textContent = 'Email o password non validi'; 
    }
};

const eseguiLogout = async () => { 
    if (confirm('Vuoi uscire?')) await signOut(auth); 
};

const resetTutteAssenze = async () => {
    if (!confirm('Resettare tutte le assenze, conferme, attività e foresteria?')) return;
    const updates = {};
    Object.keys(assenzeData).forEach(id => { updates[`assenze/${id}`] = null; });
    if (Object.keys(updates).length > 0) {
        await update(ref(db), updates);
    } else {
        alert('Nessuna registrazione presente.');
    }
};

const stampaReport = () => {
    const ora  = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const data = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    document.getElementById('printTimestamp').textContent = `Aggiornamento ${data} ore ${ora}`;
    window.print();
};

// Assegnazione Eventi ai bottoni principali della UI
loginBtn.addEventListener('click', eseguiLogin);
stampaBtn.addEventListener('click', stampaReport);
resetBtn.addEventListener('click', resetTutteAssenze);
logoutBtn.addEventListener('click', eseguiLogout);

// Rendering del singolo elemento studente nella lista della camera
function creaStudenteElement(studente, room) {
    const id          = getStudentId(studente, room);
    const stato       = assenzeData[id] || {};
    const isForesteria = studente.classe === 'Foresteria';
    const isNota       = studente.cognome === 'NOTE';

    const div = document.createElement('div');
    div.className = 'student-item';

    if (isNota) {
        div.className += ' nota-row';
        div.innerHTML = `<div class="student-name">${studente.nome}</div>`;
        return div;
    }

    if (isForesteria) {
        div.className = `student-item foresteria-row ${stato.occupato ? 'foresteria-occupato' : ''}`;
        div.innerHTML = `
            <span class="student-name">Foresteria ${studente.nome}</span>
            <input type="text" class="foresteria-input" placeholder="Nome ospite..." value="${stato.nomeOccupante || ''}">
        `;
        div.querySelector('input').addEventListener('change', (e) => salvaForesteria(id, e.target.value));
        return div;
    }

    if (stato.assente)    div.classList.add('stato-assente');
    if (stato.confermato) div.classList.add('stato-confermato');
    if (stato.attivita)   div.classList.add('stato-attivita');

    let statusHtml = '';
    if (stato.assente)    statusHtml = '<div class="student-status status-assente">❓ STAND-BY</div>';
    if (stato.confermato) statusHtml = '<div class="student-status status-confermato">❌ ASSENTE</div>';
    if (stato.attivita)   statusHtml = '<div class="student-status status-attivita">⚙️ ATTIVITÀ</div>';

    div.innerHTML = `
        <div class="student-name">${studente.cognome} ${studente.nome}</div>
        <div class="student-class">${studente.classe}</div>
        ${statusHtml}
    `;

    div.addEventListener('click', async (e) => {
        if (e.target.tagName === 'INPUT') return;
        const scelta = await showChoiceDialog(`${studente.cognome} ${studente.nome}`);
        if (scelta !== null) await setStatoStudente(id, scelta);
    });

    return div;
}

// Generazione dinamica della griglia basata sulle stanze dei convittori
function generaGriglia() {
    if (!studentiData.length) return;
    const stanze = {};
    let fTot = 0, fOcc = 0;

    studentiData.forEach(s => {
        if (!stanze[s.room]) stanze[s.room] = [];
        stanze[s.room].push(s);
        if (s.classe === 'Foresteria') {
            fTot++;
            if (assenzeData[getStudentId(s, s.room)]?.occupato) fOcc++;
        }
    });

    statsForesteria.textContent = `Posti liberi: ${fTot - fOcc}/${fTot}`;
    roomsGrid.innerHTML = '';

    Object.keys(stanze).sort((a, b) => Number(a) - Number(b)).forEach(room => {
        const card = document.createElement('div');
        card.className = 'room-card';
        card.innerHTML = `<div class="room-title">${room}</div>`;
        const list = document.createElement('div');
        list.className = 'students-list';
        stanze[room].forEach(s => list.appendChild(creaStudenteElement(s, room)));
        card.appendChild(list);
        roomsGrid.appendChild(card);
    });
}

// Monitoraggio dello stato dell'autenticazione dell'utente
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginScreen.style.display = 'none';
        appScreen.style.display   = 'block';
        
        onValue(ref(db, 'anagrafica'), (s) => {
            const d = s.val();
            // FILTRO ESSENZIALE: vengono considerati SOLO gli studenti con una proprietà "room" definita (i convittori)
            studentiData = d ? (Array.isArray(d) ? d : Object.values(d)).filter(x => x && x.cognome && x.room) : [];
            generaGriglia();
        });
        
        onValue(ref(db, 'assenze'), (s) => { 
            assenzeData = s.val() || {}; 
            generaGriglia(); 
        });
    } else {
        loginScreen.style.display = 'block';
        appScreen.style.display   = 'none';
    }
});