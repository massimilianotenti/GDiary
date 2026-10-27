# Riflessioni multigiornata in lotto — SPEC-004, solo locale

Implementato il 27 ottobre 2026, seguito di
[cataloghi e delta](VERIFICA-CATALOGHI-DELTA.md). Nessun deploy, setup o
accesso ai dati reali; ultimo online documentato Apps Script 75, app v2.0.4.

## Contratto

Nuova API `saveDays({days:[{date,updatedAt,...campi}],context})` con massimo
10 date distinte e 500.000 byte UTF-8 del JSON dell'array days. Una busta
vuota, con date non valide/duplicate o fuori budget è rifiutata prima delle
scritture. La validazione dei campi di una giornata ha invece esito distinto.
Il percorso singolo saveDay resta disponibile e condivide dayValues_ per
validazione di testi, rich e limiti.

Una sola acquisizione del lock globale e un flush per richiesta. Il backend
cerca le date nella sola colonna chiave e legge soltanto i record selezionati,
raggruppando le righe contigue fino a 256. Non carica tutto Days per controllare
le versioni. Il costo della ricerca nella colonna rimane legato allo storico.

Risposta: `delta:true`, `entries:[]`, `commonIncluded:false`, `results` per
ogni data, `commonUpserts.days` con i soli record confermati ed `errors` per
esiti non confermati. Gli stati sono:

- saved: scrittura completata e record canonico restituito;
- conflict: versione cambiata o più record con la stessa identità;
- invalid: campi o formattazione non validi;
- error: scrittura non confermata; potrebbe essere già avvenuta;
- notAttempted: non inviata dopo un errore di scrittura precedente.

Conflitti e campi invalidi non impediscono le altre giornate indipendenti.
Un errore inatteso durante una scrittura interrompe invece le successive:
non si assume che un'eccezione significhi nessuna mutazione. Gli errori inattesi
hanno messaggi fissi, senza contenuti o messaggi grezzi dei servizi. Un errore
sull'intera RPC, incluso un flush fallito, non consegna conferme al client.
Non è una transazione atomica del lotto e non viene promesso rollback.

Le scritture mantengono le versioni, i campi omessi, la formattazione e le
protezioni preesistenti di Days. Nessun nuovo foglio, proprietà o lock;
nessuna operazione Drive/Docs in questo percorso.

## Client

Salva pagina continua a salvare prima note/task, poi le riflessioni. Il client
raccoglie uno snapshot dei campi sporchi per giornata, quindi crea lotti da
massimo 10 date e 500.000 byte. Tre giornate ordinarie richiedono una RPC,
ventuno tre RPC (10/10/1), anziché una per data. La chiamata saveDay rimane
nelle viste del singolo giorno e della riflessione del ciclo.

Prima di cancellare bozze viene verificata la completezza delle conferme:
una data saved deve avere un record canonico con versione. Solo le giornate
confermate entrano nel merge. Gli errori restano sporchi e conservati; il
messaggio indica conteggio e prime date non salvate, distinguendo i conflitti.
Un tentativo successivo invia solo ciò che resta da salvare.

Lo snapshot confermato aggiorna la baseline dei campi. Se nel frattempo il
contenuto locale è cambiato, la nuova versione resta sporca e persistita come
bozza, con versione remota aggiornata. Le risposte non cancellano modifiche
successive. Un errore di trasporto o una risposta malformata conserva tutte
le bozze del lotto senza conferma valida; i lotti precedenti già confermati
restano salvati.

Il tracing include saveDays nell'azione di salvataggio e il solo conteggio
numerico daysCount, senza date, testi o versioni. L'operazione distinta permette
di distinguere le misure dalle vecchie RPC saveDay, mantenendo measurementVersion 4.

## Verifiche

Nuovo `npm run test:day-batch`; il backend è incluso in npm test.

- Backend: tre giornate fuori ordine, un lock/flush, esiti misti saved/conflict/
  invalid, campi omessi e rich conservati, limiti della busta, identità
  duplicate, nessuna lettura di payload storici non richiesti.
- Crescita: con 50.000 giornate estranee aggiunte, l'aggiornamento della singola
  giornata resta a **13 celle lette** dal lettore strumentato. Non è una misura
  del tempo Google né di tutti gli accessi diretti ai metadati.
- Fault injection: un errore dopo una scrittura effettiva produce error e
  notAttempted; solo le giornate precedenti con esito certo vengono confermate.
- Browser: tre giornate con un conflitto in una RPC, bozze persistite soltanto
  per ciò che resta da salvare, retry selettivo, modifica durante ACK, risposta
  persa dopo commit, risposta malformata e suddivisione 10/10/1.

Superati build, npm test, test:day-batch, test:release, test:cycle,
test:progressive, test:tracing, test:incremental e P75. Index e Demo rigenerati;
bootstrap UTF-8, ROOT_FOLDER_ID segnaposto e sei file di staging preservati.

## Limiti e seguito

Il client resta bloccato durante l'invio; questo step riduce RPC e acquisizioni
del lock, non introduce salvataggio locale durevole o invio in background.
Le scritture Sheets sono ancora per record, per distinguere gli esiti.

Non c'è una ricevuta idempotente per operationId: dopo una risposta persa,
ritentare una giornata effettivamente scritta può dare conflitto. La bozza
resta disponibile; non viene applicata automaticamente una sovrascrittura.
La gestione guidata dei conflitti e il protocollo recuperabile fanno parte
degli sviluppi successivi della SPEC-004. Non vengono introdotti retry ciechi.

Conservati i salvataggi incrementali dei cataloghi del passo precedente;
restano da trattare altri percorsi legacy, contesa del worker, copia locale,
feed e outbox. Verificare la latenza reale prima di attribuire secondi di
risparmio ai conteggi sintetici.
