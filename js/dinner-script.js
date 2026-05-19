/* DINNER-SCRIPT.JS */
// Estrae il numero della classe E la lettera per un ordinamento corretto
// Esempi: "1A" → { num: 1, lettera: "A" }, "3P" → { num: 3, lettera: "P" }
function parseClasse(classe) {
    if (!classe) return { num: 999, lettera: "Z" };
    const match = classe.toString().toUpperCase().match(/^(\d+)([A-Z]?)$/);
    if (match) {
        return { 
            num: parseInt(match[1]), 
            lettera: match[2] || "A" 
        };
    }
    return { num: 999, lettera: "Z" };
}

// ORDINAMENTO CORRETTO: prima per numero classe, poi per lettera classe, poi per cognome
function ordinaPerClasseECognome(a, b) {
    const classeA = parseClasse(a.classe);
    const classeB = parseClasse(b.classe);
    
    // Prima ordina per numero classe (1, 2, 3, 4, 5...)
    if (classeA.num !== classeB.num) return classeA.num - classeB.num;
    
    // Stesso numero → ordina per lettera (A, B, C, P...)
    if (classeA.lettera !== classeB.lettera) return classeA.lettera.localeCompare(classeB.lettera);
    
    // Stessa classe → ordina per cognome alfabeticamente
    const cognomeA = (a.cognome || '').toUpperCase();
    const cognomeB = (b.cognome || '').toUpperCase();
    return cognomeA.localeCompare(cognomeB);
}

// Distribuisce gli studenti in colonne mantenendo l'ordine sequenziale
// (riempie prima la colonna 1, poi la colonna 2, ecc.)
function distribuisciInColonne(studenti, numColonne = 3) {
    const colonne = Array(numColonne).fill().map(() => []);
    
    if (studenti.length === 0) return colonne;
    
    // Calcola quanti studenti per colonna (arrotondato per eccesso)
    const studentiPerColonna = Math.ceil(studenti.length / numColonne);
    
    // Riempie le colonne in sequenza
    for (let i = 0; i < studenti.length; i++) {
        const colonnaIndex = Math.floor(i / studentiPerColonna);
        if (colonnaIndex < numColonne) {
            colonne[colonnaIndex].push(studenti[i]);
        }
    }
    
    return colonne;
}

// Crea una singola colonna HTML
function creaColonna(studenti) {
    const colonnaDiv = document.createElement('div');
    colonnaDiv.className = 'column';
    
    // Intestazione colonna
    const header = document.createElement('div');
    header.className = 'column-header';
    header.innerHTML = `
        <div class="cell-class">Classe</div>
        <div class="cell-name">Nome e Cognome</div>
        <div class="cell-check">LU</div>
        <div class="cell-check">MA</div>
        <div class="cell-check">ME</div>
        <div class="cell-check">GI</div>
    `;
    colonnaDiv.appendChild(header);
    
    // Aggiunge le righe degli studenti
    studenti.forEach(studente => {
        colonnaDiv.appendChild(creaRigaStudente(studente));
    });
    
    return colonnaDiv;
}

// Crea una singola riga studente
function creaRigaStudente(s) {
    const row = document.createElement('div');
    row.className = 'student-row';

    let classeDisplay = (s.classe || '').toString().toUpperCase();

    row.innerHTML = `
        <div class="cell-class">${classeDisplay}</div>
        <div class="cell-name" style="cursor:pointer">
            <b>${s.cognome || ''}</b> ${s.nome || ''}
        </div>
        <div class="cell-check"><div class="check-box"></div></div>
        <div class="cell-check"><div class="check-box"></div></div>
        <div class="cell-check"><div class="check-box"></div></div>
        <div class="cell-check"><div class="check-box"></div></div>
    `;

    const nameCell = row.querySelector('.cell-name');
    const checkBoxes = row.querySelectorAll('.check-box');

    nameCell.addEventListener('click', () => {
        row.classList.toggle('row-crossed');
    });

    checkBoxes.forEach(box => {
        box.addEventListener('click', (e) => {
            e.stopPropagation();
            box.classList.toggle('checked');
        });
    });

    return row;
}

// Calcola il numero ottimale di colonne in base al numero di studenti
function calcolaNumeroColonne(numStudenti) {
    if (numStudenti <= 18) return 2;
    if (numStudenti <= 36) return 3;
    return 3;
}

