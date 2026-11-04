# Migrazione Docs con routing canonico Entries

**Data:** 29 ottobre 2026. **Stato:** `migrateDocsBatch` limitato alle Entries
legacy. Nessun provisioning, deploy o dato Google reale.

## Contratto

- Ogni lotto controlla le route Entries mentre mantiene il lock applicativo.
- Le Entries routed vengono saltate: la loro preimmagine Sheets non può
  generare sezioni o riferimenti Docs legacy. Il cursore di migrazione avanza
  comunque, mentre le Entries non routed continuano a seguire il percorso
  storico.
- La risposta riporta `migrated` e `skippedRouted`, oltre a `processed` e
  `remaining`. Nessun campo del record Entry viene modificato.
- L'import delle modifiche dirette fatte dagli utenti in Docs resta nel
  percorso di riconciliazione del pacchetto 9; questa guardia non le importa nel
  ledger.

## Verifiche

- `npm run build`: superato; Demo/Index e sei file Apps Script staging
  rigenerati senza upload.
- Controller Entries: test sintetico verifica che il migratore salti ogni
  route, continui con le Entry legacy del lotto, non modifichi le righe Entries
  e non crei riferimenti Docs per le Entry canoniche.
- `npm test`, `npm run test:release`, `npm run test:e2e` con Chromium e
  `git diff --check`: superati.
