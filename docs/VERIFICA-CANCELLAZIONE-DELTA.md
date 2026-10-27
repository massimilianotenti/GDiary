# Cancellazione con risposta incrementale — SPEC-004, solo locale

Implementato il 27 ottobre 2026. Nessun deploy, setup o accesso ai dati reali;
ultimo online documentato Apps Script 75, app v2.0.4. Seguito dei
[delta legacy](VERIFICA-DELTA-LEGACY.md).

## Backend

Con `context.incrementalCommon:true`, deleteNote non ricostruisce state_()
dopo la cancellazione. Restituisce delta:true, entries:[], commonIncluded:false,
`deletedEntryIds:[id]`, deletedNoteId e alreadyAbsent:false. Se la voce non
esiste già, restituisce la stessa identità rimossa con alreadyAbsent:true,
senza una rilettura completa o scritture ulteriori. Le identità della richiesta
devono essere stringhe non vuote fino a 200 caratteri.

Il chiamante senza opt-in conserva la risposta completa precedente. Non cambia
il significato della cancellazione: versione verificata prima delle modifiche,
controlli live di appartenenza all'archivio e cestino, struttura dei marcatori,
rimozione della sola sezione Docs e delle righe applicative collegate. Restano
invariati lock globale, flush e invalidazione della fotografia Task prima delle
scritture. I documenti e file originali non vengono cestinati dall'operazione.

Il delta conferma soltanto il completamento normale della richiesta. Su errore
intermedio o risposta persa il client non presume il successo. La conferma
alreadyAbsent permette di completare un nuovo tentativo quando l'eliminazione
era riuscita ma la risposta non era arrivata. Non è una ricevuta operationId,
un registro durevole di tombstone o una transazione atomica fra Docs e Sheets.
Il ramo già assente mantiene il comportamento precedente sui possibili record
orfani: non introduce una nuova procedura di riparazione.

## Client

Il merge rimuove la voce dalle entries, gli allegati e le pianificazioni per
entryId, il risultato della ricerca archivio e il dettaglio selezionato.
Invalida cache delle viste e anteprime per impedire riaperture da copie obsolete.
Le altre voci, i loro allegati e le riflessioni giornaliere restano conservati.

La sessione pulita del diario viene invalidata. Se contiene bozze, viene
sostituita da una sessione nuova con gli stessi oggetti bozza e versioni di
partenza, senza blocchi puliti obsoleti né vecchi cursori/fotografie. Le
richieste di pagina/contenuto della sessione precedente non possono applicare
risposte tardive. Una bozza sporca della voce rimossa resta conservata con
un messaggio di voce eliminata; non viene trasformata in una nuova voce.

Il normale comando UI continua a richiedere conferma e a impedire la
cancellazione durante modifiche non salvate. Le protezioni del merge coprono
anche applicazione diretta del delta e risposte ritardate. La nuova revisione
locale protegge inoltre le collezioni comuni da letture precedenti.

Non è eliminata ogni lettura dopo il click: nel diario può essere richiesta
una nuova pagina per ricostruire elenco e cursori. È eliminata la ricostruzione
dello stato completo nella risposta di cancellazione; in una vista senza
diario il test conferma una sola RPC di mutazione.

## Verifiche

Nuovo `npm run test:delete-delta`, backend incluso in npm test.

- Voce pending e voce consolidata: conferma canonica, rimozione delle righe
  collegate, nessuna ricostruzione state_() o lettura dello storico temporale.
- Versione obsoleta, identità non valida, documento fuori archivio, documento
  nel cestino, marcatori duplicati o annidati: richiesta respinta, senza
  cancellazione dei metadati; sezione valida eliminata, documento conservato.
- Voce già assente: delta ripetibile; client legacy: risposta completa.
- Browser: entries, allegati, pianificazione, archivio, dettaglio e cache
  aggiornati insieme; bozze continue e giornaliere estranee conservate.
- Errore e risposta persa dopo eliminazione: nessuna rimozione locale senza
  conferma; il retry alreadyAbsent completa il merge senza perdere bozze.
- Pagina del diario partita prima della cancellazione: la sua risposta
  ritardata non reintroduce il record eliminato.

Superati build, npm test, test:delete-delta, test:release, test:tracing,
test:progressive, test:incremental e test:legacy-deltas. Index e Demo
rigenerati, bootstrap UTF-8 e sei file di staging preservati; ROOT_FOLDER_ID
rimane il segnaposto. Sono prove locali, non misure di latenza Google.

## Limiti e seguito

La rimozione del contenuto Docs e dei riferimenti rimane potenzialmente
costosa e continua sotto il lock globale. Nessuna modifica al coordinamento
dei writer o promessa di crescita indipendente dal numero di riferimenti.
La riduzione della contesa in ricerca/worker, i commit recuperabili, il feed,
IndexedDB applicativo e l'outbox restano sviluppi successivi della SPEC-004.
