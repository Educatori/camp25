/**
 * CRUSCOTTO-SCRIPT.JS - Versione Integrale con Firebase Sync
 */

let cambiTurnoManuali = {};
let assenzeProgrammate = {};

// Salva riferimenti alle funzioni originali per override
window.caricaDatiLocaleOriginal = caricaDatiLocale;
window.popolaListaPermessiOriginal = popolaListaPermessi;
window.renderListaAssenzeOriginal = renderListaAssenze;

// --- 1. INIZIALIZZAZIONE ---
function init() {
    const d = new Date();
    caricaAssenzeProgrammate();
    
    const dateEl = document.getElementById('todayDate');
    if (dateEl) dateEl.innerText = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    
    updateClock();
    let clockInterval = null;
    if (clockInterval) clearInterval(clockInterval);
    clockInterval = setInterval(updateClock, 1000);
    
    const lista = document.getElementById('listaStudenti');
    if (!lista) return;
    lista.innerHTML = "";

    const studenti = [...studenticonvittori];
    studenti.sort((a, b) => a.room.localeCompare(b.room, undefined, { numeric: true })).forEach(s => {
        const r = document.createElement('div');
        r.className = 'student-row';
        
        const isLab = isStudenteInLabOggi(s.classe, s.gruppo, d);
        if (isLab) r.classList.add('highlight-lab');

        r.dataset.cognome = s.cognome;
        r.dataset.nomeCompleto = s.cognome + " " + s.nome;
        r.dataset.classe = s.classe;
        r.dataset.room = s.room;
        r.dataset.gruppo = s.gruppo || "";
        r.dataset.percorso = s.percorso || "";
        r.dataset.dinnerno = "0";

        r.innerHTML = `
            <div class="st-header">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span class="room-badge">room ${s.room}</span>
                    <button class="btn-switch" onclick="toggleSwitchTurno(this)">⇄</button>
                </div>
                <span style="font-size:0.75em; color:#666; font-weight:bold;">
                    ${s.classe} ${s.percorso ? ''+s.percorso+'' : ''} ${s.gruppo || ''} ${isLab ? '<span class="lab-badge">LAB</span>' : ''} 
                </span>
            </div>
            <b style="font-size:1.1em">${s.cognome}</b> ${s.nome}
            <div class="inputs">
                <input type="text" placeholder="ESCE" class="in-u" onchange="this.value=normalizzaOrario(this.value); salvaDatiLocale();">
                <input type="text" placeholder="ENTRA" class="in-i" oninput="controllaDinnerAutomatico(this.closest('.student-row'))" onchange="this.value=normalizzaOrario(this.value); salvaDatiLocale();">
            </div>
            <div class="btns">
                <button class="btn-ass" onclick="toggleAssenza(this)">ASSENTE</button>
                <button class="btn-din" onclick="toggleDinnerNo(this)">NON CENA</button>
            </div>`;
        
        if (isAssenteProgrammato(s.cognome, d)) {
            r.classList.add('assente');
            r.dataset.dinnerno = "1";
        }
        
        lista.appendChild(r);
    });
    
    caricaDatiLocale();
    mostraDataReset();
}

function haDirittoAlBus(s) {
    if (!s) return false;
    const classe = s.classe.toUpperCase();
    return !["2A", "2B"].includes(classe) && !classe.includes("P");
}

// --- 2. LOGICA TURNI ---
function turnoStudente(classe, cognome) {
    const oggi = new Date();
    const giornoSettimana = oggi.getDay(); 
    const cgn = cognome.toUpperCase();

    if (OVERRIDE_TURNI_DINNER[cgn] && OVERRIDE_TURNI_DINNER[cgn][giornoSettimana]) {
        return OVERRIDE_TURNI_DINNER[cgn][giornoSettimana];
    }
    return TURNI_DINNER[1].includes(classe) ? 1 : 2;
}

function setTurno(turno) {
    const classi = TURNI_DINNER[turno];
    document.querySelectorAll('.student-row').forEach(r => {
        r.style.display = classi.includes(r.dataset.classe) ? 'block' : 'none';
    });
}

