# Passaggio di consegne — 17 ottobre 2026

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

## Avviso durante il ripristino della copia locale — 4 novembre

All'avvio, se questo browser ha già il consenso alla copia locale, la UI
annuncia con un messaggio accessibile che sta verificando l'identità e che i
contenuti si apriranno solo dopo la conferma. L'avviso viene rimosso al termine
della verifica o del ripristino. Nessuna lettura locale avviene prima della
verifica dello scope. Build, test:repository, test:local-pages,
test:local-common, test:progressive, test:diary-goals e `git diff --check`
superati. `test:release` inizialmente falliva: Demo azzera le giornate al reload,
mentre i test presumevano riflessioni già presenti. Corrette le fixture di
verify-v201-opening e verify-v202-disclosures: la prima ricrea la riflessione
dopo il reload, la seconda la crea esplicitamente prima dei controlli.
Conservati i controlli su preferenze, bozze, salvataggio e layout; tutte e tre
le verifiche di `test:release` ora superate. Nessun deploy o accesso ai dati reali.

## Prima pagina locale modificabile — 30 ottobre

La prima pagina verificata nella copia può essere modificata tramite outbox mentre si attende il remoto: è indicata come datata e incompleta, applica le operazioni locali e conserva la versione originale per rilevare conflitti. Bloccato il bypass diretto dopo disattivazione e corretto l'editor dopo un primo salvataggio locale. Test Chromium/IndexedDB con due modifiche, cancellazione pendente e risposta tardiva, build, test:repository, test:local-pages, test:release, test:progressive, test:diary-goals e P70 superati. È una pagina parziale, senza collaudo Google; capability disattivate. Dettagli in VERIFICA-PAGINE-LOCALI-DIARIO.md.

## Diario locale durante la lettura remota — 30 ottobre

Le voci visibili in outbox possono aprirsi e restare modificabili mentre si attende la prima pagina remota; l'interfaccia indica che l'elenco è incompleto. Test Chromium/IndexedDB verifica editor, focus, selezione, testo e privacy anche con risposte tardive; build, test:repository, test:local-pages, test:release, test:progressive e P70 superati. L'identità va ancora verificata e la pagina completa richiede il remoto; capability disattivate e collaudo Google aperto. Dettagli in VERIFICA-PAGINE-LOCALI-DIARIO.md.

## Recupero del diario dall'outbox — 30 ottobre

Se il primo caricamento del diario fallisce, una copia locale attiva e verificata può riaprire le note/task in outbox per il mese, in una vista incompleta modificabile. Le modifiche restano locali e il retry preserva il testo; l'aggiunta di voci attende la pagina remota. Chromium verifica privacy e salvataggio locale; build, test:repository, test:local-pages, test:common-periods, test:local-common, test:release, test:diary-goals e P73/P70 superati. Non è riapertura completa né collaudo Google. Dettagli in VERIFICA-PAGINE-LOCALI-DIARIO.md.

## Anteprime locali Settimana e Abitudini — 30 ottobre

La cache dei dati comuni supporta anche settimana e giorno selezionati, con intervalli esatti e anteprime datate non modificabili mentre si attende Google. IndexedDB v9 separa i nuovi descrittori dai client precedenti e migra bozze/outbox senza cancellarle. Test Chromium con risposte Demo e migrazione v8, build, test:local-common, test:common-periods, test:local-pages, test:repository, test:local-search-persistence, test:sync-consumer e test:release superati. Restano riapertura modificabile e collaudo Google. Dettagli in VERIFICA-PAGINE-LOCALI-DIARIO.md.

## Fotografia locale per ACK — 30 ottobre

Il repository legge bozza e operazioni attive di una voce nella stessa transazione IndexedDB; le viste usano la fotografia per gestire ACK upsert e delete. Test Chromium verifica la transazione e le modifiche tra repository condivisi; build, test:repository, test:sync-consumer, test:local-search-persistence e test:release superati. La vista non è atomica con scritture successive alla lettura; collaudo Google aperto. Dettagli in VERIFICA-OUTBOX-LOCALE.md.

## ACK upsert e modifiche tra schede — 30 ottobre

Gli ACK normali e riconciliati controllano bozza e coda condivise prima di aggiornare la vista, conservando modifiche successive anche se la scheda che riceve la conferma non ne conosceva la revisione. Test Chromium con due repository IndexedDB e blocco editor, build, test:repository, test:sync-consumer e test:release superati. Scritture successive al controllo e collaudo Google restano limiti aperti. Dettagli in VERIFICA-OUTBOX-LOCALE.md.

## Ricreazione dopo cancellazione — 30 ottobre

La ricreazione di una bozza dopo tombstone assegna un nuovo ID di voce e di blocco, evitando collisioni con la precedente creazione. Test end-to-end con Chromium, IndexedDB e server simulato verifica cancellazione, modifica successiva, conflitto e nuova creazione con formattazione conservata; build, test:repository, test:sync-consumer, test:entry-create e test:release superati. I collegamenti precedenti non vengono ripristinati; collaudo Google ancora aperto. Dettagli in VERIFICA-OUTBOX-LOCALE.md.

## ACK delete e lavoro locale successivo — 30 ottobre

La vista verifica bozza e coda prima di rimuovere una voce dopo ACK delete; conserva modifiche successive o testo sporco e può ripristinare una voce presente nell'upsert di un'altra scheda. Chromium verifica due repository IndexedDB condivisi, storage indisponibile e cambio scope; build, test:repository, test:sync-consumer e test:release superati. La vista non è transazionale con scritture successive alla verifica; la risoluzione dopo tombstone e il collaudo Google restano aperti. Dettagli in VERIFICA-OUTBOX-LOCALE.md.

## Cancellazioni con risposta incerta — 30 ottobre

Il dispatcher può verificare una cancellazione contro piano, ricevuta e tombstone con scope e versione originari; una risposta «già assente» senza prova diventa conflitto. Build, test:repository, test:entry-controller, test:tracing e test:release superati, incluso il browser con IndexedDB e server simulato. Restano aperti retention e collaudo Google; capability operations disattivata. Dettagli in VERIFICA-OUTBOX-LOCALE.md.

## Riconciliazione degli upsert incerti — 30 ottobre

Il dispatcher verifica la ricevuta dopo una risposta persa o invalida e conferma solo un commit coerente con richiesta e scope; la baseline e le modifiche successive restano conservate. Test dispatcher, IndexedDB e server simulato end-to-end, build, test:repository, test:identity, test:entry-controller e test:release superati. Gli esiti senza prova mantengono la gestione precedente; retention, cancellazioni e collaudo Google restano aperti. Capability operations disattivata. Dettagli in VERIFICA-OUTBOX-LOCALE.md.

## Endpoint di verifica ricevuta — 30 ottobre

L'endpoint read-only `getJournalOperationReceipt` verifica richiesta originale e scope autorizzato per una voce, restituendo solo stato e versione verificata; l'assenza resta incerta. Test controller/Sheets simulato, build, test:entry-controller, test:entry-migration, test:commits, test:tracing e test:release superati. L'integrazione con l'outbox e il collaudo Google restano aperti; capability operations disattivata. Dettagli in VERIFICA-OUTBOX-LOCALE.md.

## Impronta della richiesta originale — 30 ottobre

I nuovi piani di pagina con operationId esplicito conservano l'impronta della richiesta originale; gateway e controller interni la confrontano prima di restituire la ricevuta verificata. Piani precedenti senza impronta rimangono incerti. Build, test:entry-migration, test:entry-browser, test:entry-controller, test:commits e test:release superati; il browser test fissa l'orologio alla data della fixture. Endpoint e integrazione outbox restano da completare. Dettagli in VERIFICA-OUTBOX-LOCALE.md.

## Ricevuta e piano della pagina — 30 ottobre

Il gateway Entries confronta la pagina normalizzata con il piano salvato e la richiesta canonica con la ricevuta, senza scritture. Un piano o ricevuta assente resta incerto. Build, test:commits, test:commit-storage, test:commit-capacity, test:release e test del gateway Entries superati. Mancano derivazione dalla richiesta originale, endpoint e integrazione outbox. Dettagli in VERIFICA-OUTBOX-LOCALE.md.

## Lettura interna delle ricevute — 30 ottobre

Il protocollo può leggere senza scritture una ricevuta verificata del principal corrente, distinguendo commit, conflitto e assenza incerta. Test in memoria e Sheets simulato, build, test:commits, test:commit-storage, test:commit-capacity e test:release superati. La riconciliazione dell'outbox non è ancora completa: restano confronto con il payload originale, endpoint autorizzato, gestione degli esiti incerti e integrazione client. Dettagli in VERIFICA-OUTBOX-LOCALE.md.

## Baseline obbligatoria per ACK locale — 30 ottobre

Il repository rifiuta atomicamente gli ACK di upsert privi di versione server non vuota, proteggendo bozza e dipendenze anche per chiamate dirette. Chromium/IndexedDB verifica il rollback e una successiva conferma valida; build, test:repository, test:sync-consumer e test:release superati. Non è una verifica dell'esito remoto; capability operations spenta e collaudo Google aperto. Dettagli in VERIFICA-OUTBOX-LOCALE.md.

## Risposta di salvataggio senza baseline — 30 ottobre

Il dispatcher rifiuta come `ProtocolCorrupt` le risposte di salvataggio con versione vuota, solo spazi, troppo lunga o risultati duplicati per clientId; nessun ACK e bozza conservata. Test unitario e Chromium/IndexedDB, build, test:repository e test:release superati. L'esito remoto può rimanere incerto; riconciliazione automatica e collaudo Google restano aperti. Dettagli in VERIFICA-OUTBOX-LOCALE.md.

## Intervallo di commit a limite fisso — 30 ottobre

L'ispezione interna dei commit può fissare `upperSequence` fra pagine, escludendo commit successivi e riportando separatamente il massimo corrente. Test in memoria e Sheets simulato coprono append fra pagine e assenza di scritture; build, test:commits, test:commit-storage, test:commit-capacity e test:release superati. Non è una fotografia coerente dello stato corrente né un checkpoint o un'autorizzazione alla retention. Dettagli in VERIFICA-CAPACITA-COMMIT.md.

## Validazione delle pagine dell'inventario — 30 ottobre

Il protocollo rifiuta risposte incoerenti dell'adattatore di inventario: cursore fermo o oltre limite, limite superiore modificato, conteggi impossibili e ricevute incomplete. Test con Sheets simulato verificano il rifiuto senza scritture; build, test:commit-capacity, test:commits, test:commit-storage e test:release superati. La scansione resta parziale, senza checkpoint coerente o autorizzazione a eliminare dati. Dettagli in VERIFICA-CAPACITA-COMMIT.md.

## Inventario limitato delle ricevute — 30 ottobre

Il protocollo offre un inventario interno in sola lettura delle ricevute, incluse quelle di conflitto senza commit, tramite pagine di al massimo 25 righe fisiche dell'indice Sheets. Ogni risultato è limitato all'archivio e principal verificati; il limite superiore resta fisso fra pagine. Test con Sheets simulato verifica isolamento, ricevute tardive, transazioni pending e assenza di scritture; build, test:commits, test:commit-storage, test:commit-capacity e test:release superati. È una scansione fisica parziale, non un checkpoint coerente né una prova di eliminabilità; non esiste una RPC pubblica o manutenzione automatica.

## Baseline delle ricevute di conflitto — 30 ottobre

L'ispezione read-only di operationId noti verifica anche che ogni versione effettivamente osservata da una ricevuta di conflitto sia presente nel commit storico e coerente con l'entità corrente; riporta quanti riferimenti esistono e quanti sono ancora correnti. Un riferimento mancante o incoerente blocca il controllo senza scritture. Test sul protocollo e sull'adattatore Sheets simulato, build, test:commits, test:commit-storage, test:commit-capacity e test:release superati. Le assenze originarie non sono dimostrate storicamente; inventario completo, retention e compattazione fisica restano aperti.

## Ispezione ricevuta senza alias — 30 ottobre

L'ispezione read-only di un operationId con ricevuta committed ora riporta la sequenza del commit verificato direttamente anche se l'alias è assente, mantenendo `aliasPresent:false`. Un test con store simulato verifica il caso e l'assenza di scritture; build, test:commits, test:commit-storage, test:commit-capacity e test:release superati. L'ispezione non inventaria le ricevute di conflitto né autorizza retention o eliminazioni.

## Associazione allegati nel feed — 30 ottobre

Se un aggiornamento del feed contiene un allegato associato a una voce diversa, il consumer aggiorna l'indice di ricerca sia per la vecchia voce sia per la nuova. Test Chromium con IndexedDB e feed sintetico verifica che il titolo compaia solo nella nuova associazione; build, test:sync-consumer, test:repository e test:release superati. Non è stato introdotto un comando di spostamento allegati né verificato il comportamento Google.

## Task locali nei risultati di ricerca — 30 ottobre

I risultati con bozza mostrano tag, progetti, stato, pianificazione e formattazione della copia locale. La checkbox dei task locali è disabilitata e protetta anche dagli eventi sintetici: per cambiarne lo stato si apre il diario, evitando un invio diretto che scavalchi l'outbox. Chromium verifica metadati locali e assenza di scritture dirette; build, test:repository, test:sync-consumer e test:release superati. La modifica è locale e non abilita la capability Google.

## Progetti delle bozze nella ricerca — 30 ottobre

La ricerca indicizza anche slug e nomi dei progetti scelti in una bozza locale non sincronizzata e li include nei riferimenti usati per le rinomine. Il formato di ricerca persistito passa a 3: i marker precedenti causano una ricostruzione, senza migrazione o cancellazione delle bozze. Test Chromium con IndexedDB e feed simulato verifica ricerca e rinomina di un progetto presente solo nella bozza; build, test:local-search, test:local-search-persistence, test:sync-consumer, test:repository e test:release superati. La ricerca conserva anche i termini della versione remota per il confronto; collaudo Google ancora aperto.

## Progetti e delta della ricerca — 30 ottobre

L'indice in memoria mantiene anche i collegamenti progetto→voci, aggiornandoli su inserimento, rimozione e ripristino. Un cambio progetto nel feed usa questi riferimenti per aggiornare i documenti di ricerca senza leggere tutte le Entries da IndexedDB; le voci cambiate nello stesso feed sono comunque aggiornate. Test unitario e Chromium con worker verificano rinomina e assenza della scansione; build, test:local-search, test:sync-consumer, test:repository, test:local-search-scale e test:release superati. Il rebuild iniziale resta completo; il collaudo Google è aperto.

## Letture mirate per il delta di ricerca — 30 ottobre

IndexedDB v8 aggiunge l'indice degli allegati per archivio, collezione e voce. Il refresh dell'indice per ID legge soltanto allegati, bozze, operazioni attive e progetti pertinenti, a gruppi di 25 voci; il rebuild iniziale e la ricerca delle voci coinvolte da un progetto modificato possono ancora scandire l'archivio. Test Chromium verifica aggiornamento di una voce senza scansione globale, ricerca negli allegati e migrazione di allegati già presenti; build, test:sync-consumer, test:repository, test:local-search-persistence e test:release superati. Nessuna misura o collaudo Google; client precedenti non aprono lo schema v8.

## Identità provvisoria dopo errore locale — 30 ottobre

Per una nuova voce, se la lettura preliminare fallisce o la transazione di accodamento fallisce con errore sicuramente concluso, l'editor ripristina ID e data di creazione precedenti mantenendo il testo. Un timeout o errore dall'esito incerto conserva l'ID per evitare una nuova identità. Test Chromium simula lettura fallita, quota, timeout e successo; build, test:repository e test:release superati. Il test usa un repository simulato; il percorso di invio remoto alternativo e la riconciliazione di esiti incerti restano aperti.

## Protezione delle voci locali nel salvataggio remoto — 30 ottobre

Se la copia viene disattivata, il salvataggio diretto blocca le voci della pagina marcate come locali in attesa/conflitto o con identità non ancora confermata; il testo rimane modificabile. Il messaggio dopo errore di storage invita a riprovare il salvataggio locale, senza suggerire un bypass della coda. Test Chromium verifica i due blocchi e una normale creazione remota; build, test:repository e test:release superati. La protezione considera lo stato presente nella pagina: una verifica affidabile della coda fra schede e l'invio remoto esplicito in caso di storage indisponibile restano aperti.

## Risposte tardive della ricerca locale — 30 ottobre

La schermata scarta i risultati di una ricerca locale se nel frattempo cambiano la privacy visualizzata, la navigazione, il consenso o lo scope verificato. Il test Chromium sospende la risposta e verifica cambio privacy, revoca e cambio principal, oltre al rendering del risultato ancora valido. Build, test:repository, test:sync-consumer e test:release superati. La prova usa Demo e un consumer simulato; collaudo iframe Google ancora aperto.

## Normalizzazione privacy nella ricerca — 30 ottobre

Il filtro della ricerca locale normalizza gli spazi nei tag privati anche nel percorso senza worker e con filtro di visibilità personalizzato, come nel worker. Test Chromium/IndexedDB verifica una bozza con tag `tag privato` rispetto all'impostazione `tag-privato` in tutti e tre i percorsi; build, test:sync-consumer, test:identity, test:local-search e test:release superati. Anche `npm test` è terminato con successo dopo la correzione del gateway Entries; l'ultima modifica privacy è stata apportata durante l'esecuzione e verificata successivamente con i test mirati. Nessun collaudo Google.

## Privacy durante la ricerca locale — 30 ottobre

