# Guida migrazione dati su Firebase — Convitto 2025

## Cosa cambia

| Prima | Dopo |
|---|---|
| `studenti_25-26.js` pubblico su GitHub | JSON protetto su Firebase Realtime Database |
| `permessi.js` pubblico su GitHub | Stesso JSON, nodo `permessi/` |
| `interni.js` / `esterni.js` separati | Un solo array `studenti` con campo `room` |
| `convittori.js` (filtro client-side) | Filtro fatto da `auth.js` → `getConvittori()` |
| Login solo su cruscotto e roomcloud | **Login unico per tutto il sito** via `login.html` |
| Sessione per-pagina | **Sessione persistente**: login una volta, accesso ovunque |

---

## Step 1 — Carica `convitto-data.json` su Firebase

1. Apri la [Firebase Console](https://console.firebase.google.com)
2. Seleziona il progetto **cruscotto-722bc** (o quello che vuoi usare)
3. Vai su **Realtime Database → Dati**
4. Clicca i tre puntini `⋮` → **Importa JSON**
5. Carica il file `convitto-data.json` fornito in questo pacchetto
6. I dati verranno inseriti sotto il nodo radice `/convitto-data`

> ⚠️ Se il database contiene già dati operativi (assenze, note, ecc.)
> importa SOLO il nodo `/convitto-data`, non sovrascrivere la radice.
> Puoi farlo importando su un nodo specifico dal pannello.

---

## Step 2 — Configura le Security Rules

Nel pannello Firebase → **Realtime Database → Regole**, incolla:

```json
{
  "rules": {
    "convitto-data": {
      ".read":  "auth != null",
      ".write": false
    },
    "assenze": {
      ".read":  "auth != null",
      ".write": "auth != null"
    },
    "note": {
      ".read":  "auth != null",
      ".write": "auth != null"
    },
    "roomcloud": {
      ".read":  "auth != null",
      ".write": "auth != null"
    }
  }
}
```

Questo garantisce che:
- Solo utenti autenticati possono leggere i dati studenti/permessi
- Solo utenti autenticati possono scrivere assenze, note, stati roomcloud
- Nessun visitatore anonimo può accedere a nulla

---

## Step 3 — Crea gli utenti autorizzati

In Firebase Console → **Authentication → Users → Aggiungi utente**

Crea un account per ogni educatore autorizzato:
- Email: indirizzo personale o di servizio
- Password: scegli una password sicura e comunicala all'interessato

---

## Step 4 — Deploy dei file

Sostituisci nel repository GitHub:

**File NUOVI da aggiungere:**
```
login.html              ← pagina di login unica
js/auth.js              ← modulo autenticazione condiviso
convitto-data.json      ← solo per riferimento/backup, NON serve online
```

**File da RIMUOVERE dal repo** (i dati sono ora su Firebase):
```
js/studenti_25-26.js    ← eliminare
js/convittori.js        ← eliminare
js/interni.js           ← eliminare
js/esterni.js           ← eliminare
js/permessi.js          ← eliminare
```

**File invariati** (logica operativa, non toccati):
```
js/cruscotto-script.js
js/dashboard-script.js
js/bus-8-script.js
js/bus-16-script.js
js/dinner-script.js
js/rooming-script.js
js/transfer-script.js
js/uscita-script.js
js/firebase-cruscotto-config.js
js/firebase-roomcloud-config.js
```

---

## Come funziona il login unico

```
Utente apre qualsiasi pagina
        ↓
auth.js controlla onAuthStateChanged
        ↓
    Autenticato? ─── SÌ ──→ pagina visibile, dati caricati da Firebase
        │
        NO
        ↓
redirect a login.html?redirect=nomepagina.html
        ↓
Utente inserisce email + password
        ↓
Firebase Auth → token salvato nel browser (persistente)
        ↓
redirect alla pagina originale
        ↓
Token valido per giorni/settimane → nessun login ripetuto
```

---

## Come aggiornare i dati per l'anno prossimo

1. Modifica `convitto-data.json` localmente
2. Carica il JSON aggiornato su Firebase (sovrascrive solo il nodo `convitto-data`)
3. Nessun push su GitHub necessario per i dati

---

## Struttura del JSON su Firebase

```
/
├── convitto-data/
│   ├── studenti/          [array 283 studenti]
│   │   └── {0..282}: { id, cognome, nome, classe, room, percorso?, gruppo? }
│   ├── permessi/
│   │   ├── LAB_PRANZO
│   │   ├── TURNI_DINNER
│   │   ├── LAB_DINNER
│   │   ├── OVERRIDE_TURNI_DINNER
│   │   ├── ORARI_PP
│   │   ├── ASSENTI_PERMESSO
│   │   └── CALENDARIO_GRUPPI_DINNER
│   └── roomcloud/
│       └── stanze_speciali/   [room 112 + foresterie]
├── assenze/               [dati operativi cruscotto]
├── note/                  [note giornaliere]
└── roomcloud/
    └── assenze/           [stati roomcloud]
```
