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
fornisce ancora una scadenza verificabile delle ricevute e degli alias; i
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

## Inventario fisico paginato commit/ricevute/alias — 8 novembre 2026

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
scoperta/verifica iniziale del checkpoint. Quindi la scansione paginata è
bounded, ma l’avvio corrente conserva un lookup che cresce con l’indice. È un
gate residuo esplicito: prima di usare questo audit come inventario totalmente
bounded, serve una scoperta del checkpoint con directory/puntatore server
recuperabile a costo limitato. La policy e il minimo cursore restano disattivati/
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
