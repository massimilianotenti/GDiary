# Outbox locale — fondazione parziale SPEC-004, fase 6

## Lettura coerente di bozza e coda — 30 ottobre

Il repository legge la bozza e le operazioni attive della voce nella stessa transazione IndexedDB read-only, usando l'indice per voce e stato. Gli aggiornamenti della vista dopo ACK upsert e delete usano questa fotografia al posto di due letture separate. Chromium verifica la singola transazione, revisioni e operazioni condivise fra repository e i casi UI di conferma; build, test:repository, test:sync-consumer, test:local-search-persistence e test:release superati. La transazione termina prima dell'aggiornamento del DOM: una scrittura successiva resta da gestire con aggiornamento della vista. Capability operations disattivata e collaudo Google aperto.

## Conferma di salvatamento e altre schede — 30 ottobre

Prima di applicare alla vista un ACK normale o ottenuto da ricevuta, l'interfaccia verifica la revisione della bozza e le operazioni attive nel repository, oltre alla revisione nota nella scheda. Se esistono modifiche successive, conserva testo, formattazione e stato della copia locale aggiornando la sola baseline; una lettura non affidabile o un cambio scope impediscono l'aggiornamento della vista. Chromium verifica due repository con IndexedDB condiviso, la voce nello stato e nell'editor, ACK normale e riconciliato e cambio scope. Build, test:repository, test:sync-consumer e test:release superati. Le letture non formano una transazione con modifiche successive al controllo; collaudo Google ancora aperto e capability operations disattivata.

## Ricreazione dopo tombstone — 30 ottobre

La scelta di ricreare una bozza conflittuale usa il nuovo ID anche come `clientId`, evitando la collisione con i record di staging della creazione originaria. L'interfaccia usa la stessa identità nel blocco e nello stato locale. Test integrato Chromium, IndexedDB e server simulato copre creazione canonica, cancellazione con risposta persa, modifica locale successiva, conflitto, ricreazione esplicita e nuovo ACK, con testo e formattazione conservati. Build, test:repository, test:sync-consumer, test:entry-create e test:release superati. La ricreazione non ripristina allegati o altri collegamenti della vecchia identità; il collaudo Google rimane aperto e la capability operations è disattivata.

## Conferma tardiva della cancellazione e bozze successive — 30 ottobre

Prima di rimuovere la voce dalla vista dopo un ACK delete, l'interfaccia legge bozza e operazioni attive nello scope corrente. Una bozza più recente, una modifica in coda o testo sporco mantengono la voce; se un upsert successivo è già stato accodato da un'altra scheda, la voce assente può essere ripristinata dalla coda. Lettura fallita o cambio scope non rimuovono la vista. Test Chromium copre anche due repository sullo stesso IndexedDB, errore di storage e cambio scope; build, test:repository, test:sync-consumer e test:release superati. Le letture non sono una transazione unica con la vista: una scrittura concorrente successiva alla verifica richiede il normale aggiornamento delle viste. Il salvataggio dopo una tombstone può richiedere risoluzione del conflitto; il collaudo Google resta aperto.

## Riconciliazione delle cancellazioni — 30 ottobre

`getJournalDeleteReceipt` confronta scope, ID, versione iniziale e operationId con il piano di cancellazione e verifica la ricevuta e la tombstone del commit. Il dispatcher lo consulta dopo una risposta persa o non valida e conferma soltanto la prova coerente; una risposta «già assente» senza prova della stessa operazione diventa conflitto. Ricevuta o piano mancanti restano `unknown`, senza inferire l'esito. Chromium con IndexedDB e server Apps Script simulato verifica un commit seguito da risposta persa, una sola cancellazione, ACK e conservazione della bozza; test controller coprono versione modificata, scope diverso, assenza e tracing, senza scritture durante la verifica. Build, test:repository, test:entry-controller, test:tracing e test:release superati. Restano aperte la retention delle ricevute, la gestione oltre la sua finestra e il collaudo Google; capability operations disattivata.

## Riconciliazione dopo risposta incerta — 30 ottobre

Dopo un errore o risposta non valida di un upsert già inviato, il dispatcher rinnova la lease e consulta `getJournalOperationReceipt` con la richiesta originale e lo scope fissato. Solo una prova committed con ID, scope e versione coerenti produce ACK e aggiorna la baseline; un conflitto verificato mantiene il flusso di confronto. La UI aggiorna la versione senza sostituire il contenuto corrente. Se la ricevuta è assente o la verifica fallisce, resta la precedente gestione dell'errore: l'assenza non viene trattata come conferma. I retry temporanei esistenti restano possibili con lo stesso operationId; una policy di retention e riconciliazione oltre la finestra non è ancora definita. La cancellazione non usa questo nuovo percorso.

