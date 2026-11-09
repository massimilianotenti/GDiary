# Retention fisica: pianificazione fail-closed

## Esito di questa tranche

È stato aggiunto un primo contratto interno `sync-retention-plan/v1`, legato
allo scope archive/principal/epoch e al digest, generazione e sequenza del
checkpoint. La policy reale è disattivata per default. La pianificazione non
scrive sul registro e non cancella righe o payload.

Lo stato della proposta è persistito separatamente dal feed come
`sync-retention-state/v1`, con revisione CAS e fasi `planned`, `approved`,
`retiring`, `complete`. Il gate di approvazione è un callback server separato.
Il passo di ritiro richiede adattatori server per lotto, verifica del residuo e
pubblicazione del minimo: se mancano, restituisce `ProtocolUnavailable` senza
modificare lo stato approvato. Il test simula pianificazione, lettura e
approvazione e verifica che l'assenza degli adattatori blocchi l'avanzamento.
I verificatori devono restituire una prova strutturata con scope, digest,
sequenza e conteggio; un booleano o un digest/scope diverso viene rifiutato.
Il controller Demo verifica davvero il manifest pubblicato e i conteggi di
Entries/Files/Layouts attraverso il checkpoint scoped. Per prefissi più grandi
richiede l'audit recuperabile descritto sotto; non usa il limite della singola
chiamata di ispezione come falsa prova di copertura completa. Le altre prove
positive di contratto usano adapter sintetici.

Il minimo cursore resta zero finché non risultano verificati tutti questi
insiemi: checkpoint, finestra delle ricevute, alias operationId, baseline Docs, tombstone
e route, lettori in corso e copertura legacy. Un piano non è approvazione,
pubblicazione del minimo cursore o autorizzazione a eliminare dati.

## Limiti e gate

Questa implementazione non completa la retention fisica. Il repository non
fornisce ancora una prova globale verificata della scadenza di ricevute e alias
(il contratto opt-in locale è descritto sotto); i
commit sono una prova alternativa usata dai retry quando la ricevuta manca.
Non esiste inoltre un inventario completo delle baseline Docs né lease dei
lettori per generazione. Perciò non si può approvare un piano sicuro con le
verifiche disponibili e non esiste un adattatore di ritiro concreto. Payload,
ricevute, alias, commit e baseline restano
intatti; nessun minimo cursore viene pubblicato.

Il test `verify-physical-retention.cjs` controlla default off, scope,
contratto, prove strutturate, digest errato, blocco quando manca una prova,
CAS, il controller Demo con checkpoint realmente pubblicato e assenza degli
adapter di ritiro. È una prova di protocollo e integrazione locale, non una
prova HTTP, Chromium, Apps Script o Google. Nessun recupero di spazio fisico è
dimostrato; pacchetto 12 resta aperto.

## Finestra d’idempotenza: contratto locale — 9 novembre 2026

Tranche dalla base `c939073`. Aggiunto `syncOperationWindow_`, contratto server
interno separato dal protocollo legacy e spento da
`syncOperationWindowEnabled_()`. Non esiste una nuova RPC Apps Script abilitata,
né provisioning reale. Le chiamate di prova usano esplicitamente servizi server
sintetici; l’app non abilita automaticamente il nuovo trasporto.

### Contratto e autorità

La finestra ammette un **inizio di tentativo** in `[issuedAt, expiresAt)`:
sul confine `now === expiresAt` è già scaduta. Una scrittura accettata entro
la finestra può completare dopo il confine; il suo pending rimane protetto.
La durata è policy server immutabile per lo scope, da 1 ms a 30 giorni; il
default del prototipo è 24 ore, non una durata di produzione approvata.
Il client non invia un tempo autorevole e non decide localmente la scadenza.

Tre metadati versionati, fuori dal feed applicativo:

| Record | Persistenza / contenuto |
|---|---|
| `sync-operation-window-anchor/v1` | Checkpoint immutabile: archive, scope archive/principal/epoch, policyId, windowMs, startedAt e checksum |
| `sync-operation-window-clock/v1` | Checkpoint mutabile append-only: stesso scope/policy e observedAt, massimo tempo server osservato durevolmente |
| `sync-operation-window-admission/v1` | Checkpoint immutabile per operationId: stesso scope/policy, fingerprint canonico, issuedAt/expiresAt, nonce server e checksum |

Chiavi private `[principalId, operation-window:epoch:anchor|clock|admission:ID]`.
`initialize` richiede autorizzazione server esplicita, capability e head
canonico zero senza pending. Non certifica l’assenza di dati legacy e non
attiva un archivio esistente. Un’inizializzazione parziale non viene riparata
ricreando silenziosamente l’orologio: resta da riconciliare. Anchor, clock e
ammissioni non sono eliminabili in questa tranche.

`admit` normalizza e valida la richiesta con lo stesso protocollo dei commit.
Il fingerprint riguarda operationId e cambiamenti canonici; la ricevuta o il
commit preesistente impediscono di adottare un’operazione legacy nella nuova
finestra. Con ammissione già presente, stesso ID/payload restituisce lo stesso
record soltanto entro il termine; payload diverso produce OperationMismatch.
Né retry né aggiornamento della configurazione rinnovano il termine.

`execute` e `lookup` richiedono ammissione esatta, integra, presente nel
registro immutabile e coerente con il payload e lo scope. Il checksum è un
sigillo d’integrità, **non una firma autosufficiente**: ricalcolare un checksum
sul client non autorizza una variante del record server. Non basta che la
ricevuta sia assente per ammettere un nuovo tentativo.

L’orologio autorevole è `services.now` server (default Date.now), mai un campo
della richiesta. Prima di eseguire si controlla il watermark persistente sotto
lo stesso lock; avanzamenti vengono salvati prima delle scritture applicative.
Una regressione rispetto al watermark blocca con `clockRegression`. Un salto
in avanti non rinnova la finestra e non si annulla tornando indietro. La prova
locale non certifica una sorgente UTC affidabile in Google né rileva regressioni
mai osservate/persistite: queste assunzioni non diventano una prova retention.
Il lookup del nuovo contratto può aggiornare il clock; il lookup legacy delle
ricevute conserva il comportamento read-only.

### Retry, pending e compatibilità

