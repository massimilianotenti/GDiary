# Lookup Entries a batch nel commit store

**Data:** 29 ottobre 2026. **Stato:** cache d'indice temporanea per lock,
verificata con store Sheets sintetico. Nessun provisioning, deploy o accesso a
dati Google reali.

## Comportamento

- Le prime otto chiavi distinte in una colonna usano ancora `TextFinder`, così
  le letture mirate non scaricano l'indice. Dal nono lookup il lock costruisce
  una mappa in memoria leggendo solo la colonna delle chiavi in blocchi da
  massimo 4.096 righe; i lookup successivi riusano la mappa.
- Gli append aggiornano la mappa e i risultati già cercati durante lo stesso
  lock. La compattazione invalida la colonna modificata. La cache viene
  eliminata all'uscita dal lock, quindi non sopravvive a reboot o richieste.
- Non viene creato un catalogo persistente né un limite globale alle route
  Entries; checksum, riferimenti pubblicati e validazione dei payload restano
  invariati.

## Verifiche

- `npm run build`: superato; Demo/Index e i sei file Apps Script staging
  rigenerati senza upload.
- `npm run test:commit-storage`: superato. Con 50.000 chiavi estranee e 64
  route richieste nello stesso lock, il test osserva 8 ricerche mirate iniziali
  e 13 letture di colonna (massimo 4.096 righe ciascuna), invece di 64 ricerche
  complete. Una lettura singola continua a usare la ricerca mirata e mantiene
  i limiti di lettura esistenti.
- Migrazione Entries: superati tutti i 363 casi per ciascuna delle prove
  migration, associazione, pianificazione, contenuto e allegati, oltre ai casi
  batch pagina e cancellazione. Controller Entries superato.
- `npm test`, `npm run test:release`, `npm run test:e2e` con Chromium e
  `git diff --check`: superati.

## Limiti

Le letture batch grandi fanno una scansione lineare della sola colonna chiavi
del registro, con memoria temporanea proporzionale alle righe dell'indice. Il
test è sintetico e non misura latenza o quote reali Apps Script. Il feed
incrementale completo e il bootstrap coerente restano attività separate; la
capability `changes` non viene abilitata.
