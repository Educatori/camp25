// 1. FUNZIONE DI LOGIN
function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    if (!email || !password) {
        errorDiv.innerText = "Inserisci sia email che password.";
        return;
    }

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Login effettuato con successo
            errorDiv.innerText = "";
            document.getElementById('loginScreen').style.display = 'none';
            console.log("👋 Benvenuto Amministratore:", userCredential.user.email);
            
            // Avvia il caricamento dei dati dal database
            inizializzaDatiDalCloud();
        })
        .catch((error) => {
            console.error("Errore di login:", error);
            errorDiv.innerText = "Credenziali errate o accesso negato.";
        });
}

// 2. FUNZIONE DI LOGOUT
function logout() {
    auth.signOut().then(() => {
        // Mostra di nuovo la schermata di login e ricarica la pagina per pulire la memoria
        document.getElementById('loginScreen').style.display = 'flex';
        window.location.reload();
    });
}

// 3. CONTROLLO STATO AUTENTICAZIONE (Resta loggato se aggiorni la pagina)
auth.onAuthStateChanged((user) => {
    if (user) {
        // L'utente è già loggato
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('connection-status').innerHTML = "🟢 Connesso: Admin";
        inizializzaDatiDalCloud();
    } else {
        // Nessun utente loggato, mostra il blocco di login
        document.getElementById('loginScreen').style.display = 'flex';
    }
});

// 4. RECUPERO DATI DA FIREBASE
function inizializzaDatiDalCloud() {
    // Comunica al cruscotto che stiamo scaricando i dati
    document.getElementById('info-reset').innerText = "Scaricamento dati in corso...";

    // Ascolta i dati da Firebase in tempo reale
    db.ref('archivio_campus').on('value', (snapshot) => {
        const datiCloud = snapshot.val();
        
        if (datiCloud) {
            console.log("📊 Dati ricevuti da Firebase:", datiCloud);
            
            // SOVRASCRIVIAMO LE VECCHIE VARIABILI STATICHE DEI TUOI FILE JS
            // In questo modo le tue funzioni di stampa leggeranno i dati freschi dal cloud!
            window.tuttiStudenti = datiCloud.studenti || [];
            window.ORARI_PP = datiCloud.orari_pp || {};
            window.OVERRIDE_TURNI_DINNER = datiCloud.override_turni || {};
            window.ASSENTI_PERMESSO = datiCloud.assenti_permesso || {};
            window.CALENDARIO_GRUPPI_DINNER = datiCloud.calendario_gruppi || {};
            window.LAB_PRANZO = datiCloud.lab_pranzo || {};
            window.TURNI_DINNER = datiCloud.turni_dinner || {};
            window.LAB_DINNER = datiCloud.lab_dinner || {};

            // Aggiorna l'orario di ultimo aggiornamento nel tuo HTML
            const oraAttuale = new Date().toLocaleTimeString('it-IT');
            document.getElementById('info-reset').innerText = `Ultimo aggiornamento cloud: oggi alle ${oraAttuale}`;

            // Esegui la funzione principale del tuo script per ridisegnare l'interfaccia con i nuovi dati
            if (typeof applicaFiltri === 'function') {
                applicaFiltri();
            }
        } else {
            document.getElementById('info-reset').innerText = "Database vuoto. Inserire i dati iniziali.";
        }
    }, (error) => {
        console.error("Errore nel recupero dati (Permessi insufficienti?):", error);
        document.getElementById('info-reset').innerText = "Errore di sincronizzazione: Accesso Negato.";
    });
}