La ricerca controlla revisione e freschezza prima e dopo il filtro privacy e verifica nuovamente lo scope completo; se una modifica concorrente invalida l'indice, non restituisce i risultati della fotografia precedente. Chromium/IndexedDB verifica che una bozza resa privata durante la ricerca non venga esposta e che il tentativo successivo la escluda. Build, test:sync-consumer, test:repository, test:local-search-persistence e test:release superati. La suite completa avviata nel passaggio precedente è ancora in esecuzione; non è un collaudo Google.

## Cancellazione senza operationId esplicito — 30 ottobre

La suite completa ha rilevato che il gateway Entries rifiutava l'assenza della proprietà `operationId`, pur prevedendo un identificativo deterministico di compatibilità. La validazione accetta ora sia l'input con operationId sia quello senza, continuando a rifiutare campi estranei. Test controller e gateway di migrazione con 165 guasti alla preparazione e 198 al commit, build e test:release superati. La suite completa è stata rilanciata; nessun collaudo Google o modifica dei dati reali.

## Ricostruzioni concorrenti della ricerca — 30 ottobre

Ogni aggiornamento dell'indice usa un token di scrittura verificato in IndexedDB. Un delta non subentra a un lavoro incompleto; una ricostruzione completa può sostituirlo e il token precedente non può più scrivere né pubblicare. Chromium verifica anche due consumer sovrapposti e il recupero dell'indice vincente. Build, test:sync-consumer, test:local-search-persistence, test:repository e test:release superati. Il protocollo non coordina client vecchi che non conoscono il token; restano capability spente e collaudo Google.

## Bozze generiche e indice — 30 ottobre

Le API generiche di scrittura e cancellazione delle bozze `note`/`task` invalidano atomicamente la revisione dell'indice, come già avviene per l'outbox. Le altre categorie di bozze, non indicizzate dalla ricerca, mantengono il comportamento precedente. Chromium/IndexedDB verifica scrittura e cancellazione durante il sync, ricostruzione al retry e rollback della bozza se l'aggiornamento dei metadati fallisce. Build, test:sync-consumer, test:repository, test:local-common, test di migrazione bozze e test:release superati. Rimane il collaudo Google.

## Indice e scritture concorrenti — 30 ottobre

Il consumer vincola il delta dell'indice alla revisione effettivamente letta: una scrittura locale concorrente durante checkpoint, feed, idratazione o aggiornamento dell'indice interrompe il tentativo, lasciando la ricerca da ricostruire al successivo sync. Test Chromium con IndexedDB inserisce una bozza mentre il checkpoint è sospeso e verifica conflitto, indice non aggiornato e recupero della bozza al tentativo seguente. Build, test:sync-consumer, test:repository, test:local-search-persistence e test:release superati. La verifica riguarda il percorso della coda, che incrementa la revisione; restano da valutare separatamente le bozze scritte con API generiche e il collaudo Google.

## Recupero corpi senza scansione a ogni tick — 30 ottobre

Il consumer scandisce le voci per recuperare corpi canonici mancanti al primo sync, dopo modifiche di revisione esterne o dopo un'interruzione; quando la revisione resta invariata, i tick successivi idratano soltanto i corpi indicati dal feed. Se una scrittura concorre durante il recupero, la revisione non viene certificata per il tick successivo. Chromium/IndexedDB verifica assenza della scansione ripetuta, recupero dopo modifica esterna e retry dopo errore. Build, test:sync-consumer, test:repository e test:release superati. Il primo recupero resta proporzionale all'archivio; non sono state misurate prestazioni Google.

## Più periodi dei dati comuni — 30 ottobre

La cache conserva fino a otto anteprime comuni per mese e giorno corrente, con migrazione del precedente descrittore singolo. Sono fotografie indipendenti e datate: se un record condiviso cambia versione, la vecchia anteprima diventa un miss. Test Chromium verifica più periodi, limite, migrazione, versione condivisa e riavvio; build, test:local-common, test:local-pages, test:repository, test:sync-consumer e test:release superati. Rimangono aperti riapertura completa delle viste e collaudo Google; la cache non rende modificabili le anteprime.

## Rinnovo lease prima degli invii — 30 ottobre

Prima di ogni RPC il dispatcher rinnova la lease solo se owner e token sono ancora validi e non scaduti. Se un'altra scheda ha preso il controllo, il vecchio dispatcher non avvia la voce successiva né rilascia la lease altrui. Test Chromium con IndexedDB verifica rinnovo, esclusione, scadenza e takeover; build, test:repository, test:identity e test:release superati. Una RPC già avviata può superare la lease: l'esito resta recuperabile mediante operationId e non è garantita l'assenza di invii duplicati. Collaudo Google ancora aperto, capability disattivate.

## Lease dopo verifica identità — 30 ottobre

Il dispatcher acquisisce la lease con l'ora successiva alla verifica identità: una verifica lenta non ne consuma anticipatamente la durata. Test con orologio simulato e Chromium/IndexedDB reale coprono una verifica di 70 secondi, claim e ACK. Build, test:repository, test:release e git diff --check superati. Rimangono aperti la durata effettiva della lease durante attese successive e il collaudo con server Google; le capability restano disattivate.

## Collegamento cache pagine e versioni canoniche — 30 ottobre, pacchetti 7 e 9 parziali

L’attivazione collega al diario le cache delle pagine e dei dati comuni usando lo scope verificato; la disattivazione le scollega. I descrittori accettano versioni commit-N e la cache verifica separatamente la versione del corpo, anche se opaca e diversa dalla versione dei metadati. Test Chromium con IndexedDB verifica attivazione, pagina conservata e anteprima mentre la risposta remota è sospesa; il consumer prova una versione corpo canonica. Build, test:repository, test:identity, test:sync-consumer, test:local-views, test:local-common, test:local-pages e test:release superati. Le anteprime rimangono non modificabili e il collaudo iframe Google resta aperto.

## Schermata dopo verifica identità fallita — 30 ottobre

Se la copia attiva perde la verifica o passa a un altro scope, l’interfaccia viene mascherata e resa inattiva senza eliminare il DOM o le digitazioni aperte. Una nuova verifica dello scope originario ripristina la stessa schermata; il dispatcher aggiorna il controllo anche durante le proprie verifiche. Build, test:repository, test:identity, test:sync-consumer, test:local-pages e test:release superati. Una indisponibilità temporanea della verifica blocca la schermata fino a nuova verifica; rimane il collaudo iframe Google.

## Scope della copia attiva — 30 ottobre

La copia attivata e il consumer restano vincolati allo scope verificato al momento dell’apertura: un cambio di principal, archivio, epoca o versione non li fa passare automaticamente al nuovo spazio. Test browser con IndexedDB verifica il rifiuto e il ritorno allo scope verificato. Build, test:repository, test:identity, test:sync-consumer, test:local-pages e test:release superati. La gestione dell’interfaccia già visualizzata dopo revoca e il collaudo Google restano da completare.

## Scope del dispatcher — 30 ottobre

Il dispatcher fissa archivio, principal, epoca e versioni di protocollo all’avvio del lotto e interrompe claim/ACK/rilascio se cambiano durante verifica o RPC. Un invio dall’esito incerto rimane recuperabile nello scope originale. Test con due scope nello stesso IndexedDB e test dispatcher, build, test:repository, test:identity e test:release superati; collaudo Google ancora aperto.

## Revoca della copia fra schede — 30 ottobre

La rimozione del consenso in una scheda ferma la copia attiva nelle altre, attendendo i lavori in corso e preservando bozze/outbox. Una revoca durante la verifica identità impedisce la riattivazione automatica. Test con due pagine Chromium e IndexedDB, build, test:repository, test:identity, test:sync-consumer, test:local-pages e test:release superati. Il comportamento di storage e partizionamento nel vero iframe Google resta da collaudare.

## Consenso e riattivazione automatica — 30 ottobre, pacchetto 7 parziale

L’attivazione esplicita salva un consenso nello scope IndexedDB e un indicatore privo di identificativi nel browser. All’avvio l’app riverifica identità e capability, quindi riattiva solo se lo scope verificato contiene il consenso; disattivare elimina l’indicatore. Chromium con IndexedDB verifica consenso, cambio principal, rifiuto identità e conservazione del consenso durante bootstrap interrotto. Build, test:repository, test:identity, test:sync-consumer, test:local-pages e test:release superati. La verifica dell’identità richiede ancora una RPC e il collaudo nell’iframe Google resta aperto.

## Riattivazione della copia esistente — 30 ottobre, pacchetto 7 parziale

Dopo verifica dell’identità e attivazione esplicita, una copia con checkpoint valido è resa disponibile senza attendere la sincronizzazione remota; lo scheduler aggiorna in background e un errore remoto non cancella la copia. Una copia marcata per ricostruzione non viene attivata prima del bootstrap. Test Chromium con IndexedDB reale e consumer simulato, build, test:repository, test:identity, test:sync-consumer, test:local-pages e test:release superati. La riapertura automatica, le altre viste e il collaudo nell’iframe Google restano aperti.

## Lettura a gruppi delle dipendenze — 30 ottobre

Il claim legge fino a 32 candidati per stato e risolve le dipendenze in gruppo, conservando FIFO e limite del lotto. Test Chromium attraversa il confine fra gruppi con 40 operazioni bloccate; build, test:repository, test:release e test:outbox-scale superati. Su 1.000 righe sintetiche, 30 ripetizioni e Chromium/Linux/i7-1370P, p95 con dipendenze distinte 93,2 ms (precedente 410,6 ms); tutte pronte 5,0 ms, dipendenza condivisa 31,1 ms. Misure non alternate, non rappresentano Google; la scansione resta proporzionale ai candidati bloccati.

## Cache delle dipendenze nel claim — 30 ottobre

Il claim riusa nella sola transazione fino a 256 esiti di dipendenze; l’ACK successivo è letto correttamente in una nuova transazione. Build, test:repository, test:release e test:outbox-scale superati. Con 1.000 operazioni sintetiche e 30 ripetizioni, Chromium/Linux/i7-1370P misura p95 29,7 ms con dipendenza bloccata condivisa (precedente misura 568,1 ms); con dipendenze tutte distinte p95 410,6 ms. Misure non alternate, nessuna stima della latenza Google; il caso con dipendenze distinte resta costoso.

## Misura claim outbox — 30 ottobre

`npm run test:outbox-scale` usa Chromium 156.0.8078.4 su Linux x64, Intel i7-1370P, 1.000 operazioni sintetiche, lotto 5 e 30 ripetizioni per scenario. Tutte inviabili: p50 2,0 ms, p95 3,7 ms; tutte bloccate: p50 375,3 ms, p95 568,1 ms (massimo 578,0 ms). Il test è locale, non rappresenta latenza Google e mostra che le dipendenze bloccate richiedono una scansione costosa; restano da progettare limite di tempo e avanzamento senza starvation.

## Selezione della coda con cursori — 30 ottobre

Il claim legge pending e sending con cursori, conserva al massimo due volte il limite del lotto e seleziona in ordine le operazioni le cui dipendenze sono confermate. Un test Chromium con 1.000 pending, 20 dipendenze bloccate e un invio scaduto verifica ordine, recupero e assenza di getAll sugli stati. Build, test:repository e test:release superati. La scansione delle operazioni bloccate può ancora richiedere tempo proporzionale alla coda; nessun collaudo Google.

## Rilascio della lease e ripetizione — 30 ottobre

Il rilascio della lease scorre soltanto le operazioni sending; Riprova invio cerca soltanto le operazioni attive della voce. Test Chromium verifica l’indice di rilascio e il retry UI; build, test:repository e test:release superati. Le code sending/attive molto grandi restano da misurare.

## Indice coda per voce e stato — 30 ottobre

IndexedDB v7 aggiunge un indice per archivio, voce e stato. Salvataggi e cancellazioni leggono solo le operazioni attive della voce; accorpamento e ACK cercano i soli pending della stessa voce. La migrazione v6→v7 è verificata in Chromium con 1.001 operazioni confermate e una pending conservate; build, test:repository, test:local-search-persistence e test:release superati. Le code attive possono comunque crescere e resta da misurarne la scala.

## Letture della coda attiva — 30 ottobre

Salvataggi e cancellazioni leggono l’indice delle sole operazioni attive; l’ACK cerca dipendenze soltanto nella stessa entità, senza scorrere l’intera coda dell’archivio. Build, test:repository e test:release superati; test IndexedDB verifica l’indice usato. Rimangono da misurare e limitare gli storici della singola entità e il numero di operazioni ancora attive.

## Modifica dopo invio incerto — 30 ottobre

Una nuova modifica dipende anche da un’operazione tornata pending dopo timeout; non viene inviata prima del suo ACK. L’accorpamento è consentito solo quando la mutazione non tentata dipende dalle altre operazioni attive. Test Chromium con IndexedDB copre timeout, seconda modifica, claim e aggiornamento versione dopo ACK. Build, test:repository e test:release superati; collaudo Google ancora aperto.

## Ispezione degli intervalli di commit — 30 ottobre, pacchetto 12 parziale

Il protocollo ispeziona in sola lettura fino a 25 commit consecutivi, controllando ricevute, alias e revisioni attuali incluse le tombstone; i dati mancanti o incoerenti bloccano il controllo. Build, test:commits, test:commit-storage e test:commit-capacity superati su backend simulati. Il rapporto non autorizza eliminazioni e non copre ricevute di conflitto, baseline Docs, checkpoint o retention fisica.

## Ispezione delle ricevute — 30 ottobre, pacchetto 12 parziale

Il protocollo offre una verifica interna di sola lettura per massimo 25 operationId del principal corrente: controlla ricevuta, commit e alias e rifiuta il controllo con una transazione pending. Non ripara né elimina dati. Build, test:commits, test:commit-storage e test:commit-capacity superati con store simulati. Non è un inventario completo né definisce la finestra di retention; restano grafo, checkpoint, compattazione fisica e collaudo Google.

## Apertura delle bozze nei risultati — 30 ottobre

I pulsanti dei risultati trasmettono la voce selezionata anche se non è già nello stato della vista. Una voce con bozza locale apre il contenuto IndexedDB senza lettura Google, anche quando esiste una versione remota; il dettaglio rimanda al diario. Build, test:repository, test:sync-consumer e test:release superati, con test browser che attiva i pulsanti reali.

## Apertura risultati solo locali — 30 ottobre

Una voce trovata nella ricerca e non ancora presente nella copia remota si apre leggendo la bozza IndexedDB, senza chiamare Google. Il dettaglio mostra il contenuto e consente di aprire il diario; la versione sintetica dell’indice non viene usata come versione server per l’eliminazione. Build, test:repository, test:sync-consumer e test:release superati, incluso test browser; capability ancora disattivate nel manifest.

## Ricerca dopo ACK di cancellazione — 30 ottobre

Una cancellazione confermata resta esclusa dalla ricerca anche prima dell’arrivo del feed remoto; una cancellazione in conflitto resta visibile. Test Chromium con IndexedDB verifica pending, conflitto, risoluzione e ACK. Build, test:sync-consumer, test:repository, test:local-search e test:release superati; collaudo Google ancora aperto.

## Pausa e ripresa — 29 ottobre

Il goal era stato messo in pausa su richiesta dell’utente ed è stato riattivato il 30 ottobre. Le modifiche restano nel worktree e non sono state pubblicate. Prima della pausa è stata completata la tranche sulla ricerca locale: una cancellazione pending/sending nasconde la voce dai risultati; se un’operazione della voce è in conflitto o fallita, la voce resta visibile per il recupero. I passaggi di stato che cambiano la visibilità invalidano atomicamente l’indice. Test Chromium con IndexedDB e backend simulato verifica la transizione delete pending → conflitto. Build, `test:sync-consumer`, `test:repository`, `test:local-search`, `test:local-search-persistence`, `test:release` e `git diff --check` superati (processo terminato con codice 0).

Alla ripresa: leggere anche `docs/STATO-PIANO-SPEC-004.md` e la SPEC-004; continuare dai requisiti aperti dei pacchetti 7–12, inclusi copertura delle altre mutazioni, retention e verifica con server attivo. Le capability della copia locale restano disattivate nel manifest; nessun deploy o modifica a dati Google è stata eseguita. Le sezioni seguenti sono appunti cronologici: quelle più recenti prevalgono sulle indicazioni precedenti che descrivono funzionalità ancora mancanti.

## Ricerca delle voci solo locali — 29 ottobre

La ricerca indicizza note/task con bozza anche quando non esiste una voce remota. Salvataggio, scarto, ricreazione e ACK invalidano atomicamente l’indice senza invalidare viste remote coerenti; Chromium verifica ricerca, riapertura e scarto. Build, test:sync-consumer, test:repository, test:local-search, test:local-search-persistence e test:release superati. La rappresentazione delle cancellazioni locali nei risultati e il collaudo Google restano da verificare.

## Ripetizione esplicita invio fallito — 29 ottobre

La voce con invio fallito offre Riprova invio: la transazione conserva operationId, payload e numero di tentativi e rimette l’operazione in attesa, con controllo concorrente dello stato. Build, test:repository e test:release superati, inclusi test IndexedDB e UI; resta da definire e verificare la finestra di retention delle ricevute prima dell’abilitazione reale.

## Cancellazione di creazione già tentata — 29 ottobre

Una creazione locale già inviata o tentata può ora ricevere una cancellazione dipendente: l’ACK della creazione aggiorna la versione del delete prima dell’invio. Un test Chromium con IndexedDB verifica claim, accodamento, ACK e claim della cancellazione. Build, test:repository e test:release superati; il server Google non è stato collaudato.

## Retry errori generici di rete — 29 ottobre

