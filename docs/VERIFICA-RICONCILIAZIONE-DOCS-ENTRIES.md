# Riconciliazione esplicita Docs → Entries canoniche

**Data:** 29 ottobre 2026. **Stato:** import limitato al comando esplicito di
aggiornamento anteprime; bootstrap, scansione in background e riconciliazione
dell'intero archivio restano aperti. Nessun deploy o dato Google reale.

## Comportamento

- `refreshNotePreviews` controlla le Entries instradate selezionate, fino a 12
  per chiamata, e legge sezione, formattazione supportata e titolo Docs sotto il
  lock esistente. Verifica anche che revisione Drive e appartenenza al root non
  cambino durante la lettura.
- Se il corpo, la formattazione supportata o il titolo sezione differiscono
  dalla baseline, importa i dati tramite `importContent` oppure
  `importContentAndTitle`: testo Entry e puntatore DocContent avanzano nello
  stesso commit quando cambia il titolo. Il contenuto viene salvato senza
  accodare una riscrittura dello stesso Docs.
- La nuova versione importata diventa la baseline per i successivi conflitti.
  Il retry dello stesso import è idempotente.
- Titoli malformati, formattazione non supportata o revisioni cambiate durante
  la lettura vengono segnalati senza importare testo parziale.
- Se una scrittura dell'app è in coda, Docs invariato rispetto alla baseline
  lascia intatta la coda; una modifica Docs concorrente viene segnalata e la
  bozza dell'app resta canonica.
- Le Entries legacy mantengono la precedente generazione di anteprime. Questo
  incremento non pubblica la capability `changes` ai client.

## Limiti

Il comando continua a selezionare al massimo le prime 12 voci passate dalla
vista corrente. Non esegue scansione pianificata e non offre un risolutore UI
per i conflitti. Il recupero
server dei corpi è descritto in [API batch contenuti](VERIFICA-CONTENUTI-BATCH-ENTRIES.md),
ma client e fotografia coerente iniziale non sono ancora collegati. Perciò non
chiude il pacchetto 9 né il feed completo del pacchetto 8.

## Verifiche

- Build: superata; `Demo.html` e `Index.html` rigenerate, sei file Apps Script
  staging preparati senza upload.
- Test mirato del piano e test d'integrazione con Docs simulati: superati; coprono
  import corpo/titolo atomico, baseline, replay idempotente, assenza di
  write-back, aggiornamenti successivi, conflitti con bozza app e rifiuto di
  titolo malformato/formattazione non supportata.
- Test gateway/controller Entries: superati, incluse 363 prove di recupero del
  gateway e le guardie delle route.
- Gate completo `npm test`, `npm run test:release`, `npm run test:e2e` con
  Chromium e `git diff --check`: superati.
