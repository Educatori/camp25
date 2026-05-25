 /* BUS-8-SCRIPT.JS */
export function elaboraEGeneraGriglia(studenticonvittori) {
    if (!studenticonvittori) return;

    // 1. FILTRO: Esclusione classi non valide, percorsi "P" e record senza cognome
    const validi = studenticonvittori.filter(s => {
        const classe = (s.classe || "").toUpperCase();
        const escluse = ["2A", "2B"];
        return !escluse.includes(classe) && !classe.includes("P") && s.cognome;
    });
    
    // 2. SEPARAZIONE: Isoli la 5B per mandarla in fondo alla lista finale
    const resto = validi.filter(s => s.classe !== "5B");
    const classe5B = validi.filter(s => s.classe === "5B");

    // 3. ORDINAMENTO: Alfabetico standard (A-Z per cognome) per il resto della scuola
    resto.sort((a, b) => {
        const cogA = a.cognome.trim().toLowerCase();
        const cogB = b.cognome.trim().toLowerCase();
        return cogA.localeCompare(cogB, 'it', { sensitivity: 'base' });
    });

    // 4. ORDINAMENTO SPECIALIZZATO 5B: Prima divisi per Gruppo (G1 -> G2), poi per Cognome
    classe5B.sort((a, b) => {
        const gA = a.gruppo || "";
        const gB = b.gruppo || "";
        
        // Se appartengono a gruppi diversi (es. G1 e G2), ordina per stringa gruppo
        if (gA !== gB) {
            return gA.localeCompare(gB);
        }
        // Se lo stesso gruppo, ordina alfabeticamente per cognome
        return a.cognome.trim().toLowerCase().localeCompare(b.cognome.trim().toLowerCase(), 'it', { sensitivity: 'base' });
    });

    // Unione finale degli array (il resto prima, la 5B ordinata in fondo)
    const listaFinale = [...resto, ...classe5B];
    
    // Pulizia preventiva dei contenitori DOM delle 3 colonne
    document.getElementById('col0').innerHTML = "";
    document.getElementById('col1').innerHTML = "";
    document.getElementById('col2').innerHTML = "";

    const itemsPerCol = Math.ceil(listaFinale.length / 3);

    // 5. GENERAZIONE COMPONENTI DOM E RENDERING TRIDIREZIONALE
    listaFinale.forEach((s, index) => {
        const colIndex = Math.floor(index / itemsPerCol);
        const colTarget = document.getElementById('col' + colIndex);
        if (!colTarget) return;

        // Recupero degli stati di presenza e delle note testuali salvate nel LocalStorage
        const isChecked = localStorage.getItem(`bus_presence_${s.id}`) === 'true';
        const savedNote = localStorage.getItem(`bus_note_${s.id}`) || '';

        const infoClasse = `${s.classe || '-'} ${s.percorso ? s.percorso : ''} ${s.gruppo ? '• ' + s.gruppo : ''}`.trim();
        const camera = String(s.room || s.stanza || '-').trim();
        const nomeVisualizzato = `${s.cognome.toUpperCase()} ${s.nome || ''}`.trim();
        
        let bgClass = "";
        if (s.classe === "5B") {
            if (s.gruppo === "G1") bgClass = "bg-5b-g1";
            if (s.gruppo === "G2") bgClass = "bg-5b-g2";
        }

        const row = document.createElement('div'); 
        row.className = `student-row ${bgClass}`;
        row.setAttribute('data-student-id', s.id);
        row.innerHTML = `
            <div class="cell-room">${camera}</div>
            <div class="cell-name">${nomeVisualizzato}</div>
            <div class="cell-class">${infoClasse}</div>
            <div class="cell-check">
                <div class="check-box ${isChecked ? 'checked' : ''}" data-id="${s.id}"></div>
            </div>
            <div class="cell-notes">
                <input type="text" class="bus-note-field" value="${savedNote}" placeholder="..." data-id="${s.id}">
                <div class="line-notes-print">${savedNote}</div>
            </div>
        `;

        // Logica Interattiva ed Event Listeners di riga
        const nameCell = row.querySelector('.cell-name');
        const checkBox = row.querySelector('.check-box');
        const noteField = row.querySelector('.bus-note-field');
        const printMirror = row.querySelector('.line-notes-print');
        
        // Click sul nome: barra o riattiva lo studente (visivo)
        nameCell.addEventListener('click', () => row.classList.toggle('row-crossed'));
        
        // Click sulla casella checkbox: toggle presenza e salvataggio locale
        checkBox.addEventListener('click', (e) => {
            e.stopPropagation();
            const checked = checkBox.classList.toggle('checked');
            localStorage.setItem(`bus_presence_${s.id}`, checked);
        });

        // Modifica note: salvataggio automatico e aggiornamento specchietto di stampa
        noteField.addEventListener('input', (e) => {
            localStorage.setItem(`bus_note_${s.id}`, e.target.value);
            if (printMirror) printMirror.textContent = e.target.value;
        });

        colTarget.appendChild(row);
    });

    console.log(`Griglia completata: generati ${listaFinale.length} studenti.`);
}
