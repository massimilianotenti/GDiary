# Fotografia temporanea dell'elenco Task — SPEC-004

Data: 27 ottobre 2026. Implementazione locale; nessun deploy, setup o accesso
ai dati del diario reale. Il test usa Demo.html e archivi sintetici.

## Risultato

Le pagine successive dei metadati Task riusano una fotografia ordinata
dell'elenco. Non ripetono la ricerca in Entries, il caricamento di TaskPlans
e JournalLayout o l'ordinamento dell'intero archivio. Nelle fixture da
50.000 voci, la continuazione passa da 389 letture strumentate e 849.992 celle
a **zero letture Sheets**. Rimangono chiamate Apps Script, Properties, lock
non bloccanti e CacheService: zero celle non equivale a zero chiamate Google.

La prima pagina continua a leggere l'archivio reale. Non riusa automaticamente
una fotografia di una navigazione precedente; una nuova apertura/Aggiorna
rilegge anche modifiche manuali ai fogli. Il costo iniziale resta proporzionale
ai candidati e include la serializzazione e la scrittura della fotografia.

Non è un indice persistente/incrementale in Sheets e non sostituisce una
sincronizzazione delle modifiche. È il passo intermedio della SPEC-004 per
evitare di ricostruire l'elenco a ogni pagina, mantenendo il protocollo precedente
come fallback.

## Contratto della paginazione

Il percorso riguarda soltanto `getJournalPage` con `metadataOnly: true` e
`taskOnly: true`. La prima risposta che necessita continuazione può aggiungere:

- `taskSnapshot`: token casuale opaco della fotografia;
- `snapshotOffset`: numero di record già restituiti.

Il client rinvia token, offset e precedente `nextCursor`. Il server verifica
coerenza di cursore/offset, mese, scope archivio/mese, progetto, configurazione
DB/root e revisione applicativa. Ogni pagina rimane limitata a 200 record e
600.000 caratteri JSON. I corpi non entrano nella fotografia e continuano a
usare `getJournalContents` con i controlli di versione e Drive preesistenti.

Le continuazioni senza token mantengono il percorso originale; non vengono
convertite a metà caricamento in una fotografia diversa. Nessun cambiamento
al caricamento completo del diario normale.

## Cache limitata e recuperabile

La fotografia vive nella Script Cache già usata dal progetto, con namespace
separato `TI1`. Non vengono creati nuovi file, fogli o servizi esterni.
Ogni fotografia include un manifest e frammenti di soli metadati:

- durata massima applicativa 600 secondi, con controllo esplicito di scadenza;
- massimo 80.000 byte UTF-8 per frammento;
- massimo 100 frammenti e 8.000.000 byte complessivi di payload;
- checksum dei frammenti e validazione di schema, numero/ordine e campi;
- una scrittura bulk; lettura dei soli frammenti necessari alla pagina corrente,
  incluso il record precedente per validare il cursore e quello successivo.

