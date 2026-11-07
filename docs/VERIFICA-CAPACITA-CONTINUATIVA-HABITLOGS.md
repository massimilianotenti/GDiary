# Capacità continuativa HabitLogs — 7 novembre 2026

Seguito locale dalla base a06f8ee: [snapshot HabitLogs mirate](VERIFICA-SNAPSHOT-HABITLOGS-MIRATE.md). Selezione prima dei
contenuti e stato minimo per i nuovi riferimenti; nessuna attivazione reale.
Le misure di costo qui riportate descrivono la base precedente; retention
e gate Google restano aperti.


Tranche locale successiva a `b8fc11b`, nel pacchetto 12 della SPEC-004.
Solo dati inventati e servizi Sheets simulati; nessun Google, provisioning,
setupDrive, migrazione reale, deploy o commit.

## Contratto implementato

Il consenso privato server `syncHabitLogMaintenanceEnabled_()` restituisce
`false` nei sorgenti. Il controller HabitLogs lo inoltra allo store come
consenso di manutenzione e di policy continuativa: il solo consenso alla
compattazione manuale non avvia la policy. Payload, context RPC e capability
client non possono abilitarla. Gli altri controller mantengono la policy
spenta anche quando condividono il registro.

`preflightWrites` rimane in sola lettura. Il gateway HabitLogs usa
`ensureWriteCapacity` sul budget aggregato di prenotazione e mutazione.
Con policy abilitata, head ed entità mutabili con almeno 384 riferimenti
attivi possono essere compattati con `compactReferences`: massimo 64 ritiri
per lotto, due lotti e 128 ritiri per lock dello store. La deadline è di
2.000 ms dall'ingresso nella policy, controllata prima dei lotti e dei
singoli ritiri. È cooperativa: una RPC Sheets o la verifica finale non sono
interrompibili, quindi non è un limite rigido alla durata del lock.
Il budget non viene rinnovato dalle chiamate successive nello stesso lock.

La guardia di scrittura richiama la stessa policy per head/entità alla soglia,
anche durante il recupero di un pending. Se il budget non basta, resta il
rifiuto recuperabile; non viene mai alzato il limite di 512 riferimenti.
Al riavvio si ricalcolano i riferimenti attivi persistiti senza un nuovo
checkpoint di manutenzione. Revoca e autorizzazione sono ricontrollate ad ogni
ritiro. La revisione pubblicata più recente, compreso un head pending, resta
esattamente nella sua riga originaria.

Non vengono cancellati payload, righe, commit, ricevute, alias o piani.
Tombstone e feed storico restano conservati. Il costo di scansione può crescere
con lo storico fisico: questo incremento non implementa retention, compattazione
fisica o capacità illimitata. Il limite della directory v2 (2.176 teoriche,
con bucket da 128 saturabili prima) resta invariato.

Corretto anche il salvataggio outbox quando una creazione v2 richiede quattro
mutazioni: la verifica della preimmagine usa la route inclusa nel piano, come
nel caso a tre mutazioni, senza cercarla prima della pubblicazione.

## Prove e risultati

Superati build, `npm test`, `test:commit-capacity`, `test:repository`,
`test:release` e la prova mirata della policy. La crescita applicativa ha
raggiunto 1.000 identità. Superati 1.401 tentativi di guasto: 324 confini alla
soglia e 143 nella transizione v2, ciascuno prima/dopo/parziale, con riavvio e
replay dell'ACK originario. Passata la contesa di due contesti V8 sullo stesso
shard v2, con BusyError durante il lock del peer, retry e riavvio.
Superato anche `npm run test:habit-log-continuous` (exit 0): Chromium consuma
1.012 log (1.000 canonici + 12 legacy) via endpoint HTTP reali del backend
simulato, senza setup diretto del repository. Le dieci raccolte occupano
20 pagine snapshot complessive, di cui 11 HabitLogs. Il feed dall'origine
attraversa 401 pagine e applica 2.002 commit: i 2.000 delle creazioni più due
setting canonici preparati per il bootstrap. Verificati ordine completo delle
sequenze senza salti/duplicati, identità uniche, checklist Unicode storiche,
cursore persistito e riapertura IndexedDB.

`complete:false` è atteso: restano cataloghi e altri dati legacy nella fixture.
Il risultato prova integrità e replay di HabitLogs, non un archivio interamente
canonico né la disponibilità dell'offline completo.

