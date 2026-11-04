# Pagine snapshot per raccolte canoniche

**Data:** 29 ottobre 2026. **Stato:** API server locale parziale, capability
client disabilitata. Nessun provisioning, deploy o accesso a dati Google reali.

## Contratto implementato

- `getSnapshotPage` restituisce pagine keyset per Entries, Projects, Days,
  Weeks, HabitLogs, Goals, Habits, Files, settings e layouts. Files legge le
  righe legacy e verifica solo i relativi proprietari tramite lookup per ID;
  layouts legge le righe `JournalLayout` legacy e verifica i loro proprietari.
  Nessuna delle due raccolte chiama più `readRows()` per enumerare tutte le
  Entries. Le entità canoniche Files e i layout canonici arrivano dal replay
  del feed immutabile. Settings include solo privacy e reflection, mai il
  ledger interno.
- Le pagine Files/Layouts descrivono la sola porzione legacy e restano
  incomplete quando questa contiene righe; il consumer integra le entità
  canoniche riproducendo il feed dall'origine. ID duplicati o record
  incoerenti fanno fallire la lettura.
- Settings/layouts espongono la propria versione di record separatamente dal
  checkpoint del feed: `commit-N` per valori canonici, versione legacy per gli
  altri. La copertura resta parziale quando è presente almeno un record legacy.
- La prima richiesta fissa un cursore di feed; le continuazioni riusano quel
  checkpoint. Ogni risposta riporta anche `observedCursor`, cioè il checkpoint
  del ledger letto sotto lo stesso lock dei record della pagina.
- Dopo tutte le pagine, il consumer deve recuperare `getChanges` dal checkpoint
  fissato fino a un checkpoint finale. Così le modifiche canoniche concorrenti
  correggono record aggiunti, cambiati o cancellati durante il paging.
- `coverage` dichiara totale, righe con versione canonica e completezza della
  singola raccolta. Le righe legacy sono restituite per consultazione ma
  rendono la raccolta esplicitamente incompleta, perché le loro mutazioni non
  sono ancora garantite dal feed.
- La risposta limita la pagina a 100 record e 64 KiB UTF-8. Cursori con scope
  errato, checkpoint futuro, raccolte sconosciute e limiti fuori contratto
  falliscono chiusi.

## Limiti

Il bootstrap ora riproduce il feed completo dal cursore 0 per ricostruire le
entità canoniche Files/Layouts; i valori più recenti già presenti nello
snapshot proteggono i record Entry dal replay storico, mentre layout e
contenuto sono applicati secondo la propria versione. Questo richiede che il
feed immutabile sia disponibile dall'origine: prima di qualsiasi compattazione
futura servirà un checkpoint iniziale esplicito e recuperabile. I corpi Entry
si recuperano con `getContentsBatch`; la scansione Docs legacy resta separata.
Le pagine Files/Layouts leggono ancora l'intera rispettiva tabella legacy e
verificano i proprietari per ID; non è una paginazione fisica della sorgente.
La suite sintetica verifica che non venga enumerato `readRows()` Entries,
oltre a feed storico, scope, byte e catch-up concorrente; non misura latenza e
contesa su Google. `capabilities.changes` e `localReadCache` restano false.

## Verifiche

Test sintetico `verify-snapshot-pages`: Files/Layouts senza enumerazione Entries,
lookup dei soli proprietari legacy, keyset, copertura legacy esplicita,
checkpoint iniziale/stato osservato, conteggio UTF-8 e catch-up concorrente.
`verify-sync-consumer` riproduce 50 commit dal cursore 0 e controlla il recupero
di Files canonici e layout, preservando un Entry snapshot più recente.
Verifiche: `npm run build`, test mirati, `npm test`, `npm run test:release`,
`npm run test:e2e` e `git diff --check` superati. Build staging di sei file;
nessun deploy o accesso a Google.
