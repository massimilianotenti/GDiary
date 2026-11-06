# Outbox locale delle registrazioni delle abitudini — 6 novembre 2026

## Ambito e base

Tranche HabitLogs del pacchetto 11 SPEC-004, dalla base ce92b50 (Days/Weeks).
Sorgenti e prove locali: nessuna configurazione o capability reale abilitata,
nessun Google, deploy, setupDrive, dato reale o commit. Goals/Habits restano
cataloghi letti: le loro mutazioni non entrano nell'outbox. Non è offline completo.

Il writer canonico, il planner delle modifiche, il routing persistente e la
barriera dei cataloghi erano già disponibili. Sono riutilizzati senza sostituire
il planner con una semplice scrittura Days/Weeks. Restano IndexedDB v11 e il
registro condiviso, con lease, CAS, ricevute, dipendenze e storico esistenti.

## Identità e contratto

Famiglia outbox `log`, identità stabile `habitId|YYYY-MM-DD` (massimo 200
caratteri). Snapshot completo dei campi LOG_HEADERS escluso updatedAt: key,
habitId, date, status, checklist. Stato pending/done/skipped; checklist JSON
canonico con steps e checked, massimo 30 microazioni. ID, titoli, spazi e ordine
storici conservati, indipendenti dal riordino successivo del catalogo.

Checked omesso nella modifica UI conserva le spunte; checked:[] le azzera.
Pending con tutte le microazioni selezionate diventa done; done incompleto è
rifiutato. Skipped conserva le spunte parziali. Una pratica semplice usa steps
vuoto e checked vuoto. Non esiste un campo numerico/booleano da convertire:
false/zero nei campi non compatibili sono rifiutati. Il ritorno a pending o lo
svuotamento delle spunte è un upsert, non una cancellazione della registrazione.
Nessun nuovo percorso delete è introdotto: il contratto applicativo non lo offre.

Nuovo modulo puro habit-log-operation.mjs, registrato insieme a day/week in
period-operation.mjs. Validazione stretta di identità, campi e checklist;
budget locale conservativo di 27.000 unità per lo snapshot, pubblico di 30.000
per l'operazione. Non si troncano testi o ID per aggirare i limiti. Questi budget
non eliminano i limiti ulteriori dei piani/registro server.

L'operazione contiene operationId, baseVersion, log e habitUpdatedAt originario.
Snapshot della bozza e payload sono verificati come coerenti prima della stessa
transazione IndexedDB. Solo richieste mai tentate vengono accorpate; dopo un
invio una nuova modifica dipende dall'operazione precedente. Un ACK aggiorna
atomicamente record comune, ricevuta e baseline delle dipendenze, conservando
snapshot successivi. Non invalida l'indice di ricerca Entries invariato. Anche il ponte RPC separa
l'invalidazione del checkpoint da quella della ricerca per saveDayOperation,
saveWeekOperation e saveHabitLogOperation: avanza la revisione di un indice
già fresco senza promuoverne uno obsoleto. Gli altri percorsi mantengono
l'invalidazione prudente preesistente. La prova UI verifica l'indice attraverso
il vero ponte api e l'ACK, oltre alle transazioni del repository.

## Writer e trasporto

Endpoint scoped:

- saveHabitLogOperation({operation,scope}) → {log: record canonico}.
- getHabitLogOperationReceipt({request,scope}) → committed/conflict/unknown.
- getHabitLogOperationState({key,scope}) → key, missing, log, catalog, scope.

Lo scope client è confrontato con quello fidato del controller. Il writer resta
l'autorità su trimestre, giorni/frequenza, data iniziale, archivio e versioni.
Sotto lock il planner verifica il catalogo e ricompone la modifica sullo snapshot
storico precedente; lo snapshot ricevuto deve coincidere con quello risultante.
Per una nuova registrazione usa la definizione corrente del catalogo verificato.
Non accetta dal client una checklist storica arbitraria per una nuova identità.
Il controller Catalog espone ora anche readOne/mapVersion in sola lettura,
prerequisito già usato dal source HabitLogs ma assente dalla facade persistente.
La prova con entrambi i cataloghi canonici sullo stesso registro verifica mapping
ISO della sola versione iniziale, rifiuto della baseline obsoleta dopo un edit,
versione confrontata, checklist storica e ricevuta stabile. Nessuna nuova
mutazione o scrittura locale dei cataloghi.