| Misura sullo storico prodotto progressivamente | Esito |
|---|---:|
| Identità HabitLogs canoniche create | 1.000 |
| Commit conservati (prenotazione + mutazione) | 2.000 |
| Riferimenti ritirati | 3.648 |
| Righe fisiche dell'indice, inclusa intestazione | 12.018 |

Sono presenti anche 12 log legacy di partenza, distinti dalle 1.000 creazioni.
La prova verifica replay senza scritture delle operazioni 0/127/128/999 e il
rifiuto senza prenotazione quando il consenso server è spento, anche passando
flag di manutenzione nel payload/context client. Il test di contesa controlla
che nessuna chiave attiva dello storico finale superi 512 riferimenti.

- Protocollo: `verify-continuous-maintenance-policy.cjs` verifica doppio gate
  server, preflight read-only, soglia 383/384, lotti e budget per lock,
  deadline cooperativa, ripresa e revoca durante il lotto. La suite storica
  `test:commit-capacity` mantiene le prove su pending, tombstone, feed,
  ricevute e 182 interruzioni RPC/prefisso.
- Integrazione: `verify-habit-log-continuous-capacity.cjs` crea progressivamente
  le identità tramite `saveHabitLogOperation`, controller persistente, planner,
  protocollo e adapter Sheets simulato. Le fixture iniziali sono solo cataloghi
  e log legacy separati; nessuna directory canonica finale è precompilata.
- Contesa: `verify-habit-log-continuous-contention.cjs` usa due contesti V8
  indipendenti, ledger e lock condivisi. Inserisce il secondo client durante
  una scrittura del primo sullo stesso shard v2, poi verifica retry e riavvio.
- Browser: `verify-habit-log-continuous-browser.cjs` espone via HTTP gli endpoint
  applicativi reali simulati; Chromium usa `createSyncConsumer` per snapshot
  paginato e replay del feed dall'origine, quindi riapre IndexedDB. Nessuna
  chiamata diretta a `applyRemoteBatch` sostituisce il consumer.

Il comando `npm run test:habit-log-continuous` produce lo storico sintetico in
una cartella temporanea, esegue contesa e browser e rimuove la fixture. È una
suite di scala separata da `npm test`, che include invece la prova mirata
della policy; le due verifiche non sono intercambiabili.

## Gate che restano aperti

La prova locale non certifica barriere, quote, latenza o concorrenza del
servizio Google; il lock sintetico modella il rifiuto del secondo client,
non l'ordinamento della rete Google. Restano iframe Apps Script, compatibilità
con i client già distribuiti, provisioning, retention e recupero dello spazio
fisico. Capability reali e consenso manutenzione restano spenti; pacchetto 12
e offline completo non sono conclusi.

La paginazione snapshot limita la risposta, ma il percorso attuale ricostruisce
ancora l'intera raccolta HabitLogs prima del filtro keyset di ciascuna pagina.
La policy non ottimizza queste letture: il test HTTP riporta separatamente i
conteggi di `getDisplayValues` del solo ledger simulato per metodo/raccolta
(massimo e totale), senza copiarne i payload. Non sono un conteggio completo
delle RPC Google né una misura di latenza Apps Script. La capacità logica
verificata non dimostra che questo percorso rientri nelle quote Google.


| Costo osservato nel ledger simulato via HTTP | Chiamate | Max letture per chiamata | Totale letture |
|---|---:|---:|---:|
| Snapshot HabitLogs | 11 | 728.201 | 8.010.211 |
| Feed getChanges | 401 | 375 | 150.366 |

Le letture qui sono chiamate `getDisplayValues` dell'adattatore sintetico,
non celle, bytes o millisecondi; non comprendono tutte le API e tabelle.
Il costo snapshot è elevato e non è stato ottimizzato in questa tranche:
nessuna dichiarazione di sostenibilità operativa su Google deriva dal solo
superamento del collaudo logico locale. Serviranno letture batch/mirate e
un collaudo dedicato prima di attivare il percorso reale.

Verifiche finali: build; `npm test`; `test:commit-capacity`;
`test:repository`; `test:release`; prova mirata della policy;
`test:habit-log-continuous`; `git diff --check`, tutte superate. Il gate
`npm test` comprende anche routing/migrazione HabitLogs, snapshot e consumer;
la prova dedicata copre in aggiunta lo storico creato progressivamente.
Staging con sei file, bootstrap UTF-8 e segnaposto ROOT_FOLDER_ID preservati.
Index rigenerato senza cambiamenti frontend; Demo incorpora il backend nuovo.
