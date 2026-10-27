# Letture Entries raggruppate — SPEC-004, seguito locale

Data: 27 ottobre 2026. Implementazione locale successiva alla diagnostica
iniziale. Nessun deployment né accesso ai dati reali.

## Problema e cambiamento

Oltre 500 voci, `entrySearch_` cercava le righe con TextFinder e leggeva
separatamente ogni gruppo contiguo trovato. Nel dataset sintetico con un task
ogni cinque voci, ogni task generava due letture di metadati; il lavoro si
ripeteva per ogni pagina da 25 risultati.

`entrySearch_` ora usa il lettore comune `readEntries_`. Il nuovo pianificatore
`entryReadRanges_` raggruppa le righe vicine, con due vincoli per intervallo:

- massimo 256 righe;
- righe lette non oltre otto volte quelle effettivamente richieste nel gruppo.

I limiti sono costanti locali, non configurazioni dei dati dell'archivio.
Risultati molto distanti rimangono separati; risultati densi vengono suddivisi
in intervalli limitati. L'amplificazione riguarda il numero di righe di
metadati, non garantisce un limite in byte se i metadati hanno lunghezze diverse.

Si leggono ancora soltanto colonne 1–11 e 13–14; la colonna 12 del corpo
storico resta esclusa. Le righe intermedie non sono materializzate come voci
nel risultato, non vengono restituite al browser né inserite in cache durature.
Ordine richiesto, duplicati con oggetti indipendenti e campi sono conservati.
Il percorso con archivio fino a 500 voci mantiene la cache della richiesta.

La modifica del lettore comune riguarda anche altri consumatori di
`readEntries_`, compresi dettaglio e worker, mantenendo il contratto esistente.
Non introduce scritture, lock, cache tra richieste, API nuove o modifiche
all'interfaccia/paginazione dei task. Nuovi contatori aggregati, ammessi
nell'export measurementVersion 3: `entryReadRanges`, `entryRequestedRows`,
`entryReadRows`, `entryOverreadRows`. Sono contati i gruppi letti con successo;
le righe richieste sono uniche, anche se il chiamante chiede duplicati.

## Confronto sintetico

Stesse fixture della [baseline iniziale](VERIFICA-AVVIO-SPEC-004.md), prima
e dopo la modifica. Verificate prima e seconda pagina Task, identità attive,
storico comune e contenuti con 1/10/100 revisioni.

| Voci | Letture prima | Letture dopo | Celle prima | Celle dopo |
|---:|---:|---:|---:|---:|
| 499 | 5 | 5 | 8.612 | 8.612 |
| 500 | 5 | 5 | 8.628 | 8.628 |
| 501 | 205 | 7 | 3.450 | 8.598 |
| 1.000 | 403 | 11 | 6.828 | 17.020 |
| 10.000 | 4.003 | 81 | 68.028 | 170.000 |
| 50.000 | 20.003 | 389 | 340.028 | 849.992 |

Per ogni riga i conteggi sono uguali sulle due pagine. Nel caso da 50.000
voci: 10.000 task richiesti, 49.228 righe di metadati lette, 39.228 righe
intermedie, 193 intervalli Entries e due letture per intervallo. Le tre
letture rimanenti appartengono alle tabelle ausiliarie. Il calo delle letture
è del 98,1%; le celle totali aumentano di circa 2,5 volte.

Questo è un compromesso esplicito fra chiamate e volume. Non dimostra una
riduzione del tempo remoto, particolarmente se i metadati intermedi sono
molto più lunghi di quelli richiesti. I contatori descrivono invocazioni del
lettore strumentato, non RPC browser o round trip di rete effettivi dopo le
cache della piattaforma Google. I tempi dei mock non stimano Google.

## Verifiche

`test:entry-batch`, incluso anche in `npm test`, verifica:

- confronto di ogni campo con una selezione indipendente dei dati sintetici;
- righe dense, intervallate, raggruppate e distanti; limiti 256 righe e fattore
  otto, comprese le condizioni di confine;
- ordine arbitrario, richieste duplicate indipendenti, input vuoto e tag
  assenti nello schema precedente;
- selettori tipo/stato/data/ID/progetto/tag/testo e archivio 499/500/501/2.000;
- nessuna lettura della colonna del corpo storico e nessuna restituzione delle
  righe intermedie;
- nuove richieste dopo modifica/eliminazione, errore Sheets e retry;
- paginazione completa su 200 task pendenti con rich text, progetti, tag
  privati, pianificazione e importanze diverse, senza mutazioni dei record.

`test:scale` aggiunge budget di chiamate per pagina e volume aggiuntivo sulle
fixture oltre 500 voci. `test:tracing` verifica anche l'esportazione dei nuovi
contatori tramite una reale chiamata al backend simulato del dettaglio.

Superati build, npm test (incluso test:entry-batch), test:scale, test:locks,
test:tracing, test:release, test:progressive, test:incremental e test browser
P82. Controllo `git diff --check` superato. Index.html e Demo.html rigenerati;
staging verificato con i sei file previsti. Nessuna dipendenza aggiunta.

## Limiti e seguito

Questa tranche risolve la frammentazione delle letture dei metadati. Il lavoro
complessivo resta proporzionale all'archivio candidato: TextFinder, ordinamento,
JournalLayout e TaskPlans non sono stati trasformati in un indice incrementale.
I dati comuni storici e la coda Docs mantengono il comportamento precedente.

Per archivi fino a 500 voci non è atteso un beneficio dal nuovo percorso di
ricerca. Per risultati completamente contigui il limite per intervallo può
aumentare le chiamate rispetto alla precedente lettura unica, mantenendo le
stesse celle: il test denso esplicita questo caso. Per risultati estremamente
sparsi il vincolo sull'amplificazione impedisce raggruppamenti inutili.

Restano successivi i pacchetti SPEC-004 per selezionare candidati con indici
dedicati, separare elenco Task e idratazione dei corpi visibili e aggiornare
in modo incrementale. La ricerca nei corpi dei task continua a funzionare
come prima, poiché i corpi vengono ancora caricati durante la paginazione.
Nessuna dichiarazione di capacità illimitata o di latenza garantita.
