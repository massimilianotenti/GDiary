# Identità stabile dell'archivio — SPEC-004 pacchetto 2, tranche locale

Implementato il 27 ottobre 2026. Nessun deploy, setup o accesso ai dati reali.
Ultimo online documentato Apps Script 75, app v2.0.4. Il commit del worker
precedente è 3da5df2. Questo passo prepara il contratto della copia locale;
non la attiva e non completa il collaudo del vero iframe Google.

## Contratto server

Nuova API getSyncManifest, disponibile anche attraverso traceApi:

- protocolVersion, minClientProtocol e schemaVersion, inizialmente 1;
- identityVerified;
- archiveId, principalId ed epoch, soltanto dopo verifica riuscita;
- capabilities.localReadCache, changes e operations: tutte false;
- reason da elenco fisso se l'identità non è verificabile.

Il server legge la configurazione da ScriptProperties; gli identificativi
proposti dal client e l'URL del deployment non selezionano l'archivio o l'utente.
I tre identificativi restituiti sono opachi, senza email o ID Drive/Sheets.
Non costituiscono credenziali né autorizzano letture future della copia locale.

archiveId ed epoch vengono creati una volta e conservati in un record JSON
ScriptProperties sotto `LOCAL_ARCHIVE_V1:` seguito dal JSON di DB_ID/ROOT_ID.
Il cambio del database o della radice ha un record distinto; tornando alla
configurazione precedente viene ritrovato il record originale. I valori di
configurazione restano nei metadati server, non nel manifest restituito.
Il record ha schemaVersion:1; un record corrotto o incompatibile non viene
sostituito silenziosamente, per evitare di cambiare namespace senza recupero.

principalId è un UUID distinto in UserProperties, chiave LOCAL_PRINCIPAL_V1,
riutilizzato dall'utente nelle configurazioni dell'archivio di questo script.
Prima di accedere a questo store il server richiede che l'utente attivo sia
identificabile e coincida con quello sotto la cui autorità viene eseguito lo
script. Non usa il solo utente effettivo né una chiave temporanea. Un visitatore
non identificato o diverso dall'utente di esecuzione non riceve un namespace
condiviso. È una politica conservativa per il deployment personale attuale.