function toggleSwitchTurno(btn) {
    const r = btn.closest('.student-row');
    const cognome = r.dataset.cognome;
    cambiTurnoManuali[cognome] = !cambiTurnoManuali[cognome];
    btn.classList.toggle('modificato');
    salvaDatiLocale();
}

// --- 3. FILTRI ---
function applicaFiltri() {
    const s = document.getElementById('search').value.toLowerCase();
    document.querySelectorAll('.student-row').forEach(r => {
        const testo = (
            r.dataset.cognome + " " +
            r.dataset.nomeCompleto + " " +
            r.dataset.classe + " " +
            r.dataset.room + " " +
            r.dataset.gruppo + " " +
            r.dataset.percorso + " "
        ).toLowerCase();
        r.style.display = testo.includes(s) ? 'block' : 'none';
    });
}

function validaERicerca() {
    const rVal = document.getElementById('roomInput').value;
    const searchInput = document.getElementById('search');
    if (rVal !== "") {
        searchInput.value = ""; 
        document.querySelectorAll('.student-row').forEach(card => {
            card.style.display = (card.dataset.room === rVal) ? 'block' : 'none';
        });
    } else { applicaFiltri(); }
}

function gestisciSaltoStanze(el) {
    let val = parseInt(el.value);
    let old = parseInt(el.oldValue) || 0;
    if (val > 125 && val < 201 && val > old) el.value = 201;
    else if (val > 125 && val < 201 && val < old) el.value = 125;
    el.oldValue = el.value;
}

// --- 4. LOGICA INPUT ---
function normalizzaOrario(valore) {
    valore = valore.trim().toLowerCase().replace(".", ":").replace(",", ":");
    if (/^\d{2}$/.test(valore)) valore += ":00";
    if (/^\d{4}$/.test(valore)) valore = valore.slice(0, 2) + ":" + valore.slice(2);
    return valore;
}

function controllaDinnerAutomatico(riga) {
    const classe = riga.dataset.classe;
    const cognome = riga.dataset.cognome;
    const giornoSettimana = new Date().getDay();
    let entra = normalizzaOrario(riga.querySelector('.in-i').value);
    let ppIn = (ORARI_PP[cognome] && ORARI_PP[cognome][giornoSettimana]) ? normalizzaOrario(ORARI_PP[cognome][giornoSettimana].in) : "";

    let limite = TURNI_DINNER[1].includes(classe) ? "18:30" : "19:15";
    const paroleNo = ["n", "no", "non", "nor", "no rientro", "x"];

    const isTardi = (orario) => orario.includes(":") && orario > limite;
    const isNoRientro = (orario) => paroleNo.includes(orario);

    if (riga.classList.contains('assente') || isNoRientro(entra) || isNoRientro(ppIn) || isTardi(entra) || isTardi(ppIn)) {
        riga.dataset.dinnerno = "1";
        riga.classList.add('dinner-no');
    } else {
        riga.dataset.dinnerno = "0";
        riga.classList.remove('dinner-no');
    }
}

function toggleAssenza(btn) {
    const r = btn.closest('.student-row');
    r.classList.toggle('assente');
    btn.classList.toggle('active-ass');
    controllaDinnerAutomatico(r);
    salvaDatiLocale();
}

function toggleDinnerNo(btn) {
    const r = btn.closest('.student-row');
    r.dataset.dinnerno = r.dataset.dinnerno === "1" ? "0" : "1";
    r.classList.toggle('dinner-no');
    btn.classList.toggle('active-din');
    salvaDatiLocale();
}