| Caso | Comportamento |
|---|---|
| Ammissione valida e tempo entro la finestra | Protocollo recuperabile esistente: ACK stabile, fingerprint, conflitti e recupero pending |
| Ricevuta assente, commit/alias presente entro finestra | Replay riconosciuto dal commit; stessa risposta, nessuna seconda applicazione |
| Confine o scadenza superati | `status: reconciliationRequired`, reason windowExpired; nessun execute/recovery applicativo implicito |
| Orologio regredito o clock/anchor assente | Riconciliazione richiesta; nessuna ricostruzione automatica del watermark |
| Ammissione assente o diversa | Riconciliazione richiesta; nessun tentativo nuovo fondato sulla sola assenza della ricevuta |
| Metadati corrotti / scope errato / payload differente | Errori espliciti ProtocolCorrupt / ScopeChanged / OperationMismatch |
| Record o client legacy senza metadati | Percorso precedente conservato, nessuna migrazione implicita, copertura retention non dimostrata |

La guardia protegge i tentativi del nuovo contratto. Le letture/il recupero
server del protocollo precedente possono ancora completare lavori già accettati;
non sono una nuova autorizzazione al replay del client. Il routing esclusivo di
**tutti** i gateway non è implementato o certificato da questo prototipo.
Non si possono quindi ritirare ricevute/alias legacy o ammissioni, neppure se
una fixture del nuovo contratto è interamente scaduta. La soppressione di tutte
le tracce di un ID non è un metodo per dimostrare che sia nuovo. Il percorso
di prima ammissione assume il registro permanente integro: non possiede una
prova autonoma di novità se vengono cancellati anche registro e storia. Per
questo la permanenza delle ammissioni rimane un blocker e il verifier globale
non viene abilitato.

### Outbox e UI

Il dispatcher ha un adattatore `operationWindow` opt-in, non configurato dal
bootstrap dell’app. Alla prima trasmissione salva l’ammissione in IndexedDB con
`attachOutboxWindow`, sotto lease e scope verificati, **prima** dell’RPC. Il
campo opzionale non cambia schema IndexedDB v11. L’ammissione non può essere
sostituita e una mutazione ammessa non viene accorpata a una nuova bozza.

Un’operazione con tentativi precedenti ma senza ammissione non ne richiede una
nuova automaticamente. Un ticket persistito non può essere spedito in modalità
legacy se l’adattatore viene disabilitato. Payload e operationId restano quelli
originari, anche dopo ACK perso, errore nel preflight ricevute o riavvio.

`reconciliationRequired` e ReconciliationRequired diventano stato outbox
`failed` con lastError **ReconciliationRequired**, distinto dagli errori
ritentabili. Sono gestiti risposta diretta, errore RPC, preflight e lookup dopo
ACK incerto. Nessuna nuova ricerca di ACK può trasformare una scadenza esplicita
in conferma automatica. `retryFailedOutbox` rifiuta questo stato; dipendenze
successive restano ferme. Bozze e formattazione sono conservate e modifiche
successive possono restare salvate come intenti dipendenti.

Le viste giornaliere, settimanali, registrazioni e voci mostrano
«Riconciliazione necessaria» e non propongono il normale reinvio quando il flag
è noto. Questo è un blocco esplicito, **non un flusso completo di riconciliazione
manuale**: confronto, eventuale applicazione intenzionale e provisioning restano
sviluppi successivi. Nessuna attivazione della feature nella UI ordinaria.

### Retention e prove

`verifyReceiptWindow` resta null: non vengono trasformati timeout, callback di
abilitazione o prove sintetiche in attestazioni positive. Il piano espone anche
`operationWindowLegacyCoverageUnverified`, `operationAdmissionRetentionUnproven`
e `operationWindowRoutingUnverified`, oltre al normale receiptWindowUnverified.
Baseline Docs, lease lettori e copertura legacy restano indipendenti.

L’inventario fisico verifica le tre nuove forme, campi esatti, checksum, scope,
chiave e assenza di alias impropri, senza nuove ricerche o letture mirate. Le
forme future sconosciute con prefisso sync-operation-window vengono rifiutate.
Restano budget, CAS, digest, replay, ripresa e invalidazione per append.

- `verify-operation-window.cjs`: clock controllabile, prima/confine/dopo,
  invarianti di ammissione/fingerprint, ACK stabili per create/edit/delete e
  conflitti, fallback commit, record
  legacy, perdita degli outcome, scope/corruzione, rollback dopo riavvio,
  contesa del lock e 36 interruzioni prima/dopo scritture di pubblicazione.
  Verifica pending lasciato intatto dal retry scaduto, più scanner fisico reale
  per i metadati, zero ricerche e corruzioni di sigillo/chiave/alias/versione.
- `verify-operation-window-browser.cjs`: HTTP dedicato con planner canonico
  Days e store reale simulato, ammissione persistita, commit con ACK perso sul
  confine, riconciliazione durevole e riavvio del processo Chromium. Verifica
  payload/rich/ID, bozza successiva, dipendenza bloccata, assenza di RPC/reissue
  al riavvio e nessun downgrade. Verifica controlli Day generati dall’app e un
  editor **isolato** con nodo/focus/selezione conservati: non è prova della
  feature attiva su ogni editor o gateway applicativo.
- `verify-outbox-dispatcher.cjs`: sei ordini risposta/errore/preflight/lookup/
  downgrade con ticket, senza retry o rinnovo dopo riconciliazione esplicita.
- `verify-operation-window-costs.cjs`: letture e scritture effettive del mock,
  con confronto opzionale del vecchio protocollo sulla stessa fixture tramite
  GDIARY_OPERATION_WINDOW_BASELINE_SOURCE. Nessuna dipendenza Git obbligatoria.

Il nuovo comando `test:operation-window` riunisce server, costi e browser;
server incluso in npm test, browser in test:repository.

### Prima/dopo e costi mock

Confronto con Code.gs di `c939073` caricato in un contesto V8 separato sulla
stessa fotografia: il normale execute legacy conserva risposta **e tutti i
contatori** (53 letture, 15 eventi di scrittura, 24.945 byte).

