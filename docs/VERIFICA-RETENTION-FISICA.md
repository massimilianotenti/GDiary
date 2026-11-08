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
