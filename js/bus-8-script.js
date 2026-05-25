/* BUS-8-SCRIPT.JS */
export function elaboraEGeneraGriglia(studenticonvittori) {
    if (!studenticonvittori) return;

    // 1. FILTRO: Esclusione classi non valide, percorsi "P" e record senza cognome
    const validi = studenticonvittori.filter(s => {
        const classe = (s.classe || "").toUpperCase().trim();
        const escluse = ["2A", "2B"];
        return !escluse.includes(classe) && !classe.includes("P") && s.cognome;
    });
    
    // 2. SEPARAZIONE: Isoli la 5B per mandarla in fondo alla lista finale
    const resto = validi.filter(s => (s.classe || "").toUpperCase().trim() !== "5B");
    const classe5B = validi.filter(s => (s.classe || "").toUpperCase().trim() === "5B");

    // 3. ORDINAMENTO: Alfabetico standard (A-Z per cognome) per il resto della scuola
    resto.sort((a, b) => {
        const cogA = a.cognome.trim().toLowerCase();
        const cogB = b.cognome.trim().toLowerCase();
        return cogA.localeCompare(cogB, 'it', { sensitivity: 'base' });
    });

    // 4. ORDINAMENTO SPECIALIZZATO 5B: Prima divisi per Gruppo (G1 -> G2), poi per Cognome
    classe5B.sort((a, b) => {
        // Normalizzazione del gruppo: costringe il testo in maiuscolo e pulito (es. "G1")
        // Se non trova nulla, cerca di estrarlo dalle note (es. se c'è scritto "G1" o "G2" nelle note)
        let gA = (a.gruppo || "").toUpperCase().trim();
        let gB = (b.gruppo || "").toUpperCase().trim();
        
        if (!gA && a.note) gA = a.note.toUpperCase().includes("G1") ? "G1" : (a.note.toUpperCase().includes("G2") ? "G2" : "");
        if (!gB && b.note) gB = b.note.toUpperCase().includes("G1") ? "G1" : (b.note.toUpperCase().includes("G2") ? "G2" : "");

        // Se appartengono a gruppi diversi (es. uno è G1 e l'altro G2), ordina per gruppo
        if (gA !== gB) {
            // Gestisce i casi in cui il gruppo sia vuoto mettendoli comunque in coda al gruppo corretto
            if (!gA) return 1;
            if (!gB) return -1;
            return gA.localeCompare(gB);
        }
        
        // Se hanno lo stesso gruppo (o entrambi non ce l'hanno), ordina alfabeticamente per cognome
        const cogA = a.cognome.trim().toLowerCase();
        const cogB = b.cognome.trim().toLowerCase();
        return cogA.localeCompare(cogB, 'it', { sensitivity: 'base' });
    });

    // Unione finale degli array (il resto prima, la 5B ordinata in fondo)
    const listaFinale = [...resto, ...classe5B];
    
    // Pulizia preventiva dei contenitori DOM delle 3 colonne
    document.getElementById('col0').innerHTML = "";
    document.getElementById('col1').innerHTML = "";
    document.getElementById('col2').innerHTML = "";

    // Calcolo matematico per dividere equamente gli elementi nelle 3 colonne
    const itemsPerCol = Math.ceil(listaFinale.length / 3);

    // 5. GENERAZIONE COMPONENTI DOM E RENDERING TRIDIREZIONALE
    listaFinale.forEach((s, index) => {
        const colIndex = Math.floor(index / itemsPerCol);
        // Protezione per evitare sforamenti sulla quarta colonna inesistente (col3) a causa degli arrotondamenti
        const finalColIndex = colIndex > 2 ? 2 : colIndex; 
        const colTarget = document.getElementById('col' + finalColIndex);
        if (!colTarget) return;

        // Recupero degli stati di presenza e delle note testuali salvate nel LocalStorage
        const isChecked = localStorage.getItem(`bus_presence_${s.id}`) === 'true';
        const savedNote = localStorage.getItem(`bus_note_${s.id}`) || '';

        // Formatta visivamente il gruppo e la classe
        const clUpper = (s.classe || '-').toUpperCase().trim();
        const grUpper = (s.gruppo || "").toUpperCase().trim();
        const infoClasse = `${clUpper} ${s.percorso ? s.percorso : ''} ${grUpper ? '• ' + grUpper : ''}`.trim();
        
        const camera = String(s.room || s.stanza || '-').trim();
        const nomeVisualizzato = `${s.cognome.toUpperCase()} ${s.nome || ''}`.trim();
        
        let bgClass = "";
        if (clUpper === "5B") {
            if (grUpper === "G1" || infoClasse.includes("G1")) bgClass = "bg-5b-g1";
            if (grUpper === "G2" || infoClasse.includes("G2")) bgClass = "bg-5b-g2";
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
