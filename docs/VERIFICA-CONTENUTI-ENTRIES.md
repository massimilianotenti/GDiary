# Contenuti Docs canonici Entries — 29 ottobre 2026

## Implementato

Il salvataggio `saveNoteText` instrada le Entries canoniche tramite un puntatore
versionato e verificato verso `DocContent`. La versione del contenuto, i campi
scadenza/pianificazione e la versione metadata Entry vengono pubblicati nello
stesso commit recuperabile. Il payload Docs continua a contenere corpo,
formattazione e baseline necessarie al merge; i frammenti e la coda sono
preparati prima della pubblicazione e restano invisibili al lettore canonico
finché il puntatore non viene committato.

Lettura dettaglio e worker controllano versione e digest del contenuto prima di
usarlo. Un disallineamento blocca il percorso. `readOnly` nega il salvataggio
prima di scrivere frammenti o coda. Una ripetizione dopo risposta persa
restituisce il commit già pubblicato senza creare un’altra versione.

## Verifiche

- `npm run build` — superato; Demo, Index e staging dei sei file rigenerati,
  senza accesso Google.
- `test:entry-controller` — superato: salvataggio corpo, contenuto canonico,
  dettaglio, retry dopo ACK perso, reboot, readOnly senza staging e barriere
  sulle mutazioni non ancora instradate.
- `test:entry-migration` — superato: puntatore contenuto, digest/preimmagine
  DocContent congelata, retry e 363 recovery sintetici Sheet/Range.
- `test:task-deferred` — superato: regressioni di indice e apertura task
  differita.
- `npm test`, `npm run test:release`, `npm run test:e2e` — superati.
- `git diff --check` — superato.

Le verifiche usano Demo e archivi sintetici; non certificano lock, quote,
latenza o Docs nell’archivio Google reale. Il diario continuo `saveJournalPage`
resta bloccato per le Entries instradate; non sono ancora instradati allegati,
eliminazione e conversione progetto→tag. Non sono stati eseguiti provisioning,
deploy o accessi a dati reali. Il controller Entries resta readOnly per default.

## Prossimo incremento

Instradare il salvataggio del diario continuo, incluse modifiche multi-blocco,
corpi Docs, layout e pianificazioni, con snapshot/versioni, retry recuperabile,
conflitti e bozze conservate. Poi completare allegati, eliminazione,
conversione progetto→tag, browser Entry, lookup/feed e contratto di attivazione.
