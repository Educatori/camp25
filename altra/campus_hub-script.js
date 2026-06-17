// --- INTERCETTAZIONE SALVATAGGIO PER FIREBASE ---

function salvaDatiLocale() {
    // 1. Estraiamo lo stato attuale di tutti gli input della pagina
    const statoStudenti = {};
    
    document.querySelectorAll(".student-row").forEach((r) => {
        const cognome = r.dataset.cognome;
        statoStudenti[cognome] = {
            esce: r.querySelector(".in-u").value,
            entra: r.querySelector(".in-i").value,
            assente: r.classList.contains("assente"),
            dinnerno: r.dataset.dinnerno
        };
    });

    // 2. Prepariamo l'oggetto globale da salvare
    const pacchettoDati = {
        stato_giornaliero: statoStudenti,
        cambi_turno_manuali: cambiTurnoManuali,
        note_giornaliere: document.getElementById("dailyNotes") ? document.getElementById("dailyNotes").value : ""
    };

    // 3. Salviamo localmente nel browser (per sicurezza extra)
    localStorage.setItem("campus_hub_local_backup", JSON.stringify(pacchettoDati));

    // 4. Inviamo i dati a Firebase (se l'amministratore è autenticato)
    if (firebase.auth().currentUser) {
        firebase.database().ref('archivio_campus/stato_corrente').set(pacchettoDati)
            .then(() => console.log("☁️ Cloud sincronizzato con successo!"))
            .catch((error) => console.error("❌ Errore di sincronizzazione cloud:", error));
    }
}

function caricaDatiLocale() {
    // Questa funzione ora riceverà i dati direttamente dal listener di Firebase 
    // sviluppato nel file `firebase-cruscotto-sync.js` (passo precedente).
    // Non leggerà più dal localStorage del singolo PC, rendendo il pannello sincrono su più dispositivi.
    
    if (window.datiRicevutiDalCloud && window.datiRicevutiDalCloud.stato_corrente) {
        const stato = window.datiRicevutiDalCloud.stato_corrente.stato_giornaliero || {};
        cambiTurnoManuali = window.datiRicevutiDalCloud.stato_corrente.cambi_turno_manuali || {};
        
        if (document.getElementById("dailyNotes") && window.datiRicevutiDalCloud.stato_corrente.note_giornaliere) {
            document.getElementById("dailyNotes").value = window.datiRicevutiDalCloud.stato_corrente.note_giornaliere;
        }

        document.querySelectorAll(".student-row").forEach((r) => {
            const cognome = r.dataset.cognome;
            const datiStudente = stato[cognome];

            if (datiStudente) {
                r.querySelector(".in-u").value = datiStudente.esce || "";
                r.querySelector(".in-i").value = datiStudente.entra || "";
                
                if (datiStudente.assente) {
                    r.classList.add("assente");
                    r.querySelector(".btn-ass").classList.add("active-ass");
                } else {
                    r.classList.remove("assente");
                    r.querySelector(".btn-ass").classList.remove("active-ass");
                }

                r.dataset.dinnerno = datiStudente.dinnerno || "0";
                if (datiStudente.dinnerno === "1") {
                    r.classList.add("dinner-no");
                    r.querySelector(".btn-din").classList.add("active-din");
                } else {
                    r.classList.remove("dinner-no");
                    r.querySelector(".btn-din").classList.remove("active-din");
                }
            }
        });
    }
}

// --- PRESENZE dinner (Ottimizzato Firebase) ---
function generaPopUpStampaPresDin() {
    const oggi = new Date();
    const dataTestuale = document.getElementById("todayDate").innerText;
    const dataOggi = oggi.toLocaleDateString("it-IT");
    const oraEsatta = oggi.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

    // FALLBACK SINCRO CLOUD: Se esiste la lista aggiornata da Firebase, usiamo quella
    if (typeof window.studenticonvittori !== "undefined") {
        var sorgenteStudenti = window.studenticonvittori;
    } else if (typeof studenticonvittori !== "undefined") {
        var sorgenteStudenti = studenticonvittori;
    } else {
        console.error("Errore: database studenti convittori non disponibile.");
        alert("Errore: Nessun dato disponibile. Effettua il login o attendi la sincronizzazione.");
        return;
    }

    function parseClasse(classe) {
        if (!classe) return { num: 999, letter: "Z" };
        const match = classe.toString().toUpperCase().match(/^(\d+)([A-Z]?)$/);
        return match ? { num: parseInt(match[1]), lettera: match[2] || "A" } : { num: 999, lettera: "Z" };
    }

    function ordinaPerClasseECognome(a, b) {
        const classeA = parseClasse(a.classe);
        const classeB = parseClasse(b.classe);
        if (classeA.num !== classeB.num) return classeA.num - classeB.num;
        if (classeA.lettera !== classeB.lettera) return classeA.lettera.localeCompare(classeB.lettera);
        return (a.cognome || "").toUpperCase().localeCompare((b.cognome || "").toUpperCase());
    }

    const turno1 = [];
    const turno2 = [];

    // Usiamo la sorgente dinamica (Firebase o locale)
    sorgenteStudenti.forEach((s) => {
        if (!s.cognome) return;
        let classe = (s.classe || "").toString().toUpperCase();

        if (classe.startsWith("1") || classe.startsWith("2") || classe === "3P") {
            turno1.push(s);
        } else if (classe.startsWith("3") || classe.startsWith("4") || classe.startsWith("5")) {
            if (classe !== "3P") turno2.push(s);
        }
    });

    turno1.sort(ordinaPerClasseECognome);
    turno2.sort(ordinaPerClasseECognome);

    function buildTurnoHtml(studentiInTurno) {
        const numColonne = 3;
        const totali = studentiInTurno.length;
        const itemsPerColonna = Math.ceil(totali / numColonne);
        const colonneHtml = ["", "", ""];

        studentiInTurno.forEach((s, idx) => {
            const colIdx = Math.floor(idx / itemsPerColonna);
            let classeDisplay = (s.classe || "").toString().toUpperCase();

            colonneHtml[colIdx] += `
                <div class="d-row">
                    <div class="d-cell d-class"><b>${classeDisplay}</b></div>
                    <div class="d-cell d-name"><b>${s.cognome}</b>&nbsp${s.nome || ""}</div>
                    <div class="d-cell d-day"></div>
                    <div class="d-cell d-day"></div>
                    <div class="d-cell d-day"></div>
                    <div class="d-cell d-day"></div>
                </div>`;
        });

        return `
            <div class="grid-container">
                ${colonneHtml.map((htmlContenuto) => `
                    <div class="colonna">
                        <div class="column-header">
                            <div class="h-cell h-class">Classe</div>
                            <div class="h-cell h-name">Cognome e Nome</div>
                            <div class="h-cell h-day">LU</div>
                            <div class="h-cell h-day">MA</div>
                            <div class="h-cell h-day">ME</div>
                            <div class="h-cell h-day">GI</div>
                        </div>
                        ${htmlContenuto}
                    </div>`).join("")}
            </div>`;
    }

    const htmlTurno1 = buildTurnoHtml(turno1);
    const htmlTurno2 = buildTurnoHtml(turno2);

    const popup = window.open("", "_blank", "width=1200,height=800");
    popup.document.write(`
        <html><head><title>Stampa Appello Cena</title><style>
            @page { size: A4 landscape; margin: 0.3cm; }
            html, body { max-height: 100%; overflow: hidden; }
            body { font-family: -apple-system, sans-serif; margin: 0; padding: 2px; color: #000; line-height: 1.0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .main-title { text-align: center; text-transform: uppercase; margin: 0; font-size: 1.0rem; font-weight: bold; }
            .date-subtitle { text-align: center; font-size: 0.75rem; margin-bottom: 3px; color: #444; }
            .timestamp { position: absolute; top: 3px; right: 10px; font-size: 0.55rem; color: #777; }
            .turno-section { margin-bottom: 6px; page-break-inside: avoid !important; break-inside: avoid; }
            .turno-title { background: #555; color: #fff; padding: 1px 6px; font-size: 0.72rem; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; border-radius: 2px; }
            .grid-container { display: flex; gap: 8px; justify-content: space-between; page-break-inside: avoid !important; }
            .colonna { width: 32.8%; display: flex; flex-direction: column; }
            .column-header { display: flex; background: #333; color: white; font-weight: bold; font-size: 0.55rem; text-transform: uppercase; border: 1px solid #000; height: 14px; }
            .d-row { display: flex; font-size: 0.56rem; border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px solid #000; align-items: stretch; height: 14px !important; box-sizing: border-box; }
            .d-cell, .h-cell { padding: 0px 2px; text-align: center; display: flex; align-items: center; justify-content: center; overflow: hidden; white-space: nowrap; height: 100%; }
            .d-class, .h-class { width: 35px; font-size: 0.54rem; }
            .d-class { border-right: 1px solid #ccc; background: #f5f5f5; font-weight: bold; }
            .h-class { border-right: 1px solid #555; }
            .d-name, .h-name { flex-grow: 1; text-align: left; justify-content: flex-start; border-right: 1px solid #ccc; text-transform: uppercase; text-overflow: ellipsis; }
            .h-name { border-right: 1px solid #555; }
            .d-day, .h-day { width: 18px; font-size: 0.54rem; font-weight: bold; }
            .d-day { border-right: 1px solid #ccc; }
            .d-day:last-child { border-right: none; }
            .h-day { border-right: 1px solid #555; }
            .no-print { text-align: center; margin-bottom: 5px; }
            @media print { .no-print { display: none; } }
        </style></head><body>
            <div class="timestamp">Generato il ${dataOggi} alle ${oraEsatta}</div>
            <div class="main-title">REGISTRO PRESENZE DINNER</div>
            <div class="date-subtitle">${dataTestuale}</div>
            <div class="no-print">
                <button onclick="window.print()" style="padding:4px 30px; background: #27ae60; color:white; font-weight:bold; border-radius:20px; border:none; cursor:pointer; font-size:0.85rem;">•STAMPA</button>
            </div>
            <div class="turno-section">
                <div class="turno-title">1° Turno (Ore 18:30) — Classi 1, 2 e 3P (Tot: ${turno1.length})</div>
                ${htmlTurno1}
            </div>
            <div class="turno-section">
                <div class="turno-title">2° Turno (Ore 19:15) — Classi 3, 4, 5 [Esclusa 3P] (Tot: ${turno2.length})</div>
                ${htmlTurno2}
            </div>
        </body></html>`);
    popup.document.close();
}