| Fase | Letture range | Righe / celle | Byte letti | Ricerche / righe candidate | Eventi di scrittura |
|---|---:|---:|---:|---:|---:|
| Execute ordinario, prima e dopo | 53 | 53 / 177 | 24.945 | 5 / 5 | 15 |
| Chiamata contratto disabilitato | 0 | 0 / 0 | 0 | 0 / 0 | 0 |
| Inizializzazione locale | 18 | 18 / 58 | 6.913 | 3 / 3 | 6 |
| Prima ammissione | 15 | 15 / 50 | 6.601 | 6 / 18 | 3 |
| Execute ammesso | 59 | 59 / 198 | 28.201 | 8 / 32 | 15 |
| Replay entro finestra | 17 | 17 / 61 | 8.245 | 6 / 54 | 0 |
| Retry sul confine | 19 | 19 / 65 | 8.333 | 3 / 27 | 3 |

È una fixture piccola e clock fisso a 1.000 fino al retry sul confine 1.100.
I tre eventi del retry scaduto persistono soltanto il watermark: l’unico commit
applicativo rimane uno. Non sono misure di latenza/quote Google né una prova di
lookup bounded nel nuovo percorso ordinario. La crescita del clock append-only
resta soggetta al limite del commit store e alla manutenzione già esistente;
non è dimostrata la sostenibilità di un registro ammissioni permanente.
Prima il protocollo legacy riconosceva indefinitamente il retry tramite le
tracce conservate; il nuovo contratto blocca il retry scaduto anche con quelle
tracce presenti o con outcome mancanti, preservando la barriera di ammissione.

### Verifiche finali e limiti ambientali

Node 24.22.1, npm 12.2.2 disponibile nel percorso temporaneo della sessione,
Chrome locale tramite CHROME_PATH. Tutte le suite richieste sono concluse:

| Comando | Esito |
|---|---|
| `npm run build` | Passato; ripetuto sulla guardia finale dell’ammissione |
| `npm test` | Passato; nuovo protocollo server e regressioni outbox inclusi |
| `npm run test:physical-retention` | Passato; ripetuto dopo l’ultimo controllo dell’ammissione |
| `npm run test:commit-capacity` | Passato |
| `npm run test:bootstrap-checkpoint` | Passato; protocollo e HTTP/Chromium |
| `npm run test:habit-log-continuous` | Passato, exit 0 |
| `npm run test:repository` | Passato; nuova prova HTTP/Chromium inclusa |
| `npm run test:release` | Passato su Demo |
| `npm run test:operation-window` con baseline `c939073` | Passato sul sorgente finale: server, costi e browser |
| `node tests/verify-outbox-dispatcher.cjs` | Passato, compresi i sei nuovi ordini di riconciliazione |

Il controllo finale ha reso esplicitamente non autorizzanti anche il campo
admission assente e quello presente con valore undefined, oltre a null. Le
prove verificano execute e lookup e head ancora zero; nessuna richiesta senza
ticket viene interpretata come autorizzata. Dopo questa modifica circoscritta
sono stati ripetuti build, retention e l’intero comando mirato (server, costi e
browser). Il resto dei percorsi legacy è coperto dalle suite generali sopra.

Suite continuativa: 1.000 identità, 2.000 commit, 3.648 riferimenti ritirati
logicamente, 12.018 righe fisiche conservate e 1.401 fault/replay; matrici
127/128/129/256/1.000 e contesa superate. Consumer HTTP/Chromium: 1.012 log,
20 snapshot e 401 pagine feed, 2.002 commit statici o 2.004 con scrittura
concorrente, riapertura IndexedDB. Checkpoint S=2.023 più sette delta e replay
dall’origine raggiungono entrambi cursore 2.030. La fixture conserva prova
operationAliases, tutti i 4.053 envelope e 591/620 passi discovery/inventory;
receiptWindowUnverified e i tre nuovi blocker specifici sono presenti.

Questo stress mantiene il nuovo contratto **spento**: verifica le regressioni
sul protocollo esistente e non certifica 1.000 operazioni con ammissione attiva.
Le prove della nuova modalità sono le fixture mirate descritte sopra. Nessuna
sostenibilità del clock/registro permanente o compatibilità totale dei client
è inferita dal risultato della suite continuativa.

Il sandbox ha rifiutato listen su 127.0.0.1; i test HTTP/browser e le suite con
sottoprocesso Git sono stati eseguiti con autorizzazione fuori sandbox, sempre
su dati sintetici. Una prima fixture browser usava un editor dell’app ancora
soggetto al render iniziale: la nuova prova isola esplicitamente il nodo editor,
mentre le suite repository esistenti conservano i test degli editor applicativi.
È stata completata anche la fixture di identità dopo il riavvio. Non sono
presentati questi aggiustamenti della fixture come risultati di staging.

Build/staging conserva i sei file Apps Script e il segnaposto ROOT_FOLDER_ID;
UTF-8 e bootstrap preservati, Demo mantenuta e Index rigenerato dai sorgenti.
`git diff --check` superato. Nessuna modifica a dipendenze o lockfile.


Pacchetto 12 aperto e conteggio 8/12 invariato. Policy e capability reali spente,
minimumAvailable zero, nessuna eliminazione di righe/payload/byte. Nessun
Google, setupDrive, deploy, migrazione reale, commit Git o pubblicazione remota.

## Envelope canonici senza `format` — 9 novembre 2026

Tranche locale successiva a `857487c`. Il writer `afterImages` del protocollo
produce esattamente `archive/collection/data/deleted/id/sequence/version`;
`entityValue` li legge senza un discriminante `format`. L’inventario ora
riconosce questa rappresentazione esistente, senza riscriverla o attribuirle
un nuovo formato persistito. `canonical-entity-envelope` è solo una classe
interna della pagina, rifiutata se compare come `format` nel payload.

Il verificatore richiede i sette campi esatti, archive/epoch uguali allo store,
una delle 15 collection del protocollo, ID non vuoto di massimo 200 caratteri,
sequenza intera positiva inferiore a `Number.MAX_SAFE_INTEGER`, versione
`commit-N`, booleano deleted e data oggetto oppure null per una cancellazione.
Verifica chiave entity derivata da collection/ID e alias vuoto del riferimento;
checksum, digest, pubblicazione, frammenti e proiezione `ref.state` restano
verificati dal lettore fisico. Un envelope incompleto, con campi aggiuntivi,
fuori scope o con `format` spurio non viene promosso a record valido.
Payload senza discriminante non riconoscibili conservano
`unversionedPayloadRecord` e impediscono la prova alias.