// --- 5. STAMPE ---
function generaPopUpStampaDinner() {
    let a1=0, p1=0, a2=0, p2=0, n1=[], n2=[], switch1=[], switch2=[];
    const oggi = new Date();
    const giornoSett = oggi.getDay();
    const oraEsatta = oggi.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const dataOggi = oggi.toLocaleDateString('it-IT');
    const dataTestuale = document.getElementById('todayDate').innerText;

    document.querySelectorAll('.student-row').forEach(r => {
        const cognome = r.dataset.cognome;
        const nomeCompleto = r.dataset.nomeCompleto;
        let turnoOriginale = TURNI_DINNER[1].includes(r.dataset.classe) ? 1 : 2;
        let turnoEffettivo = turnoStudente(r.dataset.classe, cognome);

        if (cambiTurnoManuali[cognome]) turnoEffettivo = (turnoEffettivo === 1) ? 2 : 1;

        if (turnoEffettivo !== turnoOriginale) {
            const nota = (turnoEffettivo === 1) ? " (da 2° a 1°)" : " (da 1° a 2°)";
            if(turnoEffettivo === 1) switch1.push(nomeCompleto + nota);
            else switch2.push(nomeCompleto + nota);
        }

        const isLab = isStudenteInLabOggi(r.dataset.classe, r.dataset.gruppo, oggi);
        const isPPNoCena = isPPNoDinnerOggi(cognome, giornoSett);
        const escluso = isLab || isPPNoCena || r.classList.contains('assente') || r.dataset.dinnerno === "1";

        if (turnoEffettivo === 1) {
            if (escluso) { a1++; n1.push(nomeCompleto + (isLab ? " (LAB)" : "")); } else p1++;
        } else {
            if (escluso) { a2++; n2.push(nomeCompleto + (isLab ? " (LAB)" : "")); } else p2++;
        }
    });

    const testiPermessi = {
        1: "LAB 2IeFP - PERMESSI: Tessarin NO dinner / Casalicchio turno ore 18 / Bombonato, Paonessa turno ore 19:15 / TENERE PER Querio, Pignatelli, Menaldino, Chessa dopo i turni",
        2: "LAB 5A-5B - PERMESSI: Chen, Commod NO dinner / Casalicchio, Clerin turno ore 18 / TENERE PER Querio, Lazier, Lunardi, Paonessa, Gaspard dopo i turni",
        3: "LAB 2B - PERMESSI: Berruti S, D'Agostino, Giovannelli P NO dinner / Casalicchio dinner ore 18 / Saitta, Bombonato, Paonessa turno ore 19:15 / TENERE PER Querio, Pignatelli, Chessa dopo i turni",
        4: "LAB 2A - PERMESSI: Berruti A, Chen NO dinner / Casalicchio, Clerin turno ore 18 / Bombonato, Paonessa turno ore 19:15 / TENERE PER Querio, Menaldino, Chessa dopo i turni"
    };
    const notaGiornoCorrente = testiPermessi[giornoSett] || "";

    const popup = window.open('', '_blank', 'width=900,height=800');
    popup.document.write(`
        <html><head><title>Riepilogo Dinner - ${dataTestuale}</title><style>
            body { font-family: sans-serif; padding: 40px; position: relative; }
            h2 { text-align: center; text-transform: uppercase; margin-top: 20px; }
            .timestamp { position: absolute; top: 10px; right: 20px; font-size: 0.8em; color: #666; }
            .date { text-align: center; font-size: 1.2em; margin-bottom: 20px;}
            .editable-notes { width: 100%; border: 1px dashed #ccc; font-size: 1.1em; font-weight: bold; text-align: center; text-transform: uppercase; padding: 10px; margin-bottom: 20px;}
            .section { margin-bottom: 30px; border-left: 6px solid #333; padding-left: 20px; }
            .stats-row { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; }
            input { font-size: 1.5em; font-weight: bold; width: 60px; border: none; border-bottom: 2px solid #000; text-align: center; background: transparent; }
            .nomi, .cambi { font-size: 0.85em; color: #444; font-style: italic; margin-top: 10px; line-height: 1.4; }
            .no-print { margin-top: 30px; display: flex; justify-content: center; }
            @media print { .no-print { display: none; } .editable-notes { border: none; } }
        </style></head><body>
            <div class="timestamp">aggiornamento ${dataOggi} ore ${oraEsatta}</div>
            <h2>Riepilogo Dinner</h2>
            <div class="date">${dataTestuale}</div>
            <div class="no-print"><button onclick="window.print()" style="padding:15px 50px; background:#27ae60; color:white; font-weight:bold; border-radius:80px; border:none; cursor:pointer; font-size:0.9em;">STAMPARE IN FORMATO A4</button></div>
            <textarea class="editable-notes" rows="2">${notaGiornoCorrente}</textarea>
            <div class="section">
                <h3>1° DINNER ore 18:30</h3>
                <div class="stats-row">
                    <span>Assenti: <input type="number" value="${a1}"></span>
                    <span>Presenti: <input type="number" value="${p1}"></span>
                    <span>+ EDU: <input type="number" value="2"></span>
                </div>
                <div class="nomi"><b>Esclusi:</b> ${n1.length ? n1.join(', ') : 'Nessuno'}</div>
                <div class="cambi"><b>Cambi Turno:</b> ${switch1.length ? switch1.join(', ') : 'Nessuno'}</div>
            </div>
            <div class="section">
                <h3>2° DINNER ore 19:15</h3>
                <div class="stats-row">
                    <span>Assenti: <input type="number" value="${a2}"></span>
                    <span>Presenti: <input type="number" value="${p2}"></span>
                    <span>+ EDU: <input type="number" value="2"></span>
                </div>
                <div class="nomi"><b>Esclusi:</b> ${n2.length ? n2.join(', ') : 'Nessuno'}</div>
                <div class="cambi"><b>Cambi Turno:</b> ${switch2.length ? switch2.join(', ') : 'Nessuno'}</div>
            </div>
        </body></html>`);
    popup.document.close();
}

