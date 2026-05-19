/* USCITA-SCRIPT.JS */
function generaGrigliaLibera() {
    if (typeof studenticonvittori === 'undefined') {
        alert("Errore: studenticonvittori non trovato!");
        return;
    }

    const listaFinale = studenticonvittori
        .filter(s => s && s.cognome)
        .sort((a, b) => a.cognome.localeCompare(b.cognome));

    const col0 = document.getElementById('col0');
    const col1 = document.getElementById('col1');
    
    if (col0) col0.innerHTML = "";
    if (col1) col1.innerHTML = "";

    const itemsPerCol = Math.ceil(listaFinale.length / 2);

    listaFinale.forEach((s, index) => {
        const colIndex = Math.floor(index / itemsPerCol);
        const colTarget = document.getElementById('col' + colIndex);

        if (colTarget) {
            const row = document.createElement('div');
            row.className = `student-row`;
            row.innerHTML = `
                <div class="cell-room">${s.room || '-'}</div>
                <div class="cell-class" style="font-size: 0.85em; width: 70px;">
                    ${[s.classe, s.percorso, s.gruppo].filter(Boolean).join(" ") || '-'} 
                </div>
                <div class="cell-name" style="cursor:pointer; flex-grow: 1;">
                    <b>${s.cognome}</b> ${s.nome}
                </div>
                <div class="cell-notes"><div class="line-notes"></div></div>
                <div class="cell-notes"><div class="line-notes"></div></div>
            `;

            row.querySelector('.cell-name').addEventListener('click', () => {
                row.classList.toggle('row-crossed');
            });

            colTarget.appendChild(row);
        }
    });
}

// NUOVA FUNZIONE PER IL FRONTE-RETRO
function stampaFronteRetro() {
    const originale = document.getElementById('documento-da-stampare');
    
    // Creiamo il clone
    const clone = originale.cloneNode(true);
    clone.id = "documento-retro";
    
    // Lo aggiungiamo al body
    document.body.appendChild(clone);
    
    // Stampiamo
    window.print();
    
    // Rimuoviamo il clone per tornare alla visualizzazione singola
    clone.remove();
}

window.onload = generaGrigliaLibera;