La sola validità strutturale non basta. Il writer pubblica gli after-image
prima del commit immutabile; la compattazione dei riferimenti ritira righe in
situ senza spostare quelle conservate. L’audit mantiene al massimo 25 tuple
collection/ID/sequenza/digest in `entityCoverage.pending`, sigillate nello stato
insieme al conteggio `verified`. Il successivo commit deve contenere ciascuna
impronta del payload completo. Payload discordanti, duplicati, orfani, ordine
non dimostrabile e superamento del limite producono `entityCommitMismatch` e
non autorizzano prove. Non si richiede che ogni after-image abbia ancora un
riferimento pubblicato: quelli ritirati restano nel commit, ma non sono
payload fisici classificati da questa tranche. Restano separati inventario
legacy e recupero dello spazio nei blocchi.

I commit verificano anche scope, checksum, unicità dei membri e lo stesso
contratto envelope; le ricevute mantengono il controllo del checksum e
accettano le stesse 15 collection del writer. Per ogni record il preflight del
lavoro riserva altre 25 unità per il confronto degli after-image. Non vengono
aggiunti lookup, TextFinder o mappe proporzionali all’archivio. Limiti per
pagina e stato invariati: 25 righe, 20 record, 512 KiB, 4.096 unità,
stato 196.608 byte e pagina più stato 1 MiB.

Gli stati precedenti restano leggibili. Se manca `entityCoverage` in un audit
parziale già avanzato, la ripresa mantiene `entityCoverageUnverified`; uno
stato completo precedente non acquisisce retroattivamente la prova. Occorre
una nuova scansione da una nuova fotografia/generazione. Il gate alias richiede
copertura completa, nessun pending e nessuno dei blocker preesistenti o nuovi;
non basta rimuovere `unversionedPayloadRecord`.

### Prove e risultati

`verify-retention-entity-envelopes.cjs`, incluso in `test:physical-retention`
e quindi in `npm test`, verifica 45 envelope applicativi, incluse tombstone,
28 casi malformati/ambigui, alterazioni di dati/identità/sequenza e commit,
chiave/alias/proiezione del riferimento, scope, payload legacy, riferimenti
ritirati, tutte le 15 collection e un commit di 25 mutazioni. Verifica inoltre
riapertura con impronte pending, ACK replay, append concorrente, digest e forma
dello stato, compatibilità conservativa degli audit precedenti. Un test di
protocollo con pagina sintetica verifica inoltre il limite dello stato con
ID Unicode e Bloom densi: meno di 196.608 caratteri JavaScript ma oltre
196.608 byte UTF-8 viene rifiutato senza pubblicare o avanzare il cursore.
Questa prova negativa non è una misura di performance della scansione. Il
conteggio dello stato persistito ora usa `traceBytes_`, come la discovery.
Le nuove prove
sono di protocollo locale; non sono RPC browser della retention.

Confronto eseguito sulla **stessa copia del ledger e del checkpoint** S=2.023,
caricando in un secondo contesto V8 le funzioni audit/store della base
`857487c`, senza sostituire adapter o risposte. Il test supporta il confronto
opzionale tramite `GDIARY_RETENTION_ENVELOPE_BASELINE_SOURCE` (sorgente Code.gs
precedente), insieme a `GDIARY_CONTINUOUS_FIXTURE` e
`GDIARY_RETENTION_AUDIT_ONLY=1`. La suite ordinaria non richiede la cronologia
Git. La fixture originale contiene 4.016 envelope pubblicati (3.016 settings e
1.000 HabitLogs); `enrich` ne aggiunge 37 prima del checkpoint applicativo.
Il test conta quindi 4.053 riferimenti pubblicati e richiede che tutti siano
verificati, invece di usare il numero storico come atteso fisso.

| Esito / costo mock | Base 857487c | Nuova classificazione |
|---|---:|---:|
| Commit verificati a S | 2.023 | 2.023 |
| Envelope canonici riconosciuti e confrontati | 0 | 4.053 |
| `unversionedPayloadRecord` | Presente | Assente |
| Prova `operationAliases` | Assente | Presente |
| Discovery / inventory | 591 / 620 passi | 591 / 620 passi |
| Letture dei passi, escluso begin | 23.446 | 23.446 |
| Righe / celle dei passi | 58.551 / 208.336 | 58.584 / 208.435 |
| Byte dei passi, escluso begin | 99.371.319 | 99.716.843 |
| Ricerche nei passi | 0 | 0 |
| Massimo per chiamata: letture / righe / celle | 30 / 77 / 258 | 30 / 77 / 258 |
| Massimo byte per chiamata | 270.305 | 270.389 |

La nuova discovery totalizza 6.311 letture, 20.513 righe, 77.496 celle e
13.782.617 byte; inventario 17.135 letture, 38.071 righe, 130.939 celle e
85.934.226 byte. Begin separato: 8 letture, 8 righe, 26 celle, 5.389 byte,
zero ricerche. Il massimo singolo range è 25 righe/100 celle; massimo byte
inventory 46.276 e discovery 13.240. Nessuna lettura aggiuntiva rispetto alla
base: lo stato durevole incrementa i byte dei passi di 345.524 (circa 0,35%).
Non viene dichiarato un miglioramento della latenza o del costo Google.

Audit completo: zero alias/ricevute mancanti, nessun pending envelope;
restano esattamente `receiptIdempotencyWindowUnproven`,
`docsBaselinesUnverified`, `readerLeasesUnverified`, `legacyCoverageUnverified`.
Il piano produce la prova alias ma resta bloccato da policy spenta e dalle
quattro dipendenze indipendenti. La prova di ripresa/replay/append a metà
discovery 1k è ancora superata.

Verifiche della tranche, Node 24.22.1, npm 12.2.2 e Chrome locale
(`CHROME_PATH=/usr/bin/google-chrome`):

| Comando / controllo | Esito |
|---|---|
| `npm run build` | Passato; Demo aggiornata dal backend, Index rigenerato invariato |
| `npm test` | Passato, inclusa la nuova suite envelope |
| `npm run test:physical-retention` | Passato sulla versione finale, incluse discovery, envelope e compatibilità |
| `npm run test:commit-capacity` | Passato; ripercorso anche da npm test finale |
| `npm run test:bootstrap-checkpoint` | Passato; protocollo e HTTP/Chromium |
| `npm run test:repository` | Passato |
| `npm run test:release` | Passato su Demo |
| Confronto retention-only 1k con base 857487c | Passato, exit 0 |
| `npm run test:habit-log-continuous` | Passato, exit 0; 1.401 fault/replay, matrice, contesa, HTTP/Chromium e checkpoint/feed |

