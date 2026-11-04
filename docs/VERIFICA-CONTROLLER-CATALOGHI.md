# Routing server e browser per Goals/Habits

Il controller persistente del Catalog associa Goals e Habits al registro
recuperabile già esistente. La registrazione richiede i quattro ID foglio e
controlla archivio, principal, nomi, genitore, ruoli condivisi e ledger già
provisionato. Parte in `readOnly`; l'attivazione resta un'azione esplicita.
Il resolver applicativo si attiva solo dopo la presenza dell'anchor e non
concede permessi operativi di registrazione o migrazione.

Il binding con HabitLogs condivide Goals/Habits con lo stesso ruolo e lo stesso
ledger, mantenendo modalità indipendenti. Il test server verifica migrazione,
modifica, lettura dopo riavvio, ancore persistenti e registrazione di entrambi
i controller. La suite HabitLogs conserva inoltre i sei ordini di
registrazione Days/Weeks/HabitLogs e prova tutti i 24 ordini di
registrazione Days/Weeks/HabitLogs/Catalog. I binding con Goals e Habits
scambiati vengono rifiutati senza scritture.

La matrice API Catalog copre aggiornamento e replay ACK di Goals/Habits,
conflitti su versioni obsolete e payload differenti, create intent espliciti e
replay con identità stabile, dipendenza Goal→Habit, riordino/inserimento delle
microazioni con ID preservati per titolo, archiviazione soft e riavvio. Il
messaggio di conflitto server ora nomina il Catalog invece della Giornata.
L'archiviazione non cambia le righe HabitLogs storiche.

Quando il controller Catalog è attivo, anche le impostazioni di riflessione e
privacy leggono e scrivono record canonici `settings` con CAS della versione,
ricevuta stabile al retry e conflitto per una base obsoleta. Prima
dell'attivazione le letture e le scritture mantengono il percorso
ScriptProperties esistente. Dopo il routing, i valori Properties legacy non
vengono aggiornati né usati come fallback se manca un record canonico. Il
test verifica inoltre che valori non validi non producano scritture.

## Verifiche

- `node tests/verify-catalog-routing-controller.cjs`: binding esplicito,
  registrazione `readOnly`, migrazione/modifica canonica, riavvio e CAS modalità.
- `node tests/verify-catalog-routing-mutations.cjs`: create/edit/archive,
  conflitti, ACK e identità al retry, dipendenze e microazioni; impostazioni
  reflection/privacy canoniche, replay, conflitti e rifiuto prima della scrittura.
- `node tests/verify-habit-log-routing-server.cjs`: fixture server Demo,
  Catalog e HabitLogs sullo stesso ledger, ruolo delle tabelle, migrazione e
  modifica Goal, riavvio, binding in tutti i 24 ordini. Nessun accesso Google.
- `node tests/verify-catalog-routing-browser.cjs`: Chromium su Demo e RPC
  sintetiche; bootstrap/render senza errori, lettura/scrittura canonica
  Goals/Habits e impostazioni, retry/conflitto, Properties legacy congelate e
  riga storica HabitLogs invariata.
- `npm run build`, `npm test`, `npm run test:e2e`, `npm run test:release` e
  `git diff --check`: tutti superati il 28 ottobre 2026.

## Limiti e lavoro ancora aperto

Queste prove usano il backend Demo e fogli sintetici. Non certificano il vero
iframe Apps Script, permessi Google, latenza, provisioning o attivazione sul
diario. Il pacchetto 8 SPEC-004 resta aperto: serve completare la matrice delle
mutazioni per le altre entità e il feed completo, oltre al contratto di
provisioning/abilitazione.
Nessun deploy, `setupDrive` o modifica a dati reali è stata eseguita. Il
manifest di capacità rimane disattivato.