I limiti sono inferiori al massimo di 100 KB per chiave della
[CacheService Google](https://developers.google.com/apps-script/reference/cache/cache).
La cache può espellere dati prima del TTL: non si assume una pubblicazione
atomica o una disponibilità garantita di manifest e frammenti. Il checksum
rileva alterazioni del payload, non è un meccanismo di autenticazione.

Se la costruzione supera i budget o la scrittura cache fallisce, la prima
pagina viene restituita senza token: la navigazione prosegue con le letture
normali. Se una continuazione perde la fotografia o rileva dati cambiati,
riceve `snapshotReset` con una categoria nota e nessuna pagina sostitutiva.
Non viene costruito silenziosamente un ordine diverso dietro un cursore vecchio.

La UI dichiara i risultati parziali e offre «Aggiorna elenco Task». Il riavvio
conserva gli stessi oggetti delle bozze e rilegge i record puliti. Le bozze
mantengono la loro versione originale: un conflitto non viene risolto
sovrascrivendo il testo o aggiornandone arbitrariamente la baseline.

Dopo cache mancante, corrotta, scaduta o indisponibile, il retry disabilita la
fotografia per quella sessione e usa il percorso normale. Questo impedisce
un ciclo infinito di riavvii su cache inaffidabile o archivi che richiedono
più tempo del TTL. Il comportamento originale resta disponibile, anche se
più costoso. Errori di rete ordinari mantengono invece il retry dal cursore.

## Revisione applicativa e invalidazioni

Nuova Script Property `TASK_INDEX_REVISION`, inizialmente assente/`0` e generata
automaticamente alla prima scrittura pertinente. Non è un ID dell'archivio,
una credenziale o un registro dei contenuti. Non richiede setup/migrazioni.

`taskIndexTouch_` cambia la revisione **prima** della prima mutazione di Entries,
TaskPlans, JournalLayout o TaskDocQueue nella richiesta. Le scritture tramite
append, writeRow/writeRows e i percorsi diretti di modifica/conversione/eliminazione
coprono tali tabelle. Se la proprietà non può essere aggiornata, la scrittura
si ferma prima di cambiare i dati: un commit non deve lasciare valido un indice
precedente. Una mutazione parziale invalida comunque la vecchia fotografia.

Il costo introdotto è una `setProperty` per richiesta che modifica tali
tabelle, non per riga. Va misurato anche sui salvataggi reali prima di dichiarare
un vantaggio complessivo. Giorni, settimane, abitudini e preferenze locali non
invalidano l'elenco se non modificano le tabelle pertinenti. La coda Docs lo
invalida solo quando cambia effettivamente, per mantenere corretti pending/errori.

La lettura della revisione e della configurazione usa
[`getProperties`](https://developers.google.com/apps-script/reference/properties/properties)
sotto un tentativo immediato di acquisizione del lock. Le tabelle vengono
lette e la cache costruita fuori dal lock; la revisione viene ricontrollata
dopo la lettura delle strutture ausiliarie. Una scrittura sovrapposta impedisce
di pubblicare quella fotografia. Le continuazioni controllano nuovamente la
revisione dopo aver letto la cache.

Non sono introdotte attese aggiuntive `waitLock` nelle letture dell'indice.
`APP_LOCK_DEPTH` evita che il controllo rilasci un lock applicativo già
posseduto dalla stessa esecuzione. Il lock del worker Docs rimane invariato.

Le modifiche manuali ai fogli e le scritture da versioni precedenti dello script
non aggiornano questa revisione: sono osservate
alla nuova lettura iniziale/Aggiorna. Una fotografia già aperta resta una vista
del momento in cui è stata costruita, entro TTL. Il fallback non indicizzato
conserva i limiti di coerenza delle precedenti letture senza lock: questa
tranche non implementa transazioni atomiche fra fogli.

## Confronto sintetico

Stesse fixture deterministiche dei passi precedenti; la variante metadati
è misurata a freddo e in continuazione con token.

| Voci | Task | Letture iniziali | Celle iniziali | Letture/celle continuazione | Frammenti | Payload UTF-8 |
|---:|---:|---:|---:|---:|---:|---:|
| 10.000 | 2.000 | 81 | 170.000 | 0 / 0 | 12 | 926.885 byte |
| 50.000 | 10.000 | 389 | 849.992 | 0 / 0 | 59 | 4.661.071 byte |

Le prime quattro fixture (499/500/501/1.000 voci) contengono al massimo
200 task: l'elenco termina nella prima pagina e non viene scritto in cache.
I conteggi iniziali restano quelli del percorso precedente. Con metadati
molto lunghi il budget può disabilitare l'indice; non viene imposta una nuova
capacità massima all'archivio applicativo.

Sono conteggi del lettore strumentato su servizi simulati, non una misura
della latenza Google. La prima pagina ora include lavoro di serializzazione
e cache non presente nel conteggio delle celle. Nessuna riduzione in secondi
dimostrata senza collaudo reale autorizzato.

## Test e diagnostica

`test:task-index` comprende backend e browser. Il backend è anche in `npm test`.
Copertura:

- equivalenza di tutte le pagine, ordine, scope e cursore; continuazione senza
  letture Sheets/Drive/Docs;
- matrice di invalidazione per stato, tag, progetti, pianificazione, layout,
  coda, creazione e cancellazione; una sola scrittura revisione per batch,
  isolamento DB/root e salvataggio giorno estraneo all'indice;
- cache mancante/corrotta/scaduta, eccezioni cache e fallimento di Properties;
- append parziale, scrittura sovrapposta, lock occupato e lock già posseduto;
- limiti UTF-8 e fallback per contenuti oltre budget;
- browser: perdita cache tra pagine, fallback senza token, conservazione di
  bozza/nodo/editor e corpo originale, scrittura da un altro client, ripartenza
  fresca, assenza di duplicati e risposta tardiva dopo cambio vista;
- export diagnostico privo di token, ID archivio e contenuti.

`test:scale` verifica anche le continuazioni indicizzate su archivi fino a
50.000 voci, producendo artifacts/scale-baseline.json. measurementVersion
rimane 4: la navigazione continua a misurare metadati. Aggiunti segmenti
`taskIndexCheck/Build/Put/Get/Read/Revision` e contatori aggregati di hit,
reset, invalidazione, busy, errori, dimensioni e budget. I tempi inclusivi
non vanno sommati; nessuna chiave cache/revisione entra nell'export.

Superati build, npm test (incluso il backend dell'indice), test:task-index,
test:scale, test:locks, test:tracing, test:release, test:task-deferred,
test:progressive, test:incremental e browser P82. `git diff --check` superato.
Index.html e Demo.html rigenerati, staging verificato con i sei file previsti.

## Stato e seguito

La fotografia non è una cache locale IndexedDB e non elimina tutte le RPC.
Una nuova apertura rimane una lettura completa dei candidati; l'indice
incrementale per stato/periodo, i dati comuni limitati per intervallo, la
sincronizzazione locale e l'ottimizzazione del worker rimangono successivi.
La struttura Drive, i controlli dei corpi, le identità e i sei file Apps Script
sono conservati; nessuna dipendenza o autorizzazione Google nuova.
