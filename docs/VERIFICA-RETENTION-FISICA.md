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

## Audit paginato commit/ricevute/alias

`syncPhysicalRetentionAudit_` fissa generazione, digest del manifest e
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

Il test Demo ha completato un audit su 29 commit in sei pagine e verificato
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
