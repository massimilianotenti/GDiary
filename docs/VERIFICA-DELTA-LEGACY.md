# Delta di allegati, aggiornamento legacy e conversione progetto — SPEC-004

Implementato il 27 ottobre 2026, solo locale. Nessun deploy, setup o modifica
ai dati reali; ultimo online documentato Apps Script 75, app v2.0.4.
Seguito di [cataloghi e delta](VERIFICA-CATALOGHI-DELTA.md) e
[riflessioni in lotto](VERIFICA-RIFLESSIONI-LOTTO.md).

## Contratti

Il frontend richiede già `context.incrementalCommon:true`. Con questo opt-in
anche tre ulteriori percorsi evitano `state_()` dopo la scrittura:

| API | Risposta incrementale |
|---|---|
| addFileLink | fileUpserts con il solo allegato canonico |
| updateEntry legacy | entries con il record aggiornato, metadataOnly e preserveDetailId |
| convertProjectToTag | entryPatches, commonRemovals.projects, addedTags e convertedCount |

Tutte hanno delta:true e commonIncluded:false. I chiamanti senza opt-in
mantengono il contratto completo. Non vengono cambiati form o regole del
percorso legacy: data/titolo/collocazione rimangono fissi, il corpo non si
modifica tramite updateEntry, versioni e validazioni restano obbligatorie.

Un allegato già collegato alla stessa voce restituisce il record persistito
precedente, inclusi ID, titolo, URL e data originali. Non viene creato un
duplicato e non si presenta come salvato un nuovo titolo che il backend non
ha scritto. Restano i controlli del proprietario applicativo e del formato
HTTPS Google del collegamento, senza nuove letture remote del file allegato.

La conversione continua a verificare la firma dell'anteprima sotto lock e a
rifiutare progetti collegati a obiettivi. Restano identità, altri progetti,
contenuti, cartelle e documenti originali. Il server conserva i nuovi timestamp
calcolati nelle scritture e restituisce per ogni voce modificata soltanto
`id,projects,tags,scope,updatedAt`, corrispondenti ai valori persistiti.
Non restituisce titoli, corpi, anteprime, allegati o stato completo.

## Applicazione nel client

fileUpserts si unisce per ID, preservando gli altri allegati e i contenuti
della voce aperta. L'aggiornamento metadataOnly conserva corpo e rich già
caricati. Non viene richiesta una rilettura compensativa.

entryPatches aggiorna solo le voci già in memoria; un ID sconosciuto non
crea una voce incompleta. Il merge conserva i campi non modificati, compresi
corpo/rich e pianificazione. commonRemovals rimuove il progetto dal catalogo
e addedTags aggiorna il catalogo tag senza una scansione remota aggiuntiva.
Aggiornando insieme metadati e cataloghi, il progetto rimosso non riappare
tra i progetti dedotti dalle vecchie voci. La privacy viene ricalcolata anche
quando il nuovo tag è privato.

Il normale flusso di conversione conserva anteprima e conferma preesistenti;
questo step riduce il lavoro della risposta, non elimina l'anteprima. Le cache
delle viste e delle anteprime vengono invalidate dal percorso di mutazione.
Una sessione del diario pulita viene invalidata e ricaricata al prossimo uso.
In una sessione mista, i blocchi puliti ricevono metadati e baseline canonici;
le bozze sporche conservano testo e versione di partenza, per rilevare il
conflitto anziché sovrascriverle. I nuovi delta avanzano la revisione locale
che protegge dalle risposte comuni ritardate.

## Verifiche

Nuovo `npm run test:legacy-deltas`, backend incluso in npm test.

Backend: allegato singolo/duplicato canonico, ID voce e URL non validi,
versioni e conflitto updateEntry, firma obsoleta, vincoli degli obiettivi,
conversione con più progetti, conversione vuota, esattezza dei timestamp e
dei soli cinque campi restituiti, compatibilità completa senza opt-in.
Il test impedisce esplicitamente ricostruzioni state_(), letture dello storico
Days/Weeks/HabitLogs e aperture Docs durante questi percorsi incrementali.

Browser: una sola RPC di mutazione senza rilettura compensativa, allegati
estranei e contenuti rich conservati, idempotenza dell'allegato duplicato,
merge metadataOnly, rimozione del progetto, aggiornamento di tag e privacy,
invalidazione della sessione pulita, conservazione di bozze/versioni e baseline
dei blocchi puliti di una sessione mista. Patch di voci non caricate non
vengono trasformate in record incompleti.

Superati build, npm test, test:legacy-deltas, test:release, test:tracing e
test:incremental. Index e Demo rigenerati; bootstrap UTF-8, segnaposto
ROOT_FOLDER_ID e sei file di staging preservati dai controlli di build.

## Limiti e seguito

La ricerca del duplicato allegato legge ancora Files; il percorso conversione
ricerca e modifica tutte le voci coinvolte. Il costo e la risposta sono quindi
proporzionali alle voci convertite: non è una paginazione o un nuovo indice.
Nessun tempo Google è stato misurato in questa tranche.

Non si promettono atomicità della conversione o ricevute operationId. Un errore
durante una conversione può richiedere rilettura e nuova anteprima, come prima.
Non viene modificato il coordinamento dei writer Docs né alleggerito il lock
remoto della cancellazione. Il seguito [cancellazione incrementale](VERIFICA-CANCELLAZIONE-DELTA.md)
converte ora anche deleteNote e il caso di voce già assente, mantenendo il
contratto completo per i client legacy. La contesa della ricerca/worker, la copia
locale persistente, il feed e l'outbox restano sviluppi successivi.
