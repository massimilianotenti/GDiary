# Più pagine locali del diario — pacchetto 7, seguito parziale

## Aggiornamento remoto delle copie pulite — 4 novembre

Riprodotto un errore del merge: una voce aperta dalla cache senza modifiche
manteneva il corpo precedente anche dopo l'arrivo della risposta remota.
Il merge remoto ora sostituisce le sole copie locali pulite, senza operazioni
in outbox. Bozze e voci pendenti conservano testo e baseline originali.
Il nuovo blocco usa un oggetto separato e una revisione di rendering, così
lo smontaggio del vecchio editor non riscrive il corpo precedente e il DOM
si aggiorna anche se il corpo cambia a parità di versione dei metadati.

Il test Chromium/IndexedDB riproduceva il difetto prima della correzione;
ora copre sia la stessa versione sia una nuova versione remota, il testo
nell'editor e il mantenimento di baseline, focus, selezione e salvataggi delle
bozze. Il percorso riguarda prima pagina e continuazioni. Nessun deploy o
accesso ai dati reali; capability reali ancora disattivate.
Build, test:repository, test:local-pages, test:release, test:progressive,
P70 privacy e `git diff --check` superati. Index e Demo rigenerati, sei file
di staging preservati.

## Navigazione delle continuazioni in recupero locale — 4 novembre

Dopo un errore remoto, la vista della pagina memorizzata offre «Apri altre
voci dalla copia locale» quando il descrittore indica una continuazione.
Il comando usa il caricamento protetto esistente, con lettura cache e verifica
remota; non è un percorso senza RPC. I cursori delle pagine locali non ancora
verificate restano distinti da quello per avanzare. Una risposta per la sola
seconda pagina non rende completa o verificata anche la prima. Riprova torna
alla prima pagina ancora non verificata; aggiunte e riflessioni restano sospese
in recupero. UI Vue e fallback aggiornati.

Chromium/IndexedDB verifica errore della prima pagina, apertura della seconda
tramite il comando, conferma remota della sola seconda e retry della prima,
oltre a modifiche, baseline, cancellazione pendente, focus e selezione.
Build, test:repository, test:local-pages, test:release, test:progressive,
P70 privacy e `git diff --check` superati. Index e Demo rigenerati, staging
limitato ai sei file previsti. Nessun deploy o accesso ai dati reali.
Capability reali disattivate; resta una navigazione manuale fra pagine datate, senza fotografia coerente del mese.

## Continuazioni locali modificabili — 4 novembre

Durante «Carica altre voci del mese», anche la continuazione già conservata
può aprirsi nell'editor mentre si attende il remoto, con identità e capability
operations verificate. La vista resta datata e incompleta: niente aggiunta di
voci né riflessioni implicite. Dopo errore remoto, Riprova conserva il cursore
della continuazione. Le modifiche usano la baseline originaria e l'outbox;
la risposta tardiva preserva editor, testo, focus e selezione.

Build, test browser prima pagina/continuazione (incluso errore e retry del
cursore), test:local-pages, test:release, test:progressive, P70 privacy e
`git diff --check` superati. Index e Demo rigenerati, sei file di staging
preservati. Nessun deploy o accesso ai dati reali. È apertura della singola
continuazione richiesta dopo le pagine precedenti, non riapertura automatica
dell'intero mese o fotografia coerente fra pagine. Capability reali spente;
restano bootstrap completo e collaudo Google.

## Prima pagina locale modificabile — 30 ottobre

Con identità e capability di invio verificate, la prima pagina già conservata può aprirsi come copia datata e incompleta mentre si attende il remoto. Prima dell'apertura la UI legge la coda nello stesso scope e applica le operazioni locali, incluse le cancellazioni, senza resuscitare voci nascoste dalla coda. Le modifiche usano l'outbox con la versione originale; non si aggiungono nuove voci finché manca la pagina remota. Un marcatore impedisce a salvataggio e cancellazione diretti di bypassare la coda se la copia viene disattivata. Le riflessioni non ancora inviate non vengono salvate implicitamente in questa vista. Corretto anche il riferimento all'editor dopo salvataggio locale, così una seconda modifica resta rilevabile.

Chromium/IndexedDB verifica pagina datata, cancellazione in attesa, due modifiche successive, blocco del bypass, conflitto di versione potenziale e risposta remota tardiva con nodo, focus e selezione conservati. Build, test:repository, test:local-pages, test:release, test:progressive, test:diary-goals e P70 superati; test:sync-consumer e test:local-common passati prima dell'ultimo blocco UI. È una singola pagina, non copertura completa o checkpoint coerente; il collaudo Google resta aperto e le capability reali sono disattivate.

## Outbox visibile durante la lettura remota — 30 ottobre

Con copia e identità verificate, le voci visibili in outbox possono aprirsi in una vista modificabile e dichiarata incompleta mentre la prima pagina remota è ancora in corso. Una lettura locale tardiva non interviene dopo l'arrivo della pagina remota; la risposta remota successiva conserva testo, editor, focus e selezione già aperti. Se l'outbox contiene solo voci private nascoste non compare un indicatore che ne riveli la presenza. Test Chromium/IndexedDB verifica ritardo remoto, modifica e salvataggio, risposta tardiva, risposta locale tardiva e privacy; build, test:repository, test:local-pages, test:release, test:progressive e P70 superati. Restano necessarie la verifica identità iniziale e la connessione per caricare l'intera pagina; le capability reali sono disattivate e il collaudo Google è aperto.

## Riapertura delle voci in outbox dopo errore remoto — 30 ottobre

