# P60.1 — caricamento Vue tramite bootstrap compatibile

Sul deployment P60 è stata segnalata una pagina bianca con `Failed to execute 'write' on 'Document': Unexpected end of input` nel pannello HTML di Google. Il caricamento si interrompe mentre viene inserito il JavaScript; non è un errore dei dati Sheets. I test della Demo locale non attraversano questo caricamento Google.

P60.1 modifica l'inclusione del bundle: il codice Vue viene conservato come payload Base64 UTF-8, decodificato dal browser e inserito con un normale elemento script dopo l'interfaccia statica, prima dell'avvio dell'app. Non usa eval, servizi esterni o nuovi permessi. La grafica P60 rimane invariata. L'errore di inizializzazione del modulo viene mostrato in pagina; il frontend precedente rimane disponibile se il modulo non è inizializzato.

## Installazione

Sostituire interamente **Index.html** e **Changelog.html** con i file di questo pacchetto. Salvare e aggiornare il deployment esistente scegliendo **Nuova versione**; ricaricare la web app con Ctrl+F5. Il badge deve indicare **P60.1**.

Non modificare Code.gs, DriveDocs.gs, JournalEditor.gs, fogli o trigger. Non eseguire setupDrive. La modifica è solo frontend/build.

## Verifica e limite

Test locali di build/backend e browser completati. Verificata l'identità byte per byte del payload UTF-8, l'esecuzione dopo l'HTML statico e l'avviso/fallback con un guasto di avvio simulato. Salvataggi, note, task, stili, date, bozze, ricerca e geometria restano coperti dalle prove precedenti.

La causa esatta del troncamento del vecchio bundle all'interno di Google non è riprodotta localmente. Il nuovo caricamento evita di esporre il bundle al trattamento HTML diretto di quel passaggio, ma l'esito sul deployment reale va confermato dopo l'aggiornamento. Nessun deployment o dato Google reale è stato modificato dall'agente.
