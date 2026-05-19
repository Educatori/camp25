/* TRANSFER-SCRIPT.JS */

function generaGriglia() {
    const grid = document.getElementById('mainGrid');
    if (!grid) return;

    impostaTitoloDinamico();

    const classiDaEscludere = ["1P", "2P", "3P", "2A", "2B", "5B"];
    const oggi = new Date().getDay();
    const labConfig = (typeof LAB_PRANZO !== 'undefined') ? LAB_PRANZO : {};
    const classiInLabOggi = labConfig[oggi] || [];

    let listaDalDatabase = [];
    if (typeof tuttiStudenti !== 'undefined') {
        listaDalDatabase = [...tuttiStudenti];
    } else {
        grid.innerHTML = '<div style="text-align:center; padding:50px;">Errore: Database studenti non trovato.</div>';
        return;
    }

    if (listaDalDatabase.length === 0) {
        grid.innerHTML = '<div style="text-align:center; padding:50px;">Nessuno studente trovato nel database.</div>';
        return;
    }

    const classi = {};
    listaDalDatabase.forEach(s => {
        if (!s.cognome || s.cognome.trim() === "") return;
        const nomeClasse = s.classe ? s.classe.toUpperCase().trim() : "SENZA CLASSE";
        if (classiDaEscludere.includes(nomeClasse)) return;
        if (!classi[nomeClasse]) classi[nomeClasse] = [];
        classi[nomeClasse].push(s);
    });

    const elencoClassi = Object.keys(classi).sort();
    grid.innerHTML = "";

    if (elencoClassi.length === 0) {
        grid.innerHTML = '<div style="text-align:center; padding:50px;">Nessuna classe disponibile dopo il filtro.</div>';
        return;
    }

    elencoClassi.forEach(nomeClasse => {
        const box = document.createElement('div');
        const haLabOggi = classiInLabOggi.includes(nomeClasse);
        box.className = `room-box ${haLabOggi ? 'has-lab' : ''}`;

        classi[nomeClasse].sort((a, b) => a.cognome.localeCompare(b.cognome));

        const occupantiHtml = classi[nomeClasse].map(s => {
            const roomNum = parseInt(s.room, 10);
            const isConvittore = !isNaN(roomNum) && roomNum >= 101 && roomNum <= 221;

            const tagPercorso = s.percorso ? `<span class="percorso-tag">${s.percorso}</span>` : "";
            const tagGruppo = s.gruppo ? `• ${s.gruppo}` : "";

            // ---- NUOVA LOGICA PER LE ETICHETTE ----
            let roomInfo = "";
            if (isConvittore && s.room !== "-") {
                // Mostra solo il numero, senza "room "
                roomInfo = `${s.room}`;
            } else if (s.room === "-") {
                roomInfo = `-`;   // invece di "[esterno]"
            } else if (s.room && s.room !== "-" && !isConvittore) {
                // Se è un altro valore (es. "esterno" scritto diversamente) lo mostriamo pulito
                roomInfo = `${s.room}`;
            }
            // ---------------------------------------

            const dettagli = [
                roomInfo,
                tagPercorso,
                tagGruppo
            ].filter(Boolean).join(" ");

            return `
                <div class="row-student ${!isConvittore ? 'esterno' : ''}">
                    <span class="student-name"><b>${s.cognome}</b> ${s.nome}</span>
                    <span class="student-details">${dettagli}</span>
                </div>`;
        }).join('');

        const conteggio = classi[nomeClasse].length;
        const badgeConteggio = `<span class="count-badge">${conteggio}</span>`;

        box.innerHTML = `
            <div class="room-info">
                <span>${nomeClasse}</span>
                ${badgeConteggio}
                ${haLabOggi ? '<span class="lab-badge">LAB LUNCH</span>' : ''}
            </div>
            <div class="occupants-list">
                ${occupantiHtml}
            </div>
        `;

        grid.appendChild(box);
    });
}

/**
 * Funzione per impostare il titolo della pagina che diventerà il nome del PDF
 */
function impostaTitoloDinamico() {
    const oggi = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const dataFormattata = oggi.toLocaleDateString('it-IT', options);
    document.title = `Transfer Lunch - ${dataFormattata}`;
}

// Lancia la funzione al caricamento
window.onload = generaGriglia;
