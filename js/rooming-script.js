/* ROOMING-SCRIPT.JS */
function generaGrigliaRooming() {
    const grid = document.getElementById('mainGrid');
    if (!grid) return;
 
    // Dati extra statici
    const extra = [
        { cognome: "EDUCATORI", nome: "", classe: "", gruppo: "", room: "112", percorso: "" },
        { cognome: "", nome: "", classe: "Foresteria", gruppo: "", room: "124", percorso: "" },
        { cognome: "", nome: "", classe: "Foresteria", gruppo: "", room: "125", percorso: "" },
        { cognome: "", nome: "", classe: "Foresteria", gruppo: "", room: "213", percorso: "" },
        { cognome: "", nome: "", classe: "Foresteria", gruppo: "", room: "216", percorso: "" },
        { cognome: "", nome: "", classe: "Foresteria", gruppo: "", room: "220", percorso: "" }
    ];

    // LOGICA DI RECUPERO: Cerca 'studenti', se non esiste usa lista vuota
    let listaDalDatabase = [];

if (typeof studenticonvittori !== 'undefined') {
    listaDalDatabase = listaDalDatabase.concat(studenticonvittori);

        
    } else {
        console.warn("Attenzione: variabile 'studenti' non trovata in database.js");
    }

    const tuttiIPartecipanti = [...extra, ...listaDalDatabase];
    const stanze = {};

    // Raggruppamento dei partecipanti per numero di stanza
    tuttiIPartecipanti.forEach(s => {
        if (!s.room) return;
        if (!stanze[s.room]) stanze[s.room] = [];
        stanze[s.room].push(s);
    });

    const numeriStanze = Object.keys(stanze).sort((a, b) => parseInt(a) - parseInt(b));
    grid.innerHTML = "";
    let headerP1 = false, headerP2 = false;

    numeriStanze.forEach(num => {
        const r = parseInt(num);
        
        // Aggiunta titoli di sezione basati sul numero della stanza
        if (r >= 100 && r < 200 && !headerP1) {
            grid.insertAdjacentHTML('beforeend', `<div class="section-title">Piano 1 - Maschile</div>`);
            headerP1 = true;
        } else if (r >= 200 && !headerP2) {
            grid.insertAdjacentHTML('beforeend', `<div class="section-title">Piano 2 - Femminile</div>`);
            headerP2 = true;
        }

        const box = document.createElement('div');
        box.className = 'room-box';

        // Ordinamento alfabetico interno alla stanza
        stanze[num].sort((a, b) => (a.cognome || "").localeCompare(b.cognome || ""));

        const occupantiHtml = stanze[num].map(s => {
            const infoGruppo = s.gruppo ? ` • ${s.gruppo}` : "";
            const infoPercorso = s.percorso ? ` <span class="percorso-tag">${s.percorso}</span>` : "";
            const nomeDisplay = (s.cognome === "-") ? "<i>Libero / Foresteria</i>" : `<b>${s.cognome}</b> ${s.nome}`;
            return `
                <div class="row-student">
                    <span class="student-name">${nomeDisplay}</span>
                    <span class="student-details">${infoPercorso} ${s.classe}${infoGruppo}</span>
                    
                </div>`;
        }).join('');

        box.innerHTML = `
            <div class="room-info">${num}</div>
            <div class="occupants-list">${occupantiHtml}</div>
        `;
        grid.appendChild(box);
    });
}

// Avvia la generazione al caricamento della pagina
window.onload = generaGrigliaRooming;