Dopo l’ultimo allineamento del conteggio dello stato ai byte UTF-8 sono stati
ripetuti build e `test:physical-retention`, compreso il caso Unicode al limite.
La suite generale era già passata; la parte retention del run continuativo
finale usa il sorgente rigenerato con questa correzione.

Il run continuativo finale ha creato 1.000 identità/2.000 commit, superato
1.401 fault/replay, compattato 3.648 riferimenti logici e conservato 12.018
righe fisiche. Matrici 127/128/129/256/1.000, contesa, HTTP/Chromium e riapertura
IndexedDB superati: 1.012 log, 20 snapshot, 401 pagine feed, 2.002 commit statici
o 2.004 con scrittura concorrente. A S=2.023 il consumer ricostruisce lo stesso
cursore finale 2.030 dall’origine o da checkpoint più sette delta.

Il confronto retention integrato è un’esecuzione distinta da quella della
tabella: stessi 591/620 passi, 4.053 envelope e prova alias, con inventory
17.135 letture/38.069 righe/130.933 celle/85.936.950 byte; massimo per chiamata
30 letture/76 righe/255 celle/270.021 byte. Discovery invariata rispetto alla
tabella. I passi della base corrispondente leggono 99.374.043 byte, contro
99.719.567 nuovi: stessa differenza di 345.524 byte e zero ricerche. Non si
sommano contatori di fixture o esecuzioni differenti. HTTP/Chromium verifica
snapshot/feed/consumer; l’audit rimane una prova server locale, non una RPC
browser né un collaudo Apps Script.

UTF-8, Demo, segnaposto e lista dei sei file Apps Script preservati;
`git diff --check` superato. Index rigenerato invariato; nessuna modifica
frontend funzionale o nuova attivazione.

Il primo tentativo bootstrap nel sandbox è stato rifiutato su `listen`
127.0.0.1 (`EPERM`); le suite HTTP/browser sono state eseguite con permesso
fuori sandbox su dati sintetici. Il primo run continuativo nel sandbox aveva
superato fault/matrici, poi era stato bloccato su `spawnSync git EPERM`; anche
questo limite ambientale è stato risolto con l’esecuzione autorizzata fuori
sandbox. npm non era nel PATH: è stato scaricato in
`/tmp` con autorizzazione, senza modificare dipendenze o lockfile del progetto.
I test non hanno richiesto credenziali Google. La prima asserzione numerica del
confronto è stata corretta dopo aver distinto i 4.016 record originali dai 37
aggiunti da `enrich`: l’atteso finale è contato dalla fotografia fisica prima
dell’audit e non dal risultato del verificatore.


Policy reale spenta, minimo disponibile zero, nessuna eliminazione o recupero
di righe/payload/byte. La prova alias non è una finestra d’idempotenza:
restano ricevute senza scadenza verificabile, baseline Docs, lease lettori,
copertura legacy, compatibilità dei client e collaudo Apps Script/Google.
Pacchetto 12 aperto, conteggio 8/12 invariato. Nessun Google, deploy, setupDrive,
migrazione reale o commit.

## Discovery iniziale limitata e riprendibile — seguito dell’8 novembre 2026

L’avvio dell’inventario non chiama più `retentionHeadStatus()` né
`bootstrapDiscover()`: questi percorsi ordinari conservano i propri lookup,
ma non sono dipendenze della discovery retention. `begin` fissa soltanto
scope, generazione/digest richiesti e ultima riga fisica, pubblicando lo stato
`sync-retention-inventory/v1` in fase `discovery`. Non attesta ancora il
checkpoint: `upperSequence` resta zero e `complete` resta falso.

`step` visita finestre di massimo 25 righe dell’indice, caricando solo head,
puntatore `bootstrap:published` e manifest immutabile della generazione
richiesta. Limiti: massimo 20 payload, 512 KiB e 4.096 unità per passo;
lo stato conserva il limite di 196.608 byte e pagina più nuovo stato quello
di 1 MiB. Cursore, conteggi, digest cumulativo e ultime revisioni dei tre
candidati sono persistenti, scoped e coperti dal digest dello stato.
Il costo totale resta proporzionale alle righe dell’indice; questa tranche
limita il lavoro di ogni chiamata, non introduce una discovery totale O(1).
Le revisioni append-only della discovery aumentano lo spazio fisico occupato.

Alla fine si verifica il checksum del head più recente e si rifiutano pending,
puntatori mancanti, ambigui o fuori scope e manifest mancanti, duplicati,
non pubblicati, corrotti o non coerenti con il puntatore. Il manifest usa lo
stesso validatore del bootstrap ordinario, senza letture implicite; sequenza e
cursore devono essere coerenti con il head. Solo allora si passa a `inventory`
con la sequenza verificata e la stessa fotografia fisica iniziale.
Il rifiuto del pending avviene al termine della discovery, senza recovery
implicito. Dopo recovery applicativa o append concorrente occorre un nuovo
`begin`, che fissa una nuova fotografia.

Le revisioni sono ancorate all’ultima riga fisica, come nell’inventario:
CAS, riapertura, riparazione della pubblicazione completa con ACK perso e replay
non ripetono il lavoro già salvato. Un append estraneo invalida il cursore;
`status` restituisce `invalidated`. Gli stati inventory precedenti senza
campi `phase`/`discovery` restano leggibili e riprendibili. Un begin ripetuto
sulla stessa fotografia restituisce lo stato salvato senza discovery implicita.
Incompleto, legacy o corrotto non diventa una prova positiva.

`verify-retention-discovery.cjs`, incluso nella suite retention e in `npm test`,
verifica budget reali dei range mock, assenza di ricerche, riapertura a ogni
passo, replay ACK, CAS, interruzioni prima/dopo la pubblicazione di riferimento
e marker, append concorrente, scope, checksum head, manifest/puntatore corrotti,
manifest mancante/duplicato/non pubblicato e compatibilità degli stati inventory
precedenti. La prova sostituisce i metodi di lookup ordinari con funzioni che
falliscono se invocate: non nasconde letture dietro risposte fabricate.

