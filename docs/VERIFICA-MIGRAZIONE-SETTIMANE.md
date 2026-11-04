# Ponte Weeks e lettori coerenti

Incremento locale del 28 ottobre 2026, SPEC-004 pacchetto 8 ancora parziale.
`syncWeekMigrationGateway_` e `syncWeekSheetSource_` usano lo stesso nucleo e
adattatore dei giorni. Nessuna creazione di fogli o accesso Google.

La migrazione richiede operationId, lunedì e preimmagine legacy completa
(oppure null). Confronta l'intera riga sotto il lock condiviso; pubblica
insieme snapshot weeks, descrittore con digest/versione legacy e indice di
routing. La riga legacy resta congelata. Una settimana assente parte con
campi vuoti, energia vuota e closed:no. Massimo 128 settimane instradate,
limite del prototipo da affrontare prima dell'uso continuativo.

Un piano durevole precede ogni migrazione e salvataggio; il preflight aggrega
prenotazione e commit prima del prepare. Retry e ACK restano legati allo
snapshot originale anche dopo edit successivi. La prima bozza con versione
legacy è accettata solo se la settimana non è stata modificata dopo la
migrazione. I conflitti hanno ricevute stabili. Le settimane condividono head,
sequenza e lock con Days, ma hanno indici, descrittori e piani distinti.

`weekValues_` conserva il contratto di saveWeek: payload completo dei campi
funzionali, normalizzazione testuale esistente, energia e stato validati.
La migrazione conserva invece gli spazi originali byte per byte. Non è
introdotta formattazione rich per campi che non la prevedevano.

saveWeek, rows_ e commonDateRanges_ instradano rispettivamente scritture,
letture complete e finestre Diario/Settimana/Abitudini attraverso il gateway.
I lettori ricontrollano il routing dopo la lettura legacy e i writer sotto
lock; saveRecord_ diretto non può aggirare il gateway. Variante esterna,
duplicati o riga legacy scomparsa bloccano letture/salvataggi canonici.
Le settimane canoniche senza riga legacy sono incluse una sola volta.

`test:week-migration`, incluso in npm test, copre 44 interruzioni prima/dopo
le unità del nucleo e 396 interruzioni prima/dopo/parziali sulle chiamate
Sheet/Range, riavviando V8 dai dati persistiti. Copre conflitti, piano pendente
superato, risposta persa, cambio payload per operationId, varianti esterne,
preflight, revoca durante la lettura e lock applicativo già acquisito.
La prova Demo usa le vere API saveWeek/getState: bozze pre-migrazione, lettori
completi/per periodo, ACK senza nuove scritture al retry, registro condiviso
con Days e 50.000 righe estranee senza aumento delle celle lette nel periodo.

L'iniezione WEEK_COMMIT_GATEWAY resta null. Controller persistente, binding
congiunto Days/Weeks e collaudo browser attivo sono i passi successivi prima
delle altre mutazioni. Le fixture non dimostrano latenza o comportamento del
vero iframe Google. Capacità manifest false; nessun deploy, provisioning o
dato reale. Online resta Apps Script 75.

Build, npm test, test:week-migration, test:release e test:tracing superati
prima di iniziare il controller. Seguito: [controller persistente Weeks](VERIFICA-CONTROLLER-ROUTING-SETTIMANE.md).