Test unitari coprono timeout, risposta persa/malformata, scope alterato e assenza; Chromium con IndexedDB verifica una modifica successiva e la sua baseline. Un test integrato con server Apps Script simulato perde la risposta dopo il commit e verifica ricevuta, ACK e testo/formattazione conservati senza secondo invio. Build, test:repository, test:identity, test:entry-controller, test:release e git diff --check superati. La fixture browser dell'identità è stata aggiornata allo scope verificato richiesto dalla ricerca locale. Capability operations disattivata; nessun collaudo Google.

## Endpoint di verifica ricevuta — 30 ottobre

`getJournalOperationReceipt` verifica una richiesta di salvataggio originale per una sola voce tramite il controller Entries e restituisce stato e, per un commit verificato, ID e versione canonica. Confronta archivio, principal, epoca e versioni di protocollo con lo scope autorizzato; richiesta alterata o scope diverso sono rifiutati. Una ricevuta o un piano mancante rimangono `unknown`. La verifica è read-only e supporta il percorso diagnostico. Test con controller e Sheets simulato coprono prova, alterazioni, isolamento, più blocchi, tracing e assenza di scritture; build, test:entry-controller, test:entry-migration, test:commits, test:tracing e test:release superati. L'outbox non usa ancora l'endpoint; capability operations disattivata e nessun collaudo Google.

## Richiesta originale e ricevuta — 30 ottobre

Per i nuovi salvataggi canonici con operationId esplicito, il piano memorizza anche l'impronta della richiesta originale (mese, ID e blocchi), senza conservare un'ulteriore copia del testo. Il gateway e il controller interni possono confrontarla con quella ripresentata, quindi verificano la richiesta canonica contro la ricevuta; payload diverso è rifiutato. Piani precedenti senza impronta restituiscono `unknown`. Test gateway e controller con richiesta realmente passata da `saveJournalPage`, retry e richiesta alterata, build, test:entry-migration, test:entry-browser, test:entry-controller, test:commits e test:release superati. Il test browser usa ora una data fissata per la fixture. Endpoint client, gestione dell'assenza e integrazione outbox restano da completare; non è un collaudo Google.

## Confronto interno con il piano della pagina — 30 ottobre

Il gateway Entries può verificare in sola lettura una ricevuta rispetto all'impronta della pagina normalizzata conservata nel piano e alla richiesta canonica registrata nella ricevuta. Rifiuta una pagina o una richiesta diversa e segnala `unknown` in assenza di piano o ricevuta, senza concludere che non sia stato eseguito alcun salvataggio. I test del protocollo verificano il confronto della richiesta; quelli del gateway coprono pagina identica, modificata e assente, senza scritture. Build, test:commits, test:commit-storage, test:commit-capacity, test:release e test del gateway Entries superati. Non esiste ancora un endpoint client né la derivazione verificabile della pagina normalizzata dalla richiesta originale: la riconciliazione dell'outbox resta incompleta.

## Lettura interna delle ricevute — 30 ottobre

Il protocollo espone internamente `lookupOperationReceipt` in sola lettura, scoped per archivio e principal: restituisce una ricevuta committed o conflict verificata contro commit e baseline, oppure `unknown` se manca. Blocca transazioni pending senza recuperarle. Test in memoria e Sheets simulato coprono isolamento, ricevuta assente, baseline mancante e assenza di scritture; build, test:commits, test:commit-storage, test:commit-capacity e test:release superati. Non è una RPC e non riconcilia ancora l'outbox: occorrono associazione verificabile al payload originale, endpoint autorizzato, gestione dei casi incerti e integrazione client. `unknown` non prova che l'operazione non sia stata applicata.

## Baseline obbligatoria nel repository — 30 ottobre

La transazione `settleOutboxOperation` rifiuta un ACK di upsert senza versione server non vuota, anche se chiamata direttamente senza dispatcher. I test Chromium/IndexedDB verificano versioni assenti, nulle o vuote, conservazione invariata di operazione e bozza e successivo ACK valido; la cancellazione conserva il contratto precedente. Build, test:repository, test:sync-consumer e test:release superati. Non verifica l'autenticità della versione né risolve l'esito remoto incerto; capability operations e collaudo Google restano aperti.

## Conferma con versione valida — 30 ottobre

