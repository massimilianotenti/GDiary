# Endpoint incrementale dei commit

**Data:** 29 ottobre 2026. **Stato:** API locale collegata al protocollo;
capacità client non ancora pubblicizzata. Nessun provisioning, deploy o dato
Google reale.

## Contratto

- `getSyncCheckpoint()` recupera sotto lock il ledger, poi restituisce il suo
  `highWater` e il cursore scoped corrispondente. Una scansione può fissare
  questo limite prima di leggere le pagine; i commit successivi restano oltre
  il checkpoint e vanno recuperati col feed.
- `getSyncManifest()` include `cursor` e `highWater` usando lo stesso
  checkpoint quando esiste un controller persistente. Senza ledger entrambi
  sono `null`; l'identità dell'archivio da sola non dichiara copertura.
- `getChanges({cursor, limit})` usa il primo controller di routing persistente
  disponibile per raggiungere il ledger condiviso. Non accetta scope scelti dal
  client: archive, epoch e principal del cursore sono confrontati con quelli
  verificati dal server.
- Il cursore avanza solo per commit completi, mantiene gli upsert e i tombstone
  atomici e non espone `principalId` nei record del feed.
- Il limite resta 1–5 commit per pagina e 128 KiB per risposta; il client usa
  `hasMore`, il cursore restituito e `highWater` per continuare.
- In assenza di un routing controller persistente l'API fallisce chiusa.
- `getSyncManifest().capabilities.changes` resta `false`: prima di pubblicare
  il feed ai client occorrono bootstrap/checkpoint coerenti e la matrice
  completa delle mutazioni. I test locali non attestano ancora tale uscita.

## Verifiche

- Build e preparazione sei file Apps Script: superate, senza upload.
- Test identità e controller Entries: senza routing il manifest non dichiara
  checkpoint; col ledger include un cursore scoped coerente. Il feed percorre
  pagine senza buchi fino al checkpoint e al commit Files canonico, rifiutando
  principal errato e limite fuori contratto.
- Kernel commit e store Sheets: superati, incluso isolamento cursori, commit
  interrotti, feed immutabile e 332 recovery store.
- La suite completa (`npm test`, `test:release`, `test:e2e`) e il diff-check
  sono superati.
