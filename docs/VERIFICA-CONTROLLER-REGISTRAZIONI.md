# Controller persistente HabitLogs

Incremento locale del 28 ottobre 2026, SPEC-004 pacchetto 8 ancora parziale.

`syncHabitLogRoutingController_` estende il nucleo comune a Days/Weeks con il
dominio habit-log. Nuove chiavi SYNC_HABIT_LOG_ROUTING_* e formati
sync-habit-log-routing-anchor/state; formati e chiavi Days/Weeks conservati.
Il server risolve il controller a ogni accesso; entrambe le iniezioni in
memoria restano null nei sorgenti. Nessuna nuova RPC o registrazione automatica.

La registrazione richiede cinque ID distinti: HabitLogs, registro riferimenti,
registro frammenti, Habits e Goals. Tutti devono appartenere al DB autorizzato;
nome e ID dei tre fogli applicativi sono verificati. Controllati identità
archivio/epoca, principale, DB/cartella e accesso live. Si usano soltanto
identità e store già provisionati, senza crearli o inizializzarli.

Il binding dei peer ora confronta tutti i domini registrati: stessa identità,
DB/cartella e due fogli di registro, senza collisioni fra ruoli applicativi.
Sono rifiutati registri separati in tutti e sei gli ordini di registrazione.
Un peer corrotto o con schema non supportato blocca i controller registrati
invece di consentire un ripiego alle preimmagini legacy.

Ancora immutabile, stato a due slot e marcatore separato rendono persistente
active/readOnly. Registrazione iniziale readOnly; setMode con revisione CAS e
retry idempotente. Le facciate già ottenute ricontrollano stato/binding sotto
lock. ReadOnly conserva le letture canoniche e il recupero dei prepare già
accettati, ma blocca nuovi setHabitLog e migrazioni. Le modalità sono per
dominio: Days/Weeks possono restare active quando HabitLogs è readOnly.

Permessi operatore e migrazione false per default; disabilitarli non rimuove
il routing. Non è possibile usare un vecchio deployment privo del controller
come rollback dopo una futura migrazione reale. Il rollback compatibile è
readOnly, preservando accesso ai dati canonici.

`test:habit-log-controller`, incluso in npm test, copre 161 interruzioni e
prefissi di pubblicazione delle proprietà con riavvio V8. Verifica binding di
tutti i cinque fogli, nome/parent dei cataloghi, revoca, CAS, assenza store,
permessi, corruzione e nessuna inizializzazione o riparazione automatica.
La prova server usa le vere API Demo: stato completo e per periodo, setHabitLog,
riavvio senza iniezioni, readOnly, corse di attivazione nei lettori/writer,
sei ordini di registrazione Days/Weeks/HabitLogs, checkpoint comune e modalità
distinte. I controller Days/Weeks preesistenti sono rieseguiti sul nuovo nucleo.

Il browser HabitLogs attivo resta il prossimo incremento. Nessuna prova del
vero iframe Google, migrazione o dato reale; manifest false e online Apps
Script 75. Provisioning e restante matrice del feed restano aperti.

Superati build, npm test, test:habit-log-controller, test:day-controller,
test:week-controller, test:release, test:cycle, test:tracing, test:day-browser
e test:week-browser prima di iniziare il browser HabitLogs. Demo/staging sei
file rigenerati; nessuna nuova differenza frontend a Index in quel passaggio.
Seguito: [browser locale HabitLogs attivo](VERIFICA-BROWSER-REGISTRAZIONI.md).
