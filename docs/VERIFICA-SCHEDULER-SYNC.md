# Scheduler del consumer snapshot/feed

Il consumer espone `startAutoSync({intervalMs,onResult})`. Con identità valida e
opt-in attivo esegue subito un bootstrap se il repository non ha un cursore
scoped, altrimenti sincronizza il feed; ripete poi l'operazione all'intervallo
configurato. Intervalli ammessi: 1.000–3.600.000 ms. I tick di una stessa
istanza non si sovrappongono. `stop()` ferma i tick successivi. Gli errori
sono consegnati a `onResult` come risultati sicuri, senza interrompere il
timer.

La verifica Chromium `tests/verify-sync-consumer.cjs` controlla intervallo
non valido, catch-up immediato, cursore finale e arresto dello scheduler. Il
consumer continua a rifiutare l'avvio senza opt-in e identità verificata; il
bootstrap verifica inoltre capability e manifest prima di leggere snapshot o
feed.

## Limiti

- La UI non crea né avvia ancora lo scheduler.
- Le capability `changes` e `localReadCache` restano disabilitate.
- Questo test usa un backend sintetico; non dimostra tempi o persistenza
  nell'iframe Apps Script.
- Il callback è facoltativo e gli errori callback vengono ignorati per non
  bloccare le sincronizzazioni successive.

Verifiche eseguite: `npm run build`, `npm run test:sync-consumer`, `npm test`,
`npm run test:release`, `npm run test:e2e` e `git diff --check`.
