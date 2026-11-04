# Pianificazione task Entries — 29 ottobre 2026

## Implementato

`planTask` usa il gateway canonico quando il controller Entries è attivo.
Data pianificata, intervallo di lavoro e importanza vengono salvati insieme
alla nuova versione del task e al route marker, in un singolo commit
recuperabile. Il primo routing importa anche la pianificazione esistente da
`TaskPlans`; il digest della riga legacy resta nel route marker e qualsiasi
divergenza successiva blocca la lettura.

Il feed comune `taskPlans` sovrappone le pianificazioni canoniche alle righe
legacy. Le risposte del task e le letture del gateway espongono gli stessi
campi dopo aggiornamento e riavvio. Le scritture legacy su `TaskPlans`
falliscono chiuse per ID già instradati; il foglio resta preimmagine congelata.
I task non instradati continuano a usare il percorso legacy.

## Verifiche

- `npm run build` — superato; Demo, Index e staging dei sei file rigenerati.
- `test:entry-controller` — superato: importazione di intervallo/importanza,
  `planTask` canonico, feed comune, riga legacy immutata, guardia writer legacy
  e reboot.
- `test:entry-migration` — superato: migrazione, associazione e pianificazione
  recuperate dopo 363 interruzioni Sheet/Range ciascuna (1.089 casi), più
  divergenza della preimmagine TaskPlans e archivio oltre 128 ID.
- `npm test` — superato.
- `npm run test:release` — superato.
- `npm run test:e2e` — superato con Chromium.
- `git diff --check` — superato.

Le prove sono locali e sintetiche. `readRows` e il feed `taskPlans` controllano
la route per ogni Entry; il costo va ridotto con l’indice/feed completo prima
dell’abilitazione generale. In produzione il controller Entries resta
`readOnly` per default. Nessun provisioning, deploy o dato Google reale.

## Prossimo incremento

Instradare il corpo Docs e il diario continuo con versionamento e commit
recuperabili coerenti, mantenendo bozze, formattazione, retry e protezione dai
conflitti. Poi restano allegati, eliminazione, conversione progetto→tag,
browser Entry, lookup/feed e contratto di attivazione.
