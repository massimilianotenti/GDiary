# Aggiornamento P54

Da P53 sostituire Code.gs, DriveDocs.gs, Index.html e Changelog.html. Conservare il ROOT_FOLDER_ID del deployment attivo e le proprietà personali. Non pubblicare Demo.html. Pubblicare una nuova versione e ricaricare /exec: badge P54.

Il trigger già installato processTaskDocQueue resta valido (Head, ogni 5 minuti). Non aggiungere un duplicato. Se manca, installarlo per la sincronizzazione automatica; senza trigger i dati restano salvati e si può usare Sincronizzazione Docs > Sincronizza ora. Nessun nuovo permesso previsto, dato che Sheets e Docs erano già usati. DocContent viene creato al primo salvataggio; TaskDocQueue mantiene le quattro colonne precedenti. Da P53 non serve setup; da versioni precedenti seguire anche la migrazione descrizioni P51/P53.

## Comportamento

Nuove note e task (anche con descrizione), modifiche al testo e agli stili salvano su Sheets prima della conferma. I contenuti sono versioni persistenti e segmentate: non vengono troncati al limite della cella. Un record di coda per voce porta il trigger all’ultima versione, in batch fino a 10 voci. Durante l’attesa si apre il testo salvato senza leggere o creare Docs. Google Docs mostra la copia precedente finché il trigger non ha terminato.

Il pannello nel menu laterale mostra attese, errori e ultimi 20 completamenti. Aggiorna elenco rilegge Sheets; Sincronizza ora esegue un batch. Nessun polling periodico aggiunto. Per aggiornare indicatori nelle altre viste premere Aggiorna o riaprire il dettaglio.

Stato, date, importanza, progetti/tag, riflessioni, obiettivi e abitudini restano diretti su Sheets. Le descrizioni degli obiettivi e delle abitudini erano già su Sheets: non richiedono una scrittura Docs. Le cancellazioni di sezioni esistenti restano sincrone; cancellare una voce pendente rimuove anche la coda e il contenuto e ne impedisce la ricreazione. Le esportazioni attendono la sincronizzazione delle note coinvolte.

## Conflitti e conservazione

Se una modifica diretta in Docs non corrisponde alla base dell’editor, il trigger registra un errore e conserva la versione app senza sovrascrivere il Doc. Nel dettaglio è possibile aprire il Doc e scegliere esplicitamente Mantieni la versione dell’app e riprova; la versione Docs del conflitto viene copiata nel contenuto persistente. Elementi avanzati non supportati richiedono risoluzione in Docs. Il lock Apps Script non blocca l’editor Google Docs: modifiche esterne esattamente contemporanee alla scrittura non sono una transazione atomica.

DocContent conserva versioni precedenti e può crescere: manutenzione/retention futura da progettare. Non svuotarlo come se fosse una coda temporanea. Se una sincronizzazione fallisce il contenuto resta leggibile nell’app. I salvataggi Sheets e Docs non costituiscono una transazione distribuita; errori parziali sono recuperati tramite coda e ritentativi.

## Verifica cloud pendente

- Creare una nota e un task con descrizione; aprirli subito, poi controllare il Doc dopo il trigger.
- Modificare due volte una descrizione prima del trigger: il Doc deve ricevere la versione finale e gli stili.
- Controllare pannello, Sincronizza ora, errori e copia del conflitto.
- Eliminare una voce in attesa: non deve ricomparire.
- Misurare tempi client/server; l’eliminazione delle chiamate Docs nel salvataggio è verificata localmente, il miglioramento in secondi non è ancora misurato sul deployment.

La scrittura in una pagina continua è una futura evoluzione dell’editor, non implementata dalla P54. Nessun dato reale modificato durante lo sviluppo.