Le misure precedenti qui sotto descrivono la base `158e8af`; in particolare il
begin con 4 TextFinder su 59.100 righe candidate è il confronto prima della
tranche, non il comportamento corrente. Il piano di eligibility separato può
ancora usare il bootstrap ordinario: non è una chiamata di discovery/inventario.
Capability reali spente, minimo zero, nessuna eliminazione o accesso Google.
Idempotenza temporale, dipendenze Docs, lease lettori, copertura legacy,
compatibilità client e convalida Apps Script restano gate separati; il pacchetto
12 rimane aperto.

### Misure sulla fixture da 1.000 identità

Confronto locale su checkpoint S=2.023. Il benchmark carica l’implementazione
precedente di `syncPhysicalRetentionInventoryAudit_` dalla base `158e8af`
in un secondo contesto V8 con una copia dello stesso ledger/checkpoint;
non sostituisce gli adapter né le risposte. Parametri riproducibili del test:
`GDIARY_CONTINUOUS_FIXTURE`, `GDIARY_RETENTION_AUDIT_ONLY=1` e, per il confronto
opzionale, `GDIARY_RETENTION_BASELINE_SOURCE` con il sorgente estratto dalla
base Git. Nessuna dipendenza dalla cronologia Git nella suite ordinaria.

| Fase | Chiamate del protocollo | Letture mock | Righe | Celle | Byte letti | Ricerche / righe candidate |
|---|---:|---:|---:|---:|---:|---:|
| Begin precedente, stessa fixture | 1 | 816 | 816 | 3.252 | 411.079 | 4 / 59.100 |
| Nuovo begin | 1 | 8 | 8 | 26 | 5.269 | 0 / 0 |
| Nuova discovery, cumulativo | 591 | 6.311 | 20.513 | 77.496 | 13.676.237 | 0 / 0 |
| Inventario dopo discovery, cumulativo | 620 | 17.135 | 38.037 | 130.837 | 85.686.510 | 0 / 0 |

Massimi osservati per **intera chiamata**, inclusi lettura e verifica dello stato:

| Fase | Letture | Righe | Celle | Byte |
|---|---:|---:|---:|---:|
| Discovery | 19 | 45 | 162 | 66.489 |
| Inventario | 30 | 76 | 255 | 270.569 |

Massimo singolo range: discovery 25 righe / 100 celle / 13.240 byte;
inventario 25 righe / 100 celle / 45.992 byte. Le prove impongono inoltre un
tetto di regressione sull’intera chiamata della fixture: 100 letture,
512 righe, 1.600 celle e 1 MiB; sul solo begin iniziale della fixture,
massimo 20 letture e 32 KiB (non sui replay di stati già popolati).
Questi massimi osservati e tetti di test vanno distinti dai budget del protocollo
per pagina e stato, che contano i payload serializzati e il lavoro logico.
Non costituiscono una misura di trasporto, quote o latenza Google.

Il confronto storico dell’inventario prima della discovery era 620 pagine,
17.135 letture, 129.160 celle e 80.075.990 byte. Le pagine restano 620 e le
letture 17.135; lo stato aggiuntivo della discovery incrementa celle e byte
riletti durante l’inventario. In totale il nuovo percorso begin + discovery +
inventario legge 23.454 range mock e 99.368.016 byte: non viene dichiarata una
riduzione del lavoro totale. Il vantaggio dimostrato è eliminare dall’avvio
le ricerche crescenti e rendere il lavoro riprendibile con limiti per chiamata.

A metà discovery della fixture 1k, riapertura del contesto V8 e replay della
revisione precedente restituiscono lo stesso cursore/digest. Un commit
applicativo in una copia della stessa fotografia invalida il passo successivo
con `ScopeChanged`; `status` riporta `invalidated`. Il run termina con 2.023
commit verificati, zero ricevute/alias mancanti rilevati e i blocker
`unversionedPayloadRecord`, finestra ricevute, Docs, lettori e legacy.
La prova alias resta quindi assente e il minimo cursore resta zero.

Nel run integrato successivo `test:habit-log-continuous` sono passati anche
1.401 fault/replay, 1.000 creazioni/2.000 commit, 3.648 riferimenti logici
compattati e 12.018 righe fisiche conservate. Matrice snapshot 127/128/129/256/1k,
contesa e consumer HTTP/Chromium con riapertura IndexedDB superati. Il consumer
continuativo ha applicato 2.002 commit, oppure 2.004 con scrittura concorrente;
il successivo scenario checkpoint S=2.023 ha ricostruito 2.030 commit dall’origine
o checkpoint più 7 delta, raggiungendo lo stesso cursore.
Le misure della retention integrata confermano 591 passi discovery e 620
inventario, con gli stessi conteggi di letture/righe/celle della tabella.
I byte inventory in quel run sono 85.693.230, max range 46.012 byte e max
chiamata 270.249 byte: sono un’esecuzione distinta dal confronto sopra,
non un’identità byte per byte fra due fixture costruite separatamente.
La discovery mantiene gli stessi massimi e zero ricerche.

Il residuo `unversionedPayloadRecord` ha un riscontro concreto nella fixture
applicativa: 4.016 payload senza `format`, con envelope
`archive/collection/data/deleted/id/sequence/version`. La prossima tranche può
classificare e verificare questi envelope canonici, mantenendo il blocco sui
payload legacy o ambigui; questa osservazione non li promuove già a prova alias.

### Verifiche finali della tranche

Esiti locali dell’8 novembre 2026, Node 24.22.1 e Chrome headless tramite
`CHROME_PATH`, su Demo e ledger sintetici:

| Comando / controllo | Esito |
|---|---|
| `npm run build` | Passato; Index rigenerato, sei file staging, nessun upload |
| `npm run test:physical-retention` | Passato, inclusa discovery e compatibilità inventory precedente |
| `node tests/verify-retention-discovery.cjs` | Passato; anche budget target/byte e digest discovery alterato |
| `npm run test:bootstrap-checkpoint` | Passato; protocollo, fault/restart e HTTP/Chromium |
| `npm run test:habit-log-continuous` | Passato; 1k, 1.401 fault/replay, snapshot, contesa, HTTP/Chromium e checkpoint/feed |
| `npm run test:commit-capacity` | Passato |
| `npm run test:repository` | Passato |
| `npm run test:release` | Passato su Demo |
| `npm test` | Passato |
| P59 build/deploy simulato, invarianti sorgenti e `git diff --check` | Passati |

