# Riallineamento locale del catalogo HabitLogs — 6 novembre 2026

## Seguito E2E dalla base beed3f9 — 6 novembre 2026

Esteso `tests/verify-habit-catalog-sync-e2e-browser.cjs`: due pagine Chromium
con profilo persistente e IndexedDB condivisa attraversano l'API/feed
sintetico, `createSyncConsumer`, repository, handler di riallineamento e
BroadcastChannel. Il test non chiama `publishHabitCatalogTabChange` e non
applica delta dal test al repository.

| Caso | Prova e percorso | Esito/limite |
|---|---|---|
| Goal e Habit upsert con versione nuova | `saveGoal`/`saveHabit` canonici sintetici → `getChanges` → consumer → handler → IndexedDB/peer | E2E; entrambi i record, cursore/prova e invalidazione conferma verificati |
| Goal/Habit upsert con `updatedAt` invariato | `verify-habit-log-outbox-repository.cjs` applica direttamente al repository il caso senza bump | Non E2E. Il protocollo feed sintetico assegna al commit una nuova versione e il consumer la applica; non si forza un feed non conforme per simulare l'invarianza |
| Tombstone Habit | inserimento e cancellazione sintetici tramite commit store recuperabile, poi `getChanges` e consumer | E2E; rappresenta un feed sintetico valido, non una mutazione applicativa Google |
| Feed incompleto, errore e retry | risposte sintetiche `getChanges` via RPC reale del test, poi refresh UI | E2E; errore/incomplete mantengono `stale`, il retry applica il commit |
| Conferma → operazione HabitLogs/ACK trattenuto → delta catalogo → ACK | click di conferma, checkbox UI, dispatcher e feed consumato nell'altra pagina con barriere | E2E; la modifica successiva alla stessa cella resta nel draft dopo ACK; nuova intenzione bloccata non viene spedita |
| Risposta tardiva dopo revoca | risposta feed acquisita e trattenuta al confine RPC; revoca locale reale della cache prima del rilascio | E2E sintetico; la copia cancellata non viene ripopolata |
| Tracker focalizzato simultaneo al feed | pagina peer mantiene lo stesso nodo checkbox e microazione focalizzata mentre la prima consuma il delta e la UI pubblica l'invalidazione | E2E per focus/nodo tracker |
| Rich editor e tracker simultanei al feed/ACK | pagina consumer mantiene editor contenteditable con grassetto, testo, nodo, focus e selezione mentre l'altra scheda ha un ACK HabitLogs trattenuto, modifica la stessa cella e la prima applica un delta | E2E; prova nodo/focus/selezione sia nel feed iniziale sia nell'interleaving ACK/delta |

La sequenza concorrente usa barriere sul ritorno `getChanges`/ACK; l'ordine non
dipende da sleep di scheduling. Il test verifica che catalogo e ACK HabitLogs
non rendano obsoleto l'indice Entries già fresco. Per il caso `updatedAt`
immutato resta prova repository diretta. Il contratto `syncCatalogSnapshot_`
esclude `updatedAt` dal payload canonico e `sync-consumer` assegna al record la
versione del commit: nel feed valido non esiste un upsert catalogo con
`updatedAt` invariato dopo l'applicazione. Non si maschera questo limite con un
delta applicato direttamente.

Il percorso UI rivela un difetto corretto in `frontend/shell.html`: se un
refresh `getChanges` terminava con errore o feed incompleto, la vecchia prova
catalogo poteva lasciare lo stato UI `ready`. Ora il risultato fallito porta
lo stato a `stale` e mostra il retry; la nuova regressione E2E lo verifica.
Rigenerati `Index.html` e `Demo.html`; bootstrap UTF-8, sei file Apps Script e
`ROOT_FOLDER_ID` segnaposto controllati.

Verifiche dalla base `beed3f9`: `npm run build`, `node
tests/verify-habit-catalog-sync-e2e-browser.cjs`, `npm run test:repository`,
`npm run test:release`, `npm test` e `git diff --check` superati. La suite
`npm test` ha incluso le regressioni di Days, Weeks e HabitLogs, incluse le
matrici di recovery e i test UI/browser con IndexedDB reale. Il test E2E
cataloghi è in `test:repository`.

