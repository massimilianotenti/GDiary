# Aggiornamento P58

Da P55/P56/P57 sostituire **Index.html**, **JournalEditor.gs** e **Changelog.html**, poi pubblicare una nuova versione e ricaricare /exec: badge P58. Code.gs, DriveDocs.gs, manifest, dati personali e trigger invariati. Da versioni precedenti seguire anche AGGIORNAMENTO-P55.md. Non rieseguire setupDrive. Conservare il ROOT_FOLDER_ID personale.

## Validazione del salvataggio

Il titolo della nota resta facoltativo. Un task deve invece avere un titolo su una sola riga; descrizione e titolo sono campi distinti. I precedenti messaggi generici non permettevano di sapere quale voce del gruppo fosse non valida. Ora il client evidenzia quella voce, mostra l'errore vicino al campo e porta il focus nel punto da correggere. Anche il server distingue i motivi e include tipo e titolo della voce.

Un blocco nuovo senza titolo, testo o proprietà significative viene ignorato quando si preme Salva pagina, anziché impedire il salvataggio degli altri blocchi. I blocchi con testo o date da correggere rimangono nella bozza. Correggere il campo, poi premere nuovamente Salva pagina.

“In attesa” descrive la replica Docs della versione già registrata: non conferma il salvataggio di ogni modifica ancora nell'editor. La conferma è **Pagina salvata**. In caso di errore, gli avvisi di modifiche non salvate rimangono correttamente attivi. Gruppi differenti da massimo 25 possono essere salvati separatamente; scritture Sheets fra più fogli non sono atomiche. Un errore nell'ultimo tentativo non implica che una versione precedente della nota non esista.

Il corpo riportato nell'ultimo screenshot dell'utente contiene apparentemente il paragrafo e i cinque punti forniti. Il titolo aggiunto e il check risultavano diversi dopo il ritorno alla pagina: è compatibile con un aggiornamento successivo non salvato, non prova di un troncamento del corpo. Senza accesso autenticato al deployment non è stato possibile identificare il blocco effettivo che causava l'errore.

## Aspetto e navigazione

Titoli nota più leggeri, simbolo e data nell'intestazione. La sola voce attiva ha bordo/fondo discreti. **Aa** apre la formattazione vicino al testo; la barra non compare automaticamente su ogni nota. Testo, stili e task compatti restano modificabili nella pagina; il giorno conserva il ruolo di ingresso.

La pagina continua recente resta in memoria durante il cambio di vista: entro 60 secondi tornare da Giorno al Diario non forza un'altra lettura dei contenuti. Aggiorna rilegge; versioni più recenti nei metadati invalidano la pagina. Non è una sincronizzazione in tempo reale: modifiche dirette Docs e completamento del worker possono richiedere Aggiorna o scadenza della cache.

I dati comuni non vengono invalidati dopo ogni salvataggio della pagina: le pianificazioni dei task sono aggiornate con la risposta. Il pannello tempi aggiunge **Pagina diario** con metadati, contenuti e numero di Docs aperti. I tempi reali del deployment restano da misurare.

## Verifiche

Browser locale desktop/mobile: note e task, formattazione Aa, selezione unica, data, proprietà, validazione vicina, corpo senza titolo, blocco vuoto, correzione e salvataggio, navigazione senza falso avviso dopo successo, ritorno al diario senza nuova chiamata ai contenuti, ID preservati, bozze progetto e dettaglio. Backend: errori distinti e validazione del gruppo prima delle scritture; regressioni di coda, conflitti e segmentazione conservate.

Script nuovi: tests/verify-p58-validation.cjs e tests/verify-p58-browser.cjs. I test browser P55–P57 descrivono le rispettive interfacce storiche e non costituiscono la suite corrente della P58. Anteprime: P58-editor-desktop.png e P58-editor-mobile.png.

La prova sul deployment fornito è arrivata alla schermata Google Accedi in un browser isolato. Nessuna scrittura o autorizzazione dell'account eseguita; non considerare quella prova una verifica dell'app in produzione.

## Prossimi passi

PIANO-EDITOR-AGENDA.md distingue il primo passaggio consegnato dalle relazioni note/task, dall'editor misto e dalla replica Docs ancora da sviluppare. DEPLOY-AUTOMATICO.md e tools/prepare-apps-script.cjs preparano il percorso clasp: Script ID, autenticazione e repository restano da configurare. Il preparatore copia solo i sei file necessari e non effettua upload. React/Vue sono possibili evoluzioni frontend, non introdotte da questa release.