La documentazione Google distingue utente attivo ed effettivo e indica che
l'identità attiva può non essere disponibile, in particolare nelle web app
eseguite come sviluppatore. UserProperties è riferito all'utente corrente o
effettivo: questo motiva il confronto prima del suo utilizzo.
Fonti: [Session](https://developers.google.com/apps-script/reference/base/session),
[PropertiesService](https://developers.google.com/apps-script/reference/properties/properties-service).

## Autorizzazioni e controlli

Aggiunto nei sorgenti appsscript.json lo scope
`https://www.googleapis.com/auth/userinfo.email`, richiesto dai metodi Session
usati. ExecuteAs USER_DEPLOYING e access MYSELF restano invariati. Al prossimo
deploy occorrerà verificare/concedere la nuova autorizzazione. L'email viene
solo confrontata in memoria sul server, mai restituita, memorizzata nei record
identità, mostrata nella diagnostica o aggiunta agli export.

La verifica controlla accesso alla radice, cestino della radice e del database,
nonché apertura del database configurato, senza leggere celle del diario o
aprire Docs. Non richiede che lo Sheet sia dentro la radice dei Docs: il
progetto supporta anche uno Sheet associato separatamente.

I controlli remoti avvengono prima della breve sezione critica. Per inizializzare
i metadati usa il lock globale con tryLock(0), senza attesa e senza flush
Sheets. Dentro il lock ricontrolla utente e configurazione. Le scritture dei
record vengono rilette prima della conferma; su errore o esito incerto non
restituisce identificativi. Un retry ritrova gli eventuali metadati già salvati.
Una configurazione cambiata durante la verifica richiede una nuova verifica.

Le cause previste sono principalUnavailable, notConfigured, archiveUnavailable,
configurationChanged, identityUnavailable e archiveBusy. I messaggi grezzi
non vengono restituiti per queste condizioni. Nessun foglio, migrazione dei
dati o autorizzazione basata sugli argomenti del client viene introdotto.

## Client e diagnostica

Nuovo modulo frontend/archive-identity.js, importato dalla build esistente.
Valida protocollo, schema e identificativi prima di stabilire uno scope soltanto
in memoria. Nessun riferimento a IndexedDB, localStorage o sessionStorage.
Una nuova verifica revoca subito lo scope precedente; un errore, una risposta
non supportata o un'invalidazione lo lasciano nullo. Un contatore di generazione
impedisce a una risposta tardiva di ripristinare l'archivio precedente.

Le API del modulo restituiscono copie dello scope e uno stato diagnostico
separato senza identificativi. cacheReady è sempre false in questa versione,
anche se un server pubblicizzasse prematuramente la capacità di persistenza.
Il repository applicativo e la gestione della sua autorizzazione sono futuri.

Impostazioni → Diagnostica prestazioni → Verifica identità archivio effettua
la prova soltanto su richiesta. Non aggiunge RPC all'avvio; il risultato visibile
indica verifica riuscita o non disponibile, senza ID o email. La prova IndexedDB
con dati sintetici rimane separata. getSyncManifest è nella allowlist del tracing,
ma i suoi identificativi non entrano nel rapporto: solo operazione, tempi,
conteggi, esito e dimensione della risposta.

## Verifiche

Nuovo `npm run test:identity`, backend incluso in npm test.

Backend: stabilità senza ulteriori scritture, cambio radice/database e ritorno,
isolamento di due utenti, argomenti client ignorati, assenza di dati identificativi
reali nel manifest, identità attiva mancante o diversa, root/DB nel cestino,
Properties indisponibili, record corrotto e lock occupato. Simulati scrittura
metadati riuscita con conferma persa e cambio configurazione tra verifica remota
e sezione critica. Riavvio del deployment simulato in un nuovo contesto con
metadati server sintetici ripristinati: identità invariata.

Browser: validazione del protocollo e dello scope, risposta obsoleta, revoca,
errori sanitizzati, impossibilità di abilitare lo storage attraverso un flag
server, RPC solo manuale, nessun ID/email in UI o export e **zero aperture
IndexedDB** durante la verifica dell'identità. La prova storage separata continua
a verificare transazioni e riavvio con soli marcatori inventati.

Superati build, npm test, test:identity, test:storage, test:release e test:tracing.
Index e Demo rigenerati, bootstrap UTF-8, ROOT_FOLDER_ID segnaposto e sei file
di staging preservati. Il mock Session/UserProperties usa utenti inventati
example.invalid e memorizzazione server simulata in memoria.

## Limiti e seguito

Manca il collaudo nel vero contenitore Google: email disponibile nel deployment
supportato, persistenza/partizionamento del browser, aggiornamento deployment,
riavvio desktop/mobile e browser differenti. Il backend restituisce capacità
applicative disabilitate finché repository e verifiche non sono pronti.
Il contratto di identità del pacchetto 2 è implementato; quel pacchetto rimane
parziale per la verifica del contenitore reale.

Le identità sono stabili all'interno dello stesso progetto Apps Script e dei
suoi store di proprietà. Un nuovo progetto, la cancellazione delle proprietà o
un loro ripristino incompatibile richiedono recupero/migrazione espliciti; non
si promette continuità automatica fra script diversi. L'epoca non è ancora un
contatore automatico dei ripristini dei dati. Non viene fatta pulizia automatica
dei record relativi ad archivi precedenti.

Prima della copia locale serviranno consenso alla conservazione, schema e
transazioni del repository, gestione delle bozze e revoca/accesso alla copia.
Prima dell'outbox servirà inoltre il protocollo recuperabile di commit e feed.
Nessuna di queste funzionalità è abilitata da questo passo.