Il dispatcher normalizza gli errori temporanei riconosciuti dal messaggio a un codice accettato dal repository: una eccezione generica con timeout resta pending con backoff e bozza conservata. Test Chromium con IndexedDB reale, build, test:repository e test:release superati; collaudo Google ancora necessario.

## Editor dopo risoluzione — 29 ottobre

Scegliendo la bozza locale l’editor mostra il testo accodato e usa la versione remota confrontata come baseline. Le scelte di risoluzione bloccano temporaneamente i controlli durante la transazione per non sovrascrivere digitazioni concorrenti. Build, test:repository, test:release e test UI asincrono superati; collaudo Google ancora necessario.

## Verifica integrata risoluzione conflitto — 29 ottobre

Il test Chromium usa IndexedDB reale e server simulato per seguire salvataggio, risposta di conflitto, scelta locale e ACK sulla versione confrontata; verifica la conservazione della versione remota. Ha rilevato e portato alla correzione della classificazione del messaggio «Voce modificata altrove». Build, test:repository e test:release superati; collaudo Google ancora necessario.

## Conferma eliminazione già avvenuta — 29 ottobre

Quando la lettura conferma che la voce è assente, una cancellazione locale in conflitto può essere chiusa esplicitamente senza un nuovo invio. La transazione controlla revisione e dipendenze, conserva lo storico e invalida la cache. Il salvataggio del delete conserva anche i dati utili a ripresentare la voce in caso di conflitto. Build, test:repository, test:release e test UI mirato superati; collaudo Google ancora necessario.

## Ricreazione voce remota assente — 29 ottobre

Quando il server conferma l’assenza, si può ricreare la bozza con una nuova identità. La transazione verifica revisione e dipendenze, conserva la copia precedente e accoda una creazione; i collegamenti alla vecchia voce non vengono ripristinati. Build, test:repository e test:release superati, incluso test UI; resta il caso di cancellazione locale già soddisfatta e il collaudo Google.

## Rilevazione voce remota assente — 29 ottobre

Il dettaglio accetta allowMissing e restituisce un risultato esplicito quando la voce non esiste; l’interfaccia mostra la bozza separando l’assenza confermata da una lettura fallita. Il recupero non è ancora implementato. Build, test:entry-controller, test:repository e test:release superati; nessun collaudo Google.

## Classificazione conflitti del server — 29 ottobre

Il dispatcher tratta anche i messaggi server «nota cambiata» e «voce non trovata» come conflitti, conservando l’operazione; non deduce la cancellazione da un errore di rete. Build, test:repository e test:release superati. Il recupero di una voce effettivamente eliminata resta da sviluppare e verificare.

## Verifica conflitto a diario aperto — 29 ottobre

Un test Chromium collega dispatcher e handler UI: una cancellazione in conflitto riappare e un testo non salvato resta intatto senza ridisegno. La lettura asincrona controlla anche che la copia locale sia ancora attiva. Build, test:repository e test:release superati con server simulato; collaudo Google ancora necessario. Il controllo intermittente del messaggio è stato sostituito dalla verifica della cancellazione durevole.

## Segnalazione immediata outbox — 29 ottobre

Dopo la registrazione di un conflitto o errore permanente, il dispatcher avvisa la UI; una cancellazione nascosta tenta di ricaricare la voce per il confronto. Con modifiche aperte la UI segnala il problema senza ridisegnare l’editor. Build, test:repository e test:release superati; test mirato del callback dispatcher, percorso UI e Google da verificare ulteriormente.

## Recupero cancellazioni in conflitto — 29 ottobre

Il confronto distingue una cancellazione locale e permette di confermarla sulla versione remota mostrata oppure mantenere la voce Google. La risoluzione conserva la versione remota e crea un nuovo delete condizionato; una revisione locale cambiata o invii incerti bloccano la transazione. Build, test:repository, test:release e test UI mirato superati. La cancellazione remota già avvenuta e il collaudo Google restano aperti.

## Ricostruzione cache invalidata — 29 ottobre

Dopo la scelta remota la ricerca non usa dati invalidati e la sincronizzazione ricostruisce la copia completa. Il marcatore rimane fino al termine dello snapshot: un’interruzione richiede un nuovo bootstrap e conserva bozze e outbox. Build, test:sync-consumer, test:repository e test:release superati con server simulato; collaudo Google ancora necessario.

## Invalidazione cache dopo scelta remota — 29 ottobre

La scelta della versione Google invalida atomicamente le viste locali e l’indice di ricerca, senza avanzare il cursore del feed: la copia precedente non è proposta come aggiornata. Il feed successivo deve ricostruire i dati. Build, test:repository e test:release superati; nessun collaudo Google.

## Scelta della versione Google — 29 ottobre

Il confronto permette anche di mantenere la versione remota: la transazione verifica la revisione della bozza, conserva entrambe le versioni nella cronologia locale e chiude le operazioni compatibili senza inviare modifiche. Build, test:repository, test:release e test UI mirato superati. Restano cancellazioni dipendenti, voce remota cancellata, aggiornamento della cache remota e collaudo Google.

## Recupero della versione locale — 29 ottobre

Dal confronto si può scegliere di inviare la bozza locale sulla versione remota mostrata. La transazione verifica la revisione locale, conserva il contenuto remoto nelle operazioni sostituite e accoda una nuova operazione con base remota; il server resta condizionato alla versione. Build, test:repository, test:release e test UI mirato superati. Restano scelta della versione remota, cancellazioni dipendenti, voce remota cancellata e collaudo Google.

## Confronto dei conflitti — 29 ottobre

Nel diario continuo il comando Confronta le versioni mostra la bozza IndexedDB corrente e la voce remota letta su richiesta, come testo. Se la lettura remota fallisce, la bozza resta conservata. Build, test:repository, test:release e test browser mirato superati. Resta da implementare la scelta e la risoluzione; il confronto non copre una voce remota cancellata.

## Cancellazione dopo conflitto — 29 ottobre

Una cancellazione accodata dopo un conflitto o errore lascia la voce visibile con il suo stato; anche alla riapertura la cancellazione dipendente non nasconde il problema. Build, test:repository e test:release superati. La risoluzione esplicita resta da implementare.

## Riapertura creazioni in conflitto — 29 ottobre

Il diario continuo ripristina una creazione locale in conflitto anche senza voce remota. Se la voce remota esiste, mantiene il contenuto locale separatamente dal contenuto mostrato; il marcatore di conflitto sopravvive a un successivo aggiornamento pending. Build, test:repository e test:release superati. La scelta di risoluzione resta da implementare.

## Dispatcher e IndexedDB asincrono — 29 ottobre

Il dispatcher attende lease, claim, ACK, retry e rilascio del repository asincrono. Un test Chromium usa IndexedDB reale con server simulato e verifica invio, ACK e aggiornamento della baseline. Build, test:repository e test:release superati. Capability server ancora disattivata; nessun collaudo Google.

## Dipendenze dei conflitti outbox — 29 ottobre

Modifiche e cancellazioni successive dipendono anche dalle operazioni in conflitto o fallite, impedendo un invio che le scavalchi. Test browser mirato, build, test:repository e test:release superati; la scelta di risoluzione resta da implementare.

## Outbox note/task collegata alla UI — 29 ottobre, pacchetto 11 parziale

Il diario continuo salva prima la nota/task in `drafts` e `outbox` nella stessa
transazione IndexedDB; mostra «Salvato su questo dispositivo» soltanto dopo il
commit. Le modifiche pending compatibili si accorpano preservando operationId;
le nuove note mantengono l'ID locale attraverso i retry. `createOutboxDispatcher`
invia upsert singoli tramite `saveJournalPage`, con lease, claim, ACK/versione e
retry classificati. L'ACK aggiorna atomicamente baseline draft e operazioni
dipendenti non inviate. Il trasporto parte solo se `operations:true` è verificato
nel manifest. Demo/server dichiara la capability falsa: nessun RPC outbox è
partito. Il dispatcher traduce anche delete in `deleteNote`; il gateway accetta
operationId client-scoped e ripete il receipt/tombstone. Elimina accoda il
delete e nasconde la voce solo dopo il commit IndexedDB; una creazione locale mai inviata può essere eliminata atomicamente con la sua bozza; se è già stata tentata, va prima sincronizzata. La UI non
offre ancora il flusso di risoluzione conflitti. Build, `test:repository`, `test:identity`, `test:entry-controller`,
`test:entry-browser`, `test:release` e diff-check superati; nessun deploy.
[Verifica](VERIFICA-OUTBOX-LOCALE.md).

## ID stabile per create e operationId writer — 29 ottobre, pacchetto 11 parziale

`saveJournalPage` accetta ora un `operationId` opzionale. Il gateway lo usa per
la chiave di piano/ricevuta scoped per principal e conserva il fingerprint del
payload; un retry identico restituisce lo stesso commit, un payload diverso
riusato con quell’ID fallisce `OperationMismatch`. Il percorso senza campo
continua a usare l’ID derivato dal contenuto. I create con operationId riusano
l'ID locale dopo controlli di collisione nelle righe legacy e canoniche; gli
update restano condizionati dalla versione. Build, controller Entries, create
routing, matrice recovery, release e diff-check superati. Il dispatcher non
chiama ancora questo percorso dall'outbox; nessun deploy o RPC Google.

## Coalescing outbox — 29 ottobre, pacchetto 11 parziale

IndexedDB v6 aggiunge `byScopeEntity`. `saveLocalOperation()` può aggiornare
payload e snapshot solo quando trova una sola operazione compatibile della
stessa entità in stato pending, con zero tentativi e stessa baseVersion e
dipendenze; conserva l'operationId già in coda. Un'operazione claimata resta
immutabile e la modifica successiva crea un nuovo ID. Test Chromium copre
coalescing, immutabilità dopo claim e migrazione v2→v6. Build,
`test:repository`, `test:local-search-persistence`, `test:release`, `test:e2e`
e diff-check superati. Nessun deploy o RPC Google.

## Retry outbox con jitter — 29 ottobre, pacchetto 11 parziale

`retryOutboxFailure` classifica `BusyError`, `NetworkError`, `TimeoutError`,
`RateLimit`, `ServiceUnavailable`, `StorageError` e `ProtocolUnavailable` come
transitori e programma full jitter esponenziale da 1 s fino a 300 s. Errori di
conflitto passano a `conflict`; gli altri codici a `failed`. Controllo lease,
classificazione e transizione sono nella stessa transazione. Il test Chromium
fissa il generatore per verificare il limite temporale, la coda bloccata prima
della scadenza e il percorso conflitto. Build, `test:repository`, `test:release`,
`test:e2e` e `git diff --check` superati; nessun deploy o RPC Google. Restano
dispatcher UI/trasporto e mapping degli errori RPC interni.

## Claim outbox e lease cross-tab — 29 ottobre, pacchetto 11 parziale

`archiveMeta` contiene una lease con owner/token ed expiry; le transazioni
serializzate impediscono due claim concorrenti. `claimOutboxBatch` legge gli
stati pendenti/inviati dall'indice `byScopeStatus`, ordina per creazione e
operationId, rispetta dipendenze ACK e `nextAttemptAt`, incrementa i tentativi
e assegna la scadenza. Esiti ACK/retry/conflict/failed sono transizioni fenced
dal token; scadenza o rilascio rendono recuperabili gli invii incerti mantenendo
operationId e payload invariati. Schema IndexedDB v6 aggiunge gli indici di stato e di entità; le
migrazioni precedenti restano additive. Il test Chromium copre contesa tra
schede, dipendenze, backoff/jitter, conflitto, ACK tardivo, recovery e tentativi.
**Non è ancora collegato a un trasporto**: la lease non invia RPC; il protocollo
server idempotente esiste, ma manca il suo adattatore dall'outbox. Build,
repository, release, e2e e diff-check superati; nessun deploy o RPC Google.
[Verifica](VERIFICA-OUTBOX-LOCALE.md).

## Fondazione scrittura outbox locale — 29 ottobre, pacchetto 11 parziale

Il repository espone `saveLocalOperation()` per note/task: verifica ID
stabili, baseVersion, payload e snapshot; nella stessa transazione IndexedDB
aggiorna la bozza CAS e inserisce l'operazione `pending`. I payload hanno limiti
di byte, gli operationId duplicati non possono cambiare contenuto e le
dipendenze sono conservate per il successivo ordinamento. `listOutbox()` e
`getOutbox()` consentono recupero dopo riapertura. Chromium simula un errore
durante la seconda scrittura e verifica che la transazione non lasci né bozza
né outbox parziali. Build e `test:repository` superati. È solo persistenza:
salvataggi UI restano online; non ci sono ancora lease, invio, retry, ACK,
conflitti o adattatori server. Nessun deploy o RPC Google.
[Verifica](VERIFICA-OUTBOX-LOCALE.md).

## Stress ricerca persistita a 50k — 29 ottobre, pacchetto 10 parziale

La fixture Chromium ha misurato direttamente 10.000 e 50.000 documenti nel solo
store `searchDocuments`: 4,73 MB e 740–745 ms a 10k; 16,84–17,63 MB stimati
e 3.801–3.870 ms totali a 50k (circa 3,1 s per gli ultimi 40k). La scansione
scoped di tutti i 50.000 testi sintetici ha richiesto circa 1.046 ms. La UI non esegue questa scansione:
usa l'indice n-gramma in memoria nel worker; il test consumer verifica l'assenza
di letture candidate da IndexedDB a ogni query. Valori StorageManager specifici
di Chromium/macchina e testi sintetici. Build, test consumer, storage, migrazione
bozze, `test:release`, `test:e2e` e diff-check superati dopo il cambiamento.
Restano stress con dati rappresentativi e CSP staging. Nessun deploy o dati Google.
[Verifica](VERIFICA-INDICE-RICERCA-LOCALE.md).

## Migrazione bozze sessionStorage — 29 ottobre, pacchetto 10 parziale

All'attivazione esplicita della copia locale, le bozze UI nello spazio della
scheda vengono copiate nel repository IndexedDB scoped. Restano in
sessionStorage fino a bootstrap completato e scrittura confermata; poi sono
ripristinabili dal repository. Le modifiche successive usano revisione CAS;
una scheda obsoleta conserva il proprio testo e non sovrascrive la revisione
più recente. La cancellazione della cache remota conserva le bozze. Test
Chromium copre migrazione, riapertura, scrittura successiva, conflitto tra
schede e cancellazione cache. Build, test mirato, `test:release`, `test:e2e`
e diff-check superati. La capability reale resta disattivata: mancano staging
CSP e stress su bozze rappresentative. Nessun deploy o accesso ai dati Google.

## Riduzione footprint IndexedDB — 29 ottobre, pacchetto 10 parziale

## Riduzione footprint IndexedDB — 29 ottobre, pacchetto 10 parziale

Il benchmark aveva mostrato che 10.000 documenti con posting per trigramma
occupavano circa 345,33 MB e richiedevano 1.044.534 ms. Il formato è stato
sostituito: IndexedDB v5 conserva i soli documenti di ricerca e cerca il testo
esatto tramite scansione dell'indice scoped; il worker mantiene l'indice n-gramma
in memoria per le query UI. L'upgrade v3 elimina lo store `searchPostings` e il
marker versione precedente forza un rebuild locale. La stessa fixture da 10.000
documenti a 10k richiede circa 745 ms e 4,73 MB stimati; la misura diretta 50k
è documentata nell'aggiornamento successivo. Test di
migrazione v1/v2→v4, persistenza, consumer, benchmark, release ed e2e superati.
Tutti i test componenti di `npm test` sono passati, ma il runner aggregato non ha
restituito un codice finale in questa sessione; la conversione lenta è stata
verificata isolatamente e le prove successive eseguite separatamente. Restano
CSP staging e migrazione bozze sessionStorage. Nessun deploy o dato Google.
[Dettagli](VERIFICA-INDICE-RICERCA-LOCALE.md).

## Footprint IndexedDB ricerca — 29 ottobre, pacchetto 10 parziale

Il benchmark Chromium `test:local-search-storage` popola gli store v3 con
documenti/posting nello schema e negli indici di produzione, poi usa
`navigator.storage.estimate()` e conta le righe. Su testo sintetico ripetuto,
10.000 documenti hanno generato 1.480.000 posting; la stima origin-scoped è
345,33 MB e la scrittura browser ha richiesto 1.044.534 ms sulla macchina di
sviluppo. La proiezione lineare a 50.000 è 1.726,66 MB, non una misura diretta.
La prova da 50k è risultata troppo lenta per il gate normale e non è stata
completata; il benchmark esteso è separato da `npm test`. Esperimenti precedenti
con il writer API hanno inoltre raggiunto `TimeoutError` sui batch da 100;
il consumer ora limita i batch di persistenza a 20 documenti. Build, `npm test`,
`test:release`, `test:e2e`, consumer e persistenza superati. Il risultato indica
che il formato posting per coppia documento/trigramma va ridisegnato prima di
considerare chiuso il pacchetto 10. Nessun deploy o dati Google.
[Dettagli](VERIFICA-INDICE-RICERCA-LOCALE.md).

## Worker della ricerca nel bundle — 29 ottobre, pacchetto 10 parziale