La build e la suite retention completa sono state ripetute dopo l’ultimo
allineamento del limite numerico del head: come il lettore ordinario,
la discovery rifiuta `committedThrough >= Number.MAX_SAFE_INTEGER`.
La prova usa un checksum valido per distinguere questo limite da corruzione
del checksum. Nessuna modifica frontend funzionale; Index rigenerato invariato,
Demo con backend aggiornato. UTF-8, sei file Apps Script, segnaposto
`ROOT_FOLDER_ID` e policy retention reale spenta verificati.

Il confronto retention 1k separato con sorgente precedente è terminato con
exit 0. Il protocollo retention rimane server-only: le prove HTTP/Chromium
riguardano snapshot/feed/consumer; non sono una RPC browser dell’audit né un
collaudo Apps Script/Google. Zero righe, payload e byte recuperati. Nessuna
capability reale, deploy, setupDrive, migrazione reale, commit o modifica ai
dati reali. Il pacchetto 12 non è chiuso.

## Inventario fisico paginato — base 158e8af dell’8 novembre 2026

La nuova scansione `sync-retention-inventory/v1` fissa sul server checkpoint,
scope archive/principal/epoch e ultima riga fisica. Il client passa solo
generazione, digest e revisione; non fornisce prove, limiti o cursori. Le pagine
leggono al massimo 25 righe dell’indice e 20 record pubblicati, con tetto di
512 KiB e 4.096 unità di lavoro. Ogni record viene verificato contro checksum
del riferimento, generazione, digest e righe payload; i commit verificano alias
operationId, fingerprint, versioni e tombstone dichiarate. Le ricevute
verificano fingerprint, operationId e versioni. La catena dei tuple commit e
ricevute permette di rilevare righe committed mancanti, orfane o discordanti.

Il cursore e i digest di pagina/cumulativo sono persistiti come nuove revisioni
append-only del registro. La ripresa legge l’ultima riga fisica in modo diretto,
senza `TextFinder`: una nuova scrittura applicativa prima del passo successivo
invalida la fotografia con `ScopeChanged`. Replay di una revisione già
confermata restituisce lo stato più recente senza ripetere la scansione. Ogni
stato è limitato a 196.608 byte e la somma di pagina più stato a 1.048.576 byte;
corruzione o superamento interrompono il passo senza avanzare il cursore. I
record `retired`, `unpublished` e `unknown` vengono conteggiati; righe corrotte
bloccano con errore esplicito. Le capability e il minimo cursore restano spenti
e zero.

Il rilevamento di operationId duplicati usa filtri Bloom server-side a 262.144
bit distinti per alias e ricevute. Un hit (duplicato reale o falso positivo)
blocca l’audit; un falso positivo non può autorizzare un’eliminazione. La finestra
di idempotenza resta comunque non dimostrata e viene mantenuta come blocker.
Baseline Docs, lease lettori e copertura legacy restano blocker separati.

### Misure e classificazione delle prove

`verify-physical-retention.cjs` ha scandito la fixture Demo locale da 29 commit:
la misurazione più recente ha letto 319 righe fisiche e 319 record pubblicati in
16 pagine, per 558.390 byte e 3.809 unità di lavoro cumulative; massimo 25
righe, 20 record, 512 KiB e 4.096 unità per chiamata. L’audit progressivo ha
richiesto 16 revisioni. Differenze tra esecuzioni derivano dai checkpoint di
fixture creati dal test. I contatori sono trasferimenti e
lavoro del mock locale, non letture o costi Apps Script/Google.

### Inventario sulla fixture applicativa da 1.000 identità

Il run progressivo ha pubblicato checkpoint a S=2.023. Il verifier fisico ha
esaminato 2.023 commit in 620 pagine: 17.135 letture simulate, 37.478 righe,
129.160 celle e 80.075.990 byte cumulativi; per singola lettura massimo 25 righe,
100 celle e 43.012 byte. Le chiamate di scansione non hanno eseguito TextFinder.
Non sono mancati commit associati, ricevute committed o alias rilevati, ma
`unversionedPayloadRecord` blocca l’attestazione completa degli alias: il verifier
non promuove una copertura incompleta a prova positiva. Il piano segnala anche
`operationAliasesUnverified`.

Costo separato dell’avvio: 816 letture, 816 righe, 3.252 celle e 411.079 byte;
4 TextFinder hanno esaminato complessivamente 59.100 righe candidate per la
scoperta/verifica iniziale del checkpoint. Nella base precedente la scansione paginata era
bounded, ma l’avvio conservava un lookup che cresce con l’indice. Questo limite dell’avvio è affrontato dalla discovery paginata descritta
sopra; le misure di questo paragrafo sono il confronto precedente. La policy e il minimo cursore restano disattivati/
zero anche perché ricevute non hanno una finestra d’idempotenza provabile, e
Docs baseline, lease lettori e copertura legacy non sono enumerate.

Prove di protocollo superate: righe fisiche mancanti/duplicate, alias operationId
mancante/duplicato, riferimento non pubblicato, riga sconosciuta e payload
ricevuta corrotto bloccano; un head pending
produce `RetentionAuditPending` senza recovery implicito, il retry lo recupera e
consente poi una nuova scansione. Append concorrente, scope, riavvio, budget byte
e ACK perso/replay sono coperti. La duplicazione che rende ambiguo il
lookup del checkpoint viene respinta fail-closed prima della scansione, senza
produrre un falso esito idoneo.

L’audit non elimina righe o payload e non avanza il minimo cursore. Il modello
locale non prova atomicità Google, comportamento o costo di TextFinder reale,
quote Apps Script, scadenza degli operationId o compatibilità dei client
distribuiti. Il run integrato `test:habit-log-continuous` è terminato con exit 0. La fixture
applicativa progressiva ha creato 1.000 identità e 2.000 commit, compattato 3.648 riferimenti logici
(non righe fisiche) e conservato 12.018 righe fisiche; 1.401 casi di fault/replay
su soglia e transizione v2 sono passati. Snapshot matrix 127/128/129/256/1.000
con limiti 1/25/100, pagine finali/vuote e directory corrotte superata.