Il piano prenotato conserva fingerprint, richiesta completa e digest dei
cataloghi. Prima di un commit nuovo i cataloghi devono ancora coincidere.
Dopo commit/ricevuta il replay restituisce snapshot e versione originali anche
con cataloghi modificati o abitudine archiviata. Non ricalcola una richiesta
incerta e non cambia ID durante il retry. Lo spazio hl-reserve- è riservato.

Creazione canonica con route e directory atomiche soltanto senza preimmagine
legacy. Una registrazione legacy esistente richiede la migrazione esplicita già
prevista; nessuna migrazione implicita o doppia scrittura. La tabella HabitLogs
legacy resta congelata. Il limite attuale della directory è **128 identità**,
oltre ai budget del registro: non è capacità sufficiente dimostrata per l'uso
continuativo reale del tracker.

Il dispatcher riusa il trasporto dei record comuni; valida snapshot e versione
sicura prima dell'ACK diretto. Un ACK valido non richiede letture compensative.
Dopo un esito incerto interroga la ricevuta originale; unknown non conferma un
salvataggio. Il retry conserva identità/payload sul protocollo idempotente.
ReadOnly conserva letture e ricevute, impedendo nuovi commit senza perdere coda.

## UI, bozze e conflitti

Percorsi locali collegati: pratiche in Abitudini, dettaglio giorno e diario
continuo, più il passaggio comune run('setHabitLog'). Il percorso Google
precedente rimane quando il locale non è disponibile e non ci sono modifiche
locali da completare; non viene usato per aggirare una coda sospesa/revocata.
Il testo di Impostazioni elenca i percorsi effettivamente supportati.

La modifica visibile viene mantenuta separata dalla fotografia durevole finché
IndexedDB non conferma. Su quota/abort/CAS rimane visibile con «Modifiche ancora
da salvare» e Riprova. La bozza di sessione è separata per scope e identità;
non è una conferma di durabilità IndexedDB e non promette recupero dopo chiusura
del browser quando lo storage è fallito. Un timeout locale cerca l'ID originale,
anche per un'operazione accorpata, prima di confermare.

Le azioni della stessa cella sono serializzate nella scheda; celle diverse
restano indipendenti. La revisione catturata nel controllo protegge dalle
scritture dell'altra scheda. Un ACK non concede alla scheda vecchia la revisione
nuova dell'altra. Un CAS locale conserva la modifica e richiede riallineamento
esplicito della vista: non sovrascrive automaticamente l'altra scheda.

Commit e ACK aggiornano i controlli montati, i contatori del tracker e il riepilogo
del diario senza rimontare editor o tracker. Gli handler leggono le spunte attuali,
non la sessione catturata dal primo render. Focus/selezione e bozze del diario
restano intatti; nessun busy globale per il trasporto. Generazioni di lettura
proteggono dalle risposte comuni tardive; callback di vecchio scope sono scartate.

Gli stati distinguono non salvato, salvato sul dispositivo/pending, failed,
conflitto e conferma Google. Retry manuale mantiene ID e tentativi. Il confronto
mostra entrambe le registrazioni e il catalogo attuale come testo. La scelta
locale crea una nuova operazione soltanto dopo confronto esplicito, con la
versione del catalogo confrontato e la checklist locale storica intatta; la
scelta Google conserva lo snapshot locale nello storico e invalida il vecchio
checkpoint secondo il meccanismo esistente. La scelta esplicita può ricomporre
la vista; gli ACK ordinari non lo fanno.

Con catalogo assente/archiviato/non pianificato la scelta locale è disabilitata.
Anche una nuova registrazione locale priva di controparte remota, con definizione
nel frattempo cambiata, richiede riallineamento: non rimappa automaticamente le
spunte ai nuovi ID. Il server verifica nuovamente le condizioni dopo il confronto.
Le righe legacy senza checklist completa non vengono ricostruite silenziosamente
da quella odierna. Cataloghi e stato incompleti restano gate espliciti.

## Verifiche ripetibili

