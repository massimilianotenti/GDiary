# Estratti nell'indice Sheets

Aggiornare Code.gs, DriveDocs.gs e Index.html in Apps Script. Conservare ROOT_FOLDER_ID, salvare e pubblicare una nuova versione del deployment esistente. Non occorre setup: il nuovo foglio Previews viene creato alla prima scrittura di un estratto.

Il diario non legge automaticamente Docs per mostrare anteprime. L'estratto di massimo 220 caratteri viene salvato nel foglio Previews quando si crea una nota completa o si salva il testo di una nota dall'app. I bullet appena creati hanno estratto vuoto finché non si sviluppa il testo. Il corpo originale resta solo in Docs.

Per le note già presenti e dopo modifiche dirette in Docs usare Aggiorna estratti da Google Docs in fondo al diario. Il comando tratta le prime 12 voci attualmente caricate. Per una nota fuori da queste prime 12, aprirla e salvarla dall'app per aggiornare l'estratto. Non è una sincronizzazione automatica degli edit esterni. I marcatori devono restare validi; errori di aggiornamento sono segnalati.

Aggiorna rilegge i dati Sheets; Aggiorna estratti da Google Docs legge invece gli originali per rigenerare gli estratti. Test locali passati; confrontare i tempi sull'app pubblicata. Il costo Anteprime Docs non deve più comparire durante la normale navigazione.
