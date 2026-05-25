/* BUS-16-SCRIPT.JS */
function generaGrigliaBus() {
    if (typeof studenticonvittori === 'undefined') {
        console.error("Errore: convittori.js non caricato correttamente.");
        return;
    }

    // 1. FILTRO: esclude 2A, 2B, percorsi "P" e record senza cognome
    const validi = studenticonvittori.filter(s => {
        const classe = s.classe.toUpperCase();
        const escluse = ["2A", "2B"];
        return !escluse.includes(classe) && !classe.includes("P") && s.cognome;
    });

    // 2. ORDINAMENTO DINAMICO
    validi.sort((a, b) => {
        // Ordinamento per classe (naturale: 1A, 2A, 10A...)
        const compClasse = a.classe.localeCompare(b.classe, undefined, { numeric: true });
        if (compClasse !== 0) return compClasse;
        
        // Se siamo in 5A o 5B, ordina PRIMA per Gruppo (G1/G2) e POI per cognome
        if (a.classe === "5A" || a.classe === "5B") {
            const gA = a.gruppo || "";
            const gB = b.gruppo || "";
            const compGruppo = gA.localeCompare(gB);
            if (compGruppo !== 0) return compGruppo;
        }
        
        // Altrimenti (o se lo stesso gruppo), ordina per Cognome
        return a.cognome.localeCompare(b.cognome);
    });

    // 3. COSTRUISCI UNA LISTA MISTA (studenti + separatori tra classi diverse)
    const elementiFinali = [];
    let ultimaClasse = null;
    
    validi.forEach((studente) => {
        if (ultimaClasse !== null && studente.classe !== ultimaClasse) {
            elementiFinali.push({ type: 'separator' });
        }
        elementiFinali.push({ type: 'student', data: studente });
        ultimaClasse = studente.classe;
    });

    // Pulisco i contenitori delle colonne
    document.getElementById('col0').innerHTML = "";
    document.getElementById('col1').innerHTML = "";
    document.getElementById('col2').innerHTML = "";

    const totaleElementi = elementiFinali.length;
    const itemsPerColonna = Math.ceil(totaleElementi / 3);

    // 4. DISTRIBUZIONE NELLE 3 COLONNE
    elementiFinali.forEach((elemento, idx) => {
        const colonnaIdx = Math.floor(idx / itemsPerColonna);
        const colonnaTarget = document.getElementById('col' + colonnaIdx);
        if (!colonnaTarget) return;

        if (elemento.type === 'separator') {
            const divider = document.createElement('div');
            divider.className = 'class-separator';
            colonnaTarget.appendChild(divider);
            return;
        }

        const s = elemento.data;
        // Mostra il gruppo solo se esiste (es. nelle quinte)
        const infoClasse = `${s.classe}${s.gruppo ? ' • ' + s.gruppo : ''}`;
        
        let bgClass = "";
        if (s.classe === "5A") {
            if (s.gruppo === "G1") bgClass = "bg-5a-g1";
            if (s.gruppo === "G2") bgClass = "bg-5a-g2";
        } else if (s.classe === "5B") {
            if (s.gruppo === "G1") bgClass = "bg-5b-g1";
            if (s.gruppo === "G2") bgClass = "bg-5b-g2";
        }

        // Creazione riga con le 4 caselle di presenza
        const row = document.createElement('div'); 
        row.className = `student-row ${bgClass}`;
        row.innerHTML = `
            <div class="cell-class">${infoClasse}</div>
            <div class="cell-name"><b>${s.cognome}</b> ${s.nome}</div>
            <div class="cell-check"><div class="check-box"></div></div>
            <div class="cell-check"><div class="check-box"></div></div>
            <div class="cell-check"><div class="check-box"></div></div>
            <div class="cell-check"><div class="check-box"></div></div>
        `;

        // Logica Interattiva
        const nameCell = row.querySelector('.cell-name');
        const checkBoxes = row.querySelectorAll('.check-box');

        nameCell.addEventListener('click', () => row.classList.toggle('row-crossed'));

        checkBoxes.forEach(checkBox => {
            checkBox.addEventListener('click', (e) => {
                e.stopPropagation(); // Evita di attivare il "barrato" sul nome per errore
                checkBox.classList.toggle('checked');
            });
        });

        colonnaTarget.appendChild(row);
    });
}

window.addEventListener('DOMContentLoaded', generaGrigliaBus);