// --- TRANSFER (Ottimizzato Firebase) ---
function generaPopUpStampaTransfer() {
    const oggi = new Date();
    const dataTestuale = document.getElementById("todayDate")?.innerText || oggi.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const dataOggi = oggi.toLocaleDateString("it-IT");
    const oraEsatta = oggi.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

    // FALLBACK SINCRO CLOUD
    if (typeof window.tuttiStudenti !== "undefined") {
        var sorgenteTutti = window.tuttiStudenti;
    } else if (typeof tuttiStudenti !== "undefined") {
        var sorgenteTutti = tuttiStudenti;
    } else {
        console.error("Errore: database generale studenti non disponibile.");
        alert("Errore: Nessun dato disponibile. Sincronizzazione in corso...");
        return;
    }

    const giornoSettimana = oggi.getDay();
    const labConfig = typeof window.LAB_PRANZO !== "undefined" ? window.LAB_PRANZO : (typeof LAB_PRANZO !== "undefined" ? LAB_PRANZO : {});
    const classiInLabOggi = labConfig[giornoSettimana] || [];

    const classi = {};
    sorgenteTutti.forEach((s) => {
        if (!s.cognome || s.cognome.trim() === "") return;
        const nomeClasse = s.classe ? s.classe.toUpperCase().trim() : "SENZA CLASSE";
        if (!classi[nomeClasse]) classi[nomeClasse] = [];
        classi[nomeClasse].push(s);
    });

    const elencoClassi = Object.keys(classi).sort();
    if (elencoClassi.length === 0) {
        alert("Nessuno studente disponibile per la stampa.");
        return;
    }

    elencoClassi.forEach((nomeClasse) => {
        classi[nomeClasse].sort((a, b) => a.cognome.localeCompare(b.cognome));
        classi[nomeClasse].forEach((s) => {
            s.haLabOggi = classiInLabOggi.includes(nomeClasse);
        });
    });

    const totaleElementi = sorgenteTutti.filter((s) => s.cognome && s.cognome.trim() !== "").length;
    const targetPerColonna = Math.ceil(totaleElementi / 3);

    const colonneHtml = ["", "", ""];
    let colonnaCorrenteIdx = 0;
    let elementiInColonnaCorrente = 0;

    elencoClassi.forEach((nomeClasse) => {
        const studentiClasse = classi[nomeClasse];
        const quantiStudenti = studentiClasse.length;

        if (elementiInColonnaCorrente > 0 && elementiInColonnaCorrente + quantiStudenti / 1.5 > targetPerColonna && colonnaCorrenteIdx < 2) {
            colonnaCorrenteIdx++;
            elementiInColonnaCorrente = 0;
        }

        let classeTableHtml = `<div class="blocco-classe"><table><tbody>`;

        studentiClasse.forEach((s) => {
            const roomNum = parseInt(s.room, 10);
            const isConvittore = !isNaN(roomNum) && roomNum >= 101 && roomNum <= 221;
            let roomInfo = s.room && s.room !== "-" ? s.room : "-";

            const dettagliTag = [s.percorso ? s.percorso : "", s.gruppo ? "• " + s.gruppo : ""].filter(Boolean).join(" ");
            let bgStyle = s.haLabOggi ? "background-color: #fff2cc;" : "";
            let classeBadge = s.haLabOggi ? `<b>${nomeClasse}</b> <span class="lab-badge">(LAB)</span>` : `<b>${nomeClasse}</b>`;
            const esternoClass = !isConvittore ? "esterno" : "";

            classeTableHtml += `
                <tr class="${esternoClass}" style="${bgStyle}">
                    <td class="t-cell t-room">${roomInfo}</td>
                    <td class="t-cell t-name"><b>${s.cognome}</b>&nbsp;${s.nome || ""}</td>
                    <td class="t-cell t-class">${classeBadge}</td>
                    <td class="t-cell t-details">${dettagliTag}</td>
                </tr>`;
            elementiInColonnaCorrente++;
        });

        classeTableHtml += `</tbody></table></div>`;
        colonneHtml[colonnaCorrenteIdx] += classeTableHtml;
    });

    const popup = window.open("", "_blank", "width=1200,height=800");
    popup.document.write(`
        <html><head><title>Transfer Lunch Completo</title><style>
            @page { size: A4 portrait; margin: 0.25cm; }
            body { font-family: -apple-system, sans-serif; margin: 0; padding: 0; color: #000; line-height: 1.0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            h2 { text-align: center; text-transform: uppercase; margin: 0; font-size: 1.0rem; }
            .date-subtitle { text-align: center; font-size: 0.75rem; margin-bottom: 3px; color: #444; }
            .timestamp { position: absolute; top: 3px; right: 10px; font-size: 0.55rem; color: #777; }
            .grid-container { display: flex; gap: 6px; justify-content: space-between; align-items: flex-start; }
            .colonna { width: 33.1%; display: flex; flex-direction: column; }
            .fake-header { display: flex; background: #2c3e50; color: white; font-weight: bold; font-size: 0.52rem; text-transform: uppercase; height: 14px; border: 1.2px solid #000; margin-bottom: 2px; }
            .h-cell { padding: 2px 2px; text-align: center; display: flex; align-items: center; justify-content: center; height: 100%; border-right: 1px solid #000; }
            .h-cell:last-child { border-right: none; }
            .blocco-classe { page-break-inside: avoid !important; break-inside: avoid-page !important; margin-bottom: 4px; width: 100%; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; border: 1.2px solid #000; }
            tr { height: 15px !important; }
            .t-cell { padding: 0px 2px; font-size: 0.54rem; border-right: 1px solid #000; border-bottom: 1px solid #ddd; text-align: left; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
            tr:last-child .t-cell { border-bottom: none; }
            .t-cell:last-child { border-right: none; }
            tr.esterno td.t-room { border-left: 2px dashed #7f8c8d; }
            .t-room, .h-room { width: 22px; text-align: center; }
            .t-room { font-weight: bold; background: #f5f5f5; }
            .t-name, .h-name { width: 105px; text-transform: uppercase; }
            .t-class, .h-class { width: 50px; text-align: center; }
            .t-details, .h-notes { flex-grow: 1; }
            .t-details { font-size: 0.50rem; color: #444; }
            .lab-badge { font-size: 0.44rem; color: #b7950b; font-weight: bold; }
            .no-print { text-align: center; margin-bottom: 4px; }
            @media print { .no-print { display: none; } }
        </style></head><body>
            <div class="timestamp">Generato il ${dataOggi} alle ${oraEsatta}</div>
            <h2>TRANSFER LUNCH</h2>
            <div class="date-subtitle">${dataTestuale} — Studenti tot: <b>${totaleElementi}</b></div>
            <div class="no-print">
                <button onclick="window.print()" style="padding:4px 30px; background:#27ae60; color:white; font-weight:bold; border-radius:20px; border:none; cursor:pointer;">•STAMPA</button>
            </div>
            <div class="grid-container">
                ${colonneHtml.map((htmlDest) => {
                    if (!htmlDest.trim()) return "";
                    return `
                    <div class="colonna">
                        <div class="fake-header">
                            <div class="h-cell h-room">Room</div>
                            <div class="h-cell h-name">Cognome e Nome</div>
                            <div class="h-cell h-class">Classe</div>
                            <div class="h-cell h-notes">Note</div>
                        </div>
                        ${htmlDest}
                    </div>`;
                }).join("")}
            </div>
        </body></html>`);
    popup.document.close();
}

