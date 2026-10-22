# Passaggio di consegne — 17 ottobre 2026

## Stato consegnato

GDiary v2.0.3. Sorgenti estratti dalla cartella storicamente chiamata BulletJournal-v3; il nome precedente non indica la versione corrente. Nessun accesso ai dati dell'utente, nessun deployment Google e nessuna creazione di repository GitHub eseguiti durante questo passaggio.

Ultime modifiche applicative:

- v2.0.1: numero di release completo; preferenze browser separate per apertura di inizio/fine giornata e abitudini.
- v2.0.2: frecce Espandi/Comprimi coerenti con Mostra/Nascondi dei task e spazio corretto accanto al menu mobile.
- v2.0.3: cinque riepiloghi settimanali compatti dei task; «Rivedi nel diario» attiva i filtri pertinenti e «Torna al checkup» riapre la settimana. Rimossi i vecchi comandi di gestione task dal checkup. Giorno pianificato e intervalli di lavorazione sovrapposti alla settimana sono inclusi.

Preparazione repository: test browser resi portabili tramite CHROME_PATH o Chromium Playwright; immagini di test dirette ad artifacts quando prima dipendevano da cartelle esterne; documentazione storica separata. Nessun cambiamento funzionale aggiuntivo all'app.

## Vincoli da conservare

- Una sola identità per voce: task nel diario, nei progetti e nei filtri sono gli stessi record.
- Salvataggio Sheets prima della sincronizzazione Docs. «In attesa» può riferirsi a Docs, non a una perdita del salvataggio Sheets.
- Titolo nota facoltativo, titolo task richiesto e su una sola riga.
- Conservare bozze, formattazione, protezione dai conflitti e privacy anche cambiando vista o dopo errori parziali di salvataggio.
- Le preferenze locali non devono sporcare i dati del diario.
- Non pubblicare automaticamente né cambiare ROOT_FOLDER_ID, permessi o dati reali senza una richiesta pertinente.

## Come riprendere con un assistente

Aprire questa cartella come progetto e chiedere: «Leggi README.md, docs/HANDOFF.md, docs/SPECIFICHE.md e docs/ARCHITETTURA.md. La base è v2.0.3. Prima di cambiare codice verifica lo stato dei file e usa Demo.html per i test locali. L'attività da svolgere è: …».

La conversazione precedente non è necessaria per compilare il progetto; le discussioni future sono riassunte in ROADMAP.md. I documenti in history possono descrivere funzioni o decisioni superate. Non eseguire i loro comandi alla cieca.

## Stato delle ipotesi locali

Aggiornamento 22 ottobre 2026: implementata localmente la
[SPEC-001](specs/001-tracing-prestazioni.md), diagnostica prestazioni opzionale
in Impostazioni con export JSON filtrato, misure RPC/backend/rendering e batch
di salvataggio correlati. Pubblicazione autorizzata eseguita il 22 ottobre:
deployment esistente aggiornato alla versione Apps Script 63, stesso URL.
Inclusa la correzione dell'allineamento dei comandi nota/task. Il collaudo
autenticato e la raccolta della baseline reale restano da effettuare.

IndexedDB, sincronizzazione offline bidirezionale, PWA ed Electron sono stati discussi, ma NON implementati. Non sostituire il salvataggio corrente basandosi soltanto sulla discussione. La prossima eventuale fase deve validare persistenza e identità dell'archivio nel contesto Apps Script.
