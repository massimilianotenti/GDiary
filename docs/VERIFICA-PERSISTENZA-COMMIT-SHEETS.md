# Persistenza a frammenti su Sheets — pacchetto 8 parziale

Sviluppo locale del 28 ottobre 2026, successivo al commit 673ccf6. Solo dati inventati e mock locali;
nessun foglio reale creato, setupDrive, deploy o modifica dell'archivio Google.

## Adattatore implementato

syncSheetsCommitStore_ in Code.gs implementa il contratto del nucleo dei commit
usando due oggetti Sheet forniti esplicitamente dal chiamante. Non apre il DB,
non sceglie il foglio attivo, non crea tabelle e non inizializza il checkpoint.
Non esistono chiamanti nel percorso applicativo. Gli interruttori del manifest
restano false, come quelli della copia locale.

Per operare richiede enabled()===true, authorize(archive)===true e il lock
condiviso. Anche i metodi di record rifiutano accessi fuori dal lock; durante le
scritture accesso/scope vengono ricontrollati dopo flush e prima di pubblicare.
L'autorizzatore va implementato dal futuro controller server, includendo identità,
configurazione e appartenenza dei fogli all'archivio verificato. Un callback
fittizio è usato soltanto nei test. Non si espone questo writer generico al client.

L'adattatore verifica le intestazioni e il numero di colonne senza modificarli:

| Foglio dedicato, oggetto passato dal server | Colonne |
|---|---|
| Indice dei record | key, operation, reference, publication |
| Frammenti dei record | generation, part, payload |

Non ci sono nomi di foglio risolti automaticamente. Eventuale espansione delle
righe avviene soltanto su questi due oggetti, dopo i controlli di attivazione e
accesso. Un head assente resta ProtocolUnavailable nel nucleo: il provisioning
reale è ancora da progettare/autorizzare, non viene aggiunto a setupDrive.

## Pubblicazione verificata

Ogni record logico (head, entità, commit, ricevuta) è serializzato in JSON
canonico, codificato UTF-8/Base64 e diviso in frammenti di 8.192 caratteri ASCII.
Le celle payload hanno prefisso b1:, generazione g: e indice n:, preservando
anche Unicode, a capo e testi che cominciano come formule. Il Base64 non cifra
i dati. Limiti del prototipo: 262.144 unità UTF-16 per record e 256 frammenti;
non sono quote dichiarate delle celle Google.

La scrittura segue tre barriere:

1. Append dei frammenti nuovi, flush e rilettura esatta dell'intero lotto.
2. Append del riferimento r1: nell'indice, con publication vuota; flush e
   rilettura esatta. Il riferimento contiene chiave, revisione, generazione,
   intervallo fisico, conteggio dei frammenti e digest SHA-256 del JSON.
3. Scrittura della sola cella di pubblicazione ok:<SHA-256>, che lega chiave,
   alias dell'operazione e riferimento. Flush, rilettura del marcatore e
   ricostruzione/verifica completa del record prima del ritorno al nucleo.

I riferimenti sono append-only: non si sovrascrive l'ultimo checkpoint valido.
Un tentativo interrotto prima del marcatore completo lascia frammenti o righe
indice non pubblicati. Un prefisso del marcatore è ignorato come tentativo non
confermato; la precedente revisione verificata resta leggibile. Dopo una
conferma persa, un marcatore completo consente di ritrovare l'unità persistita.
La selezione considera le revisioni logiche, non presume che un timestamp o
la sola ultima riga siano un ordine di commit. Revisioni massime discordanti
per lo stesso record bloccano la lettura.

Un riferimento pubblicato con checksum errato o un payload mancante/corrotto
non fa ripiegare su un dato più vecchio: il protocollo si blocca senza produrre
una conferma o saltare un checkpoint. Retry identici non creano una nuova
revisione; commit e ricevute già esistenti sono immutabili.

Il nucleo continua a pubblicare il checkpoint globale solo dopo entità, commit
e ricevuta. Il marcatore di una singola unità dell'adattatore NON rende da solo
visibile un commit incompleto del protocollo. I lettori del nucleo mantengono
la barriera di recupero prima di rispondere.

## Lookup, alias e limiti di crescita

Le chiavi sono hash di archivio, epoca, tipo e identità del record. Le ricevute
includono il principale nella chiave; l'head e la sequenza sono condivisi nello
stesso archivio/epoca. Il commit ha un alias ricercabile per principale e
operationId, nella stessa riga del riferimento e coperto dallo stesso marcatore.
Non serve una seconda scrittura indipendente per pubblicare quell'alias.