// --- POMERIGGIO BUS (Ottimizzato Firebase) ---
function generaPopUpStampaBusPomeriggio() {
    const oggi = new Date();
    const dataTestuale = document.getElementById("todayDate").innerText;
    const dataOggi = oggi.toLocaleDateString("it-IT");
    const oraEsatta = oggi.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

    // FALLBACK SINCRO CLOUD: Controllo reattivo della sorgente dati
    if (typeof window.studenticonvittori !== "undefined") {
        var sorgenteStudenti = window.studenticonvittori;
    } else if (typeof studenticonvittori !== "undefined") {
        var sorgenteStudenti = studenticonvittori;
    } else {
        console.error("Errore: database studenti convittori non definito.");
        alert("Errore: database studenti non caricato. Verifica la connessione a Firebase.");
        return;
    }

    // 1. FILTRO: esclude 2A, 2B e classi con "P" e cognome vuoto
    const validi = sorgenteStudenti.filter((s) => {
        if (!s.cognome) return false;
        const classe = s.classe.toUpperCase();
        const escluse = ["2A", "2B"];
        return !escluse.includes(classe) && !classe.includes("P");
    });

    // 2. ORDINAMENTO NATURALE: Classe -> Gruppo -> Cognome
    validi.sort((a, b) => {
        const compClasse = a.classe.localeCompare(b.classe, undefined, { numeric: true });
        if (compClasse !== 0) return compClasse;

        const gA = a.gruppo || "";
        const gB = b.gruppo || "";
        const compGruppo = gA.localeCompare(gB);
        if (compGruppo !== 0) return compGruppo;

        return a.cognome.localeCompare(b.cognome);
    });

    // 3. COSTRUZIONE LISTA MISTA CON SEPARATORI
    const elementiFinali = [];
    let ultimaClasse = null;

    validi.forEach((studente) => {
        if (ultimaClasse !== null && studente.classe !== ultimaClasse) {
            elementiFinali.push({ type: "separator" });
        }
        elementiFinali.push({ type: "student", data: studente });
        ultimaClasse = studente.classe;
    });

    // 4. DISTRIBUZIONE BILANCIATA NELLE 3 COLONNE
    const totaleElementi = elementiFinali.length;
    const itemsPerColonna = Math.ceil(totaleElementi / 3);
    const colonneHtml = ["", "", ""];

    elementiFinali.forEach((elemento, idx) => {
        const colonnaIdx = Math.floor(idx / itemsPerColonna);

        if (elemento.type === "separator") {
            colonneHtml[colonnaIdx] += `<div class="class-separator"></div>`;
            return;
        }

        const s = elemento.data;
        const infoClasse = `${s.classe}${s.gruppo ? " • " + s.gruppo : ""}`;

        let bgStyle = "";
        if (s.classe === "5A") {
            if (s.gruppo === "G1") bgStyle = "background-color: #f4ecf7;";
            if (s.gruppo === "G2") bgStyle = "background-color: #eaf2f8;";
        } else if (s.classe === "5B") {
            if (s.gruppo === "G1") bgStyle = "background-color: #e8f4fd;";
            if (s.gruppo === "G2") bgStyle = "background-color: #fef9e7;";
        }

        colonneHtml[colonnaIdx] += `
            <div class="bus-row" style="${bgStyle}">
                <div class="b-cell b-class"><b>${infoClasse}</b></div>
                <div class="b-cell b-name"><b>${s.cognome}</b></div>
                <div class="b-cell b-day"></div>
                <div class="b-cell b-day"></div>
                <div class="b-cell b-day"></div>
                <div class="b-cell b-day"></div>
                <div class="b-cell b-notes"></div>
            </div>`;
    });

    // 5. GENERAZIONE POP-UP
    const popup = window.open("", "_blank", "width=1200,height=800");
    popup.document.write(`
        <html><head><title>Appello Bus Pomeriggio Settimanale</title><style>
            @page { size: A4 landscape; margin: 0.4cm; }
            body { font-family: -apple-system, sans-serif; margin: 0; padding: 5px; color: #000; line-height: 1.1; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            h2 { text-align: center; text-transform: uppercase; margin: 5px 0 2px 0; font-size: 1.2rem; }
            .date-subtitle { text-align: center; font-size: 0.85rem; margin-bottom: 12px; color: #444; }
            .timestamp { position: absolute; top: 5px; right: 10px; font-size: 0.65rem; color: #777; }
            .grid-container { display: flex; gap: 10px; justify-content: space-between; }
            .colonna { width: 32.5%; display: flex; flex-direction: column; }
            .column-header { display: flex; background: #333; color: white; font-weight: bold; font-size: 0.70rem; text-transform: uppercase; border: 1px solid #000; height: 22px; box-sizing: border-box; }
            .bus-row { display: flex; font-size: 0.72rem; border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px solid #000; align-items: stretch; page-break-inside: avoid; height: 22px !important; box-sizing: border-box; }
            .class-separator { height: 6px; background: #444; border: 1px solid #000; margin: 1px 0; page-break-inside: avoid; }
            .b-cell, .h-cell { padding: 2px 4px; text-align: center; display: flex; align-items: center; justify-content: center; overflow: hidden; white-space: nowrap; height: 100%; box-sizing: border-box; }
            .b-class, .h-class { width: 50px; font-size: 0.65rem; }
            .b-class { border-right: 1px solid #ccc; background: #f5f5f5; }
            .h-class { border-right: 1px solid #555; }
            .b-name, .h-name { width: 115px; text-align: left; justify-content: flex-start; padding-left: 6px; }
            .b-name { border-right: 1px solid #ccc; text-transform: uppercase; text-overflow: ellipsis; }
            .h-name { border-right: 1px solid #555; }
            .b-day, .h-day { width: 22px; font-size: 0.65rem; }
            .b-day { border-right: 1px solid #ccc; }
            .h-day { border-right: 1px solid #555; }
            .b-notes, .h-notes { flex-grow: 1; text-align: left; justify-content: flex-start; padding-left: 6px; }
            .no-print { text-align: center; margin-bottom: 12px; }
            @media print { .no-print { display: none; } }
        </style></head><body>
            <div class="timestamp">Generato il ${dataOggi} alle ${oraEsatta}</div>
            <h2>BUS POMERIGGIO</h2>
            <div class="date-subtitle">${dataTestuale} — Elementi totali: <b>${totaleElementi}</b></div>
            <div class="no-print">
                <button onclick="window.print()" style="padding:6px 30px; background:#27ae60; color:white; font-weight:bold; border-radius:20px; border:none; cursor:pointer;">•STAMPA</button>
            </div>
            <div class="grid-container">
                ${colonneHtml.map((htmlDest) => `
                    <div class="colonna">
                        <div class="column-header">
                            <div class="h-cell h-class">Classe</div>
                            <div class="h-cell h-name">Cognome</div>
                            <div class="h-cell h-day">LU</div>
                            <div class="h-cell h-day">MA</div>
                            <div class="h-cell h-day">ME</div>
                            <div class="h-cell h-day">GI</div>
                            <div class="h-cell h-notes">Note</div>
                        </div>
                        ${htmlDest}
                    </div>`).join("")}
            </div>
        </body></html>`);
    popup.document.close();
}

// --- USCITE (Ottimizzato Firebase e chiuso correttamente) ---
function generaPopUpStampaUscite() {
    // FALLBACK SINCRO CLOUD
    if (typeof window.studenticonvittori !== "undefined") {
        var sorgenteStudenti = window.studenticonvittori;
    } else if (typeof studenticonvittori !== "undefined") {
        var sorgenteStudenti = studenticonvittori;
    } else {
        alert("Errore: database studenticonvittori non trovato!");
        return;
    }

    // 2. FILTRO E ORDINAMENTO
    const listaConvittori = sorgenteStudenti
        .filter((s) => s && s.cognome && s.room && s.room !== "-")
        .sort((a, b) => a.cognome.localeCompare(b.cognome));

    if (listaConvittori.length === 0) {
        alert("Nessun convittore con camera assegnata trovato.");
        return;
    }

    // 3. RIPARTIZIONE BILANCIATA NELLE 2 COLONNE
    const totaleElementi = listaConvittori.length;
    const itemsPerCol = Math.ceil(totaleElementi / 2);
    const colonneHtml = ["", ""];

    listaConvittori.forEach((s, index) => {
        const colIndex = Math.floor(index / itemsPerCol);
        const infoClasse = [s.classe, s.percorso, s.gruppo].filter(Boolean).join(" ") || "-";

        colonneHtml[colIndex] += `
            <tr>
                <td class="t-cell t-room">${s.room}</td>
                <td class="t-cell t-class">${infoClasse}</td>
                <td class="t-cell t-name"><b>${s.cognome}</b>&nbsp;${s.nome || ""}</td>
                <td class="t-cell t-sign"></td>
                <td class="t-cell t-sign"></td>
            </tr>`;
    });

    function generaLayoutContenuto() {
        return `
            <div class="grid-container">
                ${colonneHtml.map((htmlDest) => `
                    <div class="colonna">
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 35px;">Room</th>
                                    <th style="width: 65px;">Classe</th>
                                    <th style="width: 160px;">Cognome e Nome</th>
                                    <th>Uscita</th>
                                    <th>Rientro</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${htmlDest}
                            </tbody>
                        </table>
                    </div>`).join("")}
            </div>`;
    }

    // 4. GENERAZIONE POP-UP E INTERFACCIA COMPLETA
    const oggi = new Date();
    const dataOggi = oggi.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const oraEsatta = oggi.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

    const popup = window.open("", "_blank", "width=1200,height=800");
    popup.document.write(`
        <html><head><title>Registro Firme Uscite - ${dataOggi}</title><style>
            @page { size: A4 portrait; margin: 0.4cm; }
            body { font-family: -apple-system, sans-serif; margin: 0; padding: 5px; color: #000; line-height: 1.2; }
            h2 { text-align: center; text-transform: uppercase; margin: 5px 0 2px 0; font-size: 1.2rem; }
            .date-subtitle { text-align: center; font-size: 0.9rem; margin-bottom: 15px; color: #333; text-transform: capitalize; }
            .timestamp { position: absolute; top: 5px; right: 10px; font-size: 0.60rem; color: #777; }
            .grid-container { display: flex; gap: 15px; justify-content: space-between; align-items: flex-start; }
            .colonna { width: 49%; }
            table { width: 100%; border-collapse: collapse; font-size: 0.68rem; border: 1.5px solid #000; }
            th { background: #2c3e50; color: white; padding: 4px; text-transform: uppercase; font-size: 0.65rem; border: 1px solid #000; }
            td { padding: 3px 5px; border: 1px solid #444; height: 20px; box-sizing: border-box; }
            .t-room { text-align: center; font-weight: bold; background: #f5f5f5; width: 35px; }
            .t-class { text-align: center; width: 65px; color: #555; }
            .t-name { text-transform: uppercase; width: 160px; }
            .t-sign { background: #ffffff; }
            .no-print { text-align: center; margin-bottom: 12px; }
            @media print { .no-print { display: none; } }
        </style></head><body>
            <div class="timestamp">Generato il ${oggi.toLocaleDateString("it-IT")} alle ${oraEsatta}</div>
            <h2>REGISTRO FIRME USCITE DIURNE</h2>
            <div class="date-subtitle">${dataOggi}</div>
            <div class="no-print">
                <button onclick="window.print()" style="padding:6px 30px; background:#27ae60; color:white; font-weight:bold; border-radius:20px; border:none; cursor:pointer;">•STAMPA REGISTRO</button>
            </div>
            ${generaLayoutContenuto()}
        </body></html>`);
    popup.document.close();
}

