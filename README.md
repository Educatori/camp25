# Convitto 2025 — Istruzioni deployment restyling

## File modificati

### CSS (cartella `css/`)
| File | Ruolo |
|------|-------|
| `convitto-theme.css` | ⭐ NUOVO — tema base condiviso da tutte le pagine |
| `dashboard-style.css` | Restyling dark (usato da dashboard.html e cruscotto.html) |
| `cruscotto-style.css` | Identico a dashboard-style.css |
| `bus-style.css` | Restyling dark (bus-8 e bus-16) |
| `dinner-style.css` | Restyling dark |
| `rooming-style.css` | Restyling dark |
| `transfer-style.css` | Restyling dark |
| `uscita-style.css` | Restyling dark |

### HTML (root)
Tutti gli HTML sono stati aggiornati per:
1. Importare `css/convitto-theme.css` **prima** del CSS specifico
2. Aggiungere `<img src="assets/Logo.png" class="print-logo">` nell'header (visibile solo in stampa)
3. Titoli ripuliti (rimossi i `••••`)
4. Login screen del cruscotto adattato al tema dark

## Come fare il deploy su GitHub

1. Sostituisci i file HTML nella root del repo con quelli di questa cartella
2. Sostituisci i file in `css/` con quelli di questa cartella
3. Aggiungi il file `assets/Logo.png` (già preparato)
4. I file in `js/` non vanno toccati — nessuna modifica alla logica

## Struttura file attesa nel repo

```
convitto2025/
├── index.html
├── bus-8.html
├── bus-16.html
├── cruscotto.html
├── dashboard.html
├── dashboard_ADRI.html
├── dinner.html
├── presenze-dinner.html   ← alias di dinner.html
├── rooming.html
├── transfer.html
├── uscita.html
├── assets/
│   └── Logo.png           ← il tuo logo (già pronto)
├── css/
│   ├── convitto-theme.css ← NUOVO, va aggiunto
│   ├── bus-style.css
│   ├── cruscotto-style.css
│   ├── dashboard-style.css
│   ├── dinner-style.css
│   ├── rooming-style.css
│   ├── transfer-style.css
│   └── uscita-style.css
└── js/
    └── (invariati)
```

## Note sul tema

- **Font**: DM Sans (Google Fonts, caricato da CDN) + JetBrains Mono per orologi e codici
- **Sfondo**: `#0f1117` (quasi nero blu)
- **Accenti**: blu elettrico `#4f8ef7` + verde acqua `#38d9a9`
- **Logo in stampa**: `class="print-logo"` — visibile solo con `@media print`, nascosto a schermo
- Tutte le variabili CSS (`--accent`, `--ok`, `--absent`, ecc.) sono definite in `convitto-theme.css`
  e sovrascritte dove necessario nei file specifici
