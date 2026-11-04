# Allegati canonici Entries

**Data:** 29 ottobre 2026. **Esito:** collegamento e lettura per dettaglio
implementati localmente. Entries resta readOnly per default; nessun provisioning,
deploy o accesso a dati Google reali è stato eseguito.

## Comportamento

- `addFileLink` rileva le Entries instradate e registra il riferimento al file
  Drive nella collezione `files` del commit ledger, aggiornando nello stesso
  commit l'indice dei riferimenti per Entry.
- Gli ID e l'operationId sono deterministici per Entry e file Drive. Un invio
  duplicato/retry restituisce il riferimento già committato senza creare una
  seconda voce.
- Le righe legacy Files non vengono modificate. I link Drive non sono copiati,
  spostati o eliminati.
- `getEntryDetail` sovrappone i riferimenti legacy e canonici; la vista dettaglio
  mostra anche gli allegati dopo un reload. Il delta di scrittura aggiorna la
  collezione Files già caricata nella sessione.
- In `readOnly` il controller rifiuta la mutazione prima del commit.

## Verifiche

- Build Vite/assemblaggio e preparazione dei sei file Apps Script: superati,
  senza upload/deploy.
- `npm test`: superato; test di gateway e controller Entries inclusi.
- Gateway: 363 interruzioni prima/dopo/parziali Sheet/Range riprese dopo reboot,
  con stesso ID/versione e una sola associazione.
- Browser Chromium: aggiunta dal dettaglio di un Entry canonico, overlay e
  rilettura del link dopo reload; nessun errore JS.
- `npm run test:release`, `npm run test:e2e`, `git diff --check`: superati.

## Limiti

La vista globale «File collegati» carica ora anche i riferimenti canonici dopo
una nuova sessione; [verifica dedicata](VERIFICA-FEED-GLOBALE-FILES-ENTRIES.md).
Il feed incrementale complessivo del protocollo resta da sviluppare. Il
protocollo limita a 128 i riferimenti canonici indicizzati per Entry. Le righe
legacy preesistenti restano visibili senza migrazione. Eliminazione Entry e
pulizia coerente dei riferimenti/contenuti e conversione progetto→tag sono
descritte nei rapporti canonici dedicati; resta aperto il feed globale.