Il consumer avvia un Web Worker module da sorgente incorporata con Vite, senza
risorse aggiuntive oltre ai sei file Apps Script. Il worker possiede l'indice
in memoria ed esegue rebuild, delta, lookup e query; il rebuild procede a
gruppi di 100 documenti, persiste ogni gruppo e cede il thread UI tra i gruppi,
ricontrollando l'identità dell'archivio. Se Worker/Blob non sono disponibili o
la creazione viene bloccata, il consumer usa l'indice locale sincrono; un errore
del worker dopo l'avvio viene segnalato senza passare a un indice obsoleto.
Chromium verifica worker attivo su 201 voci, yield e fallback con Worker assente.
Build, `npm test`, `test:release`, `test:e2e` e `git diff --check` superati.
La suite completa `npm test` ha richiesto diversi minuti: il test Project→tag
esercita 792 recuperi da fault; in questa esecuzione è passato nel gate intero.
Resta il collaudo della CSP nel vero iframe Apps Script, la migrazione delle
bozze sessionStorage e il footprint browser/IndexedDB. Nessun deploy o accesso
ai dati reali. [Verifica](VERIFICA-INDICE-RICERCA-LOCALE.md).

## Posting n-gram persistiti — 29 ottobre, pacchetto 10 parziale

IndexedDB v3 aggiunge `searchPostings` con indici compositi per scope/trigramma
e scope/documento. Le query scelgono posting del proprio archivio e verificano
sempre la sottostringa sul testo. Aggiornamento, cancellazione e reset rimuovono
i posting obsoleti; batch/documenti oltre i limiti usano un posting overflow,
senza perdere risultati. La freshness con `postingVersion` forza il rebuild di
indici v1/v2. Build, test mirati, `npm test`, `test:release`, `test:e2e` e
`git diff --check` superati. Nessun deploy o dato Google.

## Misura heap indice locale — 29 ottobre, pacchetto 10 parziale

La fixture `test:local-search-scale` usa ora `--expose-gc` e mantiene vivo
l'indice durante la misura: 10.000 record = 48,67 MB, 50.000 = 180,99 MB nel
processo Node; build rispettivamente 219 ms e 1.180 ms. Misura indicativa di
heap sintetico, senza IndexedDB/iframe né soglie. `npm test` completo passa.
Resta da misurare il footprint browser e da spostare il
rebuild fuori dal thread UI.


## Bozze locali nella ricerca — 29 ottobre, pacchetto 10 parziale

Il consumer ora incorpora nell'indice locale le bozze note/task già salvate nel
repository IndexedDB: i termini pending sono cercabili senza sostituire i dati
remoti, una versione base superata segnala il conflitto e i tag privati della
bozza restano esclusi dai risultati. Aggiunte verifiche Chromium per update,
conflitto, privacy e cancellazione.

La UI offre opt-in esplicito, stato copertura/freschezza, ricerca nei dati
scaricati e azione di fallback online. La copia non è cifrata e la disattivazione
cancella i record remoti conservando le bozze locali. Manifest senza entrambe
le capability = nessuna apertura IndexedDB né download. Build, test mirati
(identity/UI, consumer, repository, indice), `npm test`, `test:release`,
`test:e2e` e `git diff --check` superati anche per questa integrazione UI. La capability Demo resta spenta,
quindi il percorso attivo non è collaudato in staging. Restano migrazione delle
bozze sessionStorage, outbox, worker e misure di memoria. Non
chiude il pacchetto 10 e non cambia il conteggio: 8 pacchetti aperti su 12.
Nessun deploy o accesso ai dati reali. [Dettagli](VERIFICA-INDICE-RICERCA-LOCALE.md).

## Pagine Files/Layouts e replay bootstrap — 29 ottobre, pacchetto 9 parziale

`getSnapshotPage` non chiama più `readRows()` per enumerare tutte le Entries
quando pagina Files o Layouts: legge le rispettive righe legacy e valida solo
i proprietari incontrati. Il consumer riproduce il feed immutabile da sequenza
0, così Files e layout canonici vengono ricostruiti anche quando lo snapshot
Entry è più recente del commit di routing; il layout indipendente viene
applicato senza regredire i metadati Entry. Test snapshot verifica l'assenza di
enumerazione Entries; Chromium sintetico riproduce 50 commit e cerca un
allegato canonico. Build, `npm test`, `test:release`, `test:e2e` e diff check
passati; staging di sei file. Nessuna capability attivata. Il feed deve restare
disponibile dall'origine: la compattazione futura richiederà un checkpoint recuperabile esplicito. Files e
Layouts leggono ancora ciascuna l'intera tabella legacy. [Dettagli](VERIFICA-PAGINE-SNAPSHOT.md).

## Misure locali indice di ricerca — 29 ottobre, pacchetto 10 parziale

Aggiunta la fixture automatica `test:local-search-scale` con 10.000 e 50.000
record sintetici. Nell'ultima misura la build dell'indice è risultata
rispettivamente 205 ms e 1.229 ms; la query selettiva è sotto 1 ms sulla
macchina locale. Il controllo
conferma un solo risultato esatto e copertura ancora dichiarata incompleta.
`npm run build`, `npm test`, `test:release`, `test:e2e` e `git diff --check`
superati. Questi tempi non sono una soglia garantita e non misurano la memoria.
Restano UI/fallback, posting persistenti, bozze pending e rebuild in worker.
Dettagli in [verifica indice](VERIFICA-INDICE-RICERCA-LOCALE.md).

## Indice n-gramma per la ricerca locale — 29 ottobre, pacchetto 10 parziale

`createLocalSearchIndex` seleziona candidati per n-grammi e verifica sempre
la sottostringa sul testo originale. Copre titolo/corpo, tag, progetti, date e
titoli allegati; versioni vecchie vengono scartate e cancellazioni rimuovono i
termini. Il repository IndexedDB v3 conserva documenti, posting e marker di
freschezza; il consumer aggiorna per ID dopo il feed. L'equivalenza con la
scansione completa è verificata su 2.500 record. Build, `npm test`,
`test:release`, `test:e2e` e `git diff --check`
superati al checkpoint di questo incremento. La UI è ora opt-in e
capability-gated; bozze repository note/task sono ricercabili. Restano staging,
migrazione delle bozze sessionStorage, worker e misure memoria stabili.
[Dettagli e limiti](VERIFICA-INDICE-RICERCA-LOCALE.md).

## Consumer snapshot/feed — 29 ottobre, pacchetto 9 parziale

`createSyncConsumer` percorre le dieci snapshot keyset, idrata i corpi canonici
da `getContentsBatch`, rigioca i commit scoped in ordine e scansiona i corpi
legacy su richiesta con `scanLegacyBodies`. Il repository applica
il checkpoint nello stesso batch del commit e preserva una riga snapshot più
recente rispetto al feed rigiocato. Impostazioni privacy/riflessione, Files e
Layouts sono rappresentati; buchi di sequenza e scope errati si fermano senza
avanzare il cursore. Test browser sintetico e test repository passati.
L'opt-in UI avvia il bootstrap e poi lo scheduler; il manifest Demo mantiene
le capability false, quindi il download reale non parte e resta da collaudare
in staging autorizzato. Rimangono integrazione/riapertura viste, letture
Files/Layout scalabili e collaudo iframe. [Dettagli](VERIFICA-CONSUMER-SNAPSHOT-FEED.md).

### Scheduler del consumer — 29 ottobre, pacchetto 9 parziale

`createSyncConsumer.startAutoSync()` avvia un catch-up immediato e poi invoca
bootstrap o sync a intervallo, impedendo tick sovrapposti nello stesso
scheduler. L'intervallo ammesso va da 1 secondo a 1 ora; `stop()` cancella il
timer. Opt-in, identità verificata e capability server attive restano
obbligatori. Test Chromium sintetico copre catch-up, risultato, stop e
intervallo non valido. Build, `npm test`, `test:release`, `test:e2e` e
`git diff --check` superati. La UI non avvia ancora lo scheduler; capability
disabilitate, letture Files/Layout non scalabili e collaudo iframe restano
aperti. [Verifica](VERIFICA-SCHEDULER-SYNC.md).

## Versioni canoniche nel repository locale — 29 ottobre, pacchetto 9 in sviluppo

Il repository locale accetta ora i token `commit-N` del feed oltre alle date
ISO delle righe legacy. Per la stessa identità, confronta numericamente le
sequenze canoniche e non permette a una versione timestamp legacy di
sovrascriverle. Il test repository verifica token validi, commit più vecchio e
regressione legacy. Build, `npm test`, `test:release`, `test:e2e` Chromium e
`git diff --check` superati. Questo abilita il consumer documentato nella
sezione precedente; `capabilities.changes` resta falsa fino alla verifica
dell'intero percorso.

## Worker Docs coordinato — 29 ottobre, pacchetto 4 in sviluppo locale

`processTaskDocQueue` usa la Docs API con `requiredRevisionId` per scrivere la
sola sezione marcata, conservando gli stili supportati. Una prenotazione con
token/versione e scadenza di 60 secondi coordina il lavoro fuori dal lock
globale; il commit finale verifica il token. Le altre scritture app che passano
da `locked_` o dal commit store vengono sospese fino al rilascio. Su timeout il
takeover usa un batch Docs API condizionale che crea e cancella un named range
temporaneo per invalidare la revisione del worker scaduto. Test REST simulati
coprono contesa, edit esterno, lease scaduta, ACK perso senza duplicati e
blocco di cancellazione, rebase, export e worker legacy durante la prenotazione.

Build, `npm test`, `test:release`, `test:e2e` Chromium e `git diff --check`
superati; build di sei file staging, nessun accesso Google o deploy. Resta da
convalidare il fence contro Docs reale. La creazione di sezioni mancanti resta
sotto lock; il lock globale può sospendere temporaneamente anche scritture non
correlate.
[Dettagli e limiti](VERIFICA-WRITER-DOCS-CONDIZIONALE.md).

## Pagine snapshot keyset per raccolte canoniche — 29 ottobre, pacchetto 9 parziale

`getSnapshotPage` ora pagina dieci raccolte per identità stabile: Files fonde
record legacy/canonici, Settings espone soltanto privacy e reflection, Layouts
unisce posizioni canoniche e legacy. Fissa il checkpoint iniziale e riporta
quello osservato mentre legge sotto lock; la copertura dichiara i record legacy.
Il consumer deve ancora applicare il feed dal checkpoint iniziale al finale e
recuperare i corpi via `getContentsBatch`; scansione Docs e letture scalabili
restano aperte. Files e Layouts rileggono tutte le Entries. La capability resta
disabilitata. Test snapshot, build e gate completo superati.
[Verifica e limiti](VERIFICA-PAGINE-SNAPSHOT.md).

## Import titoli Docs nelle Entries canoniche — 29 ottobre, pacchetto 9 parziale

Il refresh esplicito importa ora anche una rinomina della sezione Docs:
`Entry.text` e puntatore DocContent sono aggiornati nello stesso commit. Il
retry è idempotente e una modifica concorrente del titolo mentre la bozza app
è pending viene segnalata senza perdere la bozza. Build, test mirati,
`npm test`, `test:release`, E2E Chromium e diff-check superati.
[Verifica](VERIFICA-RICONCILIAZIONE-DOCS-ENTRIES.md).

## Checkpoint scoped del feed commit — 29 ottobre, pacchetto 9 parziale

`getSyncCheckpoint()` recupera il ledger sotto lock e restituisce cursore scoped
e `highWater` atomici. `getSyncManifest()` li include quando il routing è
registrato e restituisce `null` prima, senza fingere una snapshot disponibile.
Insieme a `getChanges`, permette di fissare il limite della scansione senza
saltare commit successivi; non fornisce ancora la fotografia paginata dei dati.
Build, test mirati, `npm test`, `test:release`, E2E Chromium e diff-check
superati. [Contratto](VERIFICA-FEED-COMMIT-API.md).

## Stato worker Docs nelle route Entries — 29 ottobre, pacchetto 9 parziale

Il worker committa `pending` nel descriptor canonico prima di scrivere Docs e
`done` dopo `saveAndClose`; i retry non regressano uno stato `done`. Il foglio
della coda UI e il side effect Docs restano fuori dal feed, quindi in caso di
ACK perso si conserva `pending` finché il retry non verifica/conferma il testo.
Build, test d'integrazione, `npm test`, `test:release`, E2E Chromium e
`git diff --check` superati. [Verifica](VERIFICA-REBASE-DOCS-ENTRIES.md).

## Rebase canonico conflitti Docs Entries — 29 ottobre, pacchetto 9 parziale

`rebaseDocQueue` per Entries instradate ora committa baseline, backup Docs e
nuovo puntatore DocContent, mantenendo la bozza app da riscrivere. Versione
deterministica e retry restituiscono lo stesso ACK; il worker poi applica il
testo confermato. Titolo/formattazione non supportati si fermano senza perdita.
Lo stato della riga UI e il side effect Docs restano fuori dal feed. Build,
test mirati, `npm test`, `test:release`, E2E Chromium e diff-check superati.
[Verifica](VERIFICA-REBASE-DOCS-ENTRIES.md).

## API batch contenuti canonici Entries — 29 ottobre, pacchetto 9 parziale

`getContentsBatch` legge al massimo 12 corpi puntati da ID/versione/digest,
sotto un lock comune e con limite di 2 MiB UTF-8. Puntatori obsoleti,
contenuti corrotti, duplicati e lotti troppo grandi vengono rifiutati. Il
consumer e il bootstrap non sono ancora collegati; `capabilities.changes`
resta falsa. Build, test mirati e gate completo superati. [Verifica](VERIFICA-CONTENUTI-BATCH-ENTRIES.md).

## Import esplicito modifiche Docs in Entries — 29 ottobre, pacchetto 9 parziale

Il comando di aggiornamento anteprime ora riconcilia il corpo e la
formattazione supportata e titolo sezione delle Entries instradate: controlla
revisione Docs e baseline, pubblica Entry e puntatore DocContent in un commit e
non riscrive il documento appena importato. Una bozza app in coda resta
conservata se trova modifiche concorrenti. Formattazione avanzata, scansione in
background, snapshot iniziale e client locale restano aperti. Build, test
mirati, `npm test`, `test:release`, E2E Chromium e diff-check superati.
[Verifica](VERIFICA-RICONCILIAZIONE-DOCS-ENTRIES.md).

## Migrazione Docs protetta dalle route Entries — 29 ottobre, pacchetto 8

`migrateDocsBatch` salta le Entries instradate, non crea sezioni/riferimenti
partendo dalle righe legacy congelate, continua però a processare le Entries
legacy e avanza il cursore. Il test controller verifica snapshot immutati e
nessun nuovo riferimento Docs per le route. [Contratto e limiti](VERIFICA-MIGRAZIONE-DOCS-ROUTING-ENTRIES.md).
La riconciliazione delle modifiche manuali fatte direttamente in Docs resta
nel pacchetto 9. Build, test mirato e gate completo superati.

## Lookup Entries batch nel commit store — 29 ottobre, pacchetto 8 parziale

Lo store Sheets mantiene una mappa volatile delle chiavi per la durata del
lock: le prime otto restano ricerche mirate; dal nono lookup la colonna viene
letta a blocchi da 4.096 righe, con aggiornamento su append e invalidazione in
compattazione. Test sintetico con 50.000 chiavi estranee e 64 route: 8 ricerche
più 13 letture a blocchi invece di 64 ricerche; il caso singolo rimane mirato.
Build, store, migrazione/controller Entries, `npm test`, `test:release`,
`test:e2e` Chromium e diff-check superati. [Verifica](VERIFICA-LOOKUP-ENTRIES-BATCH.md).
Nessun indice persistente o directory globale limitata. Prossimo: bootstrap
coerente e feed incrementale completo; capability ancora falsa.

## Creazione rapida e nota completa Entries — 29 ottobre, pacchetto 8 parziale

`addJournal` e `addCompleteNote` scrivono tramite `saveJournalPage` quando è
presente il gateway canonico. Le acquisizioni oltre 12 voci sono divise in
commit atomici con ID/retry stabili; la nota completa include corpo e rich text.
Controller e browser verificano le route e il replay; le righe legacy restano
intatte. Build, test mirati, `npm test`, `test:release`, `test:e2e` Chromium e
diff-check superati. [Verifica e limiti](VERIFICA-CREAZIONE-ENTRIES-CANONICA.md).
Resta aperta la bootstrap coerente del feed e la scalabilità dei lookup; la
capability client resta falsa. Nessuna attivazione, migrazione reale o deploy.

## API incrementale `getChanges` — 29 ottobre, pacchetto 8 parziale

L'endpoint raggiunge il ledger condiviso tramite un controller persistente e
valida archivio, epoch e principal del cursore lato server; pagine limitate a
5 commit/128 KiB preservano la sequenza di commit e i tombstone. Test mirati
per feed Files, scope e recovery superati. Build, `npm test`, `test:release`,
`test:e2e` e `git diff --check` superati.
[Verifica e limiti](VERIFICA-FEED-COMMIT-API.md). `capabilities.changes` resta
false fino al bootstrap coerente e alla matrice completa delle mutazioni.
Nessun deploy o dato reale. Prossimo task: completare mutazioni e letture del
feed senza saltare aggiornamenti legacy.

## Vista globale File collegati — 29 ottobre, pacchetto 8 parziale

La vista «File collegati» ora carica tutte le Entries dell'archivio e fonde
file legacy e canonici anche dopo una sessione nuova; il gateway legge la
tabella Files in batch e nasconde allegati di Entries cancellate. Chromium
conferma link legacy/canonico fuori dal mese corrente. Build, test mirati,
`npm test`, `test:release`, `test:e2e` e `git diff --check` superati.
[Verifica e limiti](VERIFICA-FEED-GLOBALE-FILES-ENTRIES.md).
Il lookup delle route resta O(numero Entries); feed incrementale completo e
indice di lookup sono ancora aperti. Nessun deploy o dato reale. Prossimo
task: ridurre i lookup/feed per ID senza introdurre directory globali limitate.