function generaPopUpStampaConvitto() {
    const dataStampa = document.getElementById('todayDate').innerText;
    const oraStampa = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const dataOggiStampa = new Date().toLocaleDateString('it-IT');
    const giornoSettimana = new Date().getDay();
    const camere = {};

    document.querySelectorAll('.student-row').forEach(r => {
        const room = r.dataset.room || "---";
        const cognome = r.dataset.cognome;
        let ppOut = "", ppIn = "";
        if (ORARI_PP[cognome] && ORARI_PP[cognome][giornoSettimana]) {
            ppOut = ORARI_PP[cognome][giornoSettimana].out;
            ppIn = ORARI_PP[cognome][giornoSettimana].in;
        }
        
        const sOriginale = studenticonvittori.find(st => st.cognome === cognome);

        if (!camere[room]) camere[room] = [];
        camere[room].push({
            classe: r.dataset.classe, percorso: r.dataset.percorso, cognome: cognome,
            dinnerno: r.dataset.dinnerno, presente: !r.classList.contains('assente'),
            oraU: r.querySelector('.in-u').value, oraI: r.querySelector('.in-i').value,
            ppOut: ppOut, ppIn: ppIn, gruppo: r.dataset.gruppo,
            bus: haDirittoAlBus(sOriginale)
        });
    });

    const camereOrdinate = Object.keys(camere).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const popup = window.open('', '_blank', 'width=1200,height=800');

    popup.document.write(`
        <html><head><title>Riepilogo Convitto - ${dataStampa}</title><style>
            @page { size: A3 portrait; margin: 0.3cm; }
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; color: #000; }
            h2 { text-align: center; text-transform: uppercase; font-size: 1.1em; margin: 6px 0; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 10px; }
            th, td { border: 1px solid #000; padding: 4px 2px; text-align: center; font-size: 0.62em; overflow: hidden; }
            th { background: #f2f2f2; font-weight: bold; }
            .room-header { background: #eee; font-weight: bold; width: 45px; }
            .border-bottom-bold { border-bottom: 2.5px solid #000 !important; }
            .border-dashed { border-bottom: 1px dashed #999 !important; }
            .col-cognome { text-align: center; width: 130px; text-transform: uppercase; }
            .bg-gray { background: #f9f9f9; }
            .page-break { page-break-after: always; }
            .footer-timestamp { text-align: right; font-size: 0.75em; margin-top: 15px; font-style: italic; color: #555; }
            .no-print { text-align: center; margin: 20px; }
            @media print { .no-print { display: none; } }
        </style></head><body>
            <div class="no-print"><button onclick="window.print()" style="padding:15px 50px; background:#27ae60; color:white; font-weight:bold; border-radius:80px; border:none; cursor:pointer;">STAMPARE IN FORMATO A3</button></div>
            <h2>MASCHILE - piano 1° - ${dataStampa}</h2>
            <table>
                <thead>
                    <tr>
                        <th>Room</th><th>Classe</th><th class="col-cognome">Cognome</th><th>Presente</th><th>Assente</th><th>Uscita</th><th>Ingresso</th><th>PP Uscita</th><th>PP Rientro</th><th>Dinner NO</th><th>Notte SI</th><th>Notte NO</th><th>7:30</th>
                    </tr>
                </thead>
                <tbody>
                    ${camereOrdinate.map((room) => {
                        let html = "";
                        html += camere[room].map((s, idx) => {
                            const isLastRow = idx === camere[room].length - 1;
                            const bClass = isLastRow ? 'class="border-bottom-bold"' : 'class="border-dashed"';
                            const bClassGray = isLastRow ? 'class="border-bottom-bold bg-gray"' : 'class="border-dashed bg-gray"';
                            return `<tr>
                                ${idx === 0 ? `<td rowspan="${camere[room].length}" class="room-header border-bottom-bold">${room}</td>` : ''}
                                <td ${bClass}>${s.classe} ${s.percorso || ''}</td>
                                <td ${bClass} class="col-cognome"><b>${s.cognome}</b> ${s.gruppo ? '('+s.gruppo+')' : ''}</td>
                                <td ${bClass}>${s.presente ? 'X' : ''}</td><td ${bClass}>${!s.presente ? 'X' : ''}</td>
                                <td ${bClassGray}>${s.oraU}</td><td ${bClass}>${s.oraI}</td>
                                <td ${bClassGray}><b>${s.ppOut}</b></td><td ${bClass}><b>${s.ppIn}</b></td>
                                <td ${bClassGray}>${s.dinnerno === "1" ? "X" : ""}</td><td ${bClass}></td><td ${bClassGray}></td>
                                <td ${bClass}>${s.bus ? '⭕' : ''}</td>
                            </tr>`;
                        }).join('');
                        if (room === "125") {
                            html += `</tbody></table><div class="page-break"></div><h2>FEMMINILE - piano 2° - ${dataStampa}</h2><table><thead><tr><th>Room</th><th>Classe</th><th class="col-cognome">Cognome</th><th>Presente</th><th>Assente</th><th>Uscita</th><th>Ingresso</th><th>PP Uscita</th><th>PP Rientro</th><th>Dinner NO</th><th>Notte SI</th><th>Notte NO</th><th>7:30</th></tr></thead><tbody>`;
                        }
                        return html;
                    }).join('')}
                </tbody>
            </table>
            <div class="footer-timestamp">aggiornamento ${dataOggiStampa} ore ${oraStampa}</div>
        </body></html>`);
    popup.document.close();
}