// Raggruppa gli studenti per classe (utile per debug)
function raggruppaPerClasse(studenti) {
    const gruppi = {};
    studenti.forEach(s => {
        const classe = s.classe || 'Senza classe';
        if (!gruppi[classe]) gruppi[classe] = [];
        gruppi[classe].push(s);
    });
    return gruppi;
}

// Genera i due turni
function generaDinner() {
    if (typeof studenticonvittori === 'undefined') {
        console.error("Errore: convittori.js non caricato");
        const wrapper1 = document.getElementById('turno1-wrapper');
        const wrapper2 = document.getElementById('turno2-wrapper');
        if (wrapper1) wrapper1.innerHTML = '<div style="color:red; padding:20px;">Errore: dati studenti non caricati.</div>';
        if (wrapper2) wrapper2.innerHTML = '<div style="color:red; padding:20px;">Errore: dati studenti non caricati.</div>';
        return;
    }

    const turno1 = [];
    const turno2 = [];

    studenticonvittori.forEach(s => {
        if (!s.cognome) return;
        let classe = (s.classe || '').toString().toUpperCase();

        // TURNO 1 (18:30): classi 1*, 2*, e 3P
        if (classe.startsWith('1') || classe.startsWith('2') || classe === '3P') {
            turno1.push(s);
        }
        // TURNO 2 (19:15): classi 3*, 4*, 5* (esclusa 3P)
        else if (classe.startsWith('3') || classe.startsWith('4') || classe.startsWith('5')) {
            if (classe !== '3P') {
                turno2.push(s);
            }
        }
    });

    // ORDINAMENTO CORRETTO: prima per numero classe, poi per lettera, poi per cognome
    turno1.sort(ordinaPerClasseECognome);
    turno2.sort(ordinaPerClasseECognome);

    

    // Log per debug: mostra l'ordine dei primi studenti
    console.log("📚 Turno 1 - Studenti in ordine (per classe e cognome):");
    let currentClasse = "";
    turno1.forEach((s, i) => {
        if (s.classe !== currentClasse) {
            currentClasse = s.classe;
            console.log(`   --- CLASSE ${currentClasse} ---`);
        }
        console.log(`   ${s.classe} - ${s.cognome} ${s.nome}`);
    });
    
    console.log("\n📚 Turno 2 - Studenti in ordine (per classe e cognome):");
    currentClasse = "";
    turno2.forEach((s, i) => {
        if (s.classe !== currentClasse) {
            currentClasse = s.classe;
            console.log(`   --- CLASSE ${currentClasse} ---`);
        }
        console.log(`   ${s.classe} - ${s.cognome} ${s.nome}`);
    });

    // Calcola il numero di colonne per ogni turno
    const colonneTurno1 = calcolaNumeroColonne(turno1.length);
    const colonneTurno2 = calcolaNumeroColonne(turno2.length);
    
    // Distribuisci gli studenti in colonne (in sequenza, mantenendo i gruppi)
    const colonne1 = distribuisciInColonne(turno1, colonneTurno1);
    const colonne2 = distribuisciInColonne(turno2, colonneTurno2);
    
    // Ottieni i wrapper
    const wrapper1 = document.getElementById('turno1-wrapper');
    const wrapper2 = document.getElementById('turno2-wrapper');
    
    if (!wrapper1 || !wrapper2) return;
    
    // Svuota i wrapper
    wrapper1.innerHTML = '';
    wrapper2.innerHTML = '';
    
    // Imposta il numero di colonne nel CSS
    wrapper1.style.gridTemplateColumns = `repeat(${colonneTurno1}, 1fr)`;
    wrapper2.style.gridTemplateColumns = `repeat(${colonneTurno2}, 1fr)`;
    
    // Crea le colonne per il turno 1
    colonne1.forEach((colonnaStudenti) => {
        wrapper1.appendChild(creaColonna(colonnaStudenti));
    });
    
    // Crea le colonne per il turno 2
    colonne2.forEach((colonnaStudenti) => {
        wrapper2.appendChild(creaColonna(colonnaStudenti));
    });
    
    console.log(`\n✅ Turno 1 (18:30): ${turno1.length} studenti - ${colonneTurno1} colonne`);
    console.log(`📐 Distribuzione: ${colonne1.map(c => c.length).join(', ')} studenti per colonna`);
    console.log(`✅ Turno 2 (19:15): ${turno2.length} studenti - ${colonneTurno2} colonne`);
    console.log(`📐 Distribuzione: ${colonne2.map(c => c.length).join(', ')} studenti per colonna`);
}

// Avvia quando il DOM è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', generaDinner);
} else {
    generaDinner();
}