## Conversione progetto→tag atomica — 29 ottobre, pacchetto 8 parziale

Con routing Projects ed Entries entrambi attivi, la conversione verifica firma
e dipendenze Goals, aggiorna Entries canoniche e tombstona il progetto nello
stesso commit recuperabile. Entry legacy vengono migrate nel commit mantenendo
immutate le preimmagini; un Project legacy riceve prima una route semantica
neutra. Controller e browser coprono retry/reload; fault injection ha superato
792 interruzioni Sheet/Range. Build, `npm test`, `test:release`, `test:e2e` e
`git diff --check` superati. [Verifica e limiti](VERIFICA-CONVERSIONE-PROGETTO-TAG-ENTRIES.md).
La richiesta resta limitata a 25 cambi/32 KiB; il feed incrementale completo e
i lookup Entries restano aperti. Nessun deploy, provisioning o dato reale.
Prossimo task: ridurre i lookup/feed per ID senza introdurre directory globali
limitate.

## Cancellazione canonica Entries — 29 ottobre, pacchetto 8 parziale

`deleteNote` instrada le Entries canoniche con verifica versione, piano durevole,
tombstone dell'Entry e dell'indice allegati, replay idempotente e pulizia logica
di Docs/TaskDocQueue/DocRefs/Previews. La UI elimina la voce anche dopo reload;
il documento Docs e i file Drive originali restano intatti. Superati build,
`npm test`, `test:release`, `test:e2e`, fault injection (165 prenotazioni e 198
commit) e `git diff --check`. [Verifica e limiti](VERIFICA-CANCELLAZIONE-ENTRIES-CANONICA.md).
Nessun deploy, provisioning o dato reale. Prossimo task: conversione atomica
progetto→tag nelle Entries.

## Allegati canonici Entries — 29 ottobre, pacchetto 8 parziale

Per Entries instradate, `addFileLink` salva il collegamento e il suo indice nel
ledger recuperabile; il foglio Files legacy resta immutato e l'originale Drive
non viene spostato o copiato. Il dettaglio sovrappone gli allegati canonici e
li rilegge dopo il riavvio. Testati link duplicato/retry, readOnly e 363
interruzioni Sheet/Range. Build, `npm test`, `test:release`, `test:e2e` Chromium
e `git diff --check` superati. Il feed globale Files non è ancora completo.
[Verifica e limiti](VERIFICA-ALLEGATI-ENTRIES.md).
Nessun deploy, provisioning o dato reale. La cancellazione canonica è descritta
nella verifica più recente sopra.

## Diario continuo Entries multi-blocco — 29 ottobre, pacchetto 8 parziale

`saveJournalPage` instrada il diario continuo in batch canonici fino a 12 voci:
snapshot Entry, puntatori DocContent, layout/data/posizione e pianificazione
vengono pubblicati nello stesso commit recuperabile. Nuove righe di staging
restano nascoste alla lettura applicativa; gli ACK persi si riutilizzano senza
duplicare Entries o contenuti. Il browser verifica nota formattata e task
insieme, retry, reboot, posizioni e preimmagine legacy congelata. Build,
`npm test`, `test:release`, `test:e2e` e `git diff --check` superati. Limite:
oltre 12 modifiche la UI usa più commit, conservando le bozze non completate.
[Verifica e limiti](VERIFICA-DIARIO-CONTINUO-ENTRIES.md). Nessun deploy,
provisioning o dato reale; Entries resta readOnly per default. Prossimo task:
eliminazione canonica Entry.

## Corpo Docs canonico Entries — 29 ottobre, pacchetto 8 parziale

`saveNoteText` pubblica corpo Docs/formattazione tramite puntatore `DocContent`
con digest, insieme alla versione metadata Entry, scadenza e pianificazione in
un commit recuperabile. Il contenuto frammentato e la coda sono verificati dal
worker; lettura, dettaglio e reboot seguono il puntatore. Testati ACK perso,
integrità, readOnly prima dello staging e 363 interruzioni Sheet/Range per il
commit puntatore. Build, `npm test`, `test:release`, `test:e2e` e diff-check
superati. [Verifica e limiti](VERIFICA-CONTENUTI-ENTRIES.md). Nessun deploy,
provisioning o dato reale; Entries resta readOnly per default. Prossimo task:
instradare il diario continuo multi-blocco con layout e pianificazioni coerenti.

## Pianificazione TaskPlans canonica — 29 ottobre, pacchetto 8 parziale

`planTask` ora salva la pianificazione nel gateway Entries: data, intervallo,
importanza, nuova versione del task e route marker sono un solo commit. La
prima migrazione importa TaskPlans e ne congela la preimmagine tramite digest;
letture e feed sovrappongono la versione canonica. Scritture legacy su
TaskPlans instradati sono bloccate. Test recovery: 363 interruzioni ciascuno
per migrazione, associazione e pianificazione. Build, `npm test`,
`test:release`, `test:e2e` Chromium e `git diff --check` superati.
[Verifica e limiti](VERIFICA-PIANIFICAZIONE-ENTRIES.md). Nessun deploy o dato
reale; Entries resta readOnly di default. Prossimo task: corpo Docs e diario
continuo con conflitti/retry coerenti.

## Mutazioni metadata Entries — 29 ottobre, pacchetto 8 parziale

`setEntryProjects`, `setEntryTags`, `setTaskStatus` e scadenza via
`updateEntry` scrivono snapshot nel gateway canonico quando Entries è attivo.
Le API legacy interne, il worker Docs e gli allegati ora falliscono chiusi
prima di toccare voci instradate; conversione progetto→tag resta bloccata fino
al commit atomico dei due domini. Test controller aggiunti per handler legacy,
allegati e conversione, con riga legacy congelata. Build, `npm test`,
`test:release`, `test:e2e` Chromium, test gateway/controller Entries e
`git diff --check` superati. [Verifica e limiti](VERIFICA-MUTAZIONI-ENTRIES.md).
Routing Entries ancora readOnly per default e nessun deploy/provisioning.
Prossimo task: pianificazione task e `TaskPlans` nello stesso commit.


## Controller Entries e associazione applicativa — 29 ottobre, pacchetto 8 parziale

Binding persistente `Entries/index/blocks` sul ledger condiviso con Projects;
`setEntryProjects` instradato nel gateway e risposta delta metadata-only.
Test Demo/server sintetico: readOnly iniziale, attivazione rifiutata senza
permesso dedicato, associazione, preimmagine legacy immutata e reboot. Il server
non concede `allowEntryActivation` per default perché le altre mutazioni Entry
restano legacy. [Verifica e limiti](VERIFICA-CONTROLLER-ENTRIES.md). Prossimo
task: matrice di mutazione Entries, poi browser e conversione progetto→tag.
Nessun deploy/provisioning/dato reale.

## Gateway di migrazione Entries — 29 ottobre, pacchetto 8 parziale

Gateway e source adapter metadata Entries. Route per ID senza directory globale
a 128 elementi; migration e associazione progetti condividono il commit. Overlay
con preimmagine congelata, digest, CAS, retry durevole, barriere su divergenza e
ID duplicati. Test sintetico: 140 ID e 363 recovery Sheet/Range su 121 eventi.
[Verifica e limiti](VERIFICA-MIGRAZIONE-ENTRIES.md). Il seguito
[controller Entries](VERIFICA-CONTROLLER-ENTRIES.md) instrada ora
`setEntryProjects`, ma tiene l'attivazione protetta. `readRows` fa un controllo
route per ogni riga; l'indice/feed dovrà ridurre il costo prima dell'abilitazione
generale. Nessun deploy/provisioning.

## Writer canonico dei metadati Entries — 29 ottobre, pacchetto 8 parziale

Planner e writer per snapshot metadata Entries: ID/data/tipo/titolo/progetti/
scadenza/stato/createdAt/requestId/scope/completedAt/tags, con `updatedAt`
come versione commit-N e corpo Docs escluso. CAS, ACK/conflict stabili, lettura
verificata, schema stretto e tombstone non resuscitabili. Fault test: 10 unità
durevoli e 165 Sheet/Range. Build, npm test, test:release e diff-check passati.
[Dettagli e limiti](VERIFICA-WRITER-ENTRIES.md). Non è ancora instradato alle
API: saveNoteText, status, tag, delete, diario continuo e associazioni restano
legacy; non attivare Entry routing prima del gateway e della matrice completa.
Prossimo task: gateway/migrazione Entries e associazioni progetto atomiche.
Nessun provisioning, deploy o dato reale.

## Routing canonico Projects — 29 ottobre, pacchetto 8 parziale

Gateway con overlay Projects e piani persistenti per migrazione/salvataggio;
versioni CAS, preimmagine legacy congelata, unicità del nome, retry ACK e
conflitti. Controller vincolato a Projects/index/blocks, `readOnly` al binding
e mode CAS; coesiste con Catalog/HabitLogs sullo stesso ledger senza scambiare
i ruoli dei fogli. `saveProject` e letture usano il percorso canonico; la
cartella Drive viene garantita dopo l'ACK. Associazioni Entry e conversione a
tag sono bloccate in `active` finché non vengono instradate. Fault test gateway:
396 interruzioni Sheet/Range. Build, npm test, test:release ed E2E completo con
Chromium Projects superati il 29 ottobre. [Scenari e limiti](VERIFICA-CONTROLLER-PROGETTI.md).
Nessun provisioning, deploy o dato reale; manifest non abilitato. Writer,
gateway e controller Entries sono stati aggiunti nel seguito; prossimo task:
restante matrice Entry e conversione atomica a tag
inclusi eventuali collegamenti Goal prima di riabilitare quelle API.

## Writer canonico Projects — 28 ottobre, pacchetto 8 parziale

Planner puro e `syncProjectWriter_` per snapshot completi dei metadati: commit
recuperabili, CAS, ACK/conflitti stabili, lettura per slug, isolamento per scope
e nessuna resurrezione dopo tombstone. Validazioni/schema, ripetizione dopo
modifiche successive e corruzione inclusi. Fault injection su 10 unità
durevoli e 165 Sheet/Range, con recovery su nuova istanza V8. Build, `npm test`,
`test:release` e `git diff --check` superati. [Contratto e limiti](VERIFICA-WRITER-PROGETTI.md).
Questo rapporto descriveva il writer prima dell'integrazione; il seguito
[gateway/controller Projects](VERIFICA-CONTROLLER-PROGETTI.md) instrada ora
`saveProject` e le letture. Restano associazioni, conversione a tag e feed
completo; nessun provisioning, deploy o dato reale.

## Impostazioni reflection/privacy canoniche — 28 ottobre, pacchetto 8 parziale

Con controller Catalog attivo, `reflectionSettings_`, `privacySettings_`,
`saveReflectionSettings` e `savePrivacySettings` usano il registro canonico:
versioni CAS, retry idempotenti e conflitti obsoleti. Properties resta il
percorso legacy prima dell'attivazione; dopo il routing i valori legacy sono
congelati e l'assenza del record canonico non causa fallback. Testa anche input
non validi senza scritture. Build, npm test, suite browser completa (`npm run
test:e2e`), `npm run test:release` e `git diff --check` superati il 28 ottobre;
il browser Catalog ha verificato lettura/scrittura, retry/conflitto, Properties
immutate e storico HabitLogs. [Contratto e limiti](VERIFICA-CONTROLLER-CATALOGHI.md).
Nessun deploy, provisioning o dato Google reale. Pacchetto 8 ancora aperto per
le altre mutazioni applicative, feed completo e contratto di abilitazione.
Prossimo task: censire e instradare le mutazioni Projects nel medesimo
protocollo, preservando selezioni, bozze, conflitti e i legami con Entries.

## Goals/Habits: writer, planner e lock componibili — 28 ottobre, pacchetto 8 parziale

Nuovo syncCatalogWriter_ con snapshot completi Goals/Habits e lotti atomici
fino a 25 record. Dipendenza dal goal corrente verificata sotto un solo lock;
creazione/spostamento in coppia, ricevute stabili, conflitti senza pubblicazioni
parziali e archivio che conserva la definizione precedente. Cambio trimestre
Goals senza riscrivere Habits a cascata, come nell'API esistente. 34 interruzioni
delle unità durevoli e 198 Sheet/Range, massimo payload singolo e lotto troppo
grande, scope/corruzione/tombstone/capacità verificati. Validatore microazioni
condiviso con HabitLogs. [Contratto writer](VERIFICA-WRITER-CATALOGHI-CANONICO.md).
Planner puro per API goal/habit/archive, campi omessi/vuoti e ID assegnati dal
server senza UUID durante replay. Regole di riuso degli ID confrontate con le
vere API Demo per riordini, inserimenti e titoli ripetuti, più quarter/archivio.
[Contratto planner](VERIFICA-PLANNER-CATALOGHI.md).
Prerequisito d'integrazione: letture tra controller possono ereditare il lock
server o applicativo, mantenendo binding/scope; facciate annidate non possono
salvare, migrare, registrare o cambiare modalità. Errori/busy ripristinano
ownership. [Verifica lock](VERIFICA-COMPOSIZIONE-LOCK-ROUTING.md).
Build e test eseguiti prima di iniziare ogni incremento. Ultimo giro: npm test,
test:routing-locks, controller Days/Weeks/HabitLogs, release, ciclo, incremental,
tracing e browser Days/Weeks/HabitLogs superati; anche common-periods al gate
precedente. Demo/staging sei file rigenerati; nessuna nuova modifica frontend.
SaveGoal/saveHabit/deleteHabit e lettori Goals/Habits ancora legacy. Prossimo
incremento: ponte durevole con lettori coerenti, anche per le dipendenze dei log.
Non congelare Goals/Habits lasciando il lettore HabitLogs sul catalogo legacy.
Il nuovo controller cataloghi dovrà condividere gli stessi ruoli fisici
Habits/Goals già legati dai log, senza considerarli collisioni fra ruoli diversi.
Le creazioni devono avere una chiave d'intento conservata dal form: non usare
il solo hash dei campi, che fonderebbe due creazioni volontarie identiche. UUID
assegnati vanno salvati nel piano. Poi controller persistente e browser con
retry/reload/ACK tardivi prima delle altre mutazioni. Nuove API ancora private,
manifest false, nessun deploy o dato reale; online Apps Script 75. Piano aperto.

## HabitLogs: controller e browser attivo — 28 ottobre, pacchetto 8 parziale

Controller persistente sul nucleo Days/Weeks: ancora immutabile, due slot,
active/readOnly e CAS. Binding di HabitLogs/Habits/Goals e dei due fogli del
registro; ID/nome/parent verificati, nessun provisioning. Tutti e sei gli
ordini di registrazione mantengono lo stesso archivio/registro senza collisioni.
161 interruzioni/prefissi delle proprietà e vere API Demo dopo riavvio, corse
di attivazione, revoca e permessi operatore false per default verificati.
[Contratto controller](VERIFICA-CONTROLLER-REGISTRAZIONI.md).
Browser reale su server V8/Sheets sintetico: basi prima della migrazione,
checklist storiche dopo cambi catalogo, risposta persa e sei ACK malformati,
retry senza nuovi commit, intenti identici concorrenti e conflitti distinti,
reload/readOnly persistente, pratiche semplici e percorsi Diario/Ciclo passati.
Bozze del diario conservate, focus per ID/data/microazione. Nuovo validatore
ACK prima del merge, versione e checklist confrontate con la base catturata.
Attributi DOM delle registrazioni separati da cataloghi/sezioni: regressioni
Ciclo/P80 corrette senza cambiare i test storici. Nessuna outbox aggiunta.
[Scenari, risultati e limiti](VERIFICA-BROWSER-REGISTRAZIONI.md).
Fixture condivisa estesa ai cataloghi e ripulita dalla cache del bootstrap
prima del restore sintetico; trasporto del test con latenza 40 ms, nessuna
misura Google. Tracing su lettura/mutazione senza testi o ID dei record.
Build e verifiche del controller passate prima di iniziare il browser. Ultimo
giro: npm test, release, ciclo, incremental, common-periods, tracing, browser
Days/Weeks/HabitLogs, P80 e P59 build passati. Dopo gli ultimi attributi DOM
ripetuti build/ciclo/browser HabitLogs/P80/P59. Screenshot sintetici mobile
ispezionati. Browser in test:e2e; suite storica completa non rieseguita.
Index/Demo e staging sei file rigenerati. Percorso locale HabitLogs verificato
entro i limiti del prototipo; prossima estensione Goals/Habits con writer,
lettori e mutazioni coerenti, mantenendo le dipendenze dei log già canonici.
Pacchetto 8/feed completo e altri pacchetti aperti. Nessuna registrazione reale,
deploy o dato dell'utente; manifest false e online Apps Script 75.

## HabitLogs: writer, planner e ponte — 28 ottobre, pacchetto 8 parziale