Il backend è sintetico e non è collaudo Google. La tranche non abilita
capability, non scrive dati reali e non dichiara completo il pacchetto 11 o
l'offline. Resta la prova E2E di upsert con versione invariata, impossibile da
rappresentare con l'attuale versione monotona dei commit; il caso resta coperto
dal repository diretto. I test diretti non vengono conteggiati come prova
end-to-end.

## Seguito: ordini concorrenti fra schede — base f978f4a

Le schede attive ora si scambiano tramite `BroadcastChannel` una sola
invalidazione senza scope, ID o contenuti. La ricevente rilegge la propria
IndexedDB nello scope attivo; non applica il payload dell'altra scheda e non
rimonta la vista. La riconciliazione scarta letture asincrone se nel frattempo
cambiano repository, scope, consenso o token di lettura. La conferma utente
viene riletta dopo l'ACK IndexedDB prima di mostrare `ready`; delta/tombstone
successivi mantengono il blocco.

L'aggiornamento feed non invalida più l'indice Entries per sole mutazioni
Goals/Habits/HabitLogs o di altre collezioni senza impatto sulla ricerca; le
modifiche a Entries, corpi, progetti e file lo invalidano ancora. La prova
Chromium usa due pagine reali dello stesso contesto persistente e IndexedDB
condivisa, con backend sintetico: controllo tracker focalizzato in una scheda e
rich editor con testo sporco, focus e selezione nell'altra durante delta senza
bump di versione; conferma durevole invalidata da un delta Goal con nuova
versione prima del readback UI; conferma peer seguita da tombstone; ACK HabitLogs
prima, durante e dopo delta; modifica successiva ancora pendente durante ACK;
lettura tardiva dopo cambio scope/revoca e feed incompleto con retry. Nessun
payload privato viaggia nel BroadcastChannel. Questo non è un collaudo Google.

Non è dimostrato ogni ordine possibile di tre o più feed/ACK, la selezione di
testo in ogni editor o due form testuali sporchi simultaneamente in viste diverse.
La copertura resta limitata agli ordini esplicitamente riprodotti e non implica
la correttezza di tutte le interleaving possibili.

## Risultato della tranche

Il sync esistente rimane l'unico percorso che aggiorna Goals e Habits. La UI
mostra uno stato persistente per archivio: catalogo da riallineare, catalogo
cambiato da rivedere oppure catalogo verificato ma da confermare. «Riprova
riallineamento» esegue il consumer sync; «Rivedi catalogo» legge la copia locale
nella vista corrente e richiede una conferma separata prima di riabilitare nuove
registrazioni. Gli errori e le prove incomplete non confermano il catalogo.
Nessuna mutazione Goals/Habits è stata aggiunta all'outbox e nessuna operazione
HabitLogs bloccata viene inviata automaticamente.

La conferma è memorizzata in `archiveMeta`, scoped ad archivio, principal ed
epoch e legata a fingerprint del catalogo e cursore completo. La scrittura
HabitLogs ricontrolla conferma, prova, baseline e versioni Goals/Habits nella
stessa transazione IndexedDB. Un feed completo identico conserva la conferma;
un upsert effettivamente diverso o tombstone invalida la prova e imposta un
flag durevole di revisione. Il flag non si azzera con un nuovo checkpoint,
anche se `updatedAt` e il fingerprint versionale restano uguali: si azzera
solo con la conferma esplicita. ACK HabitLogs non invalida la prova catalogo né
l'indice Entries.

## Verifiche effettuate

- `npm run build`: superato; rigenerati `Index.html` e `Demo.html`, preparati i
  sei file Apps Script.
- `tests/verify-habit-log-outbox-repository.cjs`: superato con Chromium e
  IndexedDB reale. Verifica feed identico e confermato, delta/tombstone, upsert
  senza cambio versione, guard scrittura e indice Entries. Due handle verificano
  ACK stale, feed vecchio e cambio archivio. Una matrice esplicita prova ACK log
  prima del delta, ACK dopo un secondo delta con baseline draft conservata, e
  invalidazione persistente della conferma anche dopo entrambi gli ACK.
- `tests/verify-habit-log-outbox-browser.cjs`: superato con Demo/backend
  sintetico, due pagine Chromium nello stesso contesto persistente e IndexedDB
  reale condivisa. Prova il segnale cross-tab senza payload privati; delta senza
  bump e con nuova versione; rich editor sporco con testo/focus/selezione
  conservati mentre il tracker è attivo nell'altra scheda; ACK durevole poi
  delta prima del readback UI, che resta bloccato; peer confirm/tombstone; delta
  mentre l'ACK log è trattenuto e nuova modifica ancora pendente. Include risposta
  tardiva dopo cambio scope e revoca, feed incompleto/errore/retry e riavvio.
