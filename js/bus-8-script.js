/* BUS-8-SCRIPT.JS */
function generaGrigliaBus() {
    if (typeof studenticonvittori === 'undefined') {
        console.error("Errore: convittori.js non caricato correttamente.");
        return;
    }

    // --- FILTRO CLASSI ESCLUSE ---
    const validi = studenticonvittori.filter(s => {
        const classe = s.classe.toUpperCase();
        const escluse = ["2A", "2B"];
        return !escluse.includes(classe) && !classe.includes("P") && s.cognome;
    });
    
    // Separazione per ordinamento speciale 5B
    const resto = validi.filter(s => s.classe !== "5B");
    const classe5B = validi.filter(s => s.classe === "5B");

    // Ordinamento alfabetico resto
    resto.sort((a, b) => a.cognome.localeCompare(b.cognome));

    // Ordinamento 5B per Gruppo (G1/G2) e poi cognome
    classe5B.sort((a, b) => {
        const gA = a.gruppo || "";
        const gB = b.gruppo || "";
        return (gA + a.cognome).localeCompare(gB + b.cognome);
    });

    const listaFinale = [...resto, ...classe5B];
    
    // Pulizia colonne
    document.getElementById('col0').innerHTML = "";
    document.getElementById('col1').innerHTML = "";
    document.getElementById('col2').innerHTML = "";

    const itemsPerCol = Math.ceil(listaFinale.length / 3);

    listaFinale.forEach((s, index) => {
        const colIndex = Math.floor(index / itemsPerCol);
        const colTarget = document.getElementById('col' + colIndex);
        if (!colTarget) return;

        const infoClasse = `${s.classe} ${s.percorso ? s.percorso : ''} ${s.gruppo ? '•  ' + s.gruppo : ''}`;
        
        let bgClass = "";
        if (s.classe === "5B") {
            if (s.gruppo === "G1") bgClass = "bg-5b-g1";
            if (s.gruppo === "G2") bgClass = "bg-5b-g2";
        }

        const row = document.createElement('div'); 
        row.className = `student-row ${bgClass}`;
        row.innerHTML = `
            <div class="cell-room">${s.room}</div>
            <div class="cell-name" style="cursor:pointer"><b>${s.cognome}</b> ${s.nome}</div>
            <div class="cell-class">${infoClasse}</div>
            <div class="cell-check"><div class="check-box" style="cursor:pointer"></div></div>
            <div class="cell-notes"><div class="line-notes"></div></div>
        `;

        // Logica Interattiva
        const nameCell = row.querySelector('.cell-name');
        const checkBox = row.querySelector('.check-box');
        
        nameCell.addEventListener('click', () => row.classList.toggle('row-crossed'));
        
        checkBox.addEventListener('click', (e) => {
            e.stopPropagation(); // Evita che il click sulla checkbox attivi anche il "barrato" sulla riga
            checkBox.classList.toggle('checked');
        });

        colTarget.appendChild(row);
    });
}

// Avvia la generazione al caricamento della pagina
window.onload = generaGrigliaBus;