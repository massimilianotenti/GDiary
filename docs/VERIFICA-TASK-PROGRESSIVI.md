# Verifica task progressivi — 23 ottobre 2026

Passo C SPEC-002, pubblicato su richiesta nella versione Apps Script 67.
Nessuna modifica diretta ai dati reali del diario.

## Comportamento

La prima pagina task viene applicata e mostrata prima di richiedere le altre.
Una richiesta pagina in volo. Indicatore live di caricamento/completamento e
risultati parziali anche per filtri, conteggi, ordinamento e ricerche senza
risultati. Conteggi UI basati sulle sole voci visibili, senza totale backend.
Errori successivi conservano risultati e modifiche; retry dal cursore fallito.
Cambi periodo/vista invalidano la sessione e ignorano risposte tardive.

Nessuna ricreazione degli oggetti e degli editor delle voci già presenti
all'arrivo delle pagine; bozze recuperate per pagine successive riconciliate
con lo stesso ID. Conservati focus e selezione. Tentativo di mantenere la
posizione ancorando il blocco attivo; ordinamenti possono ancora assestarsi.
Ricerca locale conserva il testo in attesa del debounce mentre arrivano pagine.
Le azioni di salvataggio riguardano le sole bozze già disponibili, non operazioni
di massa su task non ancora caricati; i riepiloghi settimanali continuano a
provenire dai metadati esistenti e non sono ricalcolati da questa lista parziale.

## Verifiche

- npm run build: passato, Demo e Index rigenerati, bootstrap UTF-8 e sei file
  Apps Script conservati.
- npm test: passato.
- npm run test:progressive: nuovo test con 59 task e risposte trattenute,
  prima pagina disponibile prima del completamento; stesso DOM editor,
  focus/selezione e testo modificato dopo pagina successiva; ricerca corpo
  sull'ultima pagina; privacy; errore pagina due/retry senza duplicati;
  cambio periodo/vista con risposte tardive; un solo caricamento in volo;
  arresto su cursore ripetuto; bozza della terza pagina recuperata e mantenuta
  con identità unica. Quattro palette a 320/390 px nello stato parziale.
- npm run test:tracing: passato, backend/browser e export filtrato.
- npm run test:release: passato, preferenze, controlli e percorsi settimana.
- Test browser P82 task, P85 settimana, P88 scelte settimanali, P65 palette,
  P64 layout/bozze: passati.
- git diff --check: passato.

Chromium locale eseguito fuori sandbox. Nessun test modifica dati reali.
La suite dedicata usa pagine sintetiche controllate: dimostra ordine degli
aggiornamenti e preservazione dello stato, non tempi Google.

## Misurazione e limiti

firstResultMs è misurato dalla partenza della navigazione alla prima pagina
applicata dopo la patch DOM Vue (nextTick), non al paint. La navigazione
termina dopo tutte le pagine; un errore successivo è partial, prima pagina
fallita è error, sessione abbandonata è cancelled. Nel retry la misura riparte.

Non si promette un tempo totale inferiore: si anticipa l'accesso ai primi
risultati. Dopo la pubblicazione nella versione 67, confrontare su Chrome
reale firstResultMs e clientMs con i tempi della versione 66. Verificare
focus/bozze e cambi vista anche sul reale, senza creare modifiche fittizie.


## Pubblicazione autorizzata — 23 ottobre 2026

Backup dei sei sorgenti remoti fuori repository; confronto con la base Git
versione 66 senza divergenze inattese, normalizzato solo ROOT_FOLDER_ID.
Eseguita procedura tools/deploy.cjs con configurazione personale tramite
variabile ambiente: build, tutti i controlli locali, push dei sei file,
creazione versione e aggiornamento del deployment esistente alla 67.
Stesso URL e accesso privato MYSELF/USER_DEPLOYING; nessun setupDrive.
Bootstrap UTF-8, sei file e segnaposto nei sorgenti conservati.
Collaudo autenticato e confronto dei tempi reali del progressivo da effettuare.


## Collaudo reale versione 67 — 23 ottobre 2026

Eseguito su richiesta tramite Playwright nel Chrome dedicato autenticato
dall'utente. Prima del refresh verificati dirtyMain/dirtyDetail e campi
capture vuoti; frontend aggiornato verificato con firstResultMs e whenRendered.
Cinque RPC pagina e cinque vere navigazioni UI Task aperti, filtro predefinito.
Nessuna modifica alle voci, nessuna elaborazione manuale della coda; tracing
ripristinato allo stato precedente. Solo diagnostica filtrata in /tmp;
nessun export originale o contenuto del diario nel repository.

Cinque letture pagina da 25 voci: tutte hit, zero miss/pending/Docs aperti,
zero errori; identità/versioni/corpo/rich-text equivalenti nel confronto
canonico in memoria. Client mediana 4,057 s (3,442–4,480 s), backend 3,159 s
(2,645–3,530 s), getAll 42 ms (34–101 ms), driveCheck 1,648 s
(1,558–1,749 s).

| Tentativo task | Primo risultato DOM | Completamento | Anticipo sulla fine |
|---|---:|---:|---:|
| 1 | 6,664 s | 16,793 s | 10,129 s |
| 2 | 5,580 s | 16,058 s | 10,478 s |
| 3 | 5,067 s | 19,553 s | 14,486 s |
| 4 | 4,330 s | 14,972 s | 10,642 s |
| 5 | 4,361 s | 14,624 s | 10,263 s |

Mediana primo risultato 5,067 s; completamento 16,058 s; mediana delle
differenze per singola navigazione 10,478 s. Tutte navigazioni con esito ok,
61 voci recuperate su tre pagine (25+25+11), tutte hit, zero miss/pending,
zero Docs aperti o errori per voce. Alla prima osservazione 25 record già
applicati e cinque task effettivamente mostrati secondo il filtro aperti e
le regole privacy: loading=true, complete=false e aria-busy=true. Nessun
totale privato backend esposto nel conteggio UI.

Su ogni navigazione il test ha focalizzato un titolo visibile e selezionato
fino a tre caratteri senza cambiarli. Al completamento stesso nodo editor
connesso, stesso focus e stessa selezione, nessuna bozza sporca. Identità,
versioni, contenuti e formattazione finali equivalenti tra le cinque letture.
Coda prima e dopo: zero pending, zero errori, 64 completate.

Confronto: v66 task mediana 14,462 s; v67 16,058 s nel nuovo campione. Non
si dimostra riduzione del tempo totale (non era l'obiettivo di C) né una
regressione causale con servizi variabili e confronto sequenziale. È invece
osservato sul reale l'accesso ai primi risultati prima della fine, con patch
DOM misurata e stato parziale verificato; firstResultMs non misura il paint.
I fallimenti pagina/retry, le modifiche vere alle bozze e la navigazione
obsoleta rimangono verificati con dati simulati, senza introdurre errori o
scritture fittizie nell'archivio reale.
