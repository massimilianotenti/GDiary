# Aggiornamento P68

Da P67 aggiornare **DriveDocs.gs, JournalEditor.gs, Index.html e Changelog.html**. Copiare il proprio ROOT_FOLDER_ID nel nuovo DriveDocs.gs: il pacchetto conserva il segnaposto. Non cambiare Code.gs o il manifest. Salvare e pubblicare una nuova versione del deployment esistente.

Non aggiornare soltanto l'interfaccia: il backend precedente non accetta i nuovi stili.

Il comando Aa mostra la barra, ora sotto i comandi della nota. Stili: testo, titoli H1/H2/H3, citazione, codice. Modificatori: B/I/U/barrato, dimensioni, quattro font, colore, evidenziatore e link. Formattazione da applicare alla selezione nel testo; il codice usa Courier New nei Docs.

Checklist: pulsante ☑; caselle spuntabili nell'app. Invio crea un'altra riga; sulla riga vuota esce dalla checklist. Salva pagina registra anche lo stato. Le caselle sono parte della nota e non creano task del diario. Nei Docs si conservano come simboli ☐ / ☑; non sono checklist native interattive. Un paragrafo Docs che comincia con questi simboli viene riconosciuto alla rilettura.

Citazioni: paragrafi rientrati di 18pt. Codice: paragrafi rientrati di 12pt in Courier New. I formati estranei non supportati restano protetti. La cache viene ricostruita con chiavi nuove.

Test locali con Docs simulati, nessun deployment reale eseguito.
