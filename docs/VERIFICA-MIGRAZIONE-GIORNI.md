# Ponte di migrazione di Days — pacchetto 8 parziale

Incremento locale del 28 ottobre 2026, successivo al commit a33b4c5.
Implementati il ponte di migrazione, l'adattatore della tabella Days e i punti
di instradamento delle API. Solo dati inventati: nessun accesso Google,
provisioning, migrazione reale o deployment.

## Componenti e attivazione

`syncDayMigrationGateway_(store, trustedScope, source)` offre preview, migrate,
saveLegacy, saveBatch e readRows. `syncDaySheetSource_(sheet)` legge preimmagini
fresche dalla tabella esplicita, senza cache di richiesta, e scrive soltanto
le date che il gateway classifica come non migrate. Nessuno dei costruttori
apre il DB, crea fogli o inizializza il checkpoint.

L'iniezione server `DAY_COMMIT_GATEWAY` resta **null** nei sorgenti. I test la
impostano sulla Demo con uno store sintetico; nessun parametro client può
selezionare store, scope, tabella o attivazione. Il manifest mantiene tutte
le capacità false. Il controller reale di apertura/autorizzazione del binding
non è implementato: questo codice non abilita una migrazione in produzione.

Quando il gateway è iniettato, saveDay e saveDays lo usano per tutte le date.
Le letture complete di Days e le finestre Diario, Settimana e Abitudini
attraversano lo stesso gateway. Il vecchio ingresso saveRecord_ su Days viene
bloccato per impedire che aggiri l'instradamento. Le altre collezioni restano
nel percorso precedente; il feed dell'intero archivio non è ancora completo.

## Migrazione per data e preimmagine congelata

preview restituisce la riga legacy completa, il relativo SHA-256, lo snapshot
canonico e l'indicazione di migrazione; non scrive. migrate richiede data,
operationId e expectedLegacy, oppure null se la riga era assente. Sotto lo
stesso lock dello store rilegge la sorgente e confronta l'intera preimmagine,
non soltanto updatedAt. Duplicati e differenze bloccano il passaggio.

Dopo la prenotazione del piano, un unico commit recuperabile pubblica:

- Il giorno `days:date` con formato sync-day/v1.
- Il descrittore `settings:day-route:date` con formato sync-day-route/v1,
  sourceDigest e legacyVersion. La versione dell'envelope è la versione
  iniziale del giorno migrato.
- L'indice `settings:day-routing-v1` con formato sync-day-routing/v1 e date
  ordinate, uniche, fino a 128. È un limite del prototipo, non una capacità
  garantita su Google.

La riga originale resta congelata, senza doppia scrittura o proiezione
aggiornata in Days. Per una data migrata lettori e writer confrontano la riga
originaria con sourceDigest e usano il record canonico. Una modifica manuale,
cancellazione o duplicazione della sorgente produce CommitBlocked, conservando
le varianti. La verifica non è una transazione con modifiche manuali Sheets:
un cambiamento esterno può avvenire dopo l'ultimo controllo e sarà rilevato
alla chiamata successiva. I writer applicativi condividono il lock.

L'indice consente di scoprire anche date canoniche prive di una riga legacy.
Le letture per periodo interrogano la sola finestra, verificano le preimmagini
interessate e sostituiscono i record per identità, senza append duplicati.
Le letture complete conservano il costo della lettura completa legacy.

## Snapshot durevole dei salvataggi parziali

Le API attuali inviano patch; il writer canonico richiede uno snapshot completo.
Il gateway valida la patch con dayValues_, la unisce al giorno corrente e
conserva il piano prima di tentare l'aggiornamento. Una prenotazione separata
è un commit interno: non conferma il salvataggio dell'utente.

Il record `settings:day-plan:<hash>` contiene formato sync-day-plan/v1,
kind, fingerprint dell'input e request canonica immutabile. La chiave e
operationId della prenotazione includono il principale; la request applicativa
conserva il proprio operationId. Gli ID day-reserve-* sono riservati al server.
Senza operationId esplicito, il gateway deriva un ID stabile da patch validata
e versione di partenza. Contesto e altri dati di navigazione non sono persistiti.

Un retry legge il piano conservato e ripresenta la stessa request. Anche dopo
altre modifiche restituisce lo snapshot e la versione dell'ACK originario.
Se si interrompe dopo la sola prenotazione e nel frattempo un altro dispositivo
scrive, il piano precedente dà conflitto anziché rifare il merge. Riutilizzare
un ID con un input diverso produce OperationMismatch. Le ricevute di conflitto
restano stabili perché anche il loro piano viene conservato.

