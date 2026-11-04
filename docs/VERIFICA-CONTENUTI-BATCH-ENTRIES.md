# API batch dei contenuti canonici Entries

**Data:** 29 ottobre 2026. **Stato:** endpoint server pronto; nessun client lo
consuma ancora. Bootstrap e capability `changes` restano disabilitati.

## Contratto

`getContentsBatch({items:[{id,version,digest}]})` accetta al massimo 12 ID
distinti. Ogni puntatore deve coincidere con la versione e il digest attuali
dell'Entry canonica. L'endpoint legge tutti i contenuti sotto un solo lock,
verifica nuovamente il digest del payload DocContent e fallisce l'intera
richiesta se un puntatore è obsoleto o una versione è corrotta.

La risposta include contenuto, baseline e metadati di formattazione necessari
al consumer. Il payload JSON completo è limitato a 2 MiB UTF-8; `bytes`
riporta il conteggio verificato. ID duplicati, digest/versioni non validi e
richieste oltre il limite vengono rifiutati prima di una lettura parziale.

## Verifiche e limiti

Il test d'integrazione con archivio sintetico legge il corpo importato dal
registro, verifica il conteggio UTF-8, rifiuta puntatori obsoleti, ID duplicati
e lotti oltre 12. Build, test mirati Docs/Entries e gate completo `npm test`,
`test:release`, E2E Chromium e `git diff --check` superati.

Il client non chiama ancora l'endpoint. Manca il checkpoint/fotografia
coerente, la continuazione per record e byte e la riconciliazione tra bootstrap
e `getChanges`; non va pubblicata la capability ai client.
