# Verifica DocContent raggruppato — 23 ottobre 2026

Passo A SPEC-002: recupero multiplo nella sola lettura pagina. Non modifica
le scritture, lo schema o i dati persistenti. Pubblicazione richiesta dall'utente ed eseguita nella versione Apps Script 68,
stesso URL e accesso privato. Backup remoto confrontato con la base 67, senza
divergenze; tutti i controlli della procedura superati. Nessun setupDrive.

## Strategia e limiti

Dopo cache e pending vengono preparati al massimo 25 ID necessari. Ricerca
regex letterale unica per finestra di 1024 righe; intestazioni contigue in
blocchi fino a 32 righe, scelta della versione massima lessicografica e parti
0..n-1. Payload della sola versione corrente in blocchi contigui fino a quattro
celle. Non letti i payload estranei o delle vecchie versioni.

Budget bulk: 256 KiB di intestazioni selezionate e 2 MiB di payload UTF-8
bufferizzati/preparati. Non misura esatta dell'heap né limite di un contenuto
salvato; oltre budget fallback al lettore individuale esistente, demandato
al ciclo pagina. Le chiamate hanno limiti di righe; i budget byte sono verificati
sui valori ricevuti prima di conservarli. Le stringhe temporanee restituite dal
servizio e l'overhead degli oggetti non sono un heap misurato. Scratch della
singola chiamata payload limitato a quattro celle. Niente ampliamento dei
limiti cache o del budget della risposta.

Per tabelle grandi: ceil(righe/1024) ricerche, non una ricerca universale;
per righe sparse fino a una chiamata payload per frammento. Un fallback può
ripetere la ricerca e la lettura già parzialmente svolte: preserva compatibilità,
non garantisce accelerazione. Prelettura entro 25 candidati, anche se qualcuno
verrà escluso dal budget risposta; nessun salto del cursore.

## Verifiche locali passate

- npm run build: Demo e Index rigenerati, bootstrap UTF-8 e sei file conservati.
- npm test, incluso verify-doccontent-batch.cjs.
- Nuovo test: equivalenza di 25 contenuti rispetto al lettore individuale,
  una ricerca contro 25; limiti degli intervalli; Unicode, frammenti fuori
  ordine e sparsi, ID con metacaratteri regex, storia su più finestre; payload
  letti solo dalla versione corrente e dalle voci richieste; assenza, corruzione
  e frammenti incompleti; errori IO per range senza perdere gli altri risultati;
  copie indipendenti e riuso nella richiesta; fallback per payload grandi e
  intestazioni oltre budget; integrazione pagina cold/warm/mista/pending.
- npm run test:tracing: backend e browser; nuove metriche nell'export filtrato.
- npm run test:release e npm run test:progressive.
- Test browser P82 task e P85 settimana.
- git diff --check.

Browser su Demo fuori sandbox; nessun dato reale modificato. Test e mock
verificano correttezza e conteggi, non la latenza Google.

## Diagnostica e confronto reale

Fasi docContentBatch/contentBatchSearch/contentBatchHeaders/contentBatchPayload,
conteggi contentBatchEntries/contentBatchSearchRows/contentBatchFallbacks.
Tempi inclusivi non sommabili con i segmenti figli; pendingContent e syncedContent
vedono il materiale preletto in memoria, quindi il costo persistente va cercato
anche in docContentBatch. Nessun testo, ID archivio o errore originale aggiunto
all'export. Assenze/errori restano nella richiesta e non sono persistiti.

Dopo deploy autorizzato: letture warm e letture con bypass esplicito cache,
confronto di contenuti canonici solo in memoria del browser, navigazione task,
stato coda e diagnostica aggregata. Nessuna modifica artificiale ai testi o
alla tabella DocContent per provocare errori/miss.

## Ripresa dopo interruzione

Build, npm test, test:tracing, test:release e test:progressive rieseguiti con
esito positivo. Chromium locale avviato fuori sandbox, poiché la sandbox
ne impedisce l'avvio. Nessun accesso a Google o nuovo deploy.

Estesa la suite DocContent: input vuoti senza IO, deduplicazione, rifiuto di
oltre 25 ID prima degli accessi; snapshot e assenze conservati nella singola
richiesta ma riletti nella successiva; errori di ricerca/intestazioni mai
convertiti in contenuti vuoti, recupero nella richiesta successiva e privacy
delle metriche. Bypass esplicito: nessun getAll, recupero raggruppato e output
equivalente alla pagina warm. npm test superato anche dopo queste aggiunte.
Rieseguiti anche P82 task e P85 settimana: entrambi superati, comprese bozze,
privacy, salvataggi parziali/retry e quattro palette a larghezze mobile/desktop.

La sessione Chrome autenticata precedente non risulta attiva alla ripresa.
Non sono disponibili risultati reali conclusivi di A: il protocollo sopra
resta da eseguire dopo il ripristino della sessione da parte dell'utente.
Nessuna conclusione sulle latenze Google deriva dalle verifiche locali.

## Collaudo reale versione 68 — 23 ottobre 2026

Ripreso su richiesta nel Chrome dedicato autenticato dall'utente tramite
Playwright. Iniziale errore Chrome ERR_CONNECTION_CLOSED sul frame
googleusercontent.com risolto ricaricando; le misure sotto iniziano dopo il
caricamento riuscito. Verificati dirtyMain/dirtyDetail falsi, nessuna bozza
nei blocchi e campi capture vuoti. Tracing e misure preesistenti ripristinati
al termine; nessun salvataggio del diario né elaborazione manuale della coda.

