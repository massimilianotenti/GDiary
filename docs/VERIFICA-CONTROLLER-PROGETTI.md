# Gateway e controller persistente Projects

Il controller associa il foglio `Projects` al registro durevole condiviso.
Binding vincolante: ID foglio Projects, ID del foglio indice e ID del foglio
blocchi. La registrazione verifica nome/ID/parent e identità dell'archivio,
recupera il ledger già provisionato e parte `readOnly`; non crea fogli o
identità. `active` richiede un cambio modalità esplicito con CAS.

Il gateway mantiene un indice canonico ordinato per slug e route per progetto.
Una prima modifica di una riga legacy pubblica nello stesso commit record,
route e indice; il piano viene prenotato prima del commit business, così il
retry dopo una risposta persa riusa richiesta e ACK originali. Le righe Sheets
legacy sono preimmagini congelate; divergenza, route mancante e duplicati
bloccano il fallback. Le letture `state_`, `rows_`, `cachedRows_` e la ricerca
archivio applicano l'overlay canonico. L'unicità del nome viene ricontrollata
sotto lock sul catalogo unito.

`saveProject` usa il gateway dopo l'attivazione e crea/verifica la cartella
Drive dopo l'ACK del registro. L'operazione Drive è ripetibile dopo un errore
senza duplicare il commit. La conversione progetto→tag è stata poi collegata
al gateway condiviso Projects/Entries con commit atomico e tombstone; dettagli
e limiti in [VERIFICA-CONVERSIONE-PROGETTO-TAG-ENTRIES.md](VERIFICA-CONVERSIONE-PROGETTO-TAG-ENTRIES.md).
Le altre associazioni Entry→Projects ancora non instradate restano protette.

Il controller Projects condivide archivio, indice e blocchi con Catalog e
HabitLogs. I ruoli fisici Goals/Habits restano distinti da Projects; binding
incrociati su archivi o fogli diversi sono rifiutati. La facciata non abilita
il manifest e non registra/attiva nulla da sola.

## Verifiche

- `npm run test:project-migration`: migrazione/overlay, preimmagini congelate,
  unicità, ACK, divergenza e 396 interruzioni Sheet/Range con riavvio V8.
- `npm run test:project-controller`: registrazione `readOnly`, coesistenza con
  Catalog/HabitLogs sul ledger condiviso, mutazioni legacy bloccate,
  `saveProject` attivo, replay, reboot e CAS modalità.
- `npm run test:project-browser`: bootstrap e form Projects in Chromium,
  scrittura canonica, replay stabile, riga legacy invariata e nessun errore JS.
- `npm run build`, `npm test`, `npm run test:release`, `npm run test:e2e` e
  `git diff --check`: superati il 29 ottobre 2026. E2E include il browser
  Projects; le suite usano Demo e backend V8/Sheets sintetico.

## Limiti

Nessun provisioning, deploy o accesso ai dati Google reali. Restano le
associazioni Entry→Projects e il feed completo. La cartella Drive resta un
effetto esterno successivo all'ACK e non è coperta da una transazione
distribuita.