// --- 6. GESTIONE ASSENZE PROGRAMMATE ---
function salvaAssenzeProgrammate() {
    localStorage.setItem('assenzeProgrammate', JSON.stringify(assenzeProgrammate));
    if (typeof syncAssenzeToFirebase === 'function') {
        syncAssenzeToFirebase();
    }
}
 
function caricaAssenzeProgrammate() {
    const saved = localStorage.getItem('assenzeProgrammate');
    assenzeProgrammate = saved ? JSON.parse(saved) : {};
}

function isAssenteProgrammato(cognome, data) {
    const lista = assenzeProgrammate[cognome.toUpperCase()];
    if (!lista) return false;

    const oggi = new Date(data.toISOString().split('T')[0]);

    return lista.some(periodo => {
        const dal = new Date(periodo.dal);
        const al = new Date(periodo.al);
        return oggi >= dal && oggi <= al;
    });
}

function aggiungiAssenza() {
    const cognomeSel = document.getElementById('selectStudente').value;
    const classeSel = document.getElementById('selectClasse').value;
    const dal = document.getElementById('dataDal').value;
    const al = document.getElementById('dataAl').value;

    if (!dal || !al) return alert("Seleziona entrambe le date");

    let studentiDaAggiornare = [];

    if (classeSel) {
        studentiDaAggiornare = studenticonvittori
            .filter(s => s.classe === classeSel)
            .map(s => s.cognome.toUpperCase());
    } else if (cognomeSel) {
        studentiDaAggiornare = [cognomeSel.toUpperCase()];
    } else {
        return alert("Seleziona uno studente o una classe");
    }

    studentiDaAggiornare.forEach(cognome => {
        if (!assenzeProgrammate[cognome]) {
            assenzeProgrammate[cognome] = [];
        }
        assenzeProgrammate[cognome].push({ dal, al });
    });

    salvaAssenzeProgrammate();
    renderListaAssenze();
    if (typeof syncAssenzeToFirebase === 'function') syncAssenzeToFirebase();
}

