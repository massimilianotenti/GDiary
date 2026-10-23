# Verifica controlli Drive — 23 ottobre 2026

Modifica locale successiva alla cache bulk pubblicata nella versione 65.
Pubblicazione autorizzata successivamente: versione Apps Script 66.
Nessun accesso o modifica ai contenuti reali del diario.

## Modifica e motivazione

inside_ conserva in IO.inside la prova del solo percorso che raggiunge la
radice o un antenato già verificato nella stessa richiesta. Più documenti
possono riusare cartelle comuni senza rileggerne i genitori. ioReset_ elimina
la prova tra richieste: documenti spostati fuori archivio vengono ricontrollati.
La fixture con due documenti sotto cartella/anno comuni richiede quattro
visite getParents invece delle sei del precedente algoritmo.

Tempi distinti driveInside, driveRoot, driveParents e driveTrash; conteggi
aggregati nodi, archi e memo hit. Allowlist frontend aggiornata e Index.html
rigenerato; nessun identificativo o contenuto aggiunto all'export.

## Verifiche passate

- npm run build: bootstrap UTF-8 conservato, sei file Apps Script preparati.
- npm test: suite completa, incluso verify-drive-checks.cjs.
- Test Drive dedicato: riuso antenati, reset richiesta e spostamento fuori
  archivio, rami esterni con genitori multipli, cicli, percorsi a diamante,
  errore getParents, radice nel cestino, diagnostica aggregata. Verifiche
  integrate: cache piena non permette la lettura di file spostati o cestinati;
  dopo ripristino il documento torna leggibile.
- npm run test:tracing: backend e browser, nuove metriche esportate.
- npm run test:release: tre suite, quattro palette e 320/390/768/1440 px.
- node tests/verify-p82-tasks.cjs: archivio oltre 25, privacy e salvataggi
  multi-mese con errore parziale e retry.
- node tests/verify-p85-week.cjs: campi, checkup, tracker e navigazione.
- git diff --check.

Browser eseguito sulla sola Demo fuori sandbox perché Chromium richiede
questa modalità nell'ambiente. Mock e suite locali dimostrano correttezza
e riduzione strutturale delle visite, non il risparmio di tempo su Google.

## Limiti e prossimo passo

Pubblicato su richiesta nella versione 66. Ripetere via Chrome autenticato le cinque letture e cinque navigazioni task;
confrontare segmenti e nodi oltre al totale. La memoizzazione resta per RPC:
le pagine successive ricontrollano i documenti. Non sono stati cambiati
revisione, cestino, gestione pending, conflitti o API di accesso a Drive.
Come nella memoizzazione preesistente per file, non si rileva uno spostamento
dell'antenato avvenuto fra due controlli nella medesima richiesta; nessuna
prova viene mantenuta nella richiesta successiva.


## Pubblicazione richiesta

Backup dei sei file remoti fuori repository e confronto con la versione 65:
nessuna divergenza inattesa. Il primo tentativo di deploy si è fermato prima
dell'upload nel test P66 delle proprietà: dopo la chiusura del pannello,
il test riapriva prima della scadenza del cleanup blur tag a 100 ms. Aggiunta
nel solo test un'attesa di 150 ms prima della riapertura; verifica isolata
passata. Nessuna modifica al comportamento UI per risolvere questo controllo.


Seconda esecuzione della procedura completa: tutti i controlli passati,
push dei sei file, creazione versione e aggiornamento del deployment esistente
alla versione 66. Versione attiva verificata con list-deployments. URL e
accesso MYSELF/USER_DEPLOYING invariati, nessun setupDrive. Bootstrap UTF-8,
sei file Apps Script e segnaposto ROOT_FOLDER_ID nei sorgenti conservati.
Il confronto prestazionale sul reale resta da effettuare sulla versione 66.


## Collaudo reale versione 66 — 23 ottobre 2026

Richiesto dall'utente e svolto con Playwright nel Chrome dedicato già
personalmente autenticato. Verificata assenza di bozze e capture non salvate
prima del refresh; nuove metriche frontend e backend presenti. Cinque RPC
pagina tramite ponte reale e cinque navigazioni UI Task, stessa metodologia
del collaudo versione 65. Tracing ripristinato allo stato precedente.
Nessuna scrittura alle voci e nessuna elaborazione manuale della coda.
Solo export filtrati in /tmp, nessun export originale nel repository.

Tutte le richieste/pagine hanno esito ok e zero errori per voce. Cinque
pagine da 25 voci tutte hit, zero miss/pending/Docs aperti; corpi, rich-text,
identità e versioni equivalenti nel confronto canonico in memoria.
Coda prima e dopo: zero pending, zero errori, 64 completate.

| Mediana | Versione 65 | Versione 66 |
|---|---:|---:|
| Client pagina | 4,499 s | 5,629 s |
| Backend pagina | 3,181 s | 4,257 s |
| Cache getAll pagina | 38 ms | 46 ms |
| driveCheck inclusivo pagina | 1,921 s | 2,637 s |
| Navigazione Task, 61 voci / tre pagine | 16,680 s | 14,462 s |

Pagina v66: client 4,613–6,586 s; backend 3,212–5,310 s.
Task v66: 19,719 / 13,696 / 13,277 / 14,462 / 15,055 s; tutte navigazioni
complete, tre pagine 25+25+11, tutte hit, zero miss/pending/Docs aperti.

Nuovo dettaglio pagina v66, mediane (tempi inclusivi non sommabili):

- driveInside: 1,945 s (1,216–2,559 s).
- driveParents: 1,785 s (1,083–2,322 s), dieci visite e dieci archi.
- driveRoot: 147 ms (120–230 ms), quattro invocazioni helper; la radice
  viene acquisita una volta nella richiesta, Calls non conta le acquisizioni.
- driveTrash: 6 ms (2–8 ms), cinque controlli, inclusa la radice.
- Due memo hit antenati per pagina: il riuso è operativo.

Per ciascuna navigazione Task: trenta visite getParents (12+10+8), sei
memo hit (3+2+1); driveParents aggregato 3,591–5,669 s. I genitori restano
la parte predominante dei controlli di appartenenza, non il cestino.

Conclusione: correttezza, nuova diagnostica e riuso confermati. Risultato
prestazionale misto, con pagina più lenta e task più rapidi nel campione.
Nessuna prova di miglioramento complessivo o regressione causale: servizi,
trasporto e scheduling variano; confronto sequenziale, non alternato A/B.
Non ampliare l'intervento attribuendo il costo al cestino o estendendo la
fiducia fra richieste. Un eventuale passo successivo deve confrontare una
strategia concreta per i controlli di appartenenza e mantenerne la sicurezza;
il caricamento progressivo Task resta un miglioramento distinto.