Confronto canonico di identità/versioni/titolo/corpo/rich-text/flag titolo
automatico soltanto nella memoria del browser, con chiavi degli oggetti
ordinate e ordine degli array conservato. Un primo tentativo con confronto
JSON non canonico è stato interrotto e scartato; non entra nel campione.
Fuori dal browser conservate in /tmp solo misure numeriche, esiti e conteggi;
nessun contenuto o identificativo dell'archivio esportato nel repository.

Una lettura di preparazione esclusa dalle statistiche, poi cinque letture
warm e cinque con refreshDocs:true sullo stesso mese/pagina da 25 voci.
Tutte riuscite, zero errori per voce e contenuti canonici equivalenti alla
lettura di preparazione. Quattro documenti verificati per richiesta.

| Misura | Warm: mediana (intervallo) | Bypass: mediana (intervallo) |
|---|---:|---:|
| Tempo client | 4,621 s (3,896–7,098) | 10,504 s (8,364–16,564) |
| Tempo backend | 3,255 s (2,694–5,865) | 9,037 s (6,757–15,388) |
| Controlli Drive inclusivi | 1,555 s (1,477–3,414) | 1,799 s (1,561–2,741) |
| DocContent raggruppato | 0 ms (0–2) | 434 ms (311–731) |
| Cache hit / miss | 25 / 0 | 0 / 25 |
| Docs aperti | 0 | 4 |

Warm: getAll mediana 37 ms (33–83), nessuna ricerca o lettura payload
DocContent. L'invocazione vuota dell'helper batch costa 0–2 ms.
Bypass: nessun getAll; ciascuna richiesta raggruppa 25 contenuti con una
ricerca su 74 righe, quattro letture intestazioni (105 celle, incluse le
versioni storiche) e 12 letture payload (25 celle, 53.557 byte), zero fallback.
Solo payload della versione corrente. Mediane ricerca 192 ms (138–293),
intestazioni 11 ms (7–14), payload 26 ms (17–35); tempi inclusivi non sommabili.
I Calls sono invocazioni degli helper strumentati, non conteggi garantiti
delle RPC fisiche ai servizi Google.

Il bypass forza il percorso miss senza invalidare dati o revisioni; i
contenuti validi possono ripopolare la normale cache. Non equivale a una
cache fredda di tutti i servizi Google e non è un confronto A/B con v67.
Warm v67: mediana client 4,057 s; warm v68: 4,621 s in questo campione.
Non si dimostra un miglioramento temporale complessivo, né una regressione
causale. È verificato sul reale il recupero raggruppato con risultato equivalente.

Cinque navigazioni tramite il pulsante UI Task aperti, tutte riuscite:
61 voci su tre pagine (25+25+11), tutte hit, zero miss/pending/Docs aperti
ed errori per voce. Contenuti finali canonici equivalenti tra ripetizioni.

| Tentativo task | Primo risultato DOM | Completamento pagine |
|---|---:|---:|
| 1 | 4,801 s | 16,185 s |
| 2 | 4,764 s | 17,042 s |
| 3 | 5,198 s | 14,806 s |
| 4 | 5,860 s | 15,127 s |
| 5 | 7,748 s | 16,153 s |

Mediane: primo risultato 5,198 s, completamento 16,153 s. Le misure
journalNavigation iniziano in loadContinuous: escludono l'eventuale getState
precedente al caricamento delle pagine (presente nei tentativi 1 e 5,
rispettivamente 5,934 e 3,283 s). Non sono tempi completi dal click.
firstResultMs misura la patch DOM Vue, non il paint.

In tutti i tentativi osservati 25 record applicati mentre loading=true e
complete=false, cinque task mostrati con il filtro aperti e le regole privacy.
Focalizzato un titolo visibile e selezionati fino a tre caratteri senza
modificarli: stesso nodo, focus e selezione conservati al completamento.
Nessuna bozza sporca. Coda prima/dopo: zero pending, zero errori, 64 completate.

Confronto sequenziale v67/v68: primo risultato mediano 5,067/5,198 s,
completamento pagine 16,058/16,153 s. Non si dimostra una riduzione del tempo
totale. Il campione task tutto hit non esercita DocContent; l'evidenza di A
proviene dalle cinque letture con bypass. Non eseguiti sul reale salvataggi,
errori artificiali, pending creati per il test o archivi sintetici voluminosi:
questi casi restano coperti localmente. Il confronto temporale con il lettore
individuale precedente non è stato eseguito a parità di stato e dati.

## Pubblicazione 2.0.4 — 23 ottobre 2026

Su richiesta, backup fuori repository dei sei file remoti Apps Script 68 e
confronto prima del push; Code.gs, DriveDocs.gs, JournalEditor.gs e manifest
coincidono, le sole differenze previste sono Index.html e Changelog.html per
2.0.4. Aggiornato il deployment privato esistente alla versione Apps Script
69, stesso URL. L'ID root è passato alla build soltanto in ROOT_FOLDER_ID,
senza modifiche al sorgente condiviso. La procedura ha preparato e caricato
tutti e sei i file, mantenendo MYSELF/USER_DEPLOYING. Build, test incorporati
nella procedura e npm run test:release superati. Verifica in Chrome autenticato:
la web app mostra v2.0.4. Nessun setupDrive o intervento sui dati del diario.
