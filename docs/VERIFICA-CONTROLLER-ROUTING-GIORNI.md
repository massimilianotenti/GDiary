# Controller persistente del routing Days

Incremento locale del 28 ottobre 2026, successivo al commit **9c50b1d**.
Pacchetto 8 ancora parziale. Solo fixture e backend della Demo: nessuna
registrazione, migrazione, configurazione o manutenzione sui dati reali;
nessun provisioning o deploy. Online resta Apps Script 75.

## Risoluzione del routing e binding

`syncDayRoutingController_` implementa il controller con dipendenze iniettate.
`syncDayRoutingServer_` fornisce il binding Apps Script: ScriptProperties,
identità già esistente, sessione verificata, accesso live a DB/cartella e
risoluzione dei fogli tramite ID numerici. Non inizializza identità o tabelle.
Le funzioni restano private, con underscore e fuori dalla allowlist traceApi.

dayCommitGateway_ risolve ora il controller per ogni chiamata Days. In assenza
di metadati riservati legge soltanto lo snapshot delle proprietà, senza aprire
il registro o acquisire un nuovo lock. Con controller registrato ritorna un
gateway persistente, ricostruito anche in un contesto server nuovo. Le vecchie
iniezioni DAY_COMMIT_GATEWAY e DAY_ROUTING_CONTROLLER restano null nei sorgenti
e disponibili per fixture/server, non per parametri client.

Il binding richiede tre Sheet ID interi non negativi, distinti: Days, indice
e frammenti. Ogni oggetto deve avere l'ID richiesto e lo stesso database come
parent; il foglio giornaliero deve chiamarsi Days. ArchiveId/epoch, DB_ID e
ROOT_ID devono corrispondere all'ancora persistita. Il principale attivo viene
verificato a ogni operazione e non è scelto dal payload. I controlli vengono
ripetuti durante l'accesso al registro e prima di restituire il risultato.

Il provider Apps Script legge LOCAL_ARCHIVE_V1 e LOCAL_PRINCIPAL_V1 esistenti;
non chiama getSyncManifest per crearli automaticamente. Richiede utente attivo
ed effettivo non vuoti e uguali, accesso al file DB e alla cartella non cestinati.
Le risposte di stato contengono solo registered, protocolVersion, mode e revision:
nessuna email, identità opaca o ID Drive/foglio viene restituito dal controller.

## Ancora richiesta e stato a due slot

Il namespace ScriptProperties riservato comprende cinque chiavi:

| Chiave | Contenuto |
|---|---|
| SYNC_DAY_ROUTING_ANCHOR_V1 | Ancora immutabile sigillata: archivio/epoca e binding DB/cartella/fogli |
| SYNC_DAY_ROUTING_STATE_A_V1 / STATE_B_V1 | Payload sigillato dello stato: formato, anchorDigest, revisione e modalità |
| SYNC_DAY_ROUTING_MARK_A_V1 / MARK_B_V1 | Preparazione o marcatore di pubblicazione del relativo slot |

Le abbreviazioni STATE_B_V1 e MARK_B_V1 nella tabella mantengono il prefisso
SYNC_DAY_ROUTING_. Il checksum SHA-256 rileva inconsistenze, non è un'autenticazione.

register richiede un permesso operatore server esplicito. Valida binding,
intestazioni e checkpoint già provisionato prima di scrivere l'ancora. Se il
checkpoint manca, non crea nulla. L'ancora è pubblicata e riletta prima dello
stato iniziale; da quel momento uno stato assente o illeggibile **non consente
il fallback legacy**. Il binding non può essere sostituito implicitamente.
Una registrazione confermata inizia in readOnly, revisione 1; ritentarla non
resetta o riattiva lo stato esistente.

Gli aggiornamenti toccano soltanto lo slot inattivo:

1. Marcatore prepare:revisione, riletto prima di proseguire.
2. Payload dello stato, riletto esattamente.
3. Marcatore ok:revisione:SHA-256, riletto e verificato.

Lo slot della revisione corrente non viene invalidato durante l'aggiornamento.
Preparazioni e prefissi incompleti non sono pubblicazioni; il lettore sceglie
la più alta revisione pubblicata e verificata. Un payload corrotto associato
a un marcatore completo blocca la lettura, senza ripiegare su uno stato più
vecchio. Revisioni massime discordanti sono corruzione. Un namespace riservato
di versione sconosciuta blocca il controller anziché sembrare non configurato.

setMode richiede modalità ed expectedRevision. Un aggiornamento concorrente
produce conflitto; il retry di un cambio già confermato alla revisione successiva
ritorna lo stato senza nuove scritture. Permesso operatore, identità e accesso
vengono ricontrollati durante la pubblicazione.

## Modalità e rollback supportato

- **active:** mantiene il gateway Days per letture e salvataggi; la migrazione
  esplicita richiede un secondo permesso server allowMigration.
