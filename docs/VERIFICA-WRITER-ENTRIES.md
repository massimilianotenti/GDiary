# Writer canonico dei metadati Entries — 29 ottobre 2026

## Risultato

Implementati `syncEntrySnapshot_`, `syncPlanEntryOperation_` e
`syncEntryWriter_` in `Code.gs`. Il record canonico mantiene ID, data, tipo,
titolo, progetti, scadenza, stato, creazione, request ID, scope, completamento
e tag. `updatedAt` è la versione del commit (`commit-N`); `body` non entra nello
snapshot perché testo ricco e sincronizzazione Docs sono conservati nel
sottosistema DocContent/Docs.

Il planner rifiuta schema/campi extra, date non reali, tipi/stati sconosciuti,
slug progetto non canonici, tag non normalizzati e payload fuori limite. Il
writer fornisce CAS, ricevute stabili, conflitti ripetibili, lettura verificata
e barriera contro la resurrezione di record tombstonati.

## Verifiche

`npm run build`, `npm test`, `npm run test:release` e `git diff --check`
superati il 29 ottobre 2026. Il test `test:canonical-entries`, incluso in
`npm test`, controlla snapshot/body, create/update/read, ACK dopo aggiornamenti,
conflitti, input invalido senza scritture, tombstone e corruzione. Iniezione di
guasti: 10 unità durevoli e 165 interruzioni Sheet/Range con ripartenza V8.

## Limiti e prossimo task

Questo è il writer dati, non il routing applicativo. `saveNoteText`, status,
tag, associazioni, delete, `saveJournalPage`, importazione e altri percorsi
continuano a usare Entries legacy. In modalità Projects attiva le associazioni
Entry→Projects e la conversione progetto→tag restano bloccate. Non migrare o
attivare Entries prima di avere gateway, lettori coerenti e copertura della
matrice delle mutazioni: il corpo Docs e le bozze devono restare sincronizzati
con i metadati. Nessun provisioning, deploy o dato reale è stato usato.

Prossimo incremento: gateway di migrazione Entries e percorso canonico per
le associazioni, con preimmagine congelata, commit atomico e letture overlay;
solo dopo integrare le altre scritture Entry e la conversione in batch fino al
limite di 25 cambi del protocollo.
