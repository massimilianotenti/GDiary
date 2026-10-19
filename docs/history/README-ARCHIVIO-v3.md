# Versione attuale P89

Da P88 aggiornare Index.html e Changelog.html. Vedi AGGIORNAMENTO-P89.md.

# Versione attuale P88

Da P87 aggiornare Index.html e Changelog.html. Vedi AGGIORNAMENTO-P88.md.

# Versione attuale P87

Da P86 aggiornare JournalEditor.gs, Index.html e Changelog.html. Vedi AGGIORNAMENTO-P87.md.

# Versione attuale P86

Da P85 aggiornare Index.html e Changelog.html. Vedi AGGIORNAMENTO-P86.md.

# Versione attuale P85

Da P84 aggiornare Index.html e Changelog.html. Vedi AGGIORNAMENTO-P85.md.

# Versione attuale P84

Da P83 aggiornare Index.html e Changelog.html. Vedi AGGIORNAMENTO-P84.md.

# Versione attuale P83

Da P82 aggiornare Index.html e Changelog.html. Vedi AGGIORNAMENTO-P83.md.

# Versione attuale P82

Da P81 aggiornare JournalEditor.gs, Index.html e Changelog.html. Vedi AGGIORNAMENTO-P82.md.

# Versione attuale P81

Da P80 aggiornare Index.html e Changelog.html. Vedi AGGIORNAMENTO-P81.md.

# Versione attuale P80

Da P79 aggiornare Index.html e Changelog.html. Vedi AGGIORNAMENTO-P80.md.

# Versione attuale P79

Da P77/P78 aggiornare Index.html e Changelog.html. Vedi AGGIORNAMENTO-P79.md.

# Versione attuale P77

Da P76 aggiornare solo Index.html e Changelog.html. Vedi AGGIORNAMENTO-P77.md.

# Versione attuale P76 — GDiary

Aggiornamento: Code.gs, Index.html e Changelog.html da P74. Vedi AGGIORNAMENTO-P76.md.

# Bullet Journal P73 — diario Vue su Google Drive

P61 estende il tema alle altre viste e ai pannelli (frontend/app-theme.css). P60.1 cambia il bootstrap del bundle Vue per il caricamento nel pannello Google; vedere AGGIORNAMENTO-P60.1.md. Tema P60 in frontend/pleasant.css: pagina calda, date riconoscibili, icone lineari e stato delle modifiche reattivo. Il diario continuo è composto con Vue 3.5.44 e compilato con Vite 8.3.4. Sheets, Google Docs e Google Apps Script restano il backend; non serve un server Node in produzione. L'editor rich text e il contratto di salvataggio esistenti sono isolati in un adattatore DOM, per una migrazione progressiva.

## Uso del pacchetto senza strumenti di sviluppo

Index.html è già compilato. Da P62 aggiornare Index.html e Changelog.html e creare una nuova versione del deployment esistente. Da P61 applicare anche DriveDocs.gs e JournalEditor.gs della P62. Conservare il ROOT_FOLDER_ID personale. Code.gs e appsscript.json sono invariati. Leggere AGGIORNAMENTO-P62.md. Conservare il proprio ID cartella e gli eventuali cambiamenti fatti nell'editor Google. Non eseguire setupDrive né ricreare i trigger.

Demo.html permette di provare l'interfaccia con dati simulati; non è una prova di funzionamento del servizio Google reale. Non si pubblica su Apps Script.

## Sviluppo

Con Node 24 e npm, dalla cartella del progetto:

```text
npm ci
npm run build
npm test
npm run test:e2e
```

I test browser usano Chrome già installato su Windows. In altri ambienti installare il browser di Playwright (`npx playwright install chromium`) oppure impostare CHROME_PATH. I test aprono la Demo locale e non scrivono nell'archivio reale.

Modificare frontend/components, frontend/main.js, frontend/diary.css e frontend/shell.html. Quest'ultimo contiene l'interfaccia e gli adattatori delle viste precedenti. Index.html e Demo.html sono generati: non modificarli direttamente, altrimenti la build successiva sostituirà le modifiche.

La compilazione incorpora Vue, JavaScript e CSS in Index.html. Il modulo frontend pesa circa 67 kB prima della compressione, oltre agli stili. Nessun caricamento esterno di Vue è richiesto. I font preesistenti hanno fallback di sistema.

## Pubblicazione con clasp

Seguire DEPLOY-AUTOMATICO.md. Clasp 3.4.1 è incluso nelle dipendenze di sviluppo. La pubblicazione non è attiva: Script ID, deployment esistente e autenticazione personale devono essere configurati una volta. Il comando `npm run deploy` effettua test, compilazione, push, creazione versione e aggiornamento dello stesso deployment.

Si pubblicano soltanto sei file: Code.gs, DriveDocs.gs, JournalEditor.gs, Index.html, Changelog.html e appsscript.json. Componenti, node_modules, test, Demo e credenziali non entrano nel progetto Google.

## Confini della migrazione Vue

L'ingresso resta dalla giornata e non richiede un progetto. Note e task mantengono identità, titoli, descrizioni e scadenze separati. Il salvataggio resta esplicito; Docs vengono consolidati tramite la coda. I task all'interno delle note e un editor a blocchi completamente nuovo sono passaggi successivi, descritti in PIANO-EDITOR-AGENDA.md.

Test locali completati. Deployment e prova autenticata sul cloud restano da eseguire.

P73: diario continuo unico con abitudini espandibili, riporto checklist e menu desktop fermo. Leggere AGGIORNAMENTO-P73.md.