La prova HTTP/Chromium ha letto 1.012 HabitLogs su 20 richieste snapshot per
tutte le raccolte e riprodotto 2.002 commit in 401 chiamate feed; con una
scrittura concorrente ha applicato 2.004 commit. Il consumer confronta bootstrap
da checkpoint e replay dall’origine, conserva bozze/outbox e riapre IndexedDB.
Nella traccia HTTP, le 11 richieste HabitLogs hanno totalizzato 34.305 letture
mock, 267.886 celle e 28.330.721 byte; massimo 3.151 letture e range massimo
4.096 righe. La fixture del confronto snapshot, stesso digest
`290a3a9a…`, per 11 pagine ha totalizzato 34.359 letture, 166.867 righe,
267.886 celle e 28.330.721 byte. Il confronto storico/ottimizzato riduce le
letture totali 8.010.233→34.359 (−99,5666%), massimo per pagina
728.203→3.156 (−99,5666%) e tempo locale cumulativo 326.416→23.641 ms.
Resta un range metadata massimo di 4.096 righe; va distinto dalle pagine fisiche
dell’inventario retention. Queste misure sono del mock locale, non costi
Apps Script/Google.

La retention fisica ha recuperato 0 righe, 0 payload e 0 byte: questa tranche
non implementa cancellazioni. Il run dimostra protocollo e integrazione
HTTP/Chromium su dati sintetici. Non dimostra costo Google né completa i gate di idempotenza temporale, Docs baseline,
lease lettori e copertura legacy.

### Compatibilità e gate

Il vecchio `sync-retention-audit/v1` basato sul feed non è più il percorso del
controller. Il nuovo protocollo inventory è un’operazione server separata e
non è esposto come RPC client. Lo snapshot HTTP e il consumer restano invariati;
le prove HTTP/Chromium del checkpoint-feed sono distinte da questa prova di
protocollo. Il minimo resta zero perché il gate di idempotenza non ha una
scadenza server provabile e Docs, lettori e legacy non sono inventariati.

## Audit paginato commit/ricevute/alias (storico v1)

`syncPhysicalRetentionAudit_` fissava generazione, digest del manifest e
`upperSequence` del checkpoint, poi ispeziona al massimo cinque commit per
chiamata (al massimo 25 cambiamenti per commit, quindi 125 entità interessate).
Il protocollo rifiuta pagine oltre cinque commit e l'ispezione del registro
rifiuta commit oltre 25 cambiamenti. Le letture di ricevute e alias usano i
lookup dell'adapter; il mock conta anche ricerche TextFinder e righe esaminate.
Queste ricerche non hanno oggi un tetto indipendente dalla lunghezza
dell'indice: il budget di lavoro per chiamata non è ancora dimostrato costante.
Non è presente un tetto server di byte per pagina. Le misure del ledger Demo
sono osservazioni effettive del mock, non limiti o stime di Apps Script/Google.
Ogni pagina usa `inspectRetainedRange`, che verifica commit, ricevuta, alias,
fingerprint, versioni e tombstone per ciascun commit visitato. Non enumera però
tutte le righe fisiche delle tabelle ricevute/alias: righe orfane, non
pubblicate o sconosciute restano blocker specifici e non diventano prove
positive per il piano. Il cursore e il digest cumulativo sono salvati nello store scoped come
`sync-retention-audit/v1` con CAS; replay di una revisione precedente restituisce
lo stato salvato, senza riapplicare lavoro. Pending, buchi, corruzione, scope o
head insufficienti bloccano la scansione. L’ACK perso dopo la scrittura dello
stato si recupera leggendo la revisione pubblicata.

Il test Demo v1 aveva completato un audit su 29 commit in sei pagine e verificato
riavvio, replay e digest cumulativo. Sullo storico progressivo il test ha
visitato 2.023 commit in 405 pagine, senza ricevute o alias mancanti per i
commit visitati. L'osservatore Demo ha contato 661.822 lookup, 6.726.292 righe,
8.690.165 celle e 759.736.897 byte complessivi; il massimo singolo range era
4.096 righe/4.096 celle/278.532 byte. Sono inoltre state richieste 90.976.149
righe candidate attraverso TextFinder, fino a 242.544 in una chiamata. Il
risultato corrente conserva blocker distinti per ricevute fisiche, alias
orfani, righe non pubblicate/sconosciute e budget byte/lavoro. Queste
ricerche mostrano che il lavoro per chiamata cresce con l'indice e non rispetta
ancora un budget costante, benché il numero di commit sia limitato a cinque.
Le misure sono del mock; non equivalgono a righe effettivamente lette o costi
Apps Script/Google. L'audit non definisce la finestra di idempotenza:
operazioni passate possono essere ritentate senza ricevuta finché il commit o
l’alias esistono. Non è autorizzata alcuna eliminazione. Baseline Docs,
lettori attivi e completezza legacy rimangono blocker non enumerabili dal
protocollo corrente.

### Tipo di prova e gate

- **Protocollo:** `verify-physical-retention.cjs` usa controller e ledger Demo;
  29 commit/6 lotti, CAS, digest, replay di ACK, riapertura e digest corrotto.
- **Integrazione:** la fixture progressiva è creata via `saveHabitLogOperation`;
  l'audit viene invocato dal controller server Demo. Snapshot e feed sono poi
  esercitati via HTTP: 1.012 record in 20 pagine e 2.002/2.004 commit in 401
  richieste `getChanges`, secondo la scrittura concorrente del caso.
- **Chromium/IndexedDB:** il consumer reale ricostruisce il checkpoint e i
  delta, con riapertura IndexedDB; nel caso concorrente il cursore raggiunge
  2.004 e conserva 1.012 log. Il protocollo audit non è esposto a una RPC
  browser e non viene presentato come test browser.
- **Servizi Google:** nessuna prova; range, atomicità, costi e TextFinder sono
  solo quelli del mock locale.

Build, `npm test`, `test:commit-capacity`, `test:repository`, `test:release`,
`test:habit-log-continuous`, `test:bootstrap-checkpoint` e la verifica dedicata
di retention sono passati nelle esecuzioni documentate. Dopo l'aggiunta dei
blocker espliciti per inventario fisico e budget byte/lavoro, build e test
mirati di retention/checkpoint sono stati ripetuti.
