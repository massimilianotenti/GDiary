# Verifica salvataggi incrementali — 23 ottobre 2026

Implementazione del passo B della SPEC-002, pubblicata su richiesta il
23 ottobre 2026 (v2.0.4, Apps Script 70). Collaudo autenticato successivo
completato su richiesta; contenuti confrontati solo in memoria del browser.

## Protocollo

saveDay/saveWeek/setHabitLog restituiscono `delta: true`, `entries: []`,
`commonIncluded: false` e `commonUpserts` con il solo record scritto.
Nessuna copia aggiuntiva in days/weeks/commonPatch. Ogni record comprende
chiave stabile, valori canonici e updatedAt; per HabitLogs comprende checklist
e stato derivato. Le scritture, i lock e i controlli versione sono invariati.

applyCommonChanges distingue le sostituzioni commonPatch dagli upsert per
chiave (date/week/key), conserva record estranei e campi assenti e non duplica
record se una risposta viene applicata più volte. Usato da run, dal tracker
nel diario e dal salvataggio delle riflessioni del diario continuo. Nessuna
lettura completa aggiunta dopo il salvataggio. Le giornate restano salvate
separatamente, con conferma e rimozione delle bozze solo dopo risposta remota.

## Verifiche eseguite

- npm run build: positivo; bootstrap UTF-8 e staging dei sei file conservati.
- npm test: positivo, inclusi conflitti, idempotenza, contenuti e pipeline.
- npm run test:incremental: positivo. Risposte di Days/Weeks/HabitLogs di
  dimensione invariata con 200 record estranei aggiunti; versioni e rifiuto
  delle scritture obsolete; preservazione campi/formattazione; merge ripetuto
  senza duplicati; percorso reale run/saveDay della Demo e registrazione
  abitudini senza getState/getCommonState compensativi.
- npm run test:release: positivo.
- npm run test:tracing: positivo.
- P85 settimana: positivo, incluso errore/riprova e tracker.
- P80 stati abitudini: positivo, incluse microazioni e stato derivato.
- P75 riflessioni: positivo, inclusi campi e formattazione.

Test browser eseguiti fuori sandbox perché l'avvio Chromium al suo interno
è bloccato. Tutti usano Demo.html e servizi simulati.

Ripresa dopo interruzione: rieseguiti build, npm test, test:incremental,
test:release, test:tracing e i test browser P85/P80/P75, tutti con esito
positivo. Anche `git diff --check` superato. Nessun nuovo deploy.

## Limiti

Le prove locali dimostrano la riduzione strutturale della risposta, non un
guadagno di latenza. Il collaudo reale sotto riporta tre misure singole,
senza confronto temporale con la versione precedente. Le letture interne
delle tabelle necessarie a validazione e conflitti restano invariate.
Frontend e backend del nuovo protocollo vanno pubblicati insieme.
Il collaudo autenticato sotto copre record esistenti, senza nuovi contenuti.

## Pubblicazione autorizzata

Prima del deploy rieseguiti build, npm test, test:incremental, test:release,
test:tracing, test:progressive e P85/P80/P75: tutti positivi. Superati anche
tutti i controlli aggiuntivi della procedura di deploy. Backup dei sei file
remoti fuori repository e confronto di HEAD/versione 69 con la base Git:
nessuna divergenza. Pubblicati insieme frontend e backend sul deployment
esistente, mantenendo URL e accesso MYSELF/USER_DEPLOYING. Verifica remota
successiva: versione 70 attiva e sei sorgenti identici allo staging.
ROOT_FOLDER_ID ricavato dal backup e passato solo tramite ambiente, senza
modificare il segnaposto nei sorgenti. Nessun setupDrive o salvataggio reale;
il collaudo autenticato delle operazioni di salvataggio è riportato sotto.

## Collaudo autenticato della versione 70

Eseguito su richiesta il 23 ottobre 2026 tramite Playwright collegato al
Chrome Windows dedicato, autenticato dall'utente. Ricaricamento necessario
per completare il frame Apps Script inizialmente vuoto. Interfaccia v2.0.4
e presenza di applyCommonChanges confermate; nessuna bozza pendente prima
delle prove. Nessun contenuto del diario esportato o inserito nel repository.

- Due navigazioni Task complete: 64 record ciascuna, 64 identità distinte,
  nessun errore di caricamento.
- Due aperture settimana: nessun errore o overflow orizzontale alla
  dimensione desktop del collaudo; ritorno al diario con 25 voci caricate,
  senza errori o modifiche pendenti.
- Un salvataggio per Days, Weeks e HabitLogs usando i valori già presenti,
  con i percorsi frontend run/saveDay, run/saveWeek e markDiaryHabit.
  Per Days inviati solo chiave e versione: i campi esistenti sono conservati.
  Cambiata la sola marca updatedAt dei tre record; nessun nuovo record.
- Ogni risposta contiene delta, entries vuoto, commonIncluded false e un
  solo commonUpserts; nessun commonPatch o getState/getCommonState
  compensativo durante i salvataggi. Merge frontend verificato.
- Tre tentativi con le rispettive versioni precedenti rifiutati come
  conflitti; nessuna scrittura obsoleta accettata.
- Rilettura esplicita finale di getCommonState: contenuti canonici e
  formattazione invariati in tutti i 19 Days, 4 Weeks e 72 HabitLogs;
  identità, conteggi e timestamp dei record estranei conservati.
- Coda Docs prima e dopo: zero pending, zero errori, 67 completate.

| Operazione | Risposta JSON UTF-8 | Durata RPC singola |
|---|---:|---:|
| saveDay | 783 byte | 2,635 s |
| saveWeek | 452 byte | 2,693 s |
| setHabitLog | 757 byte | 3,169 s |

Campione di un salvataggio per tipo, senza A/B: nessuna conclusione su un
miglioramento della latenza complessiva. Non collaudate qui creazione di
nuovi record, modifiche ai testi, guasti simulati o tutte le geometrie mobile;
questi scenari restano coperti dalle rispettive verifiche locali.
Nessun setupDrive o nuovo deploy durante il collaudo.