- `npm run test:repository`: superato, incluse regressioni Days, Weeks e
  HabitLogs.
- `npm run test:release`: superato.
- `npm test`: superato sul risultato integrato.

## Limiti e copertura non dichiarata

Il backend è sintetico: non è un collaudo Google, non prova autorizzazioni,
trigger o writer Apps Script reali. La tranche non abilita le capability e non
scrive cataloghi su Google.

Le prove repository coprono delta/tombstone Goal/Habit, contenuto con versione
invariata, due handle, ACK stale, feed più vecchio e cambio scope. La prova UI
mirata copre la gara dell'ACK UI dopo commit e prima del readback, il dirty
editor in una scheda mentre il tracker è attivo nell'altra, e il delta durante
ACK HabitLogs trattenuto con modifica successiva locale. Il repository prova ACK
prima e dopo delta, preservazione del draft dipendente e freshness dell'indice.
Non copre tutti gli ordini possibili di più ACK/feed, né due form testuali
sporchi in viste diverse mentre arrivano insieme. Il canale propaga invalidazioni solo fra pagine attive;
una pagina riaperta recupera lo stato dalla IndexedDB durante bootstrap.

Editor sporchi e dettagli in modifica non vengono smontati per la revisione:
la UI chiede di conservarli prima di procedere. È provata la conservazione di
focus e selezione del checkbox e del rich editor nei casi descritti, non per
ogni editor o cambio vista/catalogo. Le prove HabitLogs precedenti verificano
che le microazioni storiche non vengono rimappate; non è provata la gara di un
riordino catalogo durante una risoluzione conflitto. Se il checklist storico
non è compatibile, la scelta locale nel dialogo conflitto
resta disabilitata quando il record remoto è assente e la checklist non è
compatibile.

Il pacchetto 11 SPEC-004 rimane aperto; offline completo non disponibile.
Restano integrazione Google, copertura browser mirata dei casi elencati e gate
di compatibilità/retention già descritti nei rapporti HabitLogs.

## Seguito: feed cross-tab end-to-end, dalla base 1cf9d07 — 6 novembre 2026

Nuovo `tests/verify-habit-catalog-sync-e2e-browser.cjs`, incluso in
`test:repository`. In Chromium apre due pagine reali con profilo persistente e
IndexedDB condivisa. Il test inizializza una copia di fixture al cursore del
backend, poi una mutazione canonica Habit viene inviata al server sintetico
Apps Script e produce un commit nel feed. La scheda aggiorna la copia tramite
`createSyncConsumer.sync()` invocato dal percorso applicativo
`refreshLocalBootstrap`; il publisher BroadcastChannel è quindi eseguito dal
handler reale dell'applicazione e la seconda scheda rilegge il record dalla
copia condivisa. Non chiama `publishHabitCatalogTabChange` né applica il delta
direttamente dal test.

La prova controlla il cursore consumer, il record Habit condiviso, la prova
catalogo ricostruita sul cursore aggiornato, la conferma precedente rimossa,
`habitCatalogReviewRequired` e la freshness dell'indice Entries. Il backend è
sintetico e non equivale a un collaudo Google. L'inizializzazione della fixture
scrive la baseline direttamente nel repository; il delta oggetto della prova
passa invece dal commit canonico e dal feed del consumer.

Questa prova non copre ancora via consumer un tombstone Goal/Habit né tutti gli
ordini di almeno tre eventi fra feed parziali, errori/retry, conferma e ACK
HabitLogs. Non ripete nel medesimo scenario E2E i due editor attivi: la
conservazione di editor rich text e tracker cross-tab resta dimostrata dalle
prove browser/repository precedenti, che applicano direttamente il delta e
quindi non sono prova del percorso end-to-end. Non si dichiara copertura
aggiuntiva per risposta remota tardiva, revoca o cambio archivio attraverso il
consumer di questo nuovo test.

Build, `test:repository` (inclusa la nuova prova), `test:release`, `npm test`
e `git diff --check` superati il 6 novembre 2026. Nessun sorgente frontend è
stato modificato; `npm run build` ha rigenerato gli artefatti previsti e
preparato i sei file Apps Script localmente. Nessun deploy, setupDrive,
accesso Google o modifica ai dati reali.