// --- PROSEGUIMENTO PARTE 4 (Chiusura Registro Uscite Convittori) ---
    const popup = window.open("", "_blank", "width=1200,height=800");
    popup.document.write(`
        <html><head><title>Registro Uscite Convittori - ${oggi.toLocaleDateString("it-IT")}</title><style>
            @page { size: A4 portrait; margin: 0.3cm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; color: #000; line-height: 1.1; }
            
            .page-block { page-break-after: always; position: relative; }
            .page-block:last-child { page-break-after: avoid; }
            
            .no-print-header { text-align: center; margin-top: 5px; }
            h2 { text-transform: uppercase; margin: 2px 0; font-size: 1.1rem; letter-spacing: 1px; text-align: center; }
            .date-subtitle { font-size: 0.8rem; margin-bottom: 5px; color: #333; font-weight: bold; text-transform: uppercase; text-align: center; }
            .side-indicator { position: absolute; top: 2px; right: 5px; font-size: 0.6rem; font-weight: bold; background: #ddd; padding: 1px 4px; border-radius: 3px; text-transform: uppercase; }
            
            .grid-container { display: flex; gap: 10px; justify-content: space-between; }
            .colonna { width: 49.3%; display: flex; flex-direction: column; }
            
            table { width: 100%; border-collapse: collapse; table-layout: fixed; border: 1.5px solid #000; }
            th { background: #34495e; color: white; font-weight: bold; font-size: 0.6rem; text-transform: uppercase; padding: 3px 2px; border: 1px solid #000; text-align: center; }
            
            .t-cell { padding: 1px 3px; font-size: 0.62rem; border-right: 1px solid #000; border-bottom: 1px solid #000; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; height: 14px; }
            .t-cell:last-child { border-right: none; }
            
            .t-room { width: 25px; text-align: center; font-weight: bold; background: #f9f9f9; }
            .t-class { width: 55px; font-size: 0.58rem; text-align: center; color: #222; }
            .t-name { width: 140px; text-transform: uppercase; text-align: left; }
            .t-sign { background: #fff; }
            
            .no-print { text-align: center; margin: 10px 0; }
            
            @media print { 
                .no-print, .no-print-header, .side-indicator { display: none !important; }
                .page-block { min-height: auto; }
            }
        </style></head><body>
            
            <div class="no-print">
                <button onclick="window.print()" style="padding:8px 35px; background:#27ae60; color:white; font-weight:bold; border-radius:20px; border:none; cursor:pointer; font-size:0.9rem; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
                    •STAMPA
                </button>
            </div>

            <div class="page-block">
                <div class="side-indicator">Fronte</div>
                <h2>ORA LIBERA 17/18 — ORA DI UNIONE</h2>
                <div class="no-print-header">
                    <div class="date-subtitle">${dataOggi}</div>
                </div>
                ${generaLayoutContenuto()}
            </div>

            <div class="page-block">
                <div class="side-indicator">Retro</div>
                <h2>ORA LIBERA 17/18 — ORA DI UNIONE</h2>
                <div class="no-print-header">
                    <div class="date-subtitle">${dataOggi}</div>
                </div>
                ${generaLayoutContenuto()}
            </div>

        </body></html>
    `);
    popup.document.close();
}

// --- ROOMING LIST ---
function generaPopUpStampaRooming() {
    // 1. DATI EXTRA E VERIFICA DATABASE CLOUD
    const extra = [
        { cognome: "EDUCATORI", nome: "", classe: "", gruppo: "", room: "112", percorso: "" },
        { cognome: "", nome: "", classe: "Foresteria", gruppo: "", room: "124", percorso: "" },
        { cognome: "", nome: "", classe: "Foresteria", gruppo: "", room: "125", percorso: "" },
        { cognome: "", nome: "", classe: "Foresteria", gruppo: "", room: "213", percorso: "" },
        { cognome: "", nome: "", classe: "Foresteria", gruppo: "", room: "216", percorso: "" },
        { cognome: "", nome: "", classe: "Foresteria", gruppo: "", room: "220", percorso: "" }
    ];

    let listaDalDatabase = [];
    if (typeof window.studenticonvittori !== "undefined") {
        listaDalDatabase = listaDalDatabase.concat(window.studenticonvittori);
    } else if (typeof studenticonvittori !== "undefined") {
        listaDalDatabase = listaDalDatabase.concat(studenticonvittori);
    } else {
        console.warn("Attenzione: variabile 'studenticonvittori' non trovata in locale o cloud.");
    }

    const tuttiIPartecipanti = [...extra, ...listaDalDatabase];
    const stanze = {};

    // 2. RAGGRUPPAMENTO PER STANZA
    tuttiIPartecipanti.forEach((s) => {
        if (!s.room || s.room === "-") return;
        if (!stanze[s.room]) stanze[s.room] = [];
        stanze[s.room].push(s);
    });

    const numeriStanze = Object.keys(stanze).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    // Dividiamo le stanze per piano (Piano 1: 100-199 / Piano 2: >= 200)
    const stanzePiano1 = [];
    const stanzePiano2 = [];

    numeriStanze.forEach((num) => {
        const r = parseInt(num, 10);
        stanze[num].sort((a, b) => (a.cognome || "").localeCompare(b.cognome || ""));

        if (r >= 100 && r < 200) {
            stanzePiano1.push(num);
        } else if (r >= 200) {
            stanzePiano2.push(num);
        }
    });

    // Funzione interna per generare i box HTML delle stanze
    function generaBoxStanze(listaStanzeDelPiano) {
        return listaStanzeDelPiano
            .map((num) => {
                const occupanti = stanze[num];
                return `
                <div class="room-box">
                    <div class="room-header">STANZA ${num}</div>
                    <table class="room-table">
                        <tbody>
                            ${occupanti
                                .map((s) => {
                                    const infoGruppo = s.gruppo ? ` • ${s.gruppo}` : "";
                                    const infoPercorso = s.percorso ? `<span class="percorso-tag">${s.percorso}</span> ` : "";
                                    const nomeDisplay =
                                        !s.cognome && s.classe === "Foresteria" ? "<i>Libero / Foresteria</i>"
                                            : `<b>${s.cognome}</b> ${s.nome || ""}`;
                                    const dettagliDisplay = s.classe ? `${infoPercorso}${s.classe}${infoGruppo}` : "";

                                    return `
                                    <tr>
                                        <td class="cell-name">${nomeDisplay}</td>
                                        <td class="cell-details">${dettagliDisplay}</td>
                                    </tr>`;
                                })
                                .join("")}
                        </tbody>
                    </table>
                </div>`;
            })
            .join("");
    }

    // 3. GENERAZIONE POP-UP E INTERFACCIA
    const oggi = new Date();
    const dataOggi = oggi.toLocaleDateString("it-IT");

    const popup = window.open("", "_blank", "width=1200,height=800");
    popup.document.write(`
        <html><head><title>Rooming List Verticale - ${dataOggi}</title><style>
            @page { size: A4 portrait; margin: 0.3cm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; color: #000; line-height: 1.1; }
            
            .page-block { position: relative; }
            
            .no-print-header { text-align: center; margin-bottom: 4px; }
            h2 { text-transform: uppercase; margin: 0; font-size: 1.1rem; letter-spacing: 1px; display: inline-block; }
            
            .section-title { font-size: 0.72rem; font-weight: bold; text-transform: uppercase; color: #2c3e50; margin: 5px 0 3px 0; background: #ecf0f1; padding: 2px 5px; border: 1px solid #000; width: 100%; box-sizing: border-box; }
            
            .rooms-grid { display: grid; grid-template-columns: repeat(3, 31.8%); gap: 0px; justify-content: space-between; width: 100%; }
            
            .room-box { border: 1.2px solid #000; background: #fff; page-break-inside: avoid; display: flex; flex-direction: column; margin-bottom: 2px; }
            .room-header { background: #34495e; color: #fff; font-weight: bold; font-size: 0.58rem; text-align: center; padding: 1px 0; border-bottom: 1.2px solid #000; letter-spacing: 0.5px; }
            
            .room-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            .room-table td { padding: 2px 3px; font-size: 0.55rem; border-bottom: 1px solid #ddd; border-right: 1px solid #ddd; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; height: 12px; }
            .room-table tr:last-child td { border-bottom: none; }
            .room-table td:last-child { border-right: none; }
            
            .cell-name { width: 52%; text-transform: uppercase; text-align: left; }
            .cell-details { width: 48%; text-align: right; color: #555; font-size: 0.5rem; }
            
            .percorso-tag { font-weight: bold; color: #ba1313; font-size: 0.48rem; }
            
            .no-print { text-align: center; margin: 8px 0; }
            @media print { 
                .no-print { display: none; }
                .section-title { background: #ddd !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
        </style></head><body>
            
            <div class="no-print">
                <button onclick="window.print()" style="padding:8px 35px; background:#27ae60; color:white; font-weight:bold; border-radius:20px; border:none; cursor:pointer; font-size:0.9rem; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
                    •STAMPA
                </button>
            </div>

            <div class="page-block">
                <div class="no-print-header">
                    <h2>ROOMING LIST — stampata il ${dataOggi}</h2>
                </div>
                
                <div class="section-title">Piano 1 - Maschile</div>
                <div class="rooms-grid">
                    ${generaBoxStanze(stanzePiano1)}
                </div>
                
                <div class="section-title">Piano 2 - Femminile</div>
                <div class="rooms-grid">
                    ${generaBoxStanze(stanzePiano2)}
                </div>
            </div>

        </body></html>
    `);
    popup.document.close();
}