syncHabitLogWriter_ valida snapshot completi, chiave composta e checklist
storica con ID/titoli/spunte/stato coerenti. 20 interruzioni del nucleo e 165
Sheet/Range, massimo 30 titoli Unicode di 500 unità su storage frammentato.
[Contratto writer](VERIFICA-WRITER-REGISTRAZIONI-CANONICO.md).
Planner puro con cataloghi completi catturati, pianificazione/quarter/versioni,
checked omesso distinto da [], vecchie microazioni preservate. Confrontato con
cinque mutazioni effettive Demo. [Contratto planner](VERIFICA-PLANNER-REGISTRAZIONI.md).
Ponte con preimmagine congelata, migrazione atomica log/route/indice e piani
con digest dei cataloghi: prenotazione bloccata se le dipendenze cambiano,
commit preparato/ricevuta confermata recuperati anche dopo archiviazione.
Checklist mancante richiede snapshot esplicito, senza inventare spunte.
setHabitLog e lettori completi/per periodo instradati dietro iniezione null;
writer generico bloccato. 44 interruzioni del nucleo e 396 Sheet/Range; vere
API Demo, head condiviso Days/Weeks, 50.000 righe estranee per tabella con
celle lette costanti nei percorsi mirati. [Contratto ponte](VERIFICA-MIGRAZIONE-REGISTRAZIONI.md).
Build e test eseguiti prima di ciascun nuovo incremento. Ultimo giro: npm test,
test:habit-log-migration, test:release, test:cycle, test:incremental,
test:common-periods, test:tracing, test:day-browser e test:week-browser passati.
Demo/staging sei file rigenerati; nessuna nuova modifica frontend a Index.
Prossimo incremento: controller persistente HabitLogs con binding di HabitLogs,
Habits e Goals allo stesso archivio/registro, poi browser attivo. Altre mutazioni
e feed completo ancora aperti. Nessun deploy/provisioning/dato reale;
manifest false, online Apps Script 75.
Conteggio completo del piano: [7 pacchetti di sviluppo e 1 di verifica ancora aperti](STATO-PIANO-SPEC-004.md).

## Browser Weeks attivo — 28 ottobre, pacchetto 8 parziale

Nuovo test:week-browser con UI Demo reale e RPC HTTP su server V8/Sheets
locale, controller persistenti Days/Weeks sullo stesso registro. Bozza prima
della migrazione con nodo/focus/selezione, evento tardivo durante ACK, risposte
perse e quattro ACK malformati senza nuove scritture al retry, riavvio/reload,
conflitto fra browser, readOnly persistente, energia/stato, abbandono esplicito
e layout 320/390 px superati. Screenshot sintetici desktop/mobile ispezionati.
Corretto il form: bozza per settimana nella scheda con versione iniziale,
validazione ACK prima del merge e baseline aggiornata senza perdere eventi
tardivi. Messaggio di conflitto riferito alla settimana. Nessuna IndexedDB.
[Scenari, risultati e limiti](VERIFICA-BROWSER-ROUTING-SETTIMANE.md).
Build, npm test, test:week-browser, test:week-controller, test:incremental,
test:release, test:tracing, test:day-browser, test:common-periods, P85 e P88
superati. Dopo l'ultimo messaggio conflitto ripetuti build/controller/browser
Weeks. Browser in test:e2e, suite storica completa non rieseguita.
Index/Demo e staging sei file rigenerati. Percorso Weeks locale verificato
entro i limiti documentati; prossima estensione al dominio HabitLogs con
checklist/identità e dipendenze Habits, poi restante matrice delle mutazioni.
Provisioning, Google e capacità manifest ancora non abilitati. Nessun deploy
o dato reale; online Apps Script 75. Obiettivo complessivo ancora aperto.

## Ponte e controller Weeks — 28 ottobre, pacchetto 8 parziale

syncWeekMigrationGateway_/SheetSource: migrazione atomica di checkup/route/
indice, preimmagine congelata, piani durevoli e retry/ACK/conflitti stabili.
saveWeek e lettori completi/Diario/Settimana/Abitudini coerenti; writer diretto
bloccato. test:week-migration incluso in npm test: 44 interruzioni del nucleo,
396 Sheet/Range, API Demo, 50.000 righe estranee e head condiviso con Days.
[Contratto e limiti](VERIFICA-MIGRAZIONE-SETTIMANE.md).
Controller persistente Weeks sul nucleo condiviso con Days, formati/chiavi
Days conservati. Binding congiunto impone lo stesso archivio/DB/cartella e
registro; modalità active/readOnly distinte per dominio e riavvio senza
iniezione in memoria. test:week-controller in npm test: 161 interruzioni delle
proprietà, API effettive, corse e entrambi gli ordini di registrazione.
[Contratto controller](VERIFICA-CONTROLLER-ROUTING-SETTIMANE.md).
Build, npm test, test:week-migration, test:week-controller, test:day-controller,
test:release, test:tracing e test:day-browser superati. Test del ponte eseguiti
prima del controller, poi regressioni complete. Demo/staging rigenerati,
Index senza differenze frontend. Prossimo incremento: collaudo browser Weeks
attivo con bozze, ACK, conflitti, reload e readOnly prima delle altre mutazioni.
Registrazioni reali assenti, capacità manifest false; nessun deploy o dato reale.
Online Apps Script 75.

## Writer canonico Weeks — 28 ottobre, pacchetto 8 parziale

Aggiunto syncWeekWriter_ con planner puro, snapshot completo dei checkup,
versioni commit-N, ricevute/conflitti stabili e lettore con recupero/schema.
Nessun routing applicativo ancora: saveWeek e lettori Weeks restano legacy.
test:canonical-weeks incluso in npm test: 20 interruzioni del nucleo e 165
Sheet/Range con riavvio V8, isolamento, tombstone e Demo sintetica.
Build, npm test, test:canonical-weeks, test:release e test:tracing superati;
Demo/staging sei file rigenerati, Index senza differenze frontend.
[Contratto e limiti](VERIFICA-WRITER-SETTIMANALE-CANONICO.md).
Prossimo incremento: ponte di migrazione Weeks e lettori coerenti, controller
persistente con registro condiviso e collaudo browser prima delle altre
mutazioni. Manifest false; nessun deploy o dato reale, online Apps Script 75.

## Collaudo browser Days attivo — 28 ottobre, pacchetto 8 parziale

Nuovo test:day-browser con UI reale e RPC HTTP su server V8 locale, backend
Demo, SHA-256 Node e adattatore Sheet/Range simulato. Bozze pre-migrazione,
focus/selezione, evento tardivo durante ACK, risposta persa e malformata senza
nuovi commit al retry, riavvio V8/reload rich, conflitto fra due browser con
salvataggio parziale, readOnly persistente e righe legacy congelate superati.
Tracing attivo senza testi/identità nell'export; screenshot sintetici e layout
320/390 px verificati. Corretto il messaggio readOnly: testo comprensibile
con nome ProtocolUnavailable e motivo interno preservati, senza perdere bozze.
Fixture server condivisa coi test V8. Build, npm test, test:day-browser,
test:day-controller, test:day-batch, test:release e test:tracing superati;
test browser aggiunto a test:e2e, suite storica completa non rieseguita.
Demo/staging sei file rigenerati; Index senza differenze frontend.
[Scenari, risultati e limiti](VERIFICA-BROWSER-ROUTING-GIORNI.md).
Verifica locale del percorso Days attivo completata; registrazione reale,
iframe Google, provisioning e capacità manifest ancora non abilitati.
Nessun deploy o dato reale; online Apps Script 75. Prossimo incremento:
estendere il registro a Weeks con writer/lettori coerenti, poi le altre
mutazioni; pacchetto 8 e feed dell'archivio ancora parziali.

## Controller persistente Days — 28 ottobre, pacchetto 8 parziale

Controller con ancora immutabile in ScriptProperties e stato a due slot,
pubblicazione separata e CAS delle modalità active/readOnly. Binding verificato
per archivio/epoca, DB/cartella e ID/parent dei tre fogli; identità già esistente,
nessuna inizializzazione o provisioning automatico. Registro mancante/corrotto
e configurazione/accesso cambiati bloccano senza fallback legacy. readOnly
conserva le letture canoniche e blocca nuovi salvataggi/migrazioni Days.
Risoluzione collegata agli ingressi effettivi, anche dopo riavvio V8 senza
iniezione; ricontrollo delle corse di attivazione nei lettori e sotto lock nei
writer. Permessi operatore/migrazione false per default; nessuna nuova RPC.
test:day-controller incluso in npm test: 161 interruzioni/prefissi delle
proprietà, binding/revoche/CAS, riavvii e API effettive sulla Demo.
Build, npm test, test:day-controller, test:release e test:tracing superati;
Demo/staging sei file rigenerati, Index senza differenze frontend.
[Contratto e limiti](VERIFICA-CONTROLLER-ROUTING-GIORNI.md).
Ancora iniziale troncata bloccata senza riparazione automatica. readOnly è il
rollback operativo della build compatibile: vecchi deployment privi di
controller rimangono inadatti dopo una futura migrazione. Capability manifest
false, nessuna registrazione o attivazione reale; online Apps Script 75.
Prossimo incremento: collaudo browser del percorso attivo su Demo sintetica,
con bozze, conflitti, reload/errori e readOnly. Provisioning e Google separati.

## Capacità e compattazione riferimenti — 28 ottobre, pacchetto 8 parziale

Commit del ponte Days completato: 4a219f6. Nuovo preflightWrites nell'adattatore
Sheets e budget prima del prepare nel nucleo; il gateway verifica insieme
prenotazione e operazione. Guardia di write prima dei frammenti impedisce il
riferimento 513. compactReferences: dry-run e lotti fino a 128 ritiri di chiavi
head/entità superate, mantenendo esattamente l'ultima revisione verificata.
Nessuna rimozione di payload, commit, ricevute o tombstone; head pendente
preservato e recuperabile. Esecuzione richiede maintenanceEnabled esplicito,
assente per default; nessuna nuova RPC o manutenzione automatica.
test:commit-capacity incluso in npm test: 182 interruzioni, confini 510/511/512,
budget aggregato Days, recupero pendente, isolamento e guardie. Build, npm test,
test:release e test:tracing superati; Demo/staging sei file rigenerati, Index
senza differenze frontend. [Contratto e limiti](VERIFICA-CAPACITA-COMMIT.md).
Compattati solo i riferimenti attivi: storico fisico ancora in crescita, nessuna
retention o promessa di latenza Google. DAY_COMMIT_GATEWAY=null e capacità
manifest false. Prossimo incremento: controller persistente routing Days con
binding autorizzato e rollback coerente, poi collaudo browser attivo.
Nessun deploy, compattazione reale o dato reale; ultimo online Apps Script 75.

## Ponte Days e lettori coerenti — 28 ottobre, pacchetto 8 parziale

syncDayMigrationGateway_ e source esplicito della tabella Days: confronto
dell'intera preimmagine, migrazione atomica di giorno/descrittore/indice e
riga legacy congelata. Piani durevoli delle patch prima del commit, retry con
snapshot/ACK originali, compatibilità delle bozze pre-migrazione e conflitti
stabili. saveDay/saveDays, letture complete e finestre Diario/Settimana/Abitudini
instradati dietro DAY_COMMIT_GATEWAY=null; writer diretto Days bloccato quando
il gateway è iniettato. Nessuna nuova RPC, apertura o attivazione automatica.
test:day-migration in npm test: 44 interruzioni del nucleo, 396 delle chiamate
Sheets simulate, API effettive sulla Demo e 50.000 righe estranee per periodo.
Build, npm test, test:day-migration, test:release e test:tracing superati;
Demo/staging dei sei file rigenerati, Index senza differenze frontend.
[Contratto, limiti e seguito](VERIFICA-MIGRAZIONE-GIORNI.md).
Migrazione attiva solo nelle fixture, capacità manifest false. Non riportare
il routing a null come rollback dopo una futura migrazione reale: mancano
ancora controller persistente, binding autorizzato e provisioning. I piani
aggiungono un commit per operazione e consumano il budget dell'head.
Prossimo incremento: preflight capacità e compattazione recuperabile, poi
controller persistente e collaudo browser della migrazione attiva.
Nessun deploy o dato reale; ultimo online Apps Script 75.

## Primo writer canonico giornaliero — 28 ottobre, pacchetto 8 parziale

Servizio interno syncDayWriter_ con planner puro e lettore di dominio,
collegato al nucleo dei commit attraverso lo store iniettato. Snapshot completo
delle riflessioni, testo/spazi/rich conservati, versioni commit-N e ACK legati
allo scope. Payload parziali o formati non supportati rifiutati; retry e
conflitti stabili, lettore con recupero e controllo dello schema canonico.
Nuovo test:canonical-days incluso in npm test: 20 interruzioni sulle unità e
165 sulle chiamate Sheets simulate, con riavvio V8, più verifica su Demo.html.
Build, npm test, test:release e test:tracing superati; Demo/staging dei sei
file rigenerati, Index senza differenze frontend.
[Contratto, verifiche e seguito](VERIFICA-WRITER-GIORNALIERO-CANONICO.md).
Ancora scollegato da saveDay/saveDays e dai lettori applicativi: nessuna
migrazione, RPC nuova o doppia scrittura. Capacità manifest false.
Prossimo incremento: migrazione controllata di Days e instradamento coerente
dei lettori per periodo; compattazione e controller di attivazione ancora
aperti. Nessun deploy o dato reale; ultimo online Apps Script 75.

## Persistenza commit a frammenti — 28 ottobre, pacchetto 8 parziale

Adattatore interno syncSheetsCommitStore_ per due fogli dedicati espliciti:
frammenti UTF-8/Base64 e riferimenti append-only, marcatore separato dopo
flush/rilettura, revisioni/checksum e alias operationId pubblicato con il commit.
Recupero col nucleo senza duplicare ricevute o sequenze; payload pubblicati
corrotti bloccano il protocollo. Guardie di attivazione/accesso e lock condiviso.
Nuovo test:commit-storage: 332 interruzioni su mock, Unicode/formule, revoca,
corruzione e letture mirate con 50.000 righe estranee. Nessun accesso Google.
Build, npm test/test:commit-storage, test:release, test:identity e test:tracing
superati; Demo/staging rigenerati, Index senza differenze frontend.
[Schema, limiti e fonti](VERIFICA-PERSISTENZA-COMMIT-SHEETS.md).
Non collegato ai writer/lettori legacy; nessuna creazione fogli o inizializzazione
automatica. Budget 512 riferimenti per chiave: compattazione necessaria prima
dell'uso continuativo. Capacità del manifest ancora false; nessun deploy o dato
reale. Ultimo online documentato Apps Script 75.

## Commit recuperabili — 28 ottobre, pacchetto 8 parziale

Nuovo nucleo interno syncCommitProtocol_ in Code.gs, con adapter sincrono
iniettato: prepare/preimmagini, applicazione idempotente, ricevute stabili e
pubblicazione del checkpoint solo alla fine. Feed di riferimento con snapshot
immutabili, tombstone e pagine di commit interi; barriera di recupero anche
sui lettori del protocollo. SHA-256/checksum e scope archivio/epoca/principale.
Test:commits copre 16 interruzioni prima/dopo le scritture con processo nuovo,
conflitti, ricevute mancanti, varianti esterne, limiti e corruzione.
Nessun adapter Sheets o writer/lettore legacy collegato; nessuna API nuova,
setup o tabella creata. Capacità del manifest ancora false.
Build, npm test/test:commits, test:release, test:identity e test:tracing superati.
Demo e staging dei sei file rigenerati; Index rigenerato senza differenze.
[Contratto, matrice delle mutazioni e limiti](VERIFICA-NUCLEO-COMMIT-RECUPERABILI.md).
Prossimo incremento: persistenza a frammenti/checkpoint e primo writer canonico.
Nessun deploy o dato reale; ultimo online documentato resta Apps Script 75.

## Più pagine locali del diario — 28 ottobre, pacchetto 7 parziale

Indice limitato a 16 pagine per scope, chiavi mese/progetto/cursore, ricostruzione
atomica dei soli 25 metadati/corpi richiesti. Prima pagina conservata dopo le
continuazioni; totale/confini cambiati e ID sovrapposti invalidano le pagine
interessate. CAS e aggiornamento indice atomici; esclusione dei descrittori
senza cancellare dati o bozze. Compatibilità con il descrittore singolo precedente,
nessuna migrazione/reset dello schema. Anteprima anche sul caricamento successivo,
separata dagli editor già aperti, con privacy/bozze/focus/selezione preservati.
Prova diagnostica estesa con pagesReopened; nuovo test:local-pages.
Build, npm test, test:local-pages, test:local-views, test:local-common,
test:repository, test:release, test:progressive, test:identity e test:tracing
superati; Index/Demo e sei file di staging rigenerati.
[Contratto, verifiche e limiti](VERIFICA-PAGINE-LOCALI-DIARIO.md).
Interruttori di produzione ancora null, cacheReady:false, nessun deploy o dato
reale. Periodo comune ancora singolo; fotografia remota completa e abilitazione
reale restano aperte. Ultimo online documentato Apps Script 75.

## Dati comuni locali — 28 ottobre, pacchetto 7 ancora parziale

Nuovo common-read-cache per cataloghi e slice del diario con copertura esatta,
appartenenza per ID/versione e transazioni atomiche. Ticket prima della RPC,
CAS, anteprime indipendenti per pagina/periodo; mutazioni pertinenti invalidano
la copertura senza perdere bozze. Limite 500 record/4 MiB, niente cataloghi
troncati o versioni inventate. Privacy, voci, TaskPlans e tracing esclusi.
ensureCommon collegata dietro commonViewCache=null, copia reale ancora spenta.
Anteprima sola lettura, nessun merge locale nello stato canonico; bozze
preservate e risposte superate dopo salvataggi scartate nel percorso cache.
Prova diagnostica sintetica estesa con commonReopened; nuovo test:local-common.
Build, npm test, test:local-common, test:local-views, test:repository, test:release,
test:common-window, test:common-periods, test:identity e test:tracing superati.
Index/Demo e sei file di staging rigenerati.
[Contratto, verifiche e limiti](VERIFICA-DATI-COMUNI-LOCALI.md).
Nessun deploy o dato reale; ultimo online documentato resta Apps Script 75.

## Anteprima locale diario — 28 ottobre, pacchetto 7 ancora parziale

