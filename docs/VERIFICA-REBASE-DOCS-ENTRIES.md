# Risoluzione canonica dei conflitti Docs Entries

**Data:** 29 ottobre 2026. **Stato:** rebase delle Entries instradate
recuperabile; le scritture esterne Docs restano fuori da una transazione ACID.
Nessun deploy o dato Google reale.

## Contratto

- La conferma del rebase verifica route, versione Entry, riferimento, revision
  Docs, titolo e formattazione supportata sotto lock.
- Conserva il corpo app pendente e registra corpo/rich/titolo/revisione Docs in
  `conflictBackup`; la versione rebase aggiorna baseline e puntatore DocContent
  nello stesso commit Entries, quindi riaccoda il corpo app per il worker.
- Versione e operazione sono deterministiche rispetto alla baseline e alla
  revisione osservata. Il retry con la versione d'origine restituisce la
  ricevuta già impegnata; non crea un secondo commit.
- Titoli modificati, formattazione avanzata, sezioni troppo lunghe o marcatori
  riservati fermano il rebase senza perdere la bozza.
- Il percorso legacy mantiene il comportamento precedente. Per le Entries
  instradate, il worker committa `pending` nel descriptor prima di aprire Docs
  e `done` soltanto dopo `saveAndClose`; i retry non fanno regredire `done`.
  La riga della coda usata dalla UI resta nel foglio legacy; se il salvataggio
  Docs riesce ma il commit `done` fallisce, il feed conserva `pending` e il retry
  riconcilia il contenuto prima di confermare.

## Verifiche

Test d'integrazione sintetico: conflitto Docs durante una bozza, backup,
baseline, commit canonico, retry senza doppio commit, scrittura del corpo e
stato `done` non regressivo nel feed. Build, `npm test`, `test:release`, E2E
Chromium e `git diff --check`: superati.