// --- FUNZIONE STAND-BY DI CONTROLLO COERENZA ---
function verificaStudenteStandBy(r) {
    const paroleNo = ["n", "no", "non", "nor", "no rientro", "x"];
    const giornoSettimana = new Date().getDay();
    const cognome = r.dataset.cognome;
    
    // 1. Condizione Assente
    const condAssente = r.classList.contains("assente"); 
    
    // 2. Condizione Ingresso NO
    const inputIngresso = r.querySelector(".in-i");
    const ingressoNormalizzato = inputIngresso ? inputIngresso.value.trim().toLowerCase() : "";
    const condIngressoNo = paroleNo.includes(ingressoNormalizzato);
    
    // 3. Condizione Permesso Rientro NO
    let ppIn = "";
    if (typeof ORARI_PP !== "undefined" && ORARI_PP[cognome] && ORARI_PP[cognome][giornoSettimana]) {
        ppIn = ORARI_PP[cognome][giornoSettimana].in;
    }
    const condPpNo = ppIn.trim().toLowerCase().includes("no rientro");

    return condAssente || condIngressoNo || condPpNo;
}

// --- CONVITTO RIEPILOGO GENERALE ---
function generaPopUpStampaConvitto() {
    const dataStampa = document.getElementById("todayDate").innerText;
    const oraStampa = new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    const dataOggiStampa = new Date().toLocaleDateString("it-IT");
    const giornoSettimana = new Date().getDay();
    const camere = {};

    // Sincronizzazione Cloud Sicura
    let dbStudenti = typeof window.studenticonvittori !== "undefined" ? window.studenticonvittori : (typeof studenticonvittori !== "undefined" ? studenticonvittori : []);

    document.querySelectorAll(".student-row").forEach((r) => {
        const room = r.dataset.room || "---";
        const cognome = r.dataset.cognome;
        let ppOut = "", ppIn = "";
        
        if (typeof ORARI_PP !== "undefined" && ORARI_PP[cognome] && ORARI_PP[cognome][giornoSettimana]) {
            ppOut = ORARI_PP[cognome][giornoSettimana].out;
            ppIn = ORARI_PP[cognome][giornoSettimana].in;
        }

        // Optional Chaining per evitare crash se il database non ha ancora sincronizzato il record
        const sOriginale = dbStudenti.find((st) => st.cognome === cognome);

        if (!camere[room]) camere[room] = [];
        camere[room].push({
            classe: r.dataset.classe,
            percorso: r.dataset.percorso,
            cognome: cognome,
            dinnerno: r.dataset.dinnerno,
            presente: !r.classList.contains("assente"),
            oraU: r.querySelector(".in-u") ? r.querySelector(".in-u").value : "",
            oraI: r.querySelector(".in-i") ? r.querySelector(".in-i").value : "",
            ppOut: ppOut,
            ppIn: ppIn,
            gruppo: r.dataset.gruppo,
            bus: sOriginale ? haDirittoAlBus(sOriginale) : false,
            isStandBy: verificaStudenteStandBy(r) 
        });
    });

    const camereOrdinate = Object.keys(camere).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const popup = window.open("", "_blank", "width=1200,height=800");

    const hookTestataTabella = `<tr>
        <th>Room</th><th>Classe</th><th class="col-cognome">Cognome</th><th>Presente</th><th>Assente</th><th>Uscita</th><th>Ingresso</th><th>PP Uscita</th><th>PP Rientro</th><th>Dinner NO</th><th>Notte SI</th><th>Notte NO</th><th>Stand-by</th><th>7:30</th>
    </tr>`;

    popup.document.write(`
    <html><head><title>Riepilogo Convitto - ${dataStampa}</title><style>
        @page { size: A3 portrait; margin: 0.3cm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        h2 { text-align: center; text-transform: uppercase; font-size: 1.1em; margin: 4px 0; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 5px; }
        
        tr { height: 18px !important; }
        th, td { border: 1px solid #000; padding: 1px 2px; text-align: center; font-size: 0.60em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; height: 18px !important; box-sizing: border-box; line-height: 16px; }
        
        th { background: #f2f2f2; font-weight: bold; }
        .room-header { background: #eee; font-weight: bold; width: 45px; white-space: normal; line-height: 1.1; }
        .border-bottom-bold { border-bottom: 2.5px solid #000 !important; }
        .border-dashed { border-bottom: 1px dashed #999 !important; }
        .col-cognome { text-align: left !important; padding-left: 4px !important; width: 130px; text-transform: uppercase; }
        .bg-gray { background: #f9f9f9 !important; }
        .page-break { page-break-after: always; page-break-inside: avoid; }
        .footer-timestamp { text-align: right; font-size: 0.70em; margin-top: 5px; font-style: italic; color: #555; }
        .no-print { text-align: center; margin: 10px; }
        @media print { .no-print { display: none; } }
    </style></head><body>
        <div class="no-print"><button onclick="window.print()" style="padding:15px 50px; background:#27ae60; color:white; font-weight:bold; border-radius:80px; border:none; cursor:pointer;">•STAMPA RIEPILOGO</button></div>
        <h2>MASCHILE - piano 1° - ${dataStampa}</h2>
        <table>
            <thead>${hookTestataTabella}</thead>
            <tbody>
                ${camereOrdinate
                    .map((room) => {
                        let html = "";
                        html += camere[room]
                            .map((s, idx) => {
                                const isLastRow = idx === camere[room].length - 1;
                                const bClass = isLastRow ? 'class="border-bottom-bold"' : 'class="border-dashed"';
                                const bClassGray = isLastRow ? 'class="border-bottom-bold bg-gray"' : 'class="border-dashed bg-gray"';
                                const bClassCognome = isLastRow ? 'class="border-bottom-bold col-cognome"' : 'class="border-dashed col-cognome"';
                                
                                return `<tr>
                                    ${idx === 0 ? `<td rowspan="${camere[room].length}" class="room-header border-bottom-bold">${room}</td>` : ""}
                                    <td ${bClass}>${s.classe} ${s.percorso || ""}</td>
                                    <td ${bClassCognome}><b>${s.cognome}</b> ${s.gruppo ? "(" + s.gruppo + ")" : ""}</td>
                                    <td ${bClass}>${s.presente ? "X" : ""}</td>
                                    <td ${bClass}>${!s.presente ? "X" : ""}</td>
                                    <td ${bClassGray}>${s.oraU}</td>
                                    <td ${bClass}>${s.oraI}</td>
                                    <td ${bClassGray}><b>${s.ppOut}</b></td>
                                    <td ${bClass}><b>${s.ppIn}</b></td>
                                    <td ${bClassGray}>${s.dinnerno === "1" ? "X" : ""}</td>
                                    <td ${bClass}></td>
                                    <td ${bClassGray}></td>
                                    <td ${bClassGray}>${s.isStandBy ? "➖" : ""}</td>
                                    <td ${bClass}>${s.bus ? "⭕" : ""}</td>
                                </tr>`;
                            })
                            .join("");
                        
                        if (room === "125") {
                            html += `</tbody></table><div class="page-break"></div><h2>FEMMINILE - piano 2° - ${dataStampa}</h2><table><thead>${hookTestataTabella}</thead><tbody>`;
                        }
                        return html;
                    })
                    .join("")}
            </tbody>
        </table>
        <div class="footer-timestamp">aggiornamento ${dataOggiStampa} ore ${oraStampa}</div>
    </body></html>`);
    popup.document.close();
}

