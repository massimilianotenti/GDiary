# Coerenza locale HabitLogs e cataloghi verificati — 6 novembre 2026

## Scopo e stato

Seguito locale SPEC-004 dalla base `2ee5db3`, limitato alla lettura e scrittura
HabitLogs. Goals/Habits restano cataloghi remoti in sola lettura: nessuna loro
mutazione è stata aggiunta all'outbox. Questa tranche è **parziale** e non
completa il pacchetto 11 né abilita offline completo.

## Contratto locale

Il server rimane autorità su ciclo, calendario, frequenza, archivio, versioni,
checklist storiche e conflitti. La copia locale può consentire una nuova
registrazione soltanto se il feed locale ha completato la scansione comune e
dei documenti. Nella stessa transazione del checkpoint registra in
`archiveMeta.coverage.habitCatalogProof` cursore e inventari ordinati ID/versione
Goals e Habits; i cataloghi effettivi restano nei record normalizzati
`commonRecords`.

Un delta/tombstone di Goal o Habit invalida la prova. Un avanzamento feed privo
di mutazioni catalogo aggiorna il cursore attestato. ACK di HabitLogs e
checkpoint generali di vista non cambiano i cataloghi e non cancellano questa
prova. La lettura Basis controlla esistenza e versione di Habit/Goal, record
HabitLog e cursore; la scrittura outbox verifica nuovamente atomica prova,
cursore, identità e versioni. La UI controlla piano, ciclo, data di inizio,
archivio e baseline. Una risposta incompleta o un catalogo che cambia lascia
l'intenzione visibile come non salvata e richiede riallineamento; non ricostruisce
checklist né rimappa microazioni.

Le bozze di sessione rimangono distinte dalla copia durevole. La conferma locale
arriva solo dopo la transazione IndexedDB. Un ACK aggiorna anche la revisione
DOM montata; un CAS scaduto conserva l'intenzione e richiede retry/riallineamento.

## Verifiche eseguite

- `npm run build`: superato; rigenerati `Index.html` e `Demo.html`; staging dei
  sei file Apps Script verificato. Nessun upload.
- `node tests/verify-habit-log-outbox-repository.cjs`: superato con Chromium e
  IndexedDB reale; atomicità/rollback, inventario catalogo, invalidazione al
  delta, rifiuto della versione precedente, CAS, dipendenze, ACK/conflitti,
  isolamento e revoca.
- `node tests/verify-habit-log-outbox-browser.cjs`: superato con Chromium,
  IndexedDB reale e backend sintetico. Copre riavvio, percorsi Abitudini,
  giorno e diario, editor/focus, errore storage/retry, rete/ACK tardivo,
  conflitti, tab concorrenti, readOnly/revoca, catalogo incompleto/archiviato,
  riallineamento sintetico e confini periodo esercitati dalla suite.
- `node tests/verify-habit-log-outbox-server.cjs`: superato, 726 interruzioni e
  contratti writer.
- `npm run test:repository`: superato; include regressioni repository Days,
  Weeks e HabitLogs.
- `npm run test:release`: superato.
- `npm test`: superato con exit 0 sul risultato integrato, incluse regressioni
  Days/Weeks, sync consumer, migrazioni/writer e tutte le tre prove outbox.
- `git diff --check`: superato.

Una prima esecuzione di `test:repository` ha evidenziato una risoluzione locale
che ora richiede il guard di catalogo: aggiornata la fixture al contratto. La
prima esecuzione browser ha trovato il caso archivio nella vista montata; il
controllo UI ora rifiuta anche uno stato già marcato archiviato. Le prove finali
sopra sono state rieseguite dopo entrambe le correzioni.

## Limiti e lavoro residuo

1. Collegare al flusso utente il riallineamento esplicito del catalogo dopo un
   delta scoperto online; finché la copia non riceve un feed completo aggiornato,
   l'outbox locale deve restare bloccata.
2. Ampliare le prove mirate di microazioni riordinate, date trimestrali e
   navigazione dei periodi; non tutte le combinazioni hanno una prova isolata.
3. Restano separati tutti i gate Google di attivazione/recovery e la prova con
   archivio reale; nessun accesso Google, deploy o dato reale è stato usato.