Il dispatcher non conferma un salvataggio se la risposta contiene una versione vuota, solo spazi, oltre 200 caratteri o più risultati per lo stesso clientId. L'operazione resta `failed` con `ProtocolCorrupt`, senza ACK, e la bozza rimane disponibile. Test dispatcher e Chromium con IndexedDB verificano il caso; build, test:repository e test:release superati. Il server potrebbe aver già applicato l'operazione: la verifica non prova l'esito remoto né introduce una riconciliazione automatica; capability operations spenta e collaudo Google ancora aperto.

## Creazione locale non confermata — 30 ottobre

Un ID provvisorio assegnato a un nuovo blocco viene rimosso se la prelettura fallisce prima dell'invio al repository o se l'accodamento termina con `DataError`, `ConflictError`, `QuotaExceededError`, `AbortError` o `SecurityError`. Il testo resta sporco e la precedente data di creazione viene ripristinata. Per timeout e altri errori dall'esito non dimostrato l'ID resta invariato: non si presume il rollback. Chromium con repository simulato verifica prelettura, quota, timeout e successo; build, test:repository e test:release superati. Serve ancora riconciliare esplicitamente l'esito incerto e offrire l'invio remoto alternativo previsto dalla specifica.

## Blocco del bypass dalla pagina — 30 ottobre

Il salvataggio diretto non invia blocchi modificati che la pagina marca come locali pending/conflitto o che hanno un ID locale senza versione remota. Il testo resta nell'editor e l'utente viene invitato a riattivare la copia per completare o risolvere la coda. La normale creazione online senza ID continua a funzionare. Test Chromium in `test:repository`, build e test:release superati. Non è ancora l'invio remoto alternativo previsto dalla SPEC-004: il controllo usa i marcatori della pagina e non dimostra che altre schede non abbiano operazioni concorrenti; la disponibilità dell'archivio Google non è stata verificata.

## Rinnovo condizionato prima dell'invio — 30 ottobre

Il repository rinnova atomicamente la lease soltanto se owner, token e scadenza sono ancora validi; non riduce una scadenza esistente. Il dispatcher rinnova prima di ogni RPC, fermandosi se ha perso la proprietà. Il test Chromium con IndexedDB verifica rinnovo, esclusione di un altro owner, rifiuto della lease scaduta, takeover e assenza dell'invio successivo da parte del vecchio owner. Superati build, test:repository, test:identity e test:release. Non viene mantenuta una lease attiva durante una RPC già avviata: se supera la scadenza è possibile un retry concorrente, protetto dall'operationId idempotente; il server Google non è collaudato e la capability resta disattivata.

## Lease dopo verifica identità — 30 ottobre

Il dispatcher legge l'ora per acquisire la lease dopo la verifica dell'identità, anziché prima della RPC. Un test con orologio simulato fa avanzare la verifica di 70 secondi e verifica l'ora di acquisizione; un test Chromium con IndexedDB reale verifica anche claim, invio simulato e ACK. Build, test:repository, test:release e git diff --check superati. Le attese successive possono ancora consumare la lease; non è un collaudo del server Google e la capability resta disattivata.

`createLocalRepository.saveLocalOperation()` accetta soltanto mutazioni `note`
o `task`, con ID operazione e voce stabili, baseVersion, payload, snapshot
locale, revisione attesa e dipendenze. Verifica che payload, operationId e ID
della voce coincidano, limita payload/snapshot e registra l'operazione come
`pending` con zero tentativi.

La chiamata apre una singola transazione IndexedDB `readwrite` su `drafts` e
`outbox`. Controlla la revisione della bozza e l'unicità dell'operationId;
scrive insieme la nuova revisione locale e il payload che verrà inviato. Un
retry con operationId già presente non può mutare il payload. `getOutbox()` e
`listOutbox()` leggono gli elementi nello scope verificato. IndexedDB v6
aggiunge `byScopeStatus` e `byScopeEntity` per interrogare stati e operazioni
della stessa entità senza enumerare tutte le ricevute ACK/conflict.

Il writer server di `saveJournalPage` accetta ora, in aggiunta al percorso
esistente, un operationId stabile fornito dal client. La ricevuta e il piano
sono scoped per principal+operationId e confrontano un fingerprint dell’intero
payload: stesso ID/stesso contenuto ripete l’ACK, stesso ID/contenuto diverso
fallisce con `OperationMismatch`. Per un create canonico il gateway riusa
l'ID della bozza se è libero; controlla le collisioni contro Entries legacy e
canoniche, mentre il controller verifica l'identità sul primo commit e sul
replay. Il percorso di update resta condizionato dalla versione.

