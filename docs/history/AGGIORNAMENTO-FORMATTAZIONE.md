# Aggiornamento P9 — Formattazione delle note

1. Sostituisci Index.html in Google Apps Script con il file di questo pacchetto.
2. Sostituisci DriveDocs.gs, conservando il tuo ROOT_FOLDER_ID reale al posto di INCOLLA_ID_CARTELLA.
3. Code.gs e appsscript.json non richiedono modifiche per questo aggiornamento. Non eseguire setup o migrazioni.
4. In Distribuisci → Gestisci deployment → Modifica scegli Nuova versione e distribuisci. Riapri lo stesso indirizzo /exec e ricarica la pagina. Il badge deve indicare v3 · P9.

Prova prima una nota breve: Nuova nota → Nota completa. Seleziona una parola, usa B o I, inserisci un titolo o un elenco, salva e riapri. Controlla gli stessi stili nel documento originale. Nel dettaglio delle note esistenti trovi la stessa barra.

Sono disponibili grassetto, corsivo, sottolineato, titoli, dimensioni 10/11/12/14/18/24/32 pt, elenchi semplici e link http/https. Non è l'editor completo di Google Docs: tabelle, immagini, elenchi annidati e stili avanzati richiedono Docs. L'incolla inserisce testo semplice. Le anteprime nel diario restano estratti di testo; gli stili si vedono nel dettaglio.

Testo e stili sono salvati nella sezione del Google Doc, non in nuove colonne Sheets. I marcatori non entrano nell'editor. Le bozze nel browser conservano gli stili. Se il documento contiene elementi non supportati il salvataggio dall'app è bloccato; usa Docs. Modifiche esterne al testo o agli stili supportati sono confrontate con il contenuto letto all'apertura, ma non esiste un blocco atomico contro modifiche contemporanee fatte in Docs.

Verifiche locali: roundtrip backend simulato, conflitti di sola formattazione, URL non sicuri, marcatori, creazione/salvataggio/riapertura nel browser, bozze dopo ricarica, mobile e bullet rapidi. La verifica sul tuo account Google resta da effettuare dopo il deployment.