// --- MATTINO BUS (Inizio logica) ---
function generaPopUpStampaBus() {
    const oggi = new Date();
    const dataOggi = oggi.toLocaleDateString("it-IT");
    const oraEsatta = oggi.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

    const domani = new Date(oggi);
    domani.setDate(oggi.getDate() + 1);
    const dataDomaniTestuale = domani.toLocaleDateString("it-IT", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    let sorgenteStudenti = [];
    if (typeof window.studenticonvittori !== "undefined") {
        sorgenteStudenti = window.studenticonvittori;
    } else if (typeof studenticonvittori !== "undefined") {
        sorgenteStudenti = studenticonvittori;
    } else {
        console.error("Errore: studenticonvittori non definito.");
        alert("Errore: database studenti non caricato.");
        return;
    }
    
    // --- PROSEGUIMENTO PARTE 5 (Appello Bus Domattina e Bus Generico) ---

    // 1. FILTRO CLASSI ESCLUSE CON CONTROLLO DI SICUREZZA
    let dbStudentiBus = typeof window.studenticonvittori !== "undefined" ? window.studenticonvittori : (typeof studenticonvittori !== "undefined" ? studenticonvittori : []);

    const validi = dbStudentiBus.filter((s) => {
        if (!s || !s.cognome || !s.classe) return false;
        const classe = s.classe.toUpperCase();
        const escluse = ["2A", "2B"];
        return !escluse.includes(classe) && !classe.includes("P");
    });

    // 2. SEPARAZIONE E ORDINAMENTO CORRETTO
    const resto = validi.filter((s) => s.classe !== "5B");
    const classe5B = validi.filter((s) => s.classe === "5B");

    resto.sort((a, b) => a.cognome.localeCompare(b.cognome));
    classe5B.sort((a, b) => {
        const gA = a.gruppo || "";
        const gB = b.gruppo || "";
        return (gA + a.cognome).localeCompare(gB + b.cognome);
    });

    const listaFinale = [...resto, ...classe5B];

    // 3. RIPARTIZIONE IN 3 COLONNE BILANCIATE
    const itemsPerCol = Math.ceil(listaFinale.length / 3);
    const colonneHtml = ["", "", ""];

    listaFinale.forEach((s, index) => {
        const colIndex = Math.floor(index / itemsPerCol);
        const infoClasse = `${s.classe} ${s.percorso ? s.percorso : ""} ${s.gruppo ? "• " + s.gruppo : ""}`;

        let bgStyle = "";
        if (s.classe === "5B") {
            if (s.gruppo === "G1") bgStyle = "background-color: #e8f4fd;";
            if (s.gruppo === "G2") bgStyle = "background-color: #fef9e7;";
        }

        // --- RECUPERO DELLO STAND-BY DAL DOM IN SICUREZZA (Escape Apostrofi/Spazi) ---
        const cognomeEscaped = s.cognome.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const rigaElemento = document.querySelector(`.student-row[data-cognome="${cognomeEscaped}"]`);
        let visualizzaStandBy = "";
        if (rigaElemento) {
            const isStandBy = typeof verificaStudenteStandBy === "function" ? verificaStudenteStandBy(rigaElemento) : false;
            visualizzaStandBy = isStandBy ? "➖" : "";
        }

        colonneHtml[colIndex] += `
            <div class="bus-row" style="${bgStyle}">
                <div class="b-cell b-room">${s.room || ""}</div>
                <div class="b-cell b-name"><b>${s.cognome}</b></div>
                <div class="b-cell b-class">${infoClasse}</div>
                <div class="b-cell b-check"></div>
                <div class="b-cell b-standby" style="font-size: 0.9em;">${visualizzaStandBy}</div>
                <div class="b-cell b-notes"></div>
            </div>
        `;
    });

    // 4. GENERAZIONE INTERFACCIA COMPATTA A4 LANDSCAPE
    const popup = window.open("", "_blank", "width=1200,height=800");
    popup.document.write(`
        <html><head><title>Appello Bus - Elenco Domattina</title><style>
            @page { size: A4 landscape; margin: 0.4cm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 5px; color: #000; line-height: 1.1; }
            h2 { text-align: center; text-transform: uppercase; margin: 2px 0 0 0; font-size: 1.1rem; }
            .date-subtitle { text-align: center; font-size: 0.85rem; font-weight: bold; margin-bottom: 8px; color: #111; text-transform: capitalize; }
            .timestamp { position: absolute; top: 5px; right: 10px; font-size: 0.6rem; color: #777; }
            .grid-container { display: flex; gap: 10px; justify-content: space-between; }
            .colonna { width: 32.5%; display: flex; flex-direction: column; }
            
            .column-header { display: flex; background: #333; color: white; font-weight: bold; font-size: 0.6rem; text-transform: uppercase; border: 1px solid #000; height: 18px; }
            
            .bus-row { display: flex; font-size: 0.68rem; border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px solid #000; align-items: stretch; page-break-inside: avoid; height: 22px; }
            
            .b-cell, .h-cell { padding: 2px 2px; text-align: center; display: flex; align-items: center; justify-content: center; overflow: hidden; white-space: nowrap; }
            
            .b-room, .h-room { width: 25px; font-size: 0.58rem; }
            .b-room { border-right: 1px solid #ccc; font-weight: bold; background: #f5f5f5; }
            .h-room { border-right: 1px solid #555; }
            
            .b-name, .h-name { width: 105px; text-align: left; justify-content: flex-start; padding-left: 4px; }
            .b-name { border-right: 1px solid #ccc; text-transform: uppercase; text-overflow: ellipsis; }
            .h-name { border-right: 1px solid #555; }
            
            .b-class, .h-class { width: 65px; font-size: 0.55rem; }
            .b-class { border-right: 1px solid #ccc; }
            .h-class { border-right: 1px solid #555; }
            
            .b-check, .h-check { width: 22px; }
            .b-check { border-right: 1px solid #ccc; }
            .h-check { border-right: 1px solid #555; }
            
            .b-standby, .h-standby { width: 25px; border-right: 1px solid #ccc; }
            .h-standby { border-right: 1px solid #555; }

            .b-notes, .h-notes { flex-grow: 1; text-align: left; justify-content: flex-start; padding-left: 4px; }
            
            .no-print { text-align: center; margin-bottom: 8px; }
            @media print { .no-print { display: none; } }
        </style></head><body>
            <div class="timestamp">Elaborato il ${dataOggi} alle ${oraEsatta}</div>
            <h2>BUS DOMATTINA</h2>
            <div class="date-subtitle">Trasporto del ${dataDomaniTestuale} — Studenti tot: <b>${listaFinale.length}</b></div>
            
            <div class="no-print">
                <button onclick="window.print()" style="padding:6px 30px; background:#27ae60; color:white; font-weight:bold; border-radius:20px; border:none; cursor:pointer; font-size:0.9rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    •STAMPA ELENCO
                </button>
            </div>

            <div class="grid-container">
                ${colonneHtml
                    .map(
                        (htmlDest) => `
                    <div class="colonna">
                        <div class="column-header">
                            <div class="h-cell h-room">Room</div>
                            <div class="h-cell h-name">Cognome</div>
                            <div class="h-cell h-class">Classe</div>
                            <div class="h-cell h-check">Pres</div>
                            <div class="h-cell h-standby">StBy</div>
                            <div class="h-cell h-notes">Note</div>
                        </div>
                        ${htmlDest}
                    </div>`
                    )
                    .join("")}
            </div>
        </body></html>
    `);
    popup.document.close();
}

// --- BUS MATTINO GENERICO / SCHEMA TRASPORTO ---
function generaPopUpStampaBusGenerico() {
    const oggi = new Date();
    const dataElement = document.getElementById("todayDate");
    const dataTestuale = dataElement ? dataElement.innerText : oggi.toLocaleDateString("it-IT");
    const dataOggi = oggi.toLocaleDateString("it-IT");
    const oraEsatta = oggi.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

    let dbStudentiGenerico = typeof window.studenticonvittori !== "undefined" ? window.studenticonvittori : (typeof studenticonvittori !== "undefined" ? studenticonvittori : []);

    if (dbStudentiGenerico.length === 0) {
        console.error("Errore: studenticonvittori non definito o vuoto.");
        alert("Errore: database studenti non caricato.");
        return;
    }

    // 1. FILTRO CLASSI ESCLUSE
    const validi = dbStudentiGenerico.filter((s) => {
        if (!s || !s.cognome || !s.classe) return false;
        const classe = s.classe.toUpperCase();
        const escluse = ["2A", "2B"];
        return !escluse.includes(classe) && !classe.includes("P");
    });

    // 2. SEPARAZIONE E ORDINAMENTO
    const resto = validi.filter((s) => s.classe !== "5B");
    const classe5B = validi.filter((s) => s.classe === "5B");

    resto.sort((a, b) => a.cognome.localeCompare(b.cognome));
    classe5B.sort((a, b) => {
        const gA = a.gruppo || "";
        const gB = b.gruppo || "";
        return (gA + a.cognome).localeCompare(gB + b.cognome);
    });

    const listaFinale = [...resto, ...classe5B];

    // 3. RIPARTIZIONE IN 3 COLONNE BILANCIATE
    const itemsPerCol = Math.ceil(listaFinale.length / 3);
    const colonneHtml = ["", "", ""];

    listaFinale.forEach((s, index) => {
        const colIndex = Math.floor(index / itemsPerCol);
        const infoClasse = `${s.classe} ${s.percorso ? s.percorso : ""} ${s.gruppo ? "• " + s.gruppo : ""}`;

        let bgStyle = "";
        if (s.classe === "5B") {
            if (s.gruppo === "G1") bgStyle = "background-color: #e8f4fd;";
            if (s.gruppo === "G2") bgStyle = "background-color: #fef9e7;";
        }

        colonneHtml[colIndex] += `
            <div class="bus-row" style="${bgStyle}">
                <div class="b-cell b-room">${s.room || ""}</div>
                <div class="b-cell b-name"><b>${s.cognome}</b></div>
                <div class="b-cell b-class">${infoClasse}</div>
                <div class="b-cell b-check"></div>
                <div class="b-cell b-standby"></div> 
                <div class="b-cell b-notes"></div>
            </div>
        `;
    });

    // 4. GENERAZIONE INTERFACCIA COMPATTA A4 LANDSCAPE
    const popup = window.open("", "_blank", "width=1200,height=800");
    popup.document.write(`
        <html><head><title>Appello Bus - Schema Generico</title><style>
            @page { size: A4 landscape; margin: 0.4cm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 5px; color: #000; line-height: 1.1; }
            h2 { text-align: center; text-transform: uppercase; margin: 2px 0 0 0; font-size: 1.1rem; }
            .date-subtitle { text-align: center; font-size: 0.85rem; font-weight: bold; margin-bottom: 8px; color: #111; }
            .timestamp { position: absolute; top: 5px; right: 10px; font-size: 0.6rem; color: #777; }
            .grid-container { display: flex; gap: 10px; justify-content: space-between; }
            .colonna { width: 32.5%; display: flex; flex-direction: column; }
            
            .column-header { display: flex; background: #333; color: white; font-weight: bold; font-size: 0.6rem; text-transform: uppercase; border: 1px solid #000; height: 18px; }
            
            .bus-row { display: flex; font-size: 0.68rem; border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px solid #000; align-items: stretch; page-break-inside: avoid; height: 22px; }
            
            .b-cell, .h-cell { padding: 2px 2px; text-align: center; display: flex; align-items: center; justify-content: center; overflow: hidden; white-space: nowrap; }
            
            .b-room, .h-room { width: 25px; font-size: 0.58rem; }
            .b-room { border-right: 1px solid #ccc; font-weight: bold; background: #f5f5f5; }
            .h-room { border-right: 1px solid #555; }
            
            .b-name, .h-name { width: 105px; text-align: left; justify-content: flex-start; padding-left: 4px; }
            .b-name { border-right: 1px solid #ccc; text-transform: uppercase; text-overflow: ellipsis; }
            .h-name { border-right: 1px solid #555; }
            
            .b-class, .h-class { width: 65px; font-size: 0.55rem; }
            .b-class { border-right: 1px solid #ccc; }
            .h-class { border-right: 1px solid #555; }
            
            .b-check, .h-check { width: 22px; }
            .b-check { border-right: 1px solid #ccc; }
            .h-check { border-right: 1px solid #555; }
            
            .b-standby, .h-standby { width: 25px; border-right: 1px solid #ccc; }
            .h-standby { border-right: 1px solid #555; }

            .b-notes, .h-notes { flex-grow: 1; text-align: left; justify-content: flex-start; padding-left: 4px; }
            
            .no-print { text-align: center; margin-bottom: 8px; }
            @media print { .no-print { display: none !important; } }
        </style></head><body>
            <div class="timestamp">Generato il ${dataOggi} alle ${oraEsatta}</div>
            <h2>BUS DEL MATTINO</h2>
            
            <div class="date-subtitle no-print">${dataTestuale} — Studenti tot: <b>${listaFinale.length}</b></div>
            
            <div class="no-print">
                <button onclick="window.print()" style="padding:6px 30px; background:#27ae60; color:white; font-weight:bold; border-radius:20px; border:none; cursor:pointer; font-size:0.9rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    •STAMPA SCHEMA
                </button>
            </div>

            <div class="grid-container">
                ${colonneHtml
                    .map(
                        (htmlDest) => `
                    <div class="colonna">
                        <div class="column-header">
                            <div class="h-cell h-room">Room</div>
                            <div class="h-cell h-name">Cognome</div>
                            <div class="h-cell h-class">Classe</div>
                            <div class="h-cell h-check">Pres</div>
                            <div class="h-cell h-standby">StBy</div>
                            <div class="h-cell h-notes">Note</div>
                        </div>
                        ${htmlDest}
                    </div>`
                    )
                    .join("")}
            </div>
        </body></html>
    `);
    popup.document.close();
}
// --- FINE FUNZIONI DI STAMPA E LOGICHE DI CONTROLLO CONVITTO ---

// --- 6. GESTIONE ASSENZE PROGRAMMATE ---
function salvaAssenzeProgrammate() {
    localStorage.setItem("assenzeProgrammate", JSON.stringify(assenzeProgrammate));
    if (typeof syncAssenzeToFirebase === "function") {
        syncAssenzeToFirebase();
    }
}

function caricaAssenzeProgrammate() {
    const saved = localStorage.getItem("assenzeProgrammate");
    assenzeProgrammate = saved ? JSON.parse(saved) : {};
}

function isAssenteProgrammato(cognome, data) {
    if (!cognome || !data) return false;
    const lista = assenzeProgrammate[cognome.toUpperCase()];
    if (!lista) return false;

    // Normalizzazione della data corrente senza offset di fuso orario artificiale
    const oggi = new Date(data);
    oggi.setHours(0, 0, 0, 0);

    return lista.some((periodo) => {
        const dal = new Date(periodo.dal);
        dal.setHours(0, 0, 0, 0);
        const al = new Date(periodo.al);
        al.setHours(0, 0, 0, 0);
        return oggi >= dal && oggi <= al;
    });
}

function aggiungiAssenza() {
    const cognomeSel = document.getElementById("selectStudente")?.value || "";
    const classeSel = document.getElementById("selectClasse")?.value || "";
    const dal = document.getElementById("dataDal")?.value;
    const al = document.getElementById("dataAl")?.value;

    if (!dal || !al) return alert("Seleziona entrambe le date");

    let dbStudentiAssenze = typeof window.studenticonvittori !== "undefined" ? window.studenticonvittori : (typeof studenticonvittori !== "undefined" ? studenticonvittori : []);
    let studentiDaAggiornare = [];

    if (classeSel) {
        studentiDaAggiornare = dbStudentiAssenze
            .filter((s) => s.classe === classeSel && s.cognome)
            .map((s) => s.cognome.toUpperCase());
    } else if (cognomeSel) {
        studentiDaAggiornare = [cognomeSel.toUpperCase()];
    } else {
        return alert("Seleziona uno studente o una classe");
    }

    studentiDaAggiornare.forEach((cognome) => {
        if (!assenzeProgrammate[cognome]) {
            assenzeProgrammate[cognome] = [];
        }
        assenzeProgrammate[cognome].push({ dal, al });
    });

    salvaAssenzeProgrammate();
    renderListaAssenze();
}

function renderListaAssenze() {
    const container = document.getElementById("listaAssenze");
    if (!container) return;

    container.innerHTML = Object.entries(assenzeProgrammate)
        .map(([cognome, periodi]) => {
            return `
            <div style="margin-bottom:10px; border-bottom: 1px dashed #ddd; padding-bottom: 5px;">
                <b>${cognome}</b>
                ${periodi
                    .map(
                        (p, i) => `
                    <div style="font-size:0.8rem; display: flex; justify-content: space-between; align-items: center; margin-top: 2px;">
                        <span>🗓️ ${p.dal} ➔ ${p.al}</span>
                        <button onclick="rimuoviAssenza('${cognome.replace(/'/g, "\\'")}', ${i})" style="border:none; background:none; cursor:pointer;">❌</button>
                    </div>
                `
                    )
                    .join("")}
            </div>
        `;
        })
        .join("");
}