`createOutboxDispatcher()` traduce un upsert locale note/task in una pagina
singolo blocco e chiama `saveJournalPage` con operationId/Entry ID stabili.
Coordina lease e claim, ACK con serverVersion, retry transitorio e stati
failed/conflict. Su ACK il repository aggiorna nella stessa transazione la
baseline draft e le operazioni dipendenti ancora non inviate. Il diario continuo
scrive prima snapshot e outbox in IndexedDB e mostra la conferma locale solo
dopo il commit; le revisioni non inviate vengono accorpate con operationId
preservato. Le creazioni mantengono l'ID anche fra riapertura e invio. Il
dispatcher traduce anche delete in `deleteNote`; il gateway accetta l'operationId
client e conserva una ricevuta/tombstone che ripete l'ACK sul retry e respinge
lo stesso ID riutilizzato con una baseVersion diversa.

Il manifest trasporta `operationsReady` separatamente dalla capability di
lettura. Shell e dispatcher si avviano solo quando il client ha verificato
identità, cache/feed e `operations:true`; il manifest Demo/server corrente la
dichiara `false`, quindi il percorso di trasporto non è invocato da questa
build. La prova UI usa una capability sintetica e un database browser isolato.

La lease cross-tab vive in `archiveMeta` e contiene owner, token fenced e
scadenza. `acquireOutboxLease` serializza le acquisizioni; `claimOutboxBatch`
seleziona una coda limitata per creazione/operationId, non claimando dipendenze
finché non sono ACK e rispettando `nextAttemptAt`. Il claim incrementa tentativi
e marca `sending` nella transazione; una lease scaduta rende riprendibile lo
stesso operationId/payload, perciò il trasporto futuro dovrà richiedere dedupe
server. `settleOutboxOperation` accetta ACK/retry/conflict/failed solo dal token
lease attivo. `saveLocalOperation()` accorpa modifiche solo se esiste una sola
operazione compatibile della stessa entità, ancora pending e con zero tentativi;
conserva quell'operationId e aggiorna solo payload/snapshot non ancora inviati.
Dopo il claim non accorpa l'operazione e assegna un nuovo ID alla modifica
successiva. `retryOutboxFailure` classifica gli errori transitori noti e calcola
full jitter esponenziale da 1 s fino a 300 s; i conflitti diventano
stato `conflict`, gli altri errori non transitori `failed`. La transizione e il
controllo lease restano nella stessa transazione. `releaseOutboxLease` rende
recuperabili gli invii incerti.

`tests/verify-local-outbox.cjs` usa Demo e Chromium per verificare scrittura
atomica, immutabilità su retry, riapertura del DB, revisione successiva,
dipendenze, abort tra le scritture, lease esclusiva, ordinamento, coalescing
prima dell'invio e ID distinto dopo claim, jitter retry, ACK, conflitto/fallimento
preservati, token scaduto e recovery di un invio incerto.

## Limiti

- La capability `operations` resta spenta nel manifest corrente; perciò gli
  utenti attuali continuano a salvare online e il dispatcher non invia RPC.
  La lease coordina le schede dello stesso IndexedDB, non è una garanzia server.
- La classificazione opera sui codici d'errore interni; il futuro dispatcher
  traduce gli errori RPC/trasporto; ACK aggiorna la baseline della bozza e
  delle operazioni dipendenti nella stessa transazione.
- Conflitto e failed sono stati durevoli, ma la UI non espone scelta esplicita
  tra versione locale/remota né una riconciliazione.
- Il dispatcher traduce upsert e delete; il comando Elimina accoda e rimuove
  dalla vista solo dopo il commit IndexedDB. Una creazione mai inviata può
  essere rimossa con la bozza; dopo un tentativo deve prima essere sincronizzata.
  La UI non espone ancora la scelta fra versione locale/remota per i conflitti.
  La conferma locale non implica un ACK Google.
- Le operazioni sono limitate a note/task; i percorsi Days/Weeks/HabitLogs e le
  altre mutazioni restano online.

Verifiche dell'incremento: `npm run build`, `test:entry-controller` (incluso
delete operationId, replay e mismatch di baseVersion), `test:repository` (repository,
probe, outbox Chromium, dispatcher sintetico e salvataggio UI Chromium),
`test:identity`, `test:entry-controller`, `test:entry-create`,
`test:entry-migration`, `test:entry-browser`, `test:release` e
`git diff --check` superati. Capability reale operations spenta; nessun deploy,
RPC Google o accesso a dati reali.

