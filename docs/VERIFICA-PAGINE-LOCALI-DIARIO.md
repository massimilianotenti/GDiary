# Più pagine locali del diario — pacchetto 7, seguito parziale

Sviluppo locale del 28 ottobre 2026, successivo al commit f850b1c.
Nessun deploy o dato reale; online resta Apps Script 75.

## Modifica implementata

La copia locale del diario conserva ora fino a 16 descrittori di pagina per
namespace archivio/principale/epoca, anziché il solo ultimo descrittore.
La chiave continua a comprendere mese, progetto e cursore esatti. Ogni pagina
contiene al massimo 25 riferimenti ID/versione; metadati e corpi restano negli
store canonici separati, senza duplicarli nel descrittore.

`frontend/journal-page-index.js` condivide fra repository e adattatore formato,
limiti e validazione. Il nuovo indice journal-pages/v1 è memorizzato in
archiveMeta.coverage.journalPages; i suoi elementi restano journal-page/v1.
Le letture selezionano il solo descrittore richiesto e ne ricostruiscono i
metadati/corpi nella stessa transazione readonly, fino a 25+25 letture per ID.
Non scansionano gli store o caricano i corpi delle altre pagine.

I ticket monouso conservano privatamente in WeakMap la fotografia dell'indice
acquisita prima della RPC. Una conferma aggiorna pagina, corpi e indice nella
stessa transazione con la revisione CAS originale. Non si rilegge una revisione
nuova dopo la risposta per aggirare un conflitto. L'indice mantiene solo pagine
valide rispetto a quella revisione e le avanza al checkpoint successivo.
Un lotto fallito non può rimuovere una pagina precedente.

## Conservazione e invalidazione

Acquisire una continuazione con ID disgiunti e totale invariato mantiene le
altre pagine. Un aggiornamento della prima pagina che confermi gli stessi
ID/versioni nell'ordine, totale, nextCursor e nextEntry mantiene le anteprime
delle continuazioni, con la loro data originaria. Se cambia quella prova,
le precedenti pagine dello stesso mese/progetto vengono eliminate dall'indice.
Un totale cambiato invalida le altre pagine dello stesso periodo anche quando
è rilevato in una continuazione. Le pagine con ID sovrapposti alla nuova pagina
sono invalidate, anche a parità di versione: un corpo può cambiare nei Docs
senza aggiornamento del metadato di Sheets.

Letture di altri mesi/progetti con ID distinti possono coesistere. Le mutazioni
canoniche generiche su voci/corpi invalidano conservativamente tutti i
riferimenti di pagina. I lotti riguardanti solo dati comuni mantengono validi
i descrittori già validi, avanzandone la revisione ma non savedAt; la copia dei
dati comuni conserva la politica indipendente implementata nel passo precedente.
L'eliminazione di una voce invalida entrambe le categorie conservativamente.

Quando l'indice supera 16 elementi, viene esclusa l'acquisizione meno recente.
Aggiornare una chiave esistente la porta in fondo; leggere una pagina non
scrive timestamp né cambia la priorità. È un ordine di acquisizione, non LRU.
L'esclusione rimuove soltanto il descrittore: non elimina metadati, corpi, bozze
o outbox. Il limite rende prevedibili indice e lettura della vista, non limita
ancora la dimensione totale degli store; retention/compattazione restano aperte.
Il budget di 500 record/4 MiB per lotto del repository resta in vigore.

## Compatibilità e interfaccia

Il descrittore singolo precedente, coverage.journalPage, è ancora leggibile se
manca l'indice nuovo. Alla prima acquisizione compatibile viene trasferito nel
nuovo indice, con journalPage:null scritto atomicamente per evitare doppie
fonti. Nessun nuovo store, versione dello schema o reset del database.
Indici futuri, duplicati o incompatibili danno errore/miss e fallback remoto,
non cancellazione dei dati locali. I vecchi client non leggono il nuovo indice:
il downgrade può perdere il beneficio della cache, conservando i dati e bozze.

La shell può mostrare l'anteprima della continuazione richiesta anche mentre
le pagine già verificate sono aperte. L'anteprima viene aggiunta alla vista,
non entra nella sessione canonica e non sostituisce editor o selezione.
Le note private restano escluse, i testi usano i nodi/estratti sicuri esistenti,
nessuna azione di salvataggio è disponibile sulle righe dell'anteprima.
La risposta Google segue il merge normale, preservando gli editor sporchi;
soltanto quella risposta determina cursore e completezza della sessione.
Nessuna espansione automatica delle pagine successive dalla cache.

La prova diagnostica usa ora due pagine inventate e verifica che entrambe
siano ricostruibili dopo chiusura/riapertura. Il rapporto aggiunge il solo
booleano pagesReopened, senza ID, contenuti o dati della pagina aperta.
journalPageCache e commonViewCache restano null in produzione; il client
identità continua a restituire cacheReady:false. Nessuna apertura IndexedDB
automatica o nuova RPC è stata introdotta sul percorso reale.

## Verifiche locali

Nuovo `npm run test:local-pages`, su Demo.html con HTTP locale e profilo
Chromium temporaneo: tre pagine/60 voci inventate, 25+25 letture per la prima
pagina, separazione mese/progetto/cursore/principale, coesistenza con aggiornamenti
comuni, CAS dopo mutazione, confini invariati/cambiati, totale diverso e ID
sovrapposti. Provati anche limite 16, ordine di acquisizione, rimozione soltanto
del descrittore e rollback dopo successo di una singola richiesta IndexedDB.

Riavvio reale del browser con ricostruzione di tutte e tre le pagine, migrazione
del descrittore precedente e rifiuto di un indice futuro senza reset. Il ponte
reale loadContinuous mostra la continuazione sintetica senza cambiare le 25
voci già canoniche; dopo la risposta conserva nodo editor, bozza, focus e
selezione, esclude la nota privata dall'anteprima e mantiene lo stato parziale
su 50 voci anche se la terza pagina è presente nella cache. Il database reale
gdiary-local-v1 non viene creato.

Superati build, npm test, test:local-pages, test:local-views, test:local-common,
test:repository, test:release, test:progressive, test:identity e test:tracing.
Index.html e Demo.html rigenerati; bootstrap UTF-8, ROOT_FOLDER_ID segnaposto
e sei file di staging Apps Script preservati.

## Limiti e seguito

Il pacchetto 7 resta parziale. Queste sono pagine datate indipendenti: le API
legacy non forniscono una revisione remota comune fra pagine, né una prova dello
scope archivio/principale nella risposta. Non si uniscono in una fotografia
canonica completa del mese, né si riapre un editor offline dalla copia.
Il periodo comune resta singolo; altre viste/Task, avvio senza RPC bloccanti,
bootstrap/feed coerenti e retention restano successivi. Prima dell'abilitazione
reale servono anche consenso, gestione della revoca e collaudo del contenitore
Google/browser. Nessun miglioramento di latenza sui dati reali è stato misurato.
