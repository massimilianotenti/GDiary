# Direzione del prodotto — diario, progetti e azioni

Analisi del 14 ottobre 2026. Questo documento distingue la proposta architetturale dalle funzioni consegnate in P55 e P57. Non comporta migrazioni dei dati reali o pubblicazioni.

## Una pagina in cui iniziare subito

La schermata principale dovrebbe partire da Oggi: testo già pronto da compilare, senza richiesta di titolo o progetto. I giorni precedenti restano nello stesso flusso, caricati progressivamente. Il progetto è un collegamento facoltativo che si può aggiungere dopo, anche a più progetti. Il titolo della nota può essere ricavato dalla prima riga; un titolo esplicito rimane possibile.

È la parte utile del modello Daily Notes di NotePlan: il giorno funge da luogo di cattura e da inbox. NotePlan documenta una nota per ogni giorno e l'inserimento di pensieri, appuntamenti e task nello stesso contesto. La sua archiviazione è locale in file di testo Markdown con sincronizzazione cloud; la nostra app Apps Script resta invece una web app dipendente dai servizi Google, con bozze locali nella scheda. Le due architetture non offrono le stesse garanzie offline. Fonti: [Daily Notes](https://help.noteplan.co/article/43-part-1-daily-notes), [archiviazione NotePlan](https://help.noteplan.co/article/31-where-are-my-notes-saved).

L'interazione proposta è esplicita ma leggera: scrivere un paragrafo continua la nota; scegliere Task o una scorciatoia crea un task riconoscibile. Incollare testo multilinea non deve generare automaticamente una sequenza di voci. Un futuro comando per trasformare una riga selezionata in task conserverà il collegamento alla nota di origine; un interprete indiscriminato del testo rischierebbe di classificare comandi Git o esempi come attività.

P55 permette già di scrivere e modificare note e task direttamente nel diario mensile, con titolo nota facoltativo, scorciatoie e proprietà sul blocco. L'apertura automatica su Oggi con un'area vuota sempre pronta, la conversione di righe e i task interni alle note sono passi successivi.

## Ordine visivo e viste trasversali

Da Agenda prendiamo cronologia leggibile, tipografia sobria, note richiudibili e proprietà secondarie poco invasive. Non occorre copiarne tutta l'interfaccia. Agenda documenta note organizzate nei progetti, date, checklist, compressione e ordinamento; documenta anche esportazioni in formati standard. La rigidità percepita è una valutazione d'uso, non prova dell'impossibilità di esportare i contenuti. [Fonte Agenda](https://agenda.com/it/).

Il modello dati deve conservare una sola identità per nota e task. Diario, progetto, ricerca e task aperti sono viste della stessa voce. Collegare un task a un progetto non ne crea una copia e spostare il giorno pianificato non cambia la data in cui lo si è annotato.

Proposta per le date:

- Data di annotazione: collocazione storica nel diario continuo, una sola occorrenza.
- Giorno pianificato: comparsa nel lavoro previsto per quel giorno.
- Periodo di lavorazione: visibilità nelle viste operative durante quel periodo.
- Deadline: termine indipendente, usato nei riepiloghi delle scadenze e degli scaduti.

Un task con sola deadline compare nel diario alla data di annotazione e nel riepilogo scadenze alla deadline. Non va moltiplicato in ogni giorno futuro. Un task senza date operative resta nei Task aperti, da pianificare durante la revisione. Una futura vista Oggi potrà raggruppare separatamente Pianificati, In lavorazione e Scaduti, evitando di confondere il passato con ciò che si decide di fare oggi.

P57 unifica la consultazione e la scrittura del diario: note senza schede ripetute, task compatti con descrizione espandibile e comandi nel menu. La Vista elenco non è più una modalità ordinaria concorrente; resta come recupero in caso di errore.

P55 aggiunge una pagina modificabile del progetto, filtrata sulle medesime voci del mese. Il documento fisico resta nella collocazione esistente: collegamenti successivi ad altri progetti non muovono automaticamente sezioni Docs. Checklist interne, riordino con trascinamento e collegamento a Google Calendar non sono implementati.

## Drive leggibile e archivio portabile

Per ora conviene conservare i Docs mensili personali e i Docs di progetto già gestiti. Creare un Doc nuovo per ogni singola voce reintrodurrebbe il costo che stiamo eliminando. In prospettiva, i documenti di progetto molto grandi potranno essere suddivisi per anno, con un indice, sulla base di misure reali.

L'evoluzione proposta separa tre responsabilità:

| Livello | Responsabilità |
| --- | --- |
| Interfaccia | Modifica blocchi in memoria, conserva una bozza locale e invia solo quelli cambiati quando si salva. |
| Archivio strutturato | Identificativi, relazioni, date, stato e contenuto/versioni; risposta di salvataggio solo dopo la persistenza. |
| Documenti e copie leggibili | Il worker raggruppa per documento e aggiorna Docs; esportazione Markdown e backup JSON documentato rendono l'archivio portabile. |

P55 usa Entries, TaskPlans, DocContent e JournalLayout su Sheets; TaskDocQueue contiene i lavori di replica verso Docs. Il nome storico della coda non implica che gestisca soltanto task. Una voce può avere un solo record di coda anche se modificata più volte: il worker consolida la versione più recente. I metadati senza contenuto da replicare non hanno motivo di essere accodati.