Le creazioni locali mai inviate possono essere eliminate atomicamente insieme alla bozza; se esiste un tentativo o una dipendenza, la rimozione viene rifiutata. Build, `test:repository` e `test:release` superati. Il trasporto resta disabilitato nel manifest corrente.

Le modifiche e cancellazioni successive dipendono anche dalle operazioni in conflitto o fallite; il test browser verifica che non possano scavalcarle. Build, test:repository e test:release superati. Resta da implementare la scelta di risoluzione.

Il dispatcher attende i risultati asincroni del repository. Un test Chromium con IndexedDB reale e server simulato verifica lease, claim, invio, ACK e baseline; build, test:repository e test:release superati. La capability resta disattivata e manca il collaudo Google.

Alla riapertura le creazioni in conflitto sono visibili anche senza una voce remota; con una voce remota il payload locale resta separato. Test browser mirato, build, test:repository e test:release superati. La scelta di risoluzione non è ancora disponibile.

Una cancellazione dipendente da conflitto o errore non nasconde la voce, né subito né alla riapertura; test browser, build, test:repository e test:release superati. Il flusso di risoluzione resta da implementare.

Nel diario continuo è disponibile il confronto testuale fra bozza locale corrente e voce remota, caricata su richiesta. Il test browser verifica entrambe le versioni e il rendering come testo; build, test:repository e test:release superati. Resta da implementare la scelta di risoluzione e il caso di voce remota cancellata.

Il confronto consente di scegliere la versione locale: la transazione controlla la revisione della bozza, conserva la versione remota e accoda un nuovo invio condizionato. Test IndexedDB e UI, build, test:repository e test:release superati. Cancellazioni dipendenti e scelta della versione remota non sono ancora gestite; nessun collaudo Google.

È disponibile anche la scelta della versione Google: revisione locale verificata, bozza conservata nella cronologia e operazioni compatibili chiuse atomicamente. Test IndexedDB e UI, build, test:repository e test:release superati. La cache remota si aggiorna tramite sincronizzazione successiva; restano i conflitti con cancellazioni e il collaudo Google.

La scelta remota incrementa atomicamente la revisione della cache e invalida le viste e la ricerca, mantenendo il cursore del feed. La successiva sincronizzazione deve aggiornare la copia; il test IndexedDB verifica revisione, indice e cursore. Build, test:repository e test:release superati.

La prossima sincronizzazione ricostruisce la copia invalidata; la ricerca resta indisponibile finché non è completa. Un bootstrap interrotto mantiene il marcatore e conserva le bozze. Build, test:sync-consumer, test:repository e test:release superati con server simulato.

Le cancellazioni in conflitto possono essere confermate sulla versione remota mostrata oppure annullate scegliendo Google; il repository conserva la versione remota. Test IndexedDB e UI, build, test:repository e test:release superati. Resta il caso di voce remota già cancellata e il collaudo Google.

Il dispatcher segnala alla UI conflitti ed errori permanenti solo dopo il salvataggio dello stato; tenta di riportare in vista le cancellazioni nascoste e non ridisegna l’editor con modifiche aperte. Test dispatcher, build, test:repository e test:release superati; la gestione UI richiede ulteriore verifica integrata e il collaudo Google.

Un test Chromium collega il dispatcher all’handler UI: una cancellazione in conflitto torna visibile e il testo non salvato non viene ridisegnato. Build, test:repository e test:release superati; il server è simulato.

I messaggi server di nota cambiata o voce non trovata sono classificati come conflitti e non cancellano la bozza; test dispatcher, build, test:repository e test:release superati. Il recupero di una voce effettivamente eliminata resta aperto.

Il confronto riconosce una risposta esplicita di voce remota assente e mostra la bozza; gli errori di rete restano distinti. Test controller e browser, build, test:repository e test:release superati. La scelta di recupero resta da implementare.

Una bozza di voce assente può essere ricreata con nuova identità, conservando lo storico locale; i collegamenti della vecchia voce non sono ripristinati. Test IndexedDB e UI, build, test:repository e test:release superati. La cancellazione locale già soddisfatta e il collaudo Google restano aperti.

Una cancellazione locale in conflitto può essere confermata se il server segnala esplicitamente la voce assente: la transazione conserva lo storico, invalida la cache e non accoda un nuovo delete. Build, test:repository, test:release e test UI mirato superati; il server Google non è stato collaudato.