- **readOnly:** continua a leggere le date migrate attraverso il gateway e
  blocca nuovi saveDay, saveDays e migrazioni, incluse le date non migrate.
  Il normale recupero di un commit già pendente resta necessario prima di
  esporre i dati. Le altre collezioni non diventano di sola lettura.

Disabilitare i permessi di registrazione/migrazione non rimuove il routing.
Anche una facade ottenuta prima di un cambio di modalità rilegge lo stato
al momento dell'azione. Cambi di DB/cartella/epoca o fogli non validi producono
un errore senza usare le preimmagini congelate come stato corrente.

Il controller protegge inoltre l'attivazione concorrente con vecchie chiamate
già avviate: i writer legacy ricontrollano il routing sotto il lock comune
prima di toccare Days; i lettori lo ricontrollano dopo la lettura grezza e,
se necessario, ripetono la lettura attraverso il gateway. Gli ingressi coperti
sono saveDay/saveDays, letture complete e finestre Diario/Settimana/Abitudini.
Il lock applicativo già posseduto viene riusato senza riacquisizione.

Non esiste una transizione a legacy o una cancellazione dell'ancora. readOnly
è il rollback operativo supportato dal codice che conosce il controller;
**non** rende sicuro pubblicare una vecchia build che ignora queste proprietà.
Per un ritorno completo al modello precedente servirà un reverse cutover con
proiezione verificata, oppure una build di compatibilità che conservi il routing.

## Verifiche eseguite

`npm run test:day-controller`, incluso in npm test, verifica:

- Registrazione esplicita, riapertura da nuove istanze V8, modalità iniziale
  readOnly, attivazione, migrazione e lettura/salvataggio canonico.
- **161 interruzioni/prefissi sulle proprietà**, prima/dopo/parziali durante
  registrazione e pausa, con riavvio dai soli metadati e celle persistiti.
  Con ancora integra il retry riprende la pubblicazione; un'ancora iniziale
  troncata blocca senza inventare una nuova identità o usare il legacy.
- Cambio modalità con CAS, ACK perso, vecchie facade, revoca del permesso
  durante la pubblicazione e revoca dell'accesso durante la lettura dei dati.
- Binding con ID 0, parent errato, foglio assente, archivio/epoca/configurazione
  cambiati, registro non provisionato, corruzione di una pubblicazione completa,
  versione sconosciuta, lock occupato e autorizzazioni mancanti.
- Sul backend reale della Demo, provider Apps Script e API effettive senza
  iniezione in memoria: un server ricreato legge il canonico, readOnly persiste
  e le capability del manifest rimangono false.
- Corsa lettore/attivazione e corse dei writer singolo/lotto durante acquisizione
  del lock: nessuna risposta con preimmagine superata o scrittura legacy dopo
  l'attivazione osservata.

Superati build, npm test, test:day-controller, test:release e test:tracing.
Rimangono positive le suite di migrazione (440 interruzioni), capacità (182)
e persistenza. Demo e staging dei sei file rigenerati; Index senza differenze
frontend. Bootstrap UTF-8, ROOT_FOLDER_ID segnaposto e manifest preservati.
Le prove attive sono eseguite sul backend Demo in V8; i test browser release e
tracing usano l'app senza registrazione del controller.

## Limiti e prossimo incremento

Il binding è unico per il progetto/namespace ScriptProperties: un archivio
diverso richiede una procedura esplicita, non la sostituzione dei parametri.
Le registrazioni reali restano non autorizzate in questa tranche; il provider
ha allowConfigure e allowMigration false per default, e non esiste una RPC
o opzione dell'interfaccia che li abiliti.

I mock modellano chiamate sincrone e prefissi persistiti, non garanzie atomiche
o RPC tardive dei servizi Google. L'ancora troncata nella prima pubblicazione
richiede recupero operatore distinto; viene bloccata, non ricostruita per ipotesi.
La rimozione manuale di tutte le proprietà del controller e la modifica manuale
del registro sono fuori contratto: non è una procedura di disattivazione.

Le verifiche live del binding possono aggiungere molte letture di metadati;
nessuna latenza Google è stata misurata o promessa. Restano aperti provisioning
controllato, policy di capacità/manutenzione, retention e recupero dello spazio
fisico. Le altre mutazioni non alimentano ancora un feed completo.

Prossimo incremento: collaudo browser della migrazione/controller attivi su
Demo sintetica, comprese bozze, conflitti, reload, errori e modalità readOnly.
La verifica nel vero iframe Google e l'abilitazione reale richiedono un passaggio
separato e pertinente. Nessun deploy o modifica dell'archivio Google eseguiti.

Seguito completato: [collaudo browser del controller e della migrazione attivi](VERIFICA-BROWSER-ROUTING-GIORNI.md)
su HTTP locale e backend V8 sintetico. Include bozze/rich/focus, due client,
reload, ACK persi/malformati e readOnly con messaggio corretto. Non è il collaudo
iframe Google o l'abilitazione reale del registro.