Adattatore getJournalPage con ticket/revisione catturati prima della RPC,
metadati e corpi separati, copertura dell'ultima pagina e lettura atomica per ID.
Loader con anteprima obsoleta e risposta remota distinte, richieste superate
scartate e persistenza che non blocca il rendering. Shell collegata dietro
journalPageCache=null: nessuna attivazione sui dati reali o apertura automatica.
Anteprima solo lettura, note private escluse, nessun merge canonico prima della
risposta Google; bozze della scheda e versioni conservate. Prova diagnostica
sintetica estesa con viewReopened. Nuovo test:local-views.
[Contratto, verifiche e limiti](VERIFICA-ANTEPRIMA-LOCALE-DIARIO.md).
Build, npm test, test:local-views, test:repository, test:identity, test:release,
test:progressive e test:tracing superati; Index/Demo rigenerati.
Restano dati comuni, più pagine/viste, consenso e collaudo iframe reale.
Nessun deploy o dato reale; ultimo online documentato resta Apps Script 75.

## Repository locale — SPEC-004 pacchetto 7 parziale, solo sintetico

Fondamenta IndexedDB implementate: scope archivio/principale/epoca, lotti
atomici con checkpoint e revisione CAS, corpi versionati, bozze indipendenti,
invalidazione/cancellazione remota senza perdere bozze o outbox riservata.
Prova manuale nella diagnostica su DB separato con soli marcatori inventati;
nessuna apertura automatica o RPC. Copia applicativa ancora disabilitata:
cacheReady resta false e nessuna vista usa il repository.
[Contratto, verifiche e limiti](VERIFICA-REPOSITORY-LOCALE.md).
Build, npm test, test:repository e test:release superati; Index/Demo rigenerati.
Restano riapertura viste, integrazione risposte server e collaudo iframe reale.
Nessun deploy o dato reale; ultimo online documentato resta Apps Script 75.

## Identità archivio — SPEC-004 pacchetto 2 parziale, solo locale

Nuovo getSyncManifest: archiveId/epoch persistenti per DB_ID+ROOT_ID e
principalId separato in UserProperties, dopo confronto utente attivo/effettivo
non vuoti. Nessuna email o ID Drive restituiti. Controlli live di accesso,
lock breve non bloccante, identità corrotte non sostituite e retry dei metadati
incerti. Capacità di copia locale/feed/outbox tutte disabilitate.
Modulo frontend archive-identity e verifica manuale nella diagnostica, senza
RPC all'avvio o aperture IndexedDB; risposte obsolete e fallimenti revocano
lo scope. Nuovo scope userinfo.email nei sorgenti, da autorizzare al futuro
deploy. Access MYSELF e USER_DEPLOYING invariati.
[Verifica, contratto e limiti](VERIFICA-IDENTITA-ARCHIVIO.md).
Build, npm test, test:identity, test:storage, test:release e test:tracing superati.
Index/Demo e sei file di staging rigenerati. Commit worker precedente 3da5df2.
Manca ancora la verifica sul vero iframe Google: pacchetto 2 non chiuso.
Nessun deploy, setup o dato reale; ultimo online documentato Apps Script 75.

## Worker a lotti piccoli — SPEC-004 fase 1B parziale, solo locale

Una voce per acquisizione del lock, rilascio/flush fra le voci, rilettura della
coda a ogni unità. Massimo 10 identità e budget morbido di 5 secondi; stop su
busy o esito di creazione/chiusura Docs incerto. Nuove versioni fra unità restano
pending, errori non ripetuti nello stesso passaggio. UI mostra progresso e
lavoro rimasto; tracing distingue occupazione totale e massima del lock.
È l'alternativa intermedia della SPEC: scritture ancora sotto il lock globale,
una singola chiamata lenta può oltrepassare il budget, costo totale potenzialmente
maggiore. Writer condizionale e coordinamento completo restano da sviluppare.
[Verifica, fonti e limiti](VERIFICA-WORKER-LOTTI-PICCOLI.md).
Build, npm test, test:worker-chunks, test:release, test:locks, test:tracing,
test:search-concurrency e P54 superati. Index/Demo e sei file di staging
rigenerati; nessun deploy, trigger nuovo o dato reale. Ultimo online Apps Script 75.

## Ricerca senza lock lungo — SPEC-004 fase 1A, solo locale

searchArchive ora legge fuori dal lock globale, con tre controlli brevi
tryLock(0) di configurazione/revisione e senza flush. Nuova SEARCH_REVISION
prima delle mutazioni pertinenti, una volta per richiesta IO; mappe di refs,
allegati e pending. Precedenza del pending mantenuta. Controlli live di
revisione/archivio/cestino prima e dopo i Docs. Writer concorrenti invalidano
il lotto; continuazioni legate a scope/query/revisione. UI scarta tutte le
pagine al reset e propone retry, senza pubblicare pagine incomplete nello
stato canonico. Errori Docs segnalati come ricerca parziale.
[Contratti, prove e limiti](VERIFICA-RICERCA-SENZA-LOCK-LUNGO.md).
Build, npm test, test:search-concurrency, test:release, test:tracing,
test:delete-delta, test:progressive, test:task-index, test:locks e test:scale superati.
Index/Demo e sei file di staging rigenerati; mock con revisioni file.
Il worker mantiene il proprio lock lungo; il browser attende ancora la ricerca.
Nessun deploy o dato reale; ultimo online documentato resta Apps Script 75.

## Cancellazione con delta — SPEC-004, solo locale

Con incrementalCommon:true, deleteNote risponde con deletedEntryIds e
alreadyAbsent, senza ricostruire state_(). Il client elimina entry, collegamenti,
pianificazione e copie in archivio/cache; preserva bozze estranee e sostituisce
la sessione del diario per scartare richieste precedenti. Retry dopo risposta
persa gestito dal ramo già assente. Versioni, marcatori e controlli live Drive
invariati; nessuna atomicità o revisione del lock Docs introdotta.
[Verifica e limiti](VERIFICA-CANCELLAZIONE-DELTA.md).
Build, npm test, test:delete-delta, test:release, test:tracing,
test:progressive, test:incremental e test:legacy-deltas superati.
Index/Demo e sei file di staging rigenerati. Nessun deploy o dato reale;
ultimo online documentato resta Apps Script 75.

## Delta dei percorsi legacy — SPEC-004, solo locale

Con incrementalCommon:true, addFileLink restituisce il solo allegato canonico
(anche se duplicato), updateEntry i metadati versionati, convertProjectToTag
le patch dei soli campi mutati con rimozione progetto e tag aggiunti. Nessuna
ricostruzione state_() dopo queste scritture. Client: merge per identità,
contenuti/privacy conservati, niente record incompleti per voci non caricate,
cache invalidate e bozze mantenute con versioni originali. I client senza
opt-in restano compatibili. Conversione ancora proporzionale ai record coinvolti;
La cancellazione è trattata nel seguito sopra; contesa dei writer Docs invariata. [Verifica e limiti](VERIFICA-DELTA-LEGACY.md).
Build, npm test, test:legacy-deltas, test:release, test:tracing e
test:incremental superati. Index/Demo e sei file di staging rigenerati.
Nessun deploy o dato reale; ultimo online documentato resta Apps Script 75.

## Riflessioni multigiornata in lotto — SPEC-004, solo locale

Nuova saveDays: fino a 10 date/500.000 byte, una RPC e un lock/flush, letture
solo delle giornate richieste. Esito per data e upsert dei soli record
confermati; conflitti e campi invalidi non bloccano le altre giornate.
Un errore di scrittura inatteso interrompe le successive, senza falsa conferma.
Salva pagina raggruppa ora le riflessioni: tre giorni una RPC, ventuno 10/10/1.
Bozze mantenute su errore, conflitto, risposta persa o malformata; nuove modifiche
durante ACK restano sporche con baseline aggiornata. saveDay singolo invariato.
Niente atomicità del lotto o idempotenza operationId: un commit senza risposta
può dare conflitto al retry, conservando la bozza. Dettagli e verifiche in
[VERIFICA-RIFLESSIONI-LOTTO.md](VERIFICA-RIFLESSIONI-LOTTO.md).
Build, npm test, test:day-batch, test:release, test:cycle, test:progressive,
test:tracing, test:incremental e P75 superati. Index/Demo e sei file di staging
rigenerati. Nessun deploy o accesso ai dati reali; ultimo online resta v75.

## Cataloghi e risposte incrementali — SPEC-004, solo locale

Il frontend richiede delta canonici per obiettivi, abitudini (anche archivio),
progetti e impostazioni delle riflessioni. Niente state_() dopo queste scritture;
merge per identità e settingsPatch senza perdere bozze o versioni. Compatibilità
completa per client senza opt-in. Le viste senza periodo richiedono lo scope
catalogs senza storico temporale; Impostazioni/Sync omettono anche le voci del
mese. Restano completi i cataloghi scaduti e altri percorsi legacy; il lotto
multigiornata delle riflessioni è implementato nel seguito sopra.
Fixture con 50.000 record storici per tabella: lettura cataloghi invariata a
28 celle, non una misura della latenza Google. Dettagli e verifiche in
[VERIFICA-CATALOGHI-DELTA.md](VERIFICA-CATALOGHI-DELTA.md).
Build, npm test, test:catalog-deltas, test:cycle, test:release,
test:common-periods, test:common-window, test:incremental, test:tracing e P87
browser superati. Index/Demo e sei file di staging rigenerati.
Nessun deploy o dato reale; ultimo online documentato resta Apps Script 75.

## Settimana e Abitudini per periodo — SPEC-004, solo locale

Estese le finestre alle due viste: Settimana legge il periodo visibile e il
checkup; Abitudini legge la giornata e le settimane indipendenti del tracker
e del giorno scelto, senza i periodi intermedi. Slice con ranges per unioni
separate, scope week/date e merge limitato agli intervalli. Durante la lettura
il vecchio modulo rimane montato e disabilitato; errori ripristinano selezione,
bozze rich e versioni. Le risposte della vista precedente vengono invalidate.
Fixture con 50.000 righe storiche per tabella: 126/124 celle contro 1.450.283
della lettura completa, non una misura della latenza Google. In questa tranche le viste senza
finestra mantenevano la lettura completa; il seguito sopra introduce catalogs.
Build, npm test, test:common-periods, test:common-window, test:release,
test:cycle, test:incremental, test:diary-goals, test:tracing, P85 e P88 superati.
Dettagli e limiti in
[VERIFICA-SETTIMANA-ABITUDINI-PERIODO.md](VERIFICA-SETTIMANA-ABITUDINI-PERIODO.md).
Index/Demo e sei file di staging rigenerati. Nessun deploy o dato reale;
ultimo online documentato resta Apps Script 75.

## Dati comuni del diario per periodo — SPEC-004, solo locale

Il diario legge Days del mese più il giorno precedente, HabitLogs delle
settimane interessate e Weeks del focus corrente. Contratto esplicito
commonSlices/commonScope; cataloghi riutilizzati separatamente per 60 secondi.
Merge limitato agli intervalli, cache vista subordinata alla copertura e
risposte ritardate scartate dopo salvataggi confermati. In questa prima tranche le altre viste facevano
fallback completo; il seguito sopra estende le finestre a Settimana e Abitudini. Fixture con 50.000 giorni/log fuori
periodo: 85 celle lette contro 950.124 della lettura completa, non latenza reale.
Dettagli, verifiche e limiti in
[VERIFICA-DATI-COMUNI-PERIODO.md](VERIFICA-DATI-COMUNI-PERIODO.md).
Nessun deploy o dato reale; Index/Demo e sei file di staging rigenerati.

## Fotografia Task per le continuazioni — SPEC-004, solo locale

Implementato lo step successivo: prima pagina dei metadati da Sheets, poi
fotografia ordinata temporanea in CacheService, fino a 200 record per pagina.
Token/offset/cursore, scope e revisione verificati. Nella fixture da 50.000
voci le continuazioni passano da 389 letture/849.992 celle a zero letture
Sheets. Restano chiamate Cache/Properties e costo della prima scansione.
Nuova proprietà runtime TASK_INDEX_REVISION invalidata prima delle scritture
pertinenti, una volta per richiesta. Nessun setup o nuovo foglio.
Cache persa/scaduta o dati cambiati: stato parziale e retry con bozze conservate;
fallback senza indice dopo problemi cache. Worker Docs e salvataggi canonici
mantengono i contratti precedenti. Dettagli in
[VERIFICA-INDICE-TASK.md](VERIFICA-INDICE-TASK.md).
Build, npm test, test:task-index, test:scale, test:locks, test:tracing,
test:release, test:task-deferred, test:progressive, test:incremental e P82
superati; Index e Demo rigenerati, sei file di staging verificati.
Nessun deploy o accesso ai dati reali; ultimo online documentato Apps Script 75.

## Task: elenco e descrizioni separati — seguito SPEC-004, solo locale

Implementato lo step successivo: la vista Task carica metadati a pagine fino
a 200, senza Drive/Docs/DocContent. Le descrizioni vengono richieste
all'apertura, per la ricerca nei testi o prima di salvare una modifica che
non ha ancora il corpo originale. Nuova API versionata `getJournalContents`,
massimo 25 voci e controlli della versione prima/dopo la lettura; lettore
contenuti condiviso col diario normale. Ricerca parziale, retry, privacy,
bozze e risposte obsolete gestiti senza usare placeholder nei salvataggi.
Tracing measurementVersion 4: `metadataOnly` distingue la nuova navigazione
dell'elenco dal completamento dei corpi delle versioni precedenti.
Dettagli in [VERIFICA-TASK-CONTENUTI-DIFFERITI.md](VERIFICA-TASK-CONTENUTI-DIFFERITI.md).
Build, npm test, test:task-deferred, test:release, test:progressive,
test:incremental, test:tracing, test:scale, test:locks e P82 superati.
Index e Demo rigenerati; nessuna dipendenza o autorizzazione Google nuova.
Nessun deployment o accesso ai dati reali; ultimo online documentato Apps Script 75.

## Letture Entries raggruppate — seguito SPEC-004, solo locale

Implementato su richiesta lo step successivo: `entrySearch_` oltre 500 voci
usa `readEntries_` con intervalli limitati a 256 righe e amplificazione massima
otto. Restituisce solo i record richiesti; corpo storico escluso, ordine e
contratti preservati. Nessuna nuova API o modifica ai salvataggi/lock.
Nel dataset sintetico da 50.000 voci le letture per pagina Task scendono da
20.003 a 389; le celle aumentano da 340.028 a 849.992. È un risultato sul
lavoro simulato, non una misura della latenza Google. Dettagli e limiti in
[VERIFICA-LETTURE-ENTRIES-BATCH.md](VERIFICA-LETTURE-ENTRIES-BATCH.md).
Test dedicato `test:entry-batch`, incluso in npm test; budget in test:scale.
Build, npm test, test:scale, test:locks, test:tracing, test:release,
test:progressive, test:incremental e P82 superati; Index e Demo rigenerati.
Nessun deployment: ultimo online documentato resta Apps Script 75.

## Avvio SPEC-004 — 27 ottobre 2026, solo locale

Autorizzato l'avvio degli sviluppi del piano prestazionale. Prima tranche:
tracing measurementVersion 3 con attesa/occupazione lock e volume del lettore
Sheets, fixture di crescita e prova IndexedDB manuale con soli dati fittizi
in Impostazioni → Diagnostica prestazioni. Nessuna cache applicativa, outbox,
modifica al protocollo di salvataggio o al lock del worker. Nessun deploy:
ultimo online documentato resta Apps Script 75.
Risultati, baseline e limiti in [VERIFICA-AVVIO-SPEC-004.md](VERIFICA-AVVIO-SPEC-004.md).
Build, npm test, test:locks, test:storage, test:scale, test:tracing,
test:release, test:progressive e test:incremental superati su dati simulati.
La prova nel vero iframe Google e l'identità stabile dell'archivio restano
da validare prima di conservare dati applicativi in IndexedDB.

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

Successivamente raccolta una prima baseline reale e avviata la fase 0 della
SPEC-002: estensione locale del tracing con tempi esclusivi, dettaglio
DocContent/cache, motivi osservabili dei miss, correlazione delle pagine e
benchmark get/getAll facoltativo. Estensione pubblicata su richiesta nella
versione Apps Script 64, mantenendo lo stesso URL; le ottimizzazioni applicative
restano proposte in attesa delle nuove misure.

IndexedDB, sincronizzazione offline bidirezionale, PWA ed Electron sono stati discussi, ma NON implementati. Non sostituire il salvataggio corrente basandosi soltanto sulla discussione. La prossima eventuale fase deve validare persistenza e identità dell'archivio nel contesto Apps Script.


## Aggiornamento locale — 23 ottobre 2026

Baseline measurementVersion 2 raccolta il 22–23 ottobre e aggregata nella
SPEC-002, senza conservare export originali. Autorizzato e implementato
l'esperimento E: getAll/putAll per pagina, controlli revisione e pending
preservati; tracing additivo cacheGetAll/cachePutAll e Demo aggiornata.
Pubblicazione esplicitamente richiesta ed eseguita il 23 ottobre 2026:
versione Apps Script 65 sul deployment esistente, stesso URL e accesso privato.
Backup dei sei sorgenti remoti fuori repository e confronto con la base
prima del push; nessuna modifica remota divergente. Nessun accesso ai contenuti
del diario né setupDrive.
DocContent raggruppato, progressivo task e modifiche dei controlli Drive
restano successivi. Risultati locali e limiti in docs/VERIFICA-CACHE-BULK.md.


