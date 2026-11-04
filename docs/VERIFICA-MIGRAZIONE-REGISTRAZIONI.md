# Ponte HabitLogs, dipendenze e lettori coerenti

Incremento locale del 28 ottobre 2026, SPEC-004 pacchetto 8 parziale.
Writer e planner verificati prima di iniziare questo incremento.

`syncHabitLogMigrationGateway_` usa il nucleo recuperabile e lo store iniettato;
`syncHabitLogSheetSource_` riceve esplicitamente HabitLogs, Habits e Goals.
La sorgente legge per chiave le sole righe della registrazione e dei cataloghi
necessari, senza usare la cache applicativa o scansioni di payload interi.
Le letture per periodo cercano la colonna date, mentre identità e routing
restano habitId|date: due abitudini dello stesso giorno sono entità distinte.

## Migrazione e storia delle checklist

La migrazione interna richiede operationId, key, expectedLegacy,
expectedCatalog e record canonico completo. Confronta l'intera preimmagine
legacy e il contesto dei cataloghi sotto il lock condiviso. Prenota un piano
durevole, poi pubblica insieme registrazione, descrittore e indice di routing.
La riga legacy non viene riscritta; l'intero snapshot originale resta
verificabile attraverso il digest della preimmagine congelata.

Se la checklist storica esiste, la migrazione deve conservarne esattamente
stato, ID, titoli, ordine e spunte; l'ordine delle chiavi JSON è normalizzato.
Se manca, preview restituisce record:null. Il chiamante operatore deve fornire
una fotografia esplicita: nessuna spunta viene dedotta da done. Sono consentite
microazioni del catalogo catturato senza spunte oppure nessuna microazione
storica registrata; lo stato originale resta invariato. In particolare un
vecchio done senza checklist può essere rappresentato come pratica semplice
completata, non come microazioni arbitrariamente spuntate. È una scelta
esplicita del contratto di migrazione, non un aggiornamento automatico dei dati.
Nessuna chiamata reale o scelta su registrazioni dell'utente è stata eseguita.

Una registrazione senza riga legacy può essere migrata soltanto allo snapshot
iniziale pending con spunte vuote prodotto dal planner su cataloghi validi e
data prevista. Non si possono inserire completamenti tramite questo percorso.

## Piani, cataloghi e retry

Il piano conserva richiesta canonica e digest dell'intera abitudine/obiettivo
catturati. Il fingerprint dell'edit deriva dalla richiesta normalizzata prima
di consultare i cataloghi, distinguendo checked omesso e checked:[]; l'ID
operazione implicito è deterministico. Lo scope proviene esclusivamente dal
server, mai dal context inviato dal client.

Prima di preparare un nuovo commit, il ponte ricontrolla il digest dei cataloghi.
Un piano solo prenotato non può ignorare una modifica successiva dell'abitudine,
dell'obiettivo o dell'archiviazione: resta bloccato, senza ricalcolare lo snapshot.
Un commit già preparato viene recuperato con il piano originale. Una ricevuta
già confermata (o un commit conservato senza ricevuta) viene verificata dal
nucleo e riusata anche se i cataloghi sono poi cambiati o l'abitudine archiviata.
Il retry non deve ricreare una registrazione a partire dalle definizioni attuali.

Le letture storiche canoniche non richiedono un'abitudine ancora attiva; nuovi
edit verificano invece le dipendenze tramite il planner. La checklist storica
resta quella registrata, anche dopo la sostituzione delle microazioni correnti.
La prima versione legacy è accettata solo sulla prima revisione migrata;
versioni obsolete danno conflitti persistiti dal nucleo. Modificare il payload
per lo stesso operationId produce OperationMismatch.

Il preflight aggrega prenotazione e operazione prima del prepare. Il limite
resta 128 chiavi di routing, piano 32.768 unità e 512 riferimenti per chiave
nello store, soggetto alla compattazione esplicita esistente. I descrittori
usano un hash della chiave composta per non superare i 200 caratteri del
protocollo con il prefisso interno. Piani, ricevute e commit non vanno rimossi
manualmente; la retention generale è ancora un pacchetto successivo.

## Ingressi applicativi e verifiche

setHabitLog, rows_ e commonDateRanges_ usano il gateway quando iniettato.
Rilettura del routing dopo la lettura legacy e sotto lock prima del writer;
writer generico saveRecord_ bloccato. La sorgente legacy del gateway è l'unico
percorso per registrazioni non migrate e mantiene il contratto del planner.
Righe congelate cambiate, duplicate o scomparse bloccano letture e salvataggi.
Le registrazioni canoniche senza riga fisica legacy sono incluse una sola volta.

`test:habit-log-migration`, incluso in npm test, verifica:

- 44 interruzioni prima/dopo le unità di prenotazione, migrazione ed edit;
  riavvio V8 dai soli dati persistiti e convergenza allo stesso ACK.
- 396 interruzioni prima/dopo/parziali di Sheet/Range sull'adattatore frammentato.
- Piani prenotati rispetto a prepare già accettati, cambio/archiviazione dei
  cataloghi, ricevuta mancante riparata dal commit conservato, conflitti stabili.
- Checklist mancanti con snapshot esplicito, rifiuto della riscrittura della
  storia, chiavi di 200 caratteri, due abitudini nello stesso giorno, preflight,
  corruzione di indice/piano, entità orfane e revoca dopo la lettura sorgente.
- API reali della Demo: setHabitLog, stato completo e periodi Diario/Settimana/
  Abitudini, vecchie versioni, edit del catalogo, risposta persa e retry senza
  nuove scritture, archiviazione e righe congelate.
- Un solo head condiviso con Days/Weeks e lookup/letture per periodo con
  50.000 righe estranee per tabella HabitLogs, Habits e Goals, senza aumento
  delle celle lette nei percorsi mirati. Non è una misura di latenza Google.

## Confine operativo

HABIT_LOG_COMMIT_GATEWAY resta null. Il controller persistente dei giorni e
delle settimane non registra ancora HabitLogs: occorre estenderlo con binding
esplicito anche ai fogli Habits/Goals e allo stesso registro, poi collaudare
il browser attivo con risposte perse/malformate e cambi dei cataloghi.
Non disabilitare il routing come rollback dopo una futura migrazione reale:
esporrebbe preimmagini vecchie. Nessuna registrazione reale, provisioning,
nuova RPC, deploy o modifica ai dati dell'utente. Manifest false; online Apps
Script 75. Pacchetto 8 e feed dell'intero archivio ancora incompleti.

Superati build, npm test, test:habit-log-migration, test:release, test:cycle,
test:incremental, test:common-periods, test:tracing, test:day-browser e
test:week-browser. Demo e staging dei sei file rigenerati; Index senza nuove
differenze frontend in questo incremento, bootstrap e segnaposto preservati.
Git diff --check pulito. Browser HabitLogs attivo ancora da implementare.

Seguito implementato sulle fixture: [controller persistente](VERIFICA-CONTROLLER-REGISTRAZIONI.md)
e [collaudo browser attivo](VERIFICA-BROWSER-REGISTRAZIONI.md). Il routing reale
resta non registrato e le capacità del manifest disabilitate.