La scelta futura consigliata è un archivio strutturato autorevole con Docs come rappresentazione leggibile. Le modifiche fatte direttamente in Docs dovranno essere importate e riconciliate esplicitamente. Oggi la compatibilità è ancora ibrida: la pagina rilegge i Docs già sincronizzati, usa DocContent per le voci pendenti e il worker verifica la base prima di sovrascrivere. Non è una sincronizzazione bidirezionale completa né atomica.

Una possibile struttura di esportazione, aggiuntiva all'archivio corrente:

```text
Bullet Journal/
  Diario/2026/2026-10 — Diario              # Docs corrente
  Progetti/miniconf/miniconf — Note         # Docs corrente
  Esportazioni/
    Markdown/Diario/2026/10/2026-10-14.md
    Markdown/Progetti/miniconf/index.md
    Backup/2026-10-14/manifest.json
    Backup/2026-10-14/entries.json
    Backup/2026-10-14/content.json
    Backup/2026-10-14/goals-habits-reviews.json
```

Markdown serve alla lettura e al riuso del testo; JSON conserva anche identificativi, collegamenti, stati, date e descrizioni. Il backup deve includere riflessioni e abitudini, che non sono tutte nei Docs. Una prova di esportazione e reimportazione con confronto delle relazioni sarà il criterio di portabilità, non la sola disponibilità di un PDF. Gli indici dei progetti rimanderanno alle voci originali invece di duplicare task indipendenti.

Google documenta l'esportazione Docs in Markdown, testo, HTML e altri formati via Drive API. Questo non equivale a esportare automaticamente tutta la semantica dell'app: l'export JSON e l'importatore devono essere sviluppati. [Formati Google Drive](https://developers.google.com/workspace/drive/api/guides/ref-export-formats).

## Identità Bullet Journal

Le funzionalità che danno senso al diario sono cattura rapida, log del giorno, raccolte/progetti, future log e revisione. Il task scaduto deve portare a una decisione: completare, ripianificare, lasciare aperto o abbandonare. Ripianificare conserva l'identificativo e, in una futura tabella storico, registra da quale data a quale data si è migrato e quando. Nessuna nuova copia del task, nessuna ripetizione automatica infinita nel diario.

Il metodo ufficiale descrive la migrazione come valutazione intenzionale della rilevanza delle attività irrisolte. Nel digitale possiamo evitare la riscrittura fisica senza eliminare quel momento di scelta. [Migrazione Bullet Journal](https://bulletjournal.com/blogs/faq/migration).

Le riflessioni quotidiane e settimanali e le abitudini già presenti sono parte dell'identità del prodotto; manteniamo la modalità essenziale e i dettagli facoltativi. Simboli e scorciatoie devono aiutare chi li conosce, lasciando disponibili controlli comprensibili anche senza sintassi speciale. Le future microazioni dentro una nota non devono confondersi con le pratiche composte delle abitudini, che hanno già una loro definizione di completamento.

## Distribuzione ad altre persone

Il Marketplace supporta anche web app integrate con Workspace. Il percorso può mantenere questa interfaccia, ma l'installazione non separa automaticamente gli archivi. Oggi DB_ID, ROOT_ID, impostazioni, cache e lock sono in parte globali al progetto: la versione corrente resta personale. [Marketplace](https://developers.google.com/workspace/marketplace), [pubblicazione](https://developers.google.com/workspace/marketplace/how-to-publish).

Prima di una versione condivisa occorrono: configurazione guidata per utente, archivio nel suo Drive, autorizzazioni coerenti con l'identità di esecuzione, chiavi cache separate, isolamento delle code e revisione della gestione dei lock. Il worker richiede una scelta specifica: i trigger installabili eseguono come l'account che li ha creati, non cambiano utente in base alla riga della coda. Per una piccola beta possono essere usate copie indipendenti; un servizio unico richiede progettazione e misure delle quote. [Web app Apps Script](https://developers.google.com/apps-script/guides/web), [trigger installabili](https://developers.google.com/apps-script/guides/triggers/installable).

Non introduciamo adesso dati condivisi tra persone né una migrazione dell'archivio personale. La sequenza consigliata è: stabilizzare la scrittura continua, completare export/import, provare con pochi utenti indipendenti, quindi progettare il servizio unico e preparare OAuth e Marketplace.

## Ordine dei prossimi passi

1. P55: provare editor continuo e worker nell'account reale, misurando apertura e salvataggio.
2. Apertura su Oggi e cattura immediata; ricerca e caricamento progressivo coerenti con l'editor.
3. Task ricavati da una riga della nota con identità e collegamento origine; proprietà accanto al testo.
4. Revisione e migrazione con storico, riepilogo lavoro del giorno e future log.
5. Esportazione Markdown/JSON e reimportazione verificata.
6. Beta con archivi separati, poi architettura per più utenti e pubblicazione.

Questo ordine evita di promettere insieme editor nativo, offline completo, collaborazione e Marketplace prima di avere verificato la persistenza sul cloud.