Collaudo reale successivo via Chrome dedicato autenticato dall'utente e
Playwright: cinque letture pagina e cinque navigazioni Task riuscite, tutte
hit; coda zero pending/errori prima e dopo. Pagina mediana 4,499 s client,
cache 38 ms; Task mediana 16,680 s su 61 voci / tre pagine. Nessuna scrittura
sui dati del diario. Dettagli e limiti in VERIFICA-CACHE-BULK.md.


Seguito autorizzato sui controlli Drive: implementato localmente il riuso
nella stessa richiesta degli antenati sul solo percorso verificato da
inside_, con tracing di appartenenza/genitori/radice/cestino. Nessuna cache
tra richieste. Build, npm test, test:tracing, test:release e test browser
P82/P85 passati. Pubblicazione esplicitamente richiesta ed eseguita il 23 ottobre 2026:
questo seguito è attivo nella versione Apps Script 66, stesso deployment e URL. Dettagli in docs/VERIFICA-CONTROLLI-DRIVE.md.


Collaudo reale versione 66 completato su richiesta con Playwright/Chrome:
cinque letture pagina e cinque navigazioni Task, tutte riuscite e tutte hit;
coda zero pending/errori. Mediane pagina 5,629 s, Task 14,462 s, rispetto a
4,499 / 16,680 s della versione 65: risultato misto, nessun miglioramento
complessivo dimostrato. driveParents pagina mediana 1,785 s, cestino 6 ms;
riuso antenati osservato. Dettagli in VERIFICA-CONTROLLI-DRIVE.md. Nessuna
scrittura ai dati reali. Il confronto prestazionale non è un A/B alternato.


## Task progressivi — pubblicati nella versione 67

Autorizzata come prossima azione dopo il commit c1e2e72. Ogni pagina task è
visibile prima delle successive, con risultati esplicitamente parziali,
errori e retry conservativo. Editor/bozze/ricerca preservati, sessioni obsolete
ignorate e una richiesta pagina in volo. firstResultMs misura prima patch DOM,
non paint. Build e test locali passati; dettagli in VERIFICA-TASK-PROGRESSIVI.md.
Deploy successivamente richiesto ed eseguito il 23 ottobre 2026: versione
Apps Script 67 sul deployment esistente, stesso URL e accesso privato.
Backup remoto fuori repository confrontato con la base 66, nessuna divergenza.
Tutti i controlli della procedura passati; nessun setupDrive o modifica diretta
dei dati del diario. Collaudo autenticato del progressivo successivamente completato (vedi sotto).


Collaudo reale v67 richiesto dall'utente: cinque letture pagina e cinque
navigazioni Task riuscite. Primo risultato DOM task mediana 5,067 s,
completamento 16,058 s; primi risultati disponibili 10,129–14,486 s prima
della fine delle rispettive navigazioni. Stato parziale e preservazione
nodo editor/focus/selezione verificati senza modifiche. Coda zero pending/errori;
contenuti finali equivalenti nelle ripetizioni. Nessun miglioramento del tempo
totale dimostrato. Dettagli e limiti in VERIFICA-TASK-PROGRESSIVI.md.


## DocContent raggruppato — seguito al commit 74f0a7f

Implementato su autorizzazione il passo A: ricerca degli ID necessari alla
pagina in finestre limitate, lettura dei soli frammenti correnti raggruppati,
fallback individuale oltre budget bulk, errori localizzati e snapshot solo
nella richiesta. Test locali passati, dettagli/limiti in VERIFICA-DOCCONTENT-BATCH.md.
Deploy richiesto ed eseguito: versione Apps Script 68, stesso deployment/URL
e accesso privato. Backup remoto confrontato con la base 67 senza divergenze,
controlli superati. Collaudo reale richiesto ma non completato; nessun setupDrive.

Ripresa dopo interruzione: rieseguiti build, npm test, test:tracing,
test:release e test:progressive con esito positivo. Rafforzati i test A per
input vuoti/duplicati, limite 25 ID, isolamento dello snapshot tra richieste,
recupero dopo errori di ricerca/intestazioni e bypass esplicito della cache.
La sessione Chrome precedente era inizialmente indisponibile. Nessun nuovo
deploy durante la ripresa. B resta una proposta successiva.

Collaudo reale v68 successivamente completato su richiesta dopo accesso Google
dell'utente nel Chrome dedicato. Cinque letture warm e cinque con bypass cache:
tutte riuscite, 25 voci e contenuti canonici equivalenti, zero errori. Mediane
client warm 4,621 s, bypass 10,504 s; DocContent batch sul bypass 434 ms,
una ricerca su 74 righe, zero fallback. Cinque navigazioni Task riuscite,
61 voci/tre pagine tutte hit; primo risultato DOM mediano 5,198 s e
completamento pagine 16,153 s, escluso l'eventuale getState precedente.
Stato parziale, nodo editor/focus/selezione conservati senza modifiche.
Coda prima/dopo zero pending/errori, 64 completate. Nessun salvataggio del
diario, setupDrive o nuovo deploy. Nessun miglioramento temporale complessivo
dimostrato; dettagli e limiti in VERIFICA-DOCCONTENT-BATCH.md.


## Release 2.0.4 — Apps Script 69

Versione funzionale aggiornata da 2.0.3 a 2.0.4 per documentare il recupero
raggruppato di DocContent. Il changelog descrive il beneficio strutturale e
specifica che non è dimostrata una riduzione del tempo totale. package.json,
lockfile, Demo, sorgenti UI e Changelog sono aggiornati; Index.html rigenerato
con la build. Dopo il backup e il confronto dei sei file della versione 68
(identici salvo Index.html e Changelog.html), il deployment esistente è stato
aggiornato alla versione 69, stesso URL e accesso privato. Descrizione:
«GDiary v2.0.4 - recupero DocContent raggruppato». ROOT_FOLDER_ID è stato
passato solo tramite variabile temporanea ricavata dal backup remoto, senza
modificare i sorgenti o stampare l'identificativo. Build, test della procedura
di deploy e test:release superati. Chrome autenticato conferma che l'interfaccia
mostra v2.0.4. Nessun setupDrive o modifica ai dati del diario.


## Risposte di salvataggio incrementali — sviluppo locale

Implementato su richiesta il passo B della SPEC-002: Days, Weeks e HabitLogs
restituiscono il solo record canonico salvato tramite `commonUpserts`.
Frontend aggiornato nelle viste giorno, settimana, diario continuo e tracker.
Nessuna rilettura completa compensativa; preservati versioni, campi e record
estranei. Nessun deploy né accesso ai dati reali.
Verifiche e limiti in VERIFICA-SALVATAGGI-INCREMENTALI.md.

Deploy successivamente richiesto ed eseguito il 23 ottobre 2026: versione
Apps Script 70 sul deployment esistente, stesso URL e accesso privato.
Prima della pubblicazione rieseguiti build, npm test, test:incremental,
test:release, test:tracing, test:progressive e P85/P80/P75: tutti positivi,
come i controlli aggiuntivi della procedura di deploy. Backup remoto dei sei
file fuori repository; HEAD remoto e versione 69 coincidenti con la base Git.
Verifica successiva: deployment alla versione 70 e sei sorgenti pubblicati
identici allo staging. ROOT_FOLDER_ID passato solo tramite ambiente allo
staging, sorgente condiviso invariato. Nessun setupDrive o modifica ai dati
del diario. Collaudo autenticato dei salvataggi reali non eseguito.

Collaudo autenticato v70 successivamente completato su richiesta nel Chrome
Windows dedicato. Due navigazioni Task con 64 identità distinte e due aperture
settimana riuscite; diario caricato senza errori. Tre salvataggi reali con gli
stessi valori (giorno, settimana, abitudine): solo updatedAt modificato,
risposte con un record canonico, nessuna rilettura completa compensativa.
Tre tentativi con versioni obsolete rifiutati. Rilettura finale conferma tutti
i contenuti/formattazione e i record estranei invariati; coda zero pending,
zero errori, 67 completate prima e dopo. Misure singole RPC 2,635/2,693/3,169 s,
non un confronto A/B. Dettagli in VERIFICA-SALVATAGGI-INCREMENTALI.md.
Nessun nuovo deploy o setupDrive durante il collaudo.

## Design Obiettivi e abitudini — SPEC-003 locale

Avviato su richiesta lo sviluppo della proposta completa: stile e gerarchia
coerenti con diario/settimana, una superficie, tracker a tutta larghezza e
giornata nel flusso. Rimossi i vecchi adattamenti DOM della vista. Funzioni
di creazione, modifica, risultato, registrazione e archiviazione conservate;
riflessione rich senza riscrivere l'intenzione. Bozze separate per form nella
scheda e versione originaria preservata dopo altri salvataggi. Nuovo comando
test:cycle e verifica in docs/VERIFICA-DESIGN-OBIETTIVI.md. Nessun nuovo deploy
o accesso ai dati reali: Apps Script 70 mantiene il design precedente.

Deploy del nuovo design successivamente richiesto ed eseguito il 23 ottobre
2026: Apps Script 71, stesso deployment, URL e accesso privato. Build, npm test,
test:cycle, test:release, test:incremental e controlli della procedura superati.
Backup remoto dei sei file fuori repository: HEAD/versione 70 uguali alla
base Git; nessuna divergenza. Sei sorgenti pubblicati verificati identici allo
staging, manifest privato conservato e ROOT_FOLDER_ID passato solo tramite
ambiente. Nessun setupDrive o modifica ai dati del diario.

Verifica autenticata del design 71 completata in sola lettura nel Chrome
Windows dedicato: quattro sezioni e superficie unica, tracker completo di
nove colonne senza overflow desktop, apertura settimana e ritorno al ciclo
riusciti. Nessuna bozza pendente; coda zero pending/errori e 67 completate
prima e dopo. Nessun salvataggio reale durante questa verifica.

## Promemoria obiettivi in cima al diario — sviluppo locale

Su richiesta, aggiunti titoli e descrizioni degli obiettivi del trimestre
del mese visualizzato, prima delle giornate. Nessun titolo/descrizione nuovo
per il ciclo: si usano i record Goals esistenti. Riquadro sempre aperto,
descrizioni complete e multilinea; senza obiettivi non compare. Presente
anche nel diario di progetto, escluso dalla vista Task e coperto nel fallback
senza Vue. Nessuna nuova RPC o scrittura. Build, npm test, test:diary-goals,
test:release, test:progressive e test:incremental superati su Demo.html.
Verificati confini trimestre/anno, HTML trattato come testo, arrivo ritardato
dei dati comuni senza perdere bozza/nodo/focus/selezione e quattro palette a
320/390/768/1440 px. Nessun deploy: online resta Apps Script 71.

Deploy del promemoria successivamente richiesto ed eseguito il 23 ottobre
2026: Apps Script 72 sul deployment esistente, stesso URL e accesso privato.
Prima del push rieseguiti build, npm test, test:diary-goals, test:release,
test:progressive e test:incremental, tutti positivi, come i controlli
aggiuntivi della procedura. Backup dei sei sorgenti remoti fuori repository:
HEAD e versione 71 coincidenti con la base Git, nessuna divergenza.
ROOT_FOLDER_ID passato solo tramite ambiente allo staging. Verifica remota
successiva: versione 72 attiva, sei file identici allo staging, manifest
MYSELF/USER_DEPLOYING conservato. Nessun setupDrive o salvataggio reale.

Verifica autenticata della versione 72 riuscita in sola lettura: un obiettivo
del trimestre mostrato prima delle giornate, titolo e descrizione identici
ai record in memoria, nessun overflow o bozza pendente. Coda zero pending,
zero errori, 67 completate. Nessun contenuto esportato.

Durante la pubblicazione richiesto anche il riporto dell'icona dell'obiettivo:
aggiunto il path del catalogo condiviso accanto al titolo, con supporto delle
icone storiche e rispetto della scelta «Nessuna icona», anche nel fallback.
Build, npm test, test:diary-goals e test:release rieseguiti e superati.

Seguito con icone pubblicato nella versione Apps Script 73, stesso deployment,
URL e accesso privato. Backup remoto confrontato con la versione 72; Index
confrontato con la copia verificata di quel deploy, gli altri cinque file
con la base Git: nessuna divergenza. Superati tutti i controlli della procedura;
verifica successiva dei sei file identici allo staging e del manifest privato.
ROOT_FOLDER_ID passato solo tramite ambiente; nessun setupDrive o salvataggio
reale durante la pubblicazione.

Verifica autenticata della versione 73 superata in sola lettura: icona,
titolo e descrizione del promemoria corrispondono al record dell'obiettivo;
riquadro prima delle giornate, nessun overflow o bozza pendente. Coda zero
pending/errori, 67 completate. Nessun contenuto esportato o salvataggio reale.

## Palette Prugna — sviluppo locale

Su richiesta aggiunto un quinto tema, Prugna (`plum`), selezionabile in
Impostazioni → Aspetto: sfondo lavanda #f5f1f7, carta #fffaff, accento #704076.
Copertura dei token condivisi e griglia palette adattiva; scelte precedenti e
formattazione utente conservate. Build, npm test, P65 palette, test:cycle,
test:diary-goals e test:release superati; le suite del ciclo e del promemoria
ora includono anche Prugna. Dettagli in VERIFICA-PALETTE-PRUGNA.md.
Nessun deploy o accesso ai dati reali; online resta Apps Script 73.

Deploy successivamente richiesto ed eseguito: Apps Script 74, stesso deployment,
URL e accesso privato. Build, npm test, P65 palette, test:cycle, test:diary-goals,
test:release e controlli aggiuntivi della procedura superati. Backup remoto
dei sei file fuori repository e confronto HEAD/versione 73/base Git senza
divergenze. ROOT_FOLDER_ID passato solo tramite ambiente allo staging.
Verifica remota successiva: sei sorgenti identici allo staging, versione 74
attiva e manifest privato conservato. Nessun setupDrive o salvataggio reale.

Verifica autenticata v74 riuscita: cinque palette disponibili, Prugna
selezionabile con preferenza locale coerente, nessun overflow in impostazioni
o diario desktop, nessuna bozza pendente. Coda zero pending/errori e 67
completate invariata. Ripristinata la preferenza palette precedente al termine;
nessun salvataggio dei dati del diario o esportazione di contenuti.

## Evidenza cromatica del promemoria — sviluppo locale

Su richiesta il riquadro Obiettivi del trimestre usa una tonalità distinta
dalle sezioni giornaliere e un bordo più marcato: azzurro in Carta calda,
lavanda in Salvia, pesca in Blu ardesia, ambra nello Scuro e menta in Prugna.
Token CSS locali `--memory-*`, nessuna modifica a contenuti, API o flussi.
Build, npm test, test:diary-goals e test:release superati. Il test del
promemoria verifica anche sfondo distinto, contrasto testo almeno 4,5:1 e
icone almeno 3:1 sul riquadro in tutte le cinque palette; confermate le
geometrie mobile e la conservazione delle bozze. Ispezionati screenshot
simulati in artifacts/cycle-memory-highlight-*.png, esclusi da Git.
Nessun deploy o accesso ai dati reali: online resta Apps Script 74.

Deploy successivamente richiesto ed eseguito: Apps Script 75, stesso deployment,
URL e accesso privato. Build, npm test, test:diary-goals, test:release e tutti
i controlli aggiuntivi della procedura superati. Backup dei sei sorgenti remoti
fuori repository e confronto HEAD/versione 74/base Git senza divergenze.
ROOT_FOLDER_ID passato solo tramite ambiente allo staging. Verifica remota
successiva: sei sorgenti identici allo staging, versione 75 attiva e manifest
MYSELF/USER_DEPLOYING conservato. Nessun setupDrive o salvataggio reale.

Verifica autenticata v75 superata: riquadro distinto nelle cinque palette,
contrasto minimo del testo misurato 5,36:1; icona, titolo e descrizione
corrispondenti al record. Nessun overflow desktop o bozza pendente. Coda
zero pending/errori, 67 completate. Ripristinata la palette precedente al
termine; nessuna scrittura ai dati del diario o esportazione dei contenuti.

## SPEC-004, pacchetto 8 — routing locale Goals/Habits

Completato il collegamento locale del controller Goals/Habits al registro
recuperabile: binding esplicito di Goals, Habits, indice e blocchi; anchor
persistente; avvio readOnly e attivazione esplicita; dipendenze a ruolo
condiviso con HabitLogs. Aggiunti test controller/server/browser. Chromium su
Demo verifica il bootstrap e le letture canoniche dei cataloghi mantenendo
immutata la riga storica HabitLogs.

Build, `npm test`, `npm run test:e2e`, `npm run test:release` e
`git diff --check` superati il 28 ottobre 2026. Nessun deploy, setupDrive o
accesso ai dati reali. Report: `VERIFICA-CONTROLLER-CATALOGHI.md`.

Il pacchetto 8 non è chiuso: restano la matrice completa delle mutazioni, il
feed completo e il contratto di provisioning/abilitazione. Il conteggio dei
pacchetti aperti resta 8/12.

Seguito della matrice Goals/Habits: create/edit/archive, replay degli ACK,
conflitti e dipendenze, identità delle microazioni riordinate, conservazione
dei log storici; tutti i 24 ordini Days/Weeks/HabitLogs/Catalog rifiutano
binding con ruoli scambiati senza scritture. Corretto anche il testo del
conflitto Catalog che indicava erroneamente la Giornata. Superati build,
`npm test`, `npm run test:e2e`, `npm run test:release` e `git diff --check`.
Il pacchetto 8 resta aperto per le altre
mutazioni applicative, il feed completo e il contratto di provisioning.
