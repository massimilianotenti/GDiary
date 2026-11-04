# Gateway di migrazione Entries — 29 ottobre 2026

## Risultato

Aggiunti `syncEntrySheetSource_` e `syncEntryMigrationGateway_` in `Code.gs`.
Ogni route è identificato dall'hash di un ID Entry; non esiste un indice
globale con limite 128, dato che l'archivio può contenere molti più record.
La migrazione e l'assegnazione dei progetti usano lo stesso commit per i
metadati Entry e il route marker. Il piano durevole rende stabile il retry.

Le letture per ID e la scansione `readRows` sovrappongono il record canonico
alla riga legacy congelata. Digest/preimmagine, identità duplicata, versione e
schema sono controllati; una scrittura legacy divergente blocca la lettura
senza sovrascrivere i dati. L'adapter legge soltanto metadati; il corpo resta
fuori dal commit. L'assegnazione accetta progetti esistenti oppure riferimenti
legacy già presenti sulla stessa voce, come l'API precedente.

## Verifiche

`test:entry-migration` verifica migrazione e associazione atomiche, letture,
retry, progetti sconosciuti, divergenza, identità duplicata e 140 voci senza
indice limitato. Fault injection ha coperto 121 eventi Sheet/Range per la
migrazione e 121 per l'associazione, nelle tre fasi prima/dopo/parziale:
726 ripartenze in totale su nuova istanza V8. Disabilitazione dello store
verificata senza scritture.

## Limiti

Il gateway è testato su adattatori sintetici, ma non è ancora collegato a un
controller persistente o alle API web. `setEntryProjects` continua a fallire
chiuso quando Projects è attivo. Il primo `readRows` visita tutte le righe
Entries e interroga ogni route: la correttezza è verificata, la scalabilità
va migliorata con il feed/index incrementale prima dell'abilitazione generale.
Le altre mutazioni (testo/Docs, stato, tag, task plan, diario continuo,
importazione, allegati ed eliminazione) non sono ancora instradate. Nessun
provisioning, deploy o accesso a dati reali.
