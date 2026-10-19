# Primo caricamento progressivo — P5

Sostituire Code.gs e Index.html, salvare e pubblicare una nuova versione dello stesso deployment. DriveDocs.gs e ROOT_FOLDER_ID restano quelli installati. Nessun setup o migrazione richiesti.

La prima richiesta legge voci, estratti e file del diario. Progetti, pagine giornaliere, settimane, obiettivi, abitudini e registrazioni arrivano con una seconda richiesta in background. La pagina non viene nascosta mentre arrivano questi dati. Se si apre una vista dipendente prima del loro arrivo, viene indicato Caricamento dei dati della vista e si attende la stessa richiesta, senza duplicarla. Una risposta tardiva dei dati comuni non sovrascrive quelli aggiornati da un salvataggio.

La diagnostica riporta versione P5 e una riga Dati comuni distinta da getState. Il primo getState dovrebbe escludere il costo dei dati comuni. Il lavoro totale non scompare: è distribuito per rendere leggibile prima il diario. Le chiamate aggiuntive hanno un proprio costo Apps Script; confrontare i tempi reali.

Test locali passati: diario visibile prima dei dati comuni; obiettivi attendono e mostrano i dati completi; singola richiesta comuni; scrittura e recupero bozze; design desktop/mobile.