Un test integrato con IndexedDB reale e server simulato verifica conflitto, scelta locale e ACK, conservando la versione remota. È stata corretta la classificazione del messaggio «Voce modificata altrove». Build, test:repository e test:release superati; nessun collaudo Google.

La scelta locale aggiorna l’editor al testo accodato; i controlli restano bloccati durante la transazione di risoluzione. Un test browser verifica testo, baseline e blocco asincrono; build, test:repository e test:release superati.

Gli errori temporanei riconosciuti dal messaggio ricevono un codice di retry coerente; un test Chromium con IndexedDB reale verifica timeout generico, stato pending e bozza conservata. Build, test:repository e test:release superati.

Le creazioni già tentate possono essere eliminate accodando un delete dipendente dall’ACK della creazione; la versione viene aggiornata atomicamente prima del claim. Test Chromium con IndexedDB, build, test:repository e test:release superati. Nessun collaudo Google.

Gli invii falliti possono essere rimessi in attesa dall’interfaccia mantenendo identità, contenuto e numero di tentativi. Test IndexedDB e UI, build, test:repository e test:release superati. La finestra di retention delle ricevute e il collaudo Google rimangono aperti.

Una modifica successiva a un invio incerto attende la precedente anche quando questa è tornata pending. Un test Chromium con IndexedDB verifica ordine dei claim e baseline dopo ACK. Build, test:repository e test:release superati; collaudo Google ancora aperto.

Salvataggi e delete leggono le sole operazioni attive; l’ACK usa l’indice della singola entità anziché scorrere l’intero archivio. Test IndexedDB, build, test:repository e test:release superati. Restano da misurare lo storico per singola entità e le code attive molto grandi.

IndexedDB v7 aggiunge l’indice per voce e stato; salvataggi, cancellazioni e ACK interrogano i soli stati pertinenti della voce. La migrazione v6→v7 conserva 1.001 operazioni confermate e una pending nel test Chromium. Build, test:repository, test:local-search-persistence e test:release superati; resta da misurare la crescita delle operazioni attive.

Il rilascio della lease usa l’indice delle operazioni sending; il retry manuale legge le sole operazioni attive della voce. Build, test:repository e test:release superati; test IndexedDB verifica l’indice usato dal rilascio.

Il claim usa cursori per pending e sending, mantenendo al massimo 2 × limite candidati; un test Chromium con 1.000 operazioni verifica dipendenze bloccate, recupero di invio scaduto, FIFO e assenza di getAll sugli stati. Build, test:repository e test:release superati. Il tempo può crescere con le operazioni non eleggibili.

Misura locale `npm run test:outbox-scale`: Chromium 156.0.8078.4, Linux x64, Intel i7-1370P; 1.000 righe sintetiche, lotto 5, 30 ripetizioni. Tutte inviabili p50 2,0 ms / p95 3,7 ms; tutte bloccate p50 375,3 ms / p95 568,1 ms (massimo 578,0 ms). Risultati locali, non stima delle RPC Google. Il caso bloccato va ottimizzato con avanzamento corretto e senza starvation.

Il claim memorizza fino a 256 esiti di dipendenze per la sola transazione. Su 1.000 righe e 30 ripetizioni, Chromium 156/Linux/i7-1370P: p95 29,7 ms con dipendenza bloccata condivisa, 410,6 ms con dipendenze distinte; precedente misura della dipendenza condivisa 568,1 ms. Test conferma che un ACK successivo sblocca le operazioni. Build, test:repository, test:release e test:outbox-scale superati. Misure non alternate e non relative a Google.

Il claim valuta le dipendenze in gruppi fino a 32 candidati per stato, mantenendo ordine e limite del lotto. Test Chromium attraversa gruppi con 40 operazioni bloccate e verifica il recupero di invii scaduti. Su 1.000 righe, 30 ripetizioni, Chromium 156/Linux/i7-1370P: p95 93,2 ms per dipendenze distinte, precedente misura 410,6 ms; p95 5,0 ms tutte pronte e 31,1 ms con dipendenza condivisa. Build, test:repository, test:release e test:outbox-scale superati. Misure non alternate; la scansione può crescere con la coda e non misura Google.

Il dispatcher fissa lo scope per il lotto: cambio di archivio/principal/epoca durante verifica o RPC blocca ulteriori claim, ACK e rilascio nel nuovo scope. Test unitari e Chromium con due scope nello stesso IndexedDB, build, test:repository, test:identity e test:release superati. Un invio incerto resta da recuperare nello scope originale.
