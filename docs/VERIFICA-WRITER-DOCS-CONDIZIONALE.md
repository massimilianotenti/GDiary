# Worker Docs coordinato — pacchetto 4, sviluppo locale

## Incremento

`docsGetDocumentConditional_` legge documento e `revisionId` dallo stesso
snapshot dell'endpoint Docs API. `docsBatchUpdateConditional_` invia poi
richieste allo stesso endpoint fisso con token Apps Script e
`writeControl.requiredRevisionId`. Un aggiornamento basato su una revisione
superata diventa `DocsRevisionConflict`; gli altri errori sono sanitizzati e
non includono il body remoto. ID, revisione, forma della richiesta e numero
massimo di richieste sono validati prima del fetch.
Il manifest dichiara `script.external_request` oltre alla scope Docs già
presente. La build continua a preparare esattamente sei file Apps Script.

Il worker Apps Script ora prenota una voce sotto lock con token, versione e
scadenza di 60 secondi, poi legge e scrive Docs fuori dal lock globale. La
conferma finale richiede lo stesso token; un esito incerto conserva la coda e
la prenotazione. `locked_` e il commit store canonico rifiutano le altre
scritture mentre la prenotazione è attiva, inclusi un secondo worker e i writer
legacy che passano da questi ingressi.

Dopo una scadenza, il takeover acquisisce il lock e invia al documento una
richiesta Docs API condizionale che crea e cancella in un singolo batch un
named range temporaneo. Il worker scaduto, se tenta di scrivere con la vecchia
revisione, deve ricevere un conflitto; il nuovo worker verifica poi se il testo
fosse già stato applicato e completa il retry senza duplicarlo. Questo fence e
la perdita di ACK sono coperti da un adapter REST simulato; la risposta del
servizio Google reale non è stata verificata.

La Demo mantiene il percorso DocumentApp, non essendo collegata al trasporto
Google. La creazione di sezioni Docs mancanti avviene ancora nella fase
preparatoria sotto lock. Le verifiche locali mostrano che i percorsi app
protetti attendono la prenotazione; non sostituiscono una verifica online del
fence o della durata reale delle chiamate.

## Verifica locale

Superati `npm run build`, `npm test` (inclusi worker REST, scadenza/fence,
ACK perso, blocco di cancellazione/rebase/export/worker legacy durante la
prenotazione e 792 casi di fault injection per la conversione progetto→tag),
`npm run test:release`, `npm run test:e2e` Chromium e `git diff --check`.
Build e verifiche non hanno contattato Google. La build prepara esattamente sei
file Apps Script.

## Limite esplicito

Il pacchetto 4 resta aperto per la verifica del fence contro Docs reale; i test
locali dimostrano solo il comportamento dell'adapter REST simulato. Il lock
globale blocca tutte le scritture applicative che entrano da `locked_` o dal
commit store, quindi una voce in scrittura può sospendere temporaneamente anche
salvataggi non correlati. Un worker oltre i 60 secondi può essere rilevato come
scaduto, ma la sicurezza del takeover dipende dal fence Docs API condizionale.
Nessuna capability o attivazione è stata abilitata.