function rimuoviAssenza(cognome, index) {
    if (assenzeProgrammate[cognome]) {
        assenzeProgrammate[cognome].splice(index, 1);
        if (assenzeProgrammate[cognome].length === 0) {
            delete assenzeProgrammate[cognome];
        }
        salvaAssenzeProgrammate();
        renderListaAssenze();
    }
}

// --- 7. PERMESSI E UTILITY ---
function popolaListaPermessi() {
    const container = document.getElementById("listaPermessiContent");
    if (!container) return;
    
    const giorniSettimana = ["", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì"];
    const databaseOrari = typeof ORARI_PP !== "undefined" ? ORARI_PP : {};
    const studentiPP = Object.keys(databaseOrari).sort();
    
    if (studentiPP.length === 0) {
        container.innerHTML = "<p style='font-size:0.85rem; color:#777; text-align:center;'>Nessun orario PP predefinito configurato.</p>";
        return;
    }
    
    container.innerHTML = studentiPP
        .map((cognome) => {
            const orari = databaseOrari[cognome];
            let dettagli = Object.keys(orari)
                .map(
                    (g) => {
                        const nomeGiorno = giorniSettimana[g] ? giorniSettimana[g].substring(0, 2) : `G${g}`;
                        return `<div style="font-size:0.8em; margin-left:10px;"><b style="color:var(--p, #2980b9)">${nomeGiorno}:</b> ${orari[g].out || "--:--"} > ${orari[g].in || "--:--"}</div>`;
                    }
                )
                .join("");
            return `<div style="margin-bottom:12px; border-bottom:1px solid #eee; padding-bottom:4px;"><b>${cognome}</b>${dettagli}</div>`;
        })
        .join("");
}

function popolaSelectStudenti() {
    const sel = document.getElementById("selectStudente");
    if (!sel) return;

    let dbStudentiSelect = typeof window.studenticonvittori !== "undefined" ? window.studenticonvittori : (typeof studenticonvittori !== "undefined" ? studenticonvittori : []);
    const gruppi = {};
    
    dbStudentiSelect.forEach((s) => {
        if (!s.classe || !s.cognome) return;
        if (!gruppi[s.classe]) gruppi[s.classe] = [];
        gruppi[s.classe].push(s);
    });

    let html = `<option value="">-- Seleziona Nome --</option>`;
    Object.keys(gruppi)
        .sort()
        .forEach((classe) => {
            html += `<optgroup label="Classe ${classe}">`;
            gruppi[classe].sort((a, b) => a.cognome.localeCompare(b.cognome)).forEach((s) => {
                html += `<option value="${s.cognome}">${s.cognome} ${s.nome || ""}</option>`;
            });
            html += `</optgroup>`;
        });
    sel.innerHTML = html;
}

function popolaSelectClassi() {
    const sel = document.getElementById("selectClasse");
    if (!sel) return;
    
    let dbStudentiClassi = typeof window.studenticonvittori !== "undefined" ? window.studenticonvittori : (typeof studenticonvittori !== "undefined" ? studenticonvittori : []);
    const classiUniche = [...new Set(dbStudentiClassi.map((s) => s.classe).filter(Boolean))].sort();
    
    sel.innerHTML =
        `<option value="">-- Seleziona Classe --</option>` +
        classiUniche.map((c) => `<option value="${c}">${c}</option>`).join("");
}

function togglePanel() {
    const panel = document.getElementById("sidePanel");
    if (!panel) return;
    
    if (panel.style.right === "0px") {
        panel.style.right = "-350px";
    } else {
        popolaListaPermessi();
        popolaSelectStudenti();
        renderListaAssenze();
        popolaSelectClassi();
        panel.style.right = "0px";
    }
}

function isStudenteInLabOggi(classe, gruppo, dataOggetto) {
    if (!classe || !dataOggetto) return false;
    const dataKey = dataOggetto.toLocaleDateString("it-IT");
    const giorno = dataOggetto.getDay();
    
    const calDinamico = typeof CALENDARIO_GRUPPI_DINNER !== "undefined" ? CALENDARIO_GRUPPI_DINNER : {};
    const gLab = calDinamico[dataKey];
    
    if ({ 1: ["2P"], 3: ["2B"], 4: ["2A"] }[giorno]?.includes(classe)) return true;
    if ((classe === "5A" || classe === "5B") && gLab) {
        return (gLab === "gr1" && gruppo === "G1") || (gLab === "gr2" && gruppo === "G2");
    }
    return false;
}

function isPPNoDinnerOggi(cognome, giorno) {
    if (!cognome || typeof ASSENTI_PERMESSO === "undefined") return false;
    return ASSENTI_PERMESSO[giorno]?.includes(cognome.toUpperCase()) || false;
}

function updateClock() {
    const clock = document.getElementById("digitalClock");
    if (clock) clock.innerText = new Date().toLocaleTimeString("it-IT");
}

function salvaDatiLocale() {
    const dati = {};
    document.querySelectorAll(".student-row").forEach((r) => {
        if (!r.dataset.cognome) return;
        const outInput = r.querySelector(".in-u");
        const inInput = r.querySelector(".in-i");
        
        dati[r.dataset.cognome] = {
            esce: outInput ? outInput.value : "",
            entra: inInput ? inInput.value : "",
            assente: r.classList.contains("assente"),
            dinnerno: r.dataset.dinnerno || "0",
            switch: typeof cambiTurnoManuali !== "undefined" ? (cambiTurnoManuali[r.dataset.cognome] || false) : false
        };
    });
    localStorage.setItem("datiConvitto", JSON.stringify(dati));

    if (typeof triggerSync === "function") {
        triggerSync();
    }
}

function caricaDatiLocale() {
    const dati = JSON.parse(localStorage.getItem("datiConvitto") || "{}");
    const giornoSettimana = new Date().getDay();
    const dbOrariPP = typeof ORARI_PP !== "undefined" ? ORARI_PP : {};

    document.querySelectorAll(".student-row").forEach((r) => {
        const cognome = r.dataset.cognome;
        if (!cognome) return;
        const cgn = cognome.toUpperCase();
        const d = dati[cognome];

        // 1. Orari predefiniti da JSON
        let ppOut = "";
        let ppIn = "";
        if (dbOrariPP[cgn] && dbOrariPP[cgn][giornoSettimana]) {
            ppOut = dbOrariPP[cgn][giornoSettimana].out || "";
            ppIn = dbOrariPP[cgn][giornoSettimana].in || "";
        }

        // 2. Assegnazione con fallback logico
        const outInput = r.querySelector(".in-u");
        const inInput = r.querySelector(".in-i");
        if (outInput) outInput.value = d && d.esce !== undefined ? d.esce : ppOut;
        if (inInput) inInput.value = d && d.entra !== undefined ? d.entra : ppIn;

        // 3. Ripristino Classi Visive
        if (d) {
            // Stato ASSENTE
            const btnAss = r.querySelector(".btn-ass");
            if (d.assente) {
                r.classList.add("assente");
                if (btnAss) btnAss.classList.add("active-ass");
            } else {
                r.classList.remove("assente");
                if (btnAss) btnAss.classList.remove("active-ass");
            }

            // Stato NON CENA
            const btnDin = r.querySelector(".btn-din");
            if (d.dinnerno === "1") {
                r.classList.add("dinner-no");
                if (btnDin) btnDin.classList.add("active-din");
                r.dataset.dinnerno = "1";
            } else {
                r.classList.remove("dinner-no");
                if (btnDin) btnDin.classList.remove("active-din");
                r.dataset.dinnerno = "0";
            }

            // Stato CAMBIO TURNO
            if (d.switch && typeof cambiTurnoManuali !== "undefined") {
                cambiTurnoManuali[cognome] = true;
            }
        }

        if (typeof cambiTurnoManuali !== "undefined" && cambiTurnoManuali[cognome]) {
            const btnSwitch = r.querySelector(".btn-switch");
            if (btnSwitch) btnSwitch.classList.add("modificato");
        }

        // 4. Controllo automatico Dinner
        if (typeof controllaDinnerAutomatico === "function") {
            controllaDinnerAutomatico(r);
        }
    });
}

function mostraDataReset() {
    const dReset = localStorage.getItem("dataUltimoReset");
    const infoReset = document.getElementById("info-reset");
    if (dReset && infoReset) infoReset.innerText = `Ultimo aggiornamento: ${dReset}`;
}

function cancellaNote() {
    if (confirm("Vuoi cancellare definitivamente tutte le note giornaliere?")) {
        const noteInput = document.getElementById("dailyNotes");
        if (noteInput) {
            noteInput.value = "";
            localStorage.setItem("note_convitto", "");
            if (typeof syncNoteToFirebase === "function") syncNoteToFirebase();
        }
    }
}

// --- AUTHENTICATION & INITIALIZATION ---
const auth = typeof firebase !== "undefined" ? firebase.auth() : null;

function login() {
    const emailField = document.getElementById("loginEmail");
    const passField = document.getElementById("loginPassword");
    const errorField = document.getElementById("loginError");
    
    if (!emailField || !passField) return;
    
    const email = emailField.value.trim();
    const password = passField.value;

    if (!email || !password) {
        if (errorField) errorField.innerText = "Inserisci credenziali valide";
        return;
    }

    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            const screen = document.getElementById("loginScreen");
            if (screen) screen.style.display = "none";
            if (typeof startAutoSave === "function") startAutoSave();
        })
        .catch((error) => {
            if (errorField) errorField.innerText = "Email o password errati";
            console.error("Errore autenticazione:", error);
        });
}

if (auth) {
    auth.onAuthStateChanged((user) => {
        const loginScreen = document.getElementById("loginScreen");
        if (user) {
            console.log("Sessione attiva per:", user.email);
            if (loginScreen) loginScreen.style.display = "none";
            
            // Inizializzazione globale dello stato applicativo
            caricaAssenzeProgrammate();
            if (typeof init === "function") init();
            if (typeof startAutoSave === "function") startAutoSave();
            
            mostraDataReset();
            setInterval(updateClock, 1000);
        } else {
            console.log("Nessun utente autenticato. Schermata di blocco.");
            if (loginScreen) loginScreen.style.display = "flex";
            if (typeof stopAutoSave === "function") stopAutoSave();
        }
    });
}

function logout() {
    if (typeof stopAutoSave === "function") stopAutoSave();
    if (auth) {
        auth.signOut().then(() => {
            location.reload();
        });
    }
}

// Gestore eventi pronto all'uso se necessario
window.onload = () => {
    updateClock();
};