Se il primo caricamento del diario fallisce e la copia locale verificata ha operazioni note/task attive per il periodo, la schermata riapre quelle voci in una vista modificabile esplicitamente incompleta. Le modifiche vengono accodate localmente; l'aggiunta di nuove voci è sospesa finché la pagina remota non è caricata, perché la posizione nel diario non è ancora nota. Il retry unisce la risposta remota mantenendo il lavoro locale. La vista rispetta il filtro privacy e non mostra riflessioni o pratiche come se fossero state caricate. Chromium con IndexedDB verifica errore remoto, tag privato, modifica e salvataggio locale, limite di creazione e retry senza perdita del testo. Build, test:repository, test:local-pages, test:common-periods, test:local-common, test:release, test:diary-goals e test browser P73/P70 superati. È recupero delle sole voci in outbox dopo un errore, non riapertura completa dell'archivio né apertura senza verifica identità; capability server disattivate e collaudo Google aperto.

## Anteprime Settimana e Abitudini — 30 ottobre

La cache dei dati comuni conserva anche fotografie per settimana selezionata e, per Abitudini, per settimana e giorno selezionati. Verifica intervalli esatti, incluse due settimane distinte per le registrazioni, appartenenza e versioni dei record. Durante la lettura Google sospesa, le due viste possono mostrare un'anteprima datata non modificabile; navigazione o cambio scope ne impediscono l'uso tardivo. Il limite condiviso resta otto descrittori e le anteprime del diario precedenti rimangono leggibili. IndexedDB passa a v9 per impedire ai client precedenti di aprire i nuovi descrittori; il test di migrazione v8 conserva bozze e outbox. Chromium verifica risposte reali di Demo, periodi disgiunti, copertura errata e anteprime; build, test:local-common, test:common-periods, test:local-pages, test:repository, test:local-search-persistence, test:sync-consumer e test:release superati. Non è riapertura modificabile completa né collaudo Google; client precedenti non aprono lo schema v9.

## Più periodi dei dati comuni — 30 ottobre

La copia conserva fino a otto descrittori `common-journal/v1` in `common-journals/v1`, ordinati per acquisizione e selezionati per mese e giorno esatti. Il descrittore singolo precedente resta leggibile ed è trasferito atomicamente alla prima nuova acquisizione. Un salvataggio generico di dati comuni invalida tutte le anteprime; durante acquisizioni indipendenti i descrittori precedenti validi avanzano di revisione conservando la data originaria. Le letture ricostruiscono ogni anteprima nella stessa transazione e rifiutano record mancanti o di versione diversa; nessuna coerenza remota fra periodi è implicita. Il limite rimuove solo il descrittore, non bozze o record. Test Chromium copre periodi multipli, eviction, migrazione, cambio di versione condivisa e riavvio browser; build, test:local-common, test:local-pages, test:repository, test:sync-consumer e test:release superati. Le anteprime restano in sola lettura, la capability e il collaudo Google restano aperti.

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

## Riattivazione esplicita, 30 ottobre

Una copia con checkpoint valido viene aperta prima della sincronizzazione in background; un errore di rete successivo non la cancella. La copia marcata per ricostruzione richiede prima il bootstrap. Test browser con IndexedDB reale e consumer simulato, build, test:repository, test:identity, test:sync-consumer, test:local-pages e test:release superati. La riapertura automatica e il collaudo nell’iframe Google restano aperti.

## Consenso per riattivazione automatica, 30 ottobre

Dopo attivazione esplicita, un indicatore browser consente di verificare nuovamente l’identità all’avvio; la copia si riattiva solo se il consenso esiste nello scope verificato. Un altro principal o verifica rifiutata non ereditano il consenso. Test Chromium con IndexedDB, build, test:repository, test:identity, test:sync-consumer, test:local-pages e test:release superati. La verifica identità richiede RPC: la riapertura senza RPC bloccante e il collaudo iframe restano aperti.

La disattivazione segnala la revoca alle altre schede tramite storage event; le copie si fermano preservando le bozze, e una verifica identità già in corso non può riattivarle. Test con due pagine Chromium e IndexedDB, build, test:repository, test:identity, test:sync-consumer, test:local-pages e test:release superati. Il partizionamento dell’iframe Google resta da collaudare.

La copia attiva e il consumer sono vincolati allo scope verificato all’apertura: un cambio di identità non apre automaticamente il nuovo scope. Test browser con IndexedDB, build, test:repository, test:identity, test:sync-consumer, test:local-pages e test:release superati. La gestione di contenuti già visualizzati dopo revoca e il collaudo Google restano aperti.

La perdita della verifica o il cambio di scope mascherano e disabilitano la schermata della copia attiva; la verifica dello scope originario la ripristina mantenendo le digitazioni aperte. Test Chromium su cambio scope e verifica fallita, build, test:repository, test:identity e test:release superati. La verifica temporaneamente indisponibile blocca la schermata fino al ripristino; l’iframe Google resta da collaudare.

## Collegamento alla copia attivata, 30 ottobre

L’attivazione collega le cache di pagine e dati comuni all’interfaccia e la disattivazione le scollega. Le pagine accettano versioni commit-N e controllano la versione del corpo canonico separatamente dai metadati. Test browser con IndexedDB verifica la pagina riaperta mentre la risposta remota è sospesa; build, test:repository, test:identity, test:sync-consumer, test:local-views, test:local-common, test:local-pages e test:release superati. L’anteprima resta non modificabile e non sostituisce una verifica Google.
