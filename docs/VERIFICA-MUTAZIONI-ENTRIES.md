# Mutazioni metadata Entries — 29 ottobre 2026

## Implementato

Con il controller Entries in modalità `active`, le API `setEntryProjects`,
`setEntryTags`, `setTaskStatus` e la modifica della scadenza tramite
`updateEntry` scrivono snapshot metadata nel writer canonico. La risposta è un
delta metadata-only; corpo e sezione Docs non sono inclusi. Le versioni sono
CAS `commit-N`, con retry idempotente, conflict esplicito e overlay coerente
sulla riga legacy congelata.

Le scritture legacy non supportate falliscono chiuse anche se un vecchio
handler raggiunge l’implementazione interna dopo l’attivazione. Il worker di
sincronizzazione Docs controlla la route prima di aprire o modificare Docs.
`addFileLink`, pianificazione, corpo, diario continuo e cancellazione sono
state instradate in rapporti successivi. La conversione progetto→tag usa ora
un commit condiviso Projects/Entries; associazioni Entry→Projects ulteriori
restano protette finché non sono collegate al protocollo.

La guardia viene verificata sotto lock nelle mutazioni legacy, per coprire la
corsa tra il controllo iniziale dell’API e l’attivazione del controller.
L’operatore Apps Script non può attivare il dominio Entries per default; il
permesso usato dal test sintetico è esplicito e locale.

## Verifiche

- `npm run build` — superato; `Demo.html`, `Index.html` e i sei file Apps
  Script di staging rigenerati senza contattare Google.
- Test Entry controller — superato: associazioni, tag, stato e scadenza
  canonici; handler legacy simulati, corpo, programmazione, allegati,
  eliminazione e conversione protetti; preimmagine legacy immutata e reboot.
- Test Entry migration — superato: 140 ID, migrazione e associazione atomiche,
  divergenze/ID duplicati e 726 recovery Sheet/Range sintetici.
- `npm test` — superato.
- `npm run test:release` — superato.
- `npm run test:e2e` — superato con Chromium.
- `git diff --check` — superato.

Queste prove usano Demo e Sheets/Docs sintetici; non misurano quota, latenza,
capacità o comportamento nell’archivio Google reale. `readRows` effettua
ancora un controllo route per voce. Il routing Entries rimane readOnly per
default in produzione e non è stato eseguito alcun provisioning o deploy.

## Prossimo incremento

Instradare la pianificazione task e il relativo `TaskPlans` nello stesso
protocollo, mantenendo data pianificata, intervalli, importanza e versione
Entry coerenti dopo retry/reload. Seguiranno corpo/Docs, diario continuo,
allegati, eliminazione, conversione progetto→tag, lettori/feed e browser Entry.
