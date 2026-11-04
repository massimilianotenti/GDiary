# Creazione canonica Entries

**Data:** 29 ottobre 2026. **Stato:** creazione rapida e nota completa
instradate localmente nel ledger recuperabile. Nessun provisioning, deploy o
dato Google reale.

## Comportamento

- `addJournal` usa `saveJournalPage` quando il gateway Entries è presente;
  acquisizioni di oltre 12 voci sono suddivise in commit atomici mantenendo ID
  client deterministici e retry idempotenti.
- `addCompleteNote` invia nel medesimo percorso snapshot, corpo e formattazione
  rich text. Entrambe le API ripetono il controllo sotto lock nel percorso
  legacy per impedire scritture concorrenti dopo l'attivazione del routing.
- Senza writer canonico attivo resta disponibile il comportamento legacy;
  Entries non diventa attivo per default. Le righe legacy preesistenti non sono
  migrate né modificate da queste creazioni.

## Verifiche

- `npm run build`: superato; Demo/Index e staging Apps Script sono generati
  dalle sorgenti e contengono i sei file previsti.
- `npm run test:entry-create`: superato; 13 voci su due commit, identità e
  replay stabili, corpo/tag/formattazione, percorso readOnly senza scritture.
- `npm run test:entry-create-browser`: superato su Chromium; form della nota
  completa e cattura multi-bullet raggiungono le route canoniche, contenuto
  ricco conservato, voce legacy preesistente disponibile, nessun errore pagina.
- `npm test`, `npm run test:release`, `npm run test:e2e` e `git diff --check`:
  superati; la suite browser completa include anche il nuovo scenario Chromium.

## Limiti

L'endpoint `getChanges` non è ancora pubblicato ai client e l'attivazione
globale rimane readOnly: bootstrap coerente, lookup/feed scalabili e contratto
di provisioning fanno ancora parte del pacchetto 8.
