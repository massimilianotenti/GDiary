# Dati comuni nella copia locale — pacchetto 7, seguito parziale

Sviluppo locale del 28 ottobre 2026, successivo al commit b4923e0.
Nessun deploy, accesso Google o dato reale. Online resta Apps Script 75.

## Contratto implementato

`frontend/common-read-cache.js` adatta una risposta diretta di getCommonState
per il diario. La chiave comprende tipo journal, mese e giornata corrente
Europe/Rome, necessaria per il focus della settimana. Accetta esclusivamente
commonIncluded:true, commonScope coerente, cataloghi Projects/Goals/Habits
espliciti e le tre slice Days/Weeks/HabitLogs del contratto già implementato
sul backend. Non costruisce una fotografia dall'accumulo in state.

Controlla la copertura esatta: Days dal giorno precedente il mese all'ultimo
giorno del mese; Weeks solo il lunedì della settimana di today; HabitLogs dalle
settimane del primo e ultimo giorno del mese, estremi inclusi. Supporta una
slice from/to o una singola range equivalente, rifiutando rappresentazioni
ambigue, date impossibili e righe fuori periodo. Le registrazioni devono
mantenere la chiave habitId|date. Cataloghi omessi per riuso, risposte legacy
complete senza slice, delta isolati o scope differenti non vengono memorizzati.
La lettura remota resta comunque utilizzabile.

Metadati di copertura, appartenenza per ID/versione e sei collezioni sono
scritti nella stessa transazione IndexedDB. Il ticket monouso cattura scope e
revisione locale prima della RPC; CAS e controlli delle versioni impediscono
pubblicazioni tardive. I record conservano i campi originali, inclusi i testi
rich serializzati delle riflessioni e le checklist delle abitudini.
Il repository richiede updatedAt ISO canonici: record legacy senza versione
valida fanno rinunciare alla cache, senza inventare date o cambiare dati Google.

`readRemoteCommonView` legge descrittore e record referenziati in una sola
transazione readonly, al massimo 500 letture per ID, senza scansione dello
storico. Una riga mancante o con versione diversa dà miss. Una slice vuota o
un catalogo vuoto espliciti restano coperti. I record non più inclusi restano
nel repository ma non compaiono nella vista: non utilizzare listCommon per
inferire completezza o cancellazioni globali. Retention e compattazione restano
successive.

Il descrittore common-journal/v1 vive in archiveMeta.coverage.commonJournal;
nessun nuovo store o cambio di versione dello schema. Contiene anche modalità
e versione delle impostazioni delle riflessioni. Esclude preferenze privacy,
privateTags/privacyVersion, allTags, TaskPlans, voci, allegati e tracing.
La copia non può modificare la privacy attiva. Limiti: 500 record totali e
4 MiB per transazione, già applicati dal repository. Non si tronca un catalogo
per farlo rientrare: oltre budget si rinuncia alla cache.

## Coesistenza delle anteprime e integrazione

La revisione CAS globale continua a serializzare tutte le scritture. Un lotto
che modifica solo i dati comuni può mantenere valido il descrittore della
pagina; un lotto che modifica solo voci/corpi può mantenere quello comune.
Il repository avanza la revisione del descrittore soltanto se era già valido
e il lotto non modifica i suoi store. Una mutazione pertinente invalida tutta
la rispettiva copertura; eliminare una voce invalida entrambe conservativamente.
Non rinnova la data di acquisizione della fotografia. Due RPC preparate sulla
stessa revisione non possono confermare entrambe: la perdente fa fallback al
solo risultato remoto. Non c'è retry automatico con un checkpoint nuovo.
Questo sostituisce la precedente invalidazione indiscriminata documentata
nella prima tranche dell'anteprima diario.

ensureCommon è collegata al loader già esistente, con budget di preparazione
di 250 ms, lettura locale/RPC concorrenti e persistenza che non blocca il
rendering. commonViewCache resta null in produzione: nessun inizializzatore,
nuova apertura automatica o RPC supplementare. Quando i test iniettano la
cache sintetica per il diario, getCommonState richiede anche i cataloghi,
senza affidarsi a quelli presenti nella UI. Il normale percorso e Task
mantengono la politica di riuso precedente.

La copia appare come anteprima datata di sola lettura: titoli degli obiettivi
del trimestre, estratti di intenzione/riflessione, focus e titoli delle pratiche.
Testo inserito via textContent; gli estratti usano renderExcerpt, con il suo
limite di 200 caratteri e la formattazione supportata. Non ci sono editor,
checkbox o azioni di salvataggio nell'anteprima. Nessun merge in state da dati
locali; la risposta Google segue acceptCommon e il rendering ordinario.
Bozze e versioni iniziali restano separate. Cambio vista, scope, generazione o
salvataggio confermato durante la RPC impediscono di pubblicare la risposta
obsoleta nel percorso cache. Un errore lascia l'anteprima già mostrata marcata
come non verificata; non genera conferme di salvataggio.

La prova manuale del repository in diagnostica ora ricostruisce anche un
periodo comune inventato dopo chiusura/riapertura. Il rapporto aggiunge soltanto
commonReopened; non include contenuti o identità.

## Verifiche locali

Nuovo `npm run test:local-common` su Demo.html, HTTP locale e Chromium con
profilo temporaneo: copertura e cataloghi esatti, giorni impossibili, anno
bisestile e confini d'anno, record duplicati, catalogo assente, limite 500,
versioni, ticket non riutilizzabili/falsificabili, isolamento utente/epoca,
CAS concorrente, quota simulata, rollback del descrittore e conservazione bozze.
Verificati anche appartenenza vuota distinta da miss, riga referenziata mancante,
riavvio reale del browser, pulizia della sola copia e coesistenza con la pagina.

Test del ponte ensureCommon nella shell reale con dati inventati: anteprima
senza editor né merge anticipato, bozza giornaliera preservata dopo risposta,
RPC obsoleta dopo salvataggio confermato ignorata senza avanzare la cache;
errore remoto e retry senza anteprime duplicate.
La diagnostica sintetica continua a verificare assenza di RPC Google, rapporti
sanitizzati, riavvio e cancellazione del solo DB di prova. La banca dati reale
gdiary-local-v1 non viene aperta.

Superati build, npm test, test:local-common, test:local-views, test:repository,
test:release, test:common-window, test:common-periods, test:identity e test:tracing.
Index.html e Demo.html rigenerati; bootstrap UTF-8, ROOT_FOLDER_ID segnaposto
e sei file di staging Apps Script preservati.

## Limiti e seguito

Il pacchetto 7 rimane parziale: ultima pagina e ultimo periodo comune hanno
fotografie distinte, non una fotografia remota atomicamente coerente tra due
RPC. Le letture sono atomiche localmente, non su Google. Mancano riapertura
completa delle viste, più pagine/periodi, bootstrap coerente e feed.
CacheReady resta false; copia reale e avvio senza RPC bloccanti non sono attivi.
Le risposte legacy non provano lo scope archivio/principale: prima di abilitarle
servono legame richiesta/risposta all'identità verificata, consenso, gestione
della revoca e collaudo iframe/browser. Cataloghi oltre budget fanno fallback:
il loro costo remoto non è stato ridotto da questa tranche. Nessun vantaggio
di latenza sui dati reali è stato misurato e nessun salvataggio offline aggiunto.