Le ricerche usano TextFinder sulla sola colonna key o operation. Si leggono i
riferimenti corrispondenti e i soli intervalli di frammenti del record scelto,
mai l'intera tabella dei payload. I riferimenti storici della medesima chiave
sono ancora letti singolarmente: il costo può crescere con gli aggiornamenti.
Il budget è 512 corrispondenze per lookup, comprese quelle non pubblicate;
oltre questa soglia si restituisce ProtocolUnavailable, senza saltare dati.
Per l'head ciò limita anche il numero di commit eseguibili prima della
compattazione: questa versione non va abilitata come registro definitivo.

Non vengono eliminati automaticamente orfani, versioni vecchie, ricevute o
commit. La futura compattazione deve preservare checkpoint, recovery e finestra
di idempotenza. Non è ancora dimostrata una latenza Google costante: TextFinder
può avere un costo remoto sullo storico, e questo adattatore privilegia le
barriere di correttezza rispetto alla riduzione delle RPC.

## Modello di errore verificato

Il nuovo helper tests/helpers/fault-sheets.cjs implementa le API Sheet/Range
usate dal codice, inclusi formati, capacità, TextFinder, flush, Utility SHA-256,
Base64 e ScriptLock. L'adattatore usa quindi anche il ramo delle proprie
funzioni di servizio predefinite; le implementazioni Google sono sostituite
soltanto nei test da equivalenti Node.

Con test:commit-storage (incluso anche in npm test) sono verificati **332 casi**:
interruzione prima/dopo/troncata per scritture, formattazioni, espansioni e
flush; tutti i prefissi della cella di pubblicazione del prepare e del
checkpoint finale. Dopo ogni interruzione il contesto V8 viene eliminato e
ricreato usando soltanto le celle persistite. Il retry deve restituire la stessa
ricevuta, una sola sequenza e un feed completo con le due entità del piano.

Altre prove coprono frammenti orfani, corruzione dell'ultimo payload/riferimento,
head assente, schema errato, disattivazione/revoca prima delle letture e durante
la scrittura, metodi fuori lock, principalId distinti, ricevuta ricostruita
tramite alias, rilettura temporaneamente errata, grandi testi Unicode,
preservazione dei testi simili a formule e limiti di dimensione/storico.
Fixture con 50.000 righe estranee per tabella: il lettore carica soltanto i
riferimenti corrispondenti e intervalli fino a 256 frammenti. Non è un benchmark
del servizio Google e non dimostra costo costante della ricerca sul server.

Queste prove simulano effetti sincroni prima/dopo una chiamata o troncamenti
persistenti prima che l'esecuzione termini. Non provano la semantica di
persistenza del servizio reale, cancellazioni/modifiche manuali delle tabelle
del registro, né effetti di RPC arrivati dopo il rilascio del lock. Non offrono
transazioni ACID fra Sheets e Docs. I checksum non sono un'autenticazione.
Serve un collaudo Google separato e pertinente prima dell'abilitazione reale.

Superati build, npm test (compresi test:commits e test:commit-storage),
test:release, test:identity e test:tracing. Demo e staging dei sei file rigenerati;
Index rigenerato senza differenze frontend. Bootstrap UTF-8, ROOT_FOLDER_ID
segnaposto e autorizzazioni del manifest preservati.

## Documentazione Google consultata

Il codice usa flush per applicare modifiche pendenti, poi esegue le proprie
riletture e verifiche: non deduce una transazione da flush. Fonte:
[SpreadsheetApp.flush](https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet-app#flush()).

Prefissi e codifica evitano di inserire testo utente come formula nelle celle;
la documentazione segnala l'interpretazione dei valori che iniziano con =:
[Range.setValues](https://developers.google.com/apps-script/reference/spreadsheet/range#setvaluesvalues).

Overload UTF-8 e digest sono verificati sui riferimenti
[Utilities](https://developers.google.com/apps-script/reference/utilities/utilities);
il lookup usa [TextFinder](https://developers.google.com/apps-script/reference/spreadsheet/text-finder).

## Seguito

Pacchetto 8 ancora parziale. Nessun record delle tabelle applicative esistenti
è scritto da questo adattatore: sono envelope del nuovo protocollo in tabelle
dedicate. Mancano provisioning controllato, validatore/planner del primo writer,
proiezione o migrazione dei dati canonici e gateway dei relativi lettori;
poi copertura di tutte le mutazioni legacy, binding delle risposte allo scope
e consumo del feed nel repository. Prima di un uso continuativo vanno risolti
compattazione e budget del registro. L'applicazione mantiene i salvataggi attuali.

Seguito implementato: [preflight e compattazione recuperabile dei riferimenti](VERIFICA-CAPACITA-COMMIT.md).
write non può più creare il riferimento 513. La manutenzione esplicita può
ritirare vecchie chiavi head/entità in lotti mantenendo la riga corrente:
questa è l'unica modifica in sede di righe indice già esistenti. Payload,
commit e ricevute rimangono conservati; nessuna cancellazione fisica o
attivazione reale. Controller persistente e provisioning restano futuri.
