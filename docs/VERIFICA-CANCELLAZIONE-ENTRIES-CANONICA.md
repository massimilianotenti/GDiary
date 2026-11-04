# Cancellazione canonica Entries

**Data:** 29 ottobre 2026. **Esito:** cancellazione delle Entries instradate
implementata e verificata localmente. Il controller Entries resta readOnly per
default; nessun provisioning, deploy o accesso ai dati Google reali.

## Comportamento

- `deleteNote` riconosce le Entries instradate e verifica `updatedAt` prima di
  modificare il documento. Le Entries non instradate continuano a usare il
  percorso legacy.
- Il gateway prepara un piano durevole, con operation ID stabile, che registra
  il tombstone Entry e l'eventuale tombstone dell'indice allegati. Il commit e
  il retry restituiscono un ACK stabile; un Entry già assente ha un esito
  separato.
- Per contenuti già consolidati in Docs, i marcatori della sola sezione Entry
  vengono verificati e rimossi; il file Docs originale resta intatto. Dopo il
  commit vengono ripulite le righe associate in TaskDocQueue, DocRefs e
  Previews. DocContent, le righe storiche e i riferimenti immutabili del ledger
  sono conservati.
- Le letture canoniche non restituiscono l'Entry tombstonata e il dettaglio UI
  la rimuove anche dopo reload. Gli allegati canonici non sono più esposti
  attraverso l'indice dell'Entry; i file Drive non vengono eliminati.

## Verifiche

- Build Vite, assemblaggio di `Index.html` e staging dei sei file Apps Script:
  superati, senza upload o deployment.
- `test:entry-controller`: superato, compresi tombstone, replay, readOnly,
  cleanup logico degli allegati, preimmagine legacy e reboot.
- `test:entry-browser`: superato su Chromium con cancellazione dalla UI,
  verifica dell'assenza dopo reload e conservazione della riga legacy.
- `test:entry-migration`: superato: 165 interruzioni durante la prenotazione e
  198 durante il commit tombstone, recuperate dopo riavvio.
- `npm test`, `npm run test:release`, `npm run test:e2e` e `git diff --check`:
  superati.

## Limiti

Il piano durevole permette di riprendere un commit interrotto, ma la rimozione
della sezione Docs precede il tombstone: se il commit non riesce, il retry deve
completare l'operazione. Le righe `Files` legacy e i payload storici restano
conservati. Il feed globale Files completo, la conversione progetto→tag e il
contratto di provisioning/abilitazione restano attività del pacchetto 8.
# Compatibilità operationId facoltativo — 30 ottobre

Il gateway accetta l'assenza della proprietà `operationId` e genera l'identificativo deterministico precedente; accetta anche un operationId valido fornito dal client e rifiuta chiavi sconosciute. Test controller verifica l'input omesso e il replay della ricevuta; test:entry-migration verifica 165 guasti alla preparazione e 198 al commit. Build, test:entry-controller e test:release superati. Nessun server Google collaudato.
