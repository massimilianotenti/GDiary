# Conversione canonica progetto→tag

**Data:** 29 ottobre 2026. **Esito:** conversione locale Projects/Entries
implementata con commit recuperabile. Nessun deploy, provisioning o accesso ai
dati Google reali; l'attivazione Entries resta readOnly per default.

## Contratto

- L'anteprima firma il progetto corrente, le Entries associate e gli eventuali
  Goals che lo usano. La conversione rifiuta firme obsolete e progetti ancora
  collegati a Goals, anche leggendo l'overlay canonico quando Catalog è attivo.
- Richiede routing Projects ed Entries entrambi registrati e attivi. Il piano
  modifica gli snapshot canonici Entry (rimozione dello slug, aggiunta tag e
  aggiornamento scope) e tombstona il Project nello stesso commit recuperabile.
- Gli Entry legacy entrano nello stesso commit con snapshot e route marker;
  le preimmagini Sheets restano congelate. Se il Project è ancora legacy, viene
  prima migrato senza cambiare i valori visibili, poi il commit di conversione
  atomico pubblica Entries e tombstone.
- Il retry conserva operation ID e risposta. Un'interruzione durante la sola
  preparazione Project può essere ripetuta prima di prenotare la conversione.
  `tagCatalog_` legge l'overlay canonico, così il nuovo tag è disponibile dopo
  reload.

## Capacità e limiti

Il commit ledger accetta al massimo 25 cambi e 32 KiB per richiesta. La
conversione rifiuta il commit oltre questi limiti senza applicare modifiche
parziali alle Entries. Ogni Entry già instradata usa un cambio; ogni Entry
legacy usa anche un route marker; il tombstone Project occupa un cambio. Il
numero effettivo convertibile dipende quindi da quante Entries sono già
instradate. La migrazione preparatoria di un Project legacy può essere
pubblicata anche se il commit successivo supera la capacità: mantiene gli
stessi valori applicativi e lascia le righe originali congelate.

Il feed completo e le ottimizzazioni dei lookup Entries sono ancora aperti.
La conversione resta limitata alla capacità di un singolo commit, non è
paginata. Nessuna cartella, documento o file Drive viene eliminato.

## Verifiche

- Build: superata; `Demo.html`, `Index.html` e staging dei sei file Apps Script
  rigenerati senza contattare Google.
- Controller Projects: conversione di Project già instradato e Project legacy,
  Entry legacy, overlay, tombstone, retry, reboot e preimmagini congelate.
- Browser Chromium: conferma dalla UI, conversione e rilettura coerente dopo
  reload, senza errori JavaScript.
- Fault injection: **792** interruzioni prima/dopo/parziali Sheet/Range tra
  preparazione e commit conversione, tutte recuperate con ACK stabile.
- `npm run test:legacy-deltas`, `npm test`, `npm run test:release`,
  `npm run test:e2e` e `git diff --check`: superati.