function renderListaAssenze() {
    const container = document.getElementById('listaAssenze');
    if (!container) return;

    container.innerHTML = Object.entries(assenzeProgrammate).map(([cognome, periodi]) => {
        return `
            <div style="margin-bottom:10px;">
                <b>${cognome}</b>
                ${periodi.map((p, i) => `
                    <div style="font-size:0.8em;">
                        ${p.dal} → ${p.al}
                        <button onclick="rimuoviAssenza('${cognome}', ${i})">❌</button>
                    </div>
                `).join('')}
            </div>
        `;
    }).join('');
}

function rimuoviAssenza(cognome, index) {
    assenzeProgrammate[cognome].splice(index, 1);
    if (assenzeProgrammate[cognome].length === 0) {
        delete assenzeProgrammate[cognome];
    }
    salvaAssenzeProgrammate();
    renderListaAssenze();
    if (typeof syncAssenzeToFirebase === 'function') syncAssenzeToFirebase();
}

// --- 7. PERMESSI E UTILITY ---
function popolaListaPermessi() {
    const container = document.getElementById('listaPermessiContent');
    const giorniSettimana = ["", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì"];
    const studentiPP = Object.keys(ORARI_PP).sort();
    if (studentiPP.length === 0) { container.innerHTML = "<p>Nessun orario PP.</p>"; return; }
    container.innerHTML = studentiPP.map(cognome => {
        const orari = ORARI_PP[cognome];
        let dettagli = Object.keys(orari).map(g => `<div style="font-size:0.8em; margin-left:10px;"><b style="color:var(--p)">${giorniSettimana[g].substring(0,2)}:</b> ${orari[g].out} > ${orari[g].in}</div>`).join('');
        return `<div style="margin-bottom:12px; border-bottom:1px solid #eee;"><b>${cognome}</b>${dettagli}</div>`;
    }).join('');
}

function popolaSelectStudenti() {
    const sel = document.getElementById('selectStudente');
    if (!sel) return;

    const gruppi = {};
    studenticonvittori.forEach(s => {
        if (!gruppi[s.classe]) gruppi[s.classe] = [];
        gruppi[s.classe].push(s);
    });

    let html = `<option value="">-- Seleziona Nome --</option>`;
    Object.keys(gruppi).sort().forEach(classe => {
        html += `<optgroup label="${classe}">`;
        gruppi[classe].forEach(s => {
            html += `<option value="${s.cognome}">${s.cognome} ${s.nome}</option>`;
        });
        html += `</optgroup>`;
    });
    sel.innerHTML = html;
}

function popolaSelectClassi() {
    const sel = document.getElementById('selectClasse');
    if (!sel) return;
    const classiUniche = [...new Set(studenticonvittori.map(s => s.classe))].sort();
    sel.innerHTML = `<option value="">-- Seleziona Classe --</option>` + classiUniche.map(c => `<option value="${c}">${c}</option>`).join('');
}

function togglePanel() {
    const panel = document.getElementById('sidePanel');
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
    const dataKey = dataOggetto.toLocaleDateString('it-IT');
    const giorno = dataOggetto.getDay();
    const gLab = CALENDARIO_GRUPPI_DINNER[dataKey];
    if ({ 1: ["2P"], 3: ["2B"], 4: ["2A"] }[giorno]?.includes(classe)) return true;
    if ((classe === "5A" || classe === "5B") && gLab) return (gLab === "gr1" && gruppo === "G1") || (gLab === "gr2" && gruppo === "G2");
    return false;
}

function isPPNoDinnerOggi(cognome, giorno) { 
    return ASSENTI_PERMESSO[giorno]?.includes(cognome.toUpperCase()); 
}

function updateClock() { 
    document.getElementById('digitalClock').innerText = new Date().toLocaleTimeString('it-IT'); 
}

function salvaDatiLocale() {
    const dati = {};
    document.querySelectorAll('.student-row').forEach(r => {
        dati[r.dataset.cognome] = { 
            esce: r.querySelector('.in-u').value, 
            entra: r.querySelector('.in-i').value, 
            assente: r.classList.contains('assente'), 
            dinnerno: r.dataset.dinnerno, 
            switch: cambiTurnoManuali[r.dataset.cognome] || false 
        };
    });
    localStorage.setItem('datiConvitto', JSON.stringify(dati));
    
    if (typeof triggerSync === 'function') {
        triggerSync();
    }
}

function caricaDatiLocale() { 
    const dati = JSON.parse(localStorage.getItem('datiConvitto') || "{}");
    document.querySelectorAll('.student-row').forEach(r => {
        const d = dati[r.dataset.cognome];
        if (d) {
            r.querySelector('.in-u').value = d.esce || "";
            r.querySelector('.in-i').value = d.entra || "";
            if (d.assente) { 
                r.classList.add('assente'); 
                const btnAss = r.querySelector('.btn-ass');
                if (btnAss) btnAss.classList.add('active-ass');
            } else {
                r.classList.remove('assente');
                const btnAss = r.querySelector('.btn-ass');
                if (btnAss) btnAss.classList.remove('active-ass');
            }
            if (d.dinnerno === "1") { 
                r.classList.add('dinner-no'); 
                const btnDin = r.querySelector('.btn-din');
                if (btnDin) btnDin.classList.add('active-din');
                r.dataset.dinnerno = "1"; 
            } else {
                r.classList.remove('dinner-no');
                const btnDin = r.querySelector('.btn-din');
                if (btnDin) btnDin.classList.remove('active-din');
                r.dataset.dinnerno = "0";
            }
        }
        if (cambiTurnoManuali[r.dataset.cognome]) { 
            const btnSwitch = r.querySelector('.btn-switch');
            if (btnSwitch) btnSwitch.classList.add('modificato');
        }
    });
}

function mostraDataReset() {
    const dReset = localStorage.getItem('dataUltimoReset');
    if (dReset) document.getElementById('info-reset').innerText = `Ultimo aggiornamento: ${dReset}`; 
}

function cancellaNote() {
    if(confirm("Vuoi cancellare definitivamente tutte le note?")) {
        const noteInput = document.getElementById('dailyNotes');
        if (noteInput) {
            noteInput.value = '';
            localStorage.setItem('note_convitto', '');
            if (typeof syncNoteToFirebase === 'function') syncNoteToFirebase();
        }
    }
}

// --- AUTHENTICATION ---
const auth = firebase.auth();

function login() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    firebase.auth().signInWithEmailAndPassword(email, password)
        .then(() => {
            document.getElementById('loginScreen').style.display = 'none';
            if (typeof startAutoSave === 'function') startAutoSave();
        })
        .catch((error) => {
            document.getElementById('loginError').innerText = "Email o password errati";
            console.error(error);
        });
}

firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        console.log("Utente autenticato:", user.email);
        document.getElementById('loginScreen').style.display = 'none';
        init();
        if (typeof startAutoSave === 'function') startAutoSave();
    } else {
        console.log("Utente NON autenticato");
        document.getElementById('loginScreen').style.display = 'flex';
        if (typeof stopAutoSave === 'function') stopAutoSave();
    }
});

function logout() {
    if (typeof stopAutoSave === 'function') stopAutoSave();
    firebase.auth().signOut()
        .then(() => {
            location.reload();
        });
}

window.onload = () => {};