L'updatedAt legacy è accettato per una bozza aperta prima della migrazione
soltanto mentre il giorno ha ancora la versione iniziale del descrittore.
Successivamente vale il confronto con commit-N. Le risposte compatibili
espongono commit-N nel campo updatedAt; per i giorni instradati quel campo
è una versione opaca, non un timestamp. Le date non migrate conservano il
writer e i limiti legacy, incluso il conflitto dopo una risposta persa.

saveDays conserva gli esiti per data: saved, conflict, invalid, error e
notAttempted. Solo saved produce un upsert. Un errore inatteso ferma le date
successive; conflitti e input invalidi non fermano le date indipendenti.
La prenotazione non entra nelle conferme e un commit dall'esito incerto
non produce un falso saved. Il lotto non diventa atomico.

## Lock, revoca e integrità

Preimmagini, preparazione e commit usano un'unica acquisizione dello store.
Un wrapper privato permette al nucleo di operare dentro quella sezione senza
riacquisire il lock. L'adattatore Sheets può anche riusare il lock già posseduto
da locked_, verificato attraverso APP_LOCK_DEPTH; mantiene guardie e controlli
schema dello store. È necessario per i lettori invocati da writer legacy di
altre collezioni che restituiscono state_ sotto lock.

Le scritture legacy effettuate dal source hanno flush esplicito prima del
rilascio. Le unità del protocollo conservano le proprie barriere. Prima di
restituire dati il gateway attraversa di nuovo la barriera del nucleo, così
una revoca avvenuta durante la lettura della sorgente impedisce la risposta.
Uno schema di indice/descrittore/piano errato blocca il percorso; una entità
canonica non instradata impedisce il fallback al writer legacy.

## Verifiche

`npm run test:day-migration`, incluso in npm test, copre:

- **44 interruzioni** prima/dopo ogni unità durevole, sia nella migrazione
  sia nel salvataggio parziale, comprese le prenotazioni; riavvio V8 dai soli
  dati persistiti e lettura prima del retry.
- **396 interruzioni** prima/dopo/parziali delle chiamate Sheet/Range della
  migrazione. Dopo il riavvio è leggibile la versione legacy o quella canonica
  completa; il retry converge alla stessa ricevuta.
- Bozze con versione precedente alla migrazione, patch/rich, ACK originario
  dopo modifiche successive, conflitti stabili, ID immutabili e piano prenotato
  superato da una scrittura concorrente.
- Preimmagini mutate/duplicate/mancanti, variante esterna durante un prepare,
  indice corrotto, entità orfana, revoca durante la lettura e lock applicativo
  già acquisito, senza fallback a dati legacy superati.
- Sulla Demo generata, gli ingressi effettivi saveDay/saveDays e i lettori
  completi/Diario/Settimana/Abitudini; lotto misto legacy/canonico, risposta
  persa, stop senza falsa conferma, data canonica senza riga legacy e guardia
  contro saveRecord_ diretto.
- Fixture con **50.000 righe Days estranee**: celle del payload lette per
  periodo invariate. Non è una misura del costo TextFinder o della latenza Google.

Superati build, npm test, test:day-migration, test:release e test:tracing.
Demo e staging dei sei file rigenerati; Index senza differenze frontend.
Bootstrap UTF-8, ROOT_FOLDER_ID segnaposto e autorizzazioni preservati.
Le nuove prove applicative eseguono il backend della Demo in V8; i test browser
release/tracing verificano l'app con gateway spento. Non è ancora un collaudo
browser o iframe Google della migrazione attiva.

## Seguito e limiti prima dell'uso reale

Servono controller server con verifica live del binding dei fogli e stato
persistente di attivazione, provisioning controllato e rollback che continui
a instradare le date migrate. Riportare semplicemente l'iniezione a null dopo
una migrazione reale esporrebbe preimmagini vecchie: non è un rollback valido.
L'attivazione resta quindi limitata alle fixture.

Piani, ricevute, descrittori e indice devono essere protetti dalla futura
retention. I piani usano un namespace interno di settings, non preferenze
utente: il futuro consumatore del feed dovrà trattarli come infrastruttura.
Non sono tollerate rimozioni/modifiche manuali delle tabelle del registro.

La prenotazione aggiunge un commit per operazione: aumenta spazio, RPC e consumo
del budget di **512 riferimenti per chiave**, in particolare sull'head. Il limite
128 dell'indice non garantisce di poter completare 128 migrazioni nello store
attuale. Compattazione e preflight di capacità restano necessari prima dell'uso
continuativo. I limiti del piano da 32.768 unità possono impedire la migrazione
di giornate legacy grandi: nessun troncamento o conversione automatica.

Prossimo incremento: controllo della capacità e compattazione recuperabile,
poi controller persistente del routing e collaudo browser della migrazione
attiva. Il pacchetto 8 rimane parziale; le altre mutazioni non sono ancora
registrate. Online resta Apps Script 75.
