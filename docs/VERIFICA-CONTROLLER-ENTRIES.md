# Controller e API delle associazioni Entries — 29 ottobre 2026

## Risultato

Aggiunto il binding persistente Entries su `Entries/index/blocks`, con lo stesso
archivio e ledger del controller Projects. Le registrazioni verificano ID,
nome e parent dei fogli; lo stato iniziale è sempre `readOnly`. La mutazione
`setEntryProjects` usa il gateway canonico quando il binding esiste e restituisce
un delta metadata-only che conserva il dettaglio già caricato nel client.

Il passaggio a `active` richiede `allowEntryActivation` esplicito, distinto dal
permesso di configurazione/migrazione. Il server Apps Script non lo concede per
default: le altre mutazioni Entry non sono ancora instradate e non devono
modificare le preimmagini congelate. In prova sintetica il permesso dedicato
verifica l'associazione applicativa attraverso il controller e il read overlay.

## Verifiche

Il test `test:entry-controller` usa Demo e un ledger sintetico: binding, stato
readOnly, rifiuto dell'attivazione senza permesso, lettura Projects canonica,
associazione API, ACK `commit-N`, riga legacy congelata e reboot persistente.
Il test `test:entry-migration` resta responsabile dei 726 fault recovery e dei
vincoli di preimmagine/overlay. Build, `npm test`, `test:release`, `test:e2e`
e `git diff --check` superati il 29 ottobre; E2E Chromium completo, inclusi
i browser Projects e dei controller precedenti. Build locale prepara i sei
file Apps Script, senza upload.

## Limiti e seguito

Il permesso di attivazione è solo un interruttore tecnico per test controllati;
non è una dichiarazione di copertura del dominio. Prima di qualunque attivazione
reale occorre instradare o bloccare in modo coerente testo/Docs, status, tag,
pianificazione, diario continuo, importazione, allegati ed eliminazioni, quindi
verificare browser, bozze, conflitti e body. Nessun deploy, provisioning o dato
reale è stato usato.
