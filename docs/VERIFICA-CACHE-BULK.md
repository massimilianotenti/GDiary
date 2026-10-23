# Verifica cache bulk — 23 ottobre 2026

Esperimento E della SPEC-002 implementato e verificato localmente. Nessun
accesso a Google, setup o deploy. I dati della Demo sono simulati.

## Risultati

- `npm run build`: passato; Index.html e Demo.html rigenerati, bootstrap UTF-8
  conservato, staging con esattamente sei file Apps Script.
- `npm test`: passato, incluso nuovo verify-cache-bulk.cjs.
- `npm run test:tracing`: passato, backend e browser; riconosciute le fasi
  cacheGetAll/cachePutAll ed export filtrato.
- `npm run test:release`: passato.
- `node tests/verify-p82-tasks.cjs`: passato; archivio oltre 25 task,
  ricerca nel corpo, privacy, salvataggi multi-mese e retry dopo errore parziale.
- `node tests/verify-p85-week.cjs`: passato.
- `node tests/verify-p65-palettes.cjs`: passato; quattro palette,
  viste principali e impostazioni 320/390 px. Release copre anche 768/1440 px.
- `git diff --check`: passato.

I test browser sono stati inizialmente bloccati dalla sandbox all'avvio di
Chromium; rieseguiti fuori sandbox sulla sola Demo. Una prima asserzione
browser attendeva ancora cacheGetCalls individuale: aggiornata alla nuova
metrica cacheGetAllCalls, quindi suite ripassata.

## Copertura dedicata

Massimo un getAll/putAll e nessun accesso individuale nel percorso pagina;
ordine, contenuto e rich-text equivalenti fra cold/warm/misto; cache
parzialmente assente, JSON corrotto e struttura errata; servizio non disponibile;
bypass esplicito; revisioni cambiate, mancanti e ricontrollo finale fallito;
TTL invariato; limite per elemento; budget risposta e cursore senza salti;
pending prevalente su vecchia cache; pagina vuota senza chiamate cache.
Le suite esistenti coprono modifiche Docs esterne, marcatori duplicati,
conflitti e idempotenza, oltre a bozze e salvataggi parziali browser.

## Limiti e seguito

I mock verificano correttezza e conteggi, non latenza o garanzie del servizio
Google. Il benchmark precedente sostiene E sul segmento cache, senza
promettere una riduzione equivalente del totale. Raccogliere campioni reali
comparabili dopo eventuale pubblicazione esplicitamente richiesta.

La preparazione chiavi può verificare documenti di candidati esclusi dal
budget risposta: lavoro anticipato entro 25 candidati, senza salto del cursore.
Non è stato ottimizzato driveCheck: comprende appartenenza alla radice,
cestino e revisione. I tempi esclusivi attuali non separano appartenenza e
cestino. DocContent raggruppato e caricamento task progressivo restano proposte.


## Pubblicazione autorizzata

Il 23 ottobre 2026 l'utente ha richiesto la pubblicazione. Backup remoto dei
sei file fuori repository e confronto con HEAD: nessuna divergenza remota
(normalizzato soltanto ROOT_FOLDER_ID). Eseguito tools/deploy.cjs con variabile
ambiente da configurazione locale: build e tutti i controlli della procedura
superati, push di sei file e aggiornamento del deployment esistente alla
versione Apps Script 65, stesso URL. ROOT_FOLDER_ID nei sorgenti resta il
segnaposto; configurazione privata MYSELF/USER_DEPLOYING conservata.
Nessuna esecuzione di setupDrive o modifica diretta dei dati reali.
Resta il collaudo autenticato e il confronto prestazionale reale.


## Collaudo reale autenticato con Playwright — 23 ottobre 2026

L'utente ha autorizzato l'accesso e autenticato personalmente un Chrome
separato, collegato via CDP locale. Prove esclusivamente in lettura: nessuna
voce creata o modificata e nessun comando di elaborazione della coda.
Tracing attivato temporaneamente e ripristinato allo stato precedente.
Export filtrato conservato soltanto in /tmp, fuori repository; qui aggregati.

Coda prima e dopo: zero pending, zero errori, 64 elaborazioni completate.
La voce pending osservata negli export precedenti non risulta più in attesa.
Questo conferma lo stato della coda al momento del collaudo, non ne misura il
ritardo precedente né confronta direttamente il corpo della voce con il Docs.

Cinque RPC consecutive getJournalPage per il mese corrente, senza refresh
browser fra le chiamate (misura backend/RPC tramite il ponte reale dell'app):

| Metrica | Mediana | Intervallo osservato |
|---|---:|---:|
| Client | 4,499 s | 3,959–5,004 s |
| Backend | 3,181 s | 2,966–3,768 s |
| Cache getAll | 38 ms | 10–63 ms |
| driveCheck inclusivo | 1,921 s | 1,794–2,703 s |

Tutte: 25 hit, zero miss/pending, zero Docs aperti, un getAll, nessun errore
per voce. Identità, versioni, corpo e rich-text equivalenti nelle cinque
risposte, confrontando oggetti con chiavi ordinate solo in memoria browser.
Un confronto preliminare con JSON.stringify non canonico differiva per
l'ordine delle proprietà rich-text; non era una differenza dei contenuti.
Una prima serie esplorativa prima del campione finale: client 3,908–6,976 s,
getAll 32–128 ms; non usata nella mediana della tabella.

Cinque vere navigazioni UI Task aperti, ciascuna con una nuova sessione e
RPC correlate: 14,850 / 17,902 / 15,617 / 16,736 / 16,680 s.
Mediana 16,680 s, intervallo 14,850–17,902 s. Ciascuna recupera 61 voci in
3 pagine (25+25+11), tutte hit, zero miss/pending/Docs aperti/errori per voce.
Cache aggregata per navigazione 80–171 ms; driveCheck inclusivo aggregato
5,119–8,388 s. L'archivio precedente aveva 60 voci: confronto non identico.
Il tempo navigation parte dalla lettura delle pagine; non comprende l'intera
apertura app né necessariamente la getState precedente alla navigazione.

Un primo tentativo UI è stato interrotto solo dal timeout Playwright a 30 s;
non contato nei cinque campioni finali. Corretto il limite del driver a 180 s.
Non è una prova di errore RPC o di fallimento del server.

Conclusione: criterio strutturale bulk confermato sul reale, segmento cache
ridotto rispetto alle letture individuali della baseline. Le distribuzioni
prima/dopo non costituiscono un confronto controllato: niente percentuali
causali sul totale. Il costo Drive e la lettura sequenziale delle tre pagine
restano i principali approfondimenti per il percorso warm. Percorso cold
con putAll coperto localmente, non forzato sull'archivio reale.
