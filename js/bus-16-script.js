/* BUS-16-SCRIPT.JS */ 
    function generaGrigliaBus() {
        if (typeof studenticonvittori === 'undefined') {
            console.error("Errore: convittori.js non caricato correttamente.");
            return;
        }

        // 1. FILTRO: esclude 2A, 2B e classi con "P" (percorsi speciali) e cognome vuoto
        const validi = studenticonvittori.filter(s => {
            const classe = s.classe.toUpperCase();
            const escluse = ["2A", "2B"];
            return !escluse.includes(classe) && !classe.includes("P") && s.cognome;
        });

        // 2. ORDINAMENTO: per classe (ordinamento naturale) -> gruppo -> cognome
        validi.sort((a, b) => {
            const compClasse = a.classe.localeCompare(b.classe, undefined, { numeric: true });
            if (compClasse !== 0) return compClasse;
            
            const gA = a.gruppo || "";
            const gB = b.gruppo || "";
            const compGruppo = gA.localeCompare(gB);
            if (compGruppo !== 0) return compGruppo;
            
            return a.cognome.localeCompare(b.cognome);
        });

        // 3. COSTRUISCI UNA LISTA MISTA (studenti + separatori tra classi diverse)
        const elementiFinali = [];
        let ultimaClasse = null;
        
        validi.forEach((studente) => {
            // Se cambia la classe, inserisco un separatore visivo (più scuro)
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

        // Distribuzione nelle 3 colonne in base al numero totale di elementi (studenti + separator)
        const totaleElementi = elementiFinali.length;
        const itemsPerColonna = Math.ceil(totaleElementi / 3);

        // Ciclo su tutti gli elementi e li distribuisco
        elementiFinali.forEach((elemento, idx) => {
            const colonnaIdx = Math.floor(idx / itemsPerColonna);
            const colonnaTarget = document.getElementById('col' + colonnaIdx);
            if (!colonnaTarget) return;

            if (elemento.type === 'separator') {
                // Aggiungo una riga separatrice spessa e scura tra classi
                const divider = document.createElement('div');
                divider.className = 'class-separator';
                colonnaTarget.appendChild(divider);
                return;
            }

            const s = elemento.data;
            // Info classe + eventuale percorso/gruppo
            const infoClasse = `${s.classe} ${s.percorso ? s.percorso : ''} ${s.gruppo ? '• ' + s.gruppo : ''}`;
            
            // Gestione sfondo per gruppi G1/G2 (sia 5A che 5B)
            let bgClass = "";
            if (s.classe === "5A") {
                if (s.gruppo === "G1") bgClass = "bg-5a-g1";
                if (s.gruppo === "G2") bgClass = "bg-5a-g2";
            } else if (s.classe === "5B") {
                if (s.gruppo === "G1") bgClass = "bg-5b-g1";
                if (s.gruppo === "G2") bgClass = "bg-5b-g2";
            }

            // Creo la riga studente
            const row = document.createElement('div'); 
            row.className = `student-row ${bgClass}`;
            row.innerHTML = `
    <div class="cell-class">${infoClasse}</div>
    <div class="cell-name" style="cursor:pointer"><b>${s.cognome}</b> ${s.nome}</div>

    <div class="cell-check"><div class="check-box" style="cursor:pointer"></div></div>
    <div class="cell-check"><div class="check-box" style="cursor:pointer"></div></div>
    <div class="cell-check"><div class="check-box" style="cursor:pointer"></div></div>
    <div class="cell-check"><div class="check-box" style="cursor:pointer"></div></div>
`;

            // Eventi: click sul nome (barrato) e click sulla checkbox (presenza)
            const nameCell = row.querySelector('.cell-name');
            const checkBoxes = row.querySelectorAll('.check-box');

nameCell.addEventListener('click', () => row.classList.toggle('row-crossed'));

checkBoxes.forEach(checkBox => {
    checkBox.addEventListener('click', (e) => {
        e.stopPropagation();
        checkBox.classList.toggle('checked');
    });
});

            colonnaTarget.appendChild(row);
        });
    }

    window.addEventListener('DOMContentLoaded', generaGrigliaBus);