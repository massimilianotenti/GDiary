# Controller persistente Weeks e registro condiviso

Incremento locale del 28 ottobre 2026, SPEC-004 pacchetto 8 parziale.

Il controller Days è ora un'istanza del nucleo interno
`syncRecordRoutingController_`; chiavi, formati e comportamento Days restano
compatibili con le registrazioni precedenti. `syncWeekRoutingController_`
usa lo stesso nucleo con chiavi SYNC_WEEK_ROUTING_* e formati sync-week-routing.
Nessuna RPC pubblica o inizializzazione automatica.

weekCommitGateway_ risolve il controller persistente ad ogni accesso;
WEEK_COMMIT_GATEWAY e WEEK_ROUTING_CONTROLLER sono sole iniezioni di test,
null nei sorgenti. Il server ricostruisce lo scope dalla identità esistente
e verifica accesso live, DB/cartella, ID/nome/parent del foglio Weeks e dei due
fogli di registro esplicitamente provisionati. Non crea identità o fogli.

Come Days, un'ancora immutabile rende il routing obbligatorio; due slot con
pubblicazione separata mantengono la modalità recuperabile. Registrazione
esplicita iniziale in readOnly, setMode con revisione CAS e retry idempotente.
readOnly blocca saveWeek e migrazioni, mantiene letture canoniche e recupero
di commit già preparati. I permessi di configurazione/migrazione sono false
per default; disabilitarli non rimuove il routing. Le facciate già ottenute
ricontrollano modalità e binding sotto il lock ad ogni invocazione.

Quando sono registrati entrambi i domini, le ancore devono riferirsi alla
stessa identità archivio/epoca, DB/cartella e agli stessi due fogli del
registro; Days e Weeks devono avere ID distinti. Il confronto avviene prima
della registrazione e durante ogni load/ricontrollo. Un tentativo di separare
i registri non scrive proprietà o celle. Un'ancora peer corrotta o mancante
quando esistono altre sue proprietà blocca senza ripiego legacy.

Le modalità restano per dominio: Weeks readOnly può convivere con Days
active sul medesimo head. Il recupero riguarda tutto il registro, comprese
operazioni precedentemente preparate. Non è un congelamento fisico di ogni
cella o un rollback verso deployment anteriori al controller.

`test:week-controller` include 161 interruzioni/prefissi di scrittura delle
proprietà con riavvio V8, binding/revoca/CAS, corruzione, permessi operatore e
mancata inizializzazione. La prova server usa le vere API Demo senza iniezione
in memoria dopo il riavvio; verifica readOnly persistente, corse di attivazione
nei lettori e sotto lock nei writer, entrambi gli ordini di registrazione
Days/Weeks, rifiuto del registro separato, sequenza comune e modalità distinte.
I test Days preesistenti sono rieseguiti sul medesimo nucleo.

Collaudo browser del percorso Weeks attivo ancora successivo. Registrazione
reale, provisioning e vero iframe Google restano esclusi; capacità manifest
false, nessun deploy o dato reale. Online Apps Script 75.

Superati build, npm test, test:week-controller, test:day-controller,
test:release, test:tracing e test:day-browser. Demo e staging sei file
rigenerati; Index senza differenze frontend, git diff --check pulito.

Seguito: [collaudo browser locale Weeks](VERIFICA-BROWSER-ROUTING-SETTIMANE.md)
completato sulle fixture, con conservazione delle bozze e verifica degli ACK.