Nuovo npm run test:habit-log-outbox, incluso in npm test. Repository e browser
inclusi anche in test:repository. Demo.html, Chromium e IndexedDB reali;
backend Apps Script sintetico/V8 con stato Sheets persistito tra riavvii.

- Server: **726 interruzioni** before/after/partial di Sheet/Range (330 update,
  396 create), recupero dal solo persistito e ACK originale; scope, replay,
  mismatch, conflitto durevole/unknown, creazione, readOnly, tipi invalidi,
  namespace riservato, cataloghi canonici condivisi e mapping delle versioni,
  riordino catalogo, archivio successivo al commit e tabella
  legacy invariata.
- Repository: abort dopo bozza e prima dell'outbox, CAS fra connessioni,
  accorpamento, azzeramento esplicito, dipendenze e ACK atomico, entrambe le
  scelte con storico, riapertura, bootstrap per periodo senza false Entries,
  indice Entries conservato, ACK diretto senza receipt di compensazione,
  ACK non sicuro rifiutato, scope principale e consenso.
- Browser: i tre ingressi, riavvio effettivo Chromium sullo stesso profilo,
  due schede/CAS, errori quota/timeout iniettati con retry e commit locale
  accorpato riconosciuto, modifiche
  rapide su stessa cella e celle indipendenti, ACK sospeso con nuova dipendenza,
  modifica non salvata durante ACK, nodo/focus dei controlli e bozza/editor/
  selezione del diario, ACK perso con receipt senza doppia scrittura, entrambe
  le scelte con storico, confronto dopo riordino del catalogo, readOnly dopo
  riavvio server/retry, errore permanente/retry, revoca durante commit con
  recupero senza rispedire, bypass dopo revoca bloccato, risposta comune tardiva,
  date nuove, navigazione avanti/indietro mentre un ACK è sospeso, cambio
  periodo/confini mese-anno, trimestre non disponibile,
  snapshot incompleto e cataloghi assenti/archiviati, callback di altro scope,
  geometria 320/390 px e tracing senza identità archivio.

## Limiti e attività residue

Nessuna prova Google/iframe reale, provisioning, migrazione reale o attivazione
capability. Restano capacità/retention, compatibilità dei client vecchi, collaudo
multi-dispositivo reale e continuità dell'origine di storage nel vero iframe.
Non sono introdotte PWA o apertura senza HTML/identità verificata. Cataloghi,
altre mutazioni e gate generali SPEC-004 restano aperti; pacchetto 11 parziale.

Le prove sintetiche non misurano latenza Google né garantiscono persistenza
in condizioni di espulsione dello storage del browser. Le transazioni IndexedDB
non includono il DOM. Il gate dei 128 log e le migrazioni sono prerequisiti
separati prima di un'attivazione reale.

## Consolidamento e controlli integrati

La prova di navigazione con ACK sospeso ha rilevato che ensureCommon poteva
sostituire una registrazione in coda con la risposta comune. Ora verifica la
richiesta corrente e riapplica gli snapshot locali Days/Weeks/HabitLogs prima
del rendering; la nuova prova esercita avanti/indietro prima dell’ACK e salva
poi una dipendenza sulla stessa identità. Corretto anche il riallineamento
della revisione dopo la scelta esplicita di un conflitto.

Build, test:repository, test:release, test:common-periods, test:cycle e
test:habit-log-browser superati sul codice finale. Superati anche test:tracing,
test:catalog-controller e test:habit-log-controller. Superati P59 (sintassi/sei file), P60.1 (UTF-8/fallback), P70 privacy, sintassi dei nuovi
moduli/prove e git diff --check. ROOT_FOLDER_ID segnaposto verificato nei
sorgenti e nello staging. **npm test concluso con exit 0 sul risultato
integrato finale**, incluse le regressioni Days/Weeks, la prova dei cataloghi
canonici condivisi, 726 interruzioni HabitLogs e repository/browser HabitLogs.
L'ultima esecuzione è stata avviata dopo il consolidamento del ponte RPC e
della facade Catalog; gli hash di sorgenti, generati e test sono rimasti
identici fino al termine. Un precedente avvio era stato interrotto per
includere la correzione di navigazione; un altro giro completo è passato
prima della verifica finale congelata. Nessun commit o servizio Google.
