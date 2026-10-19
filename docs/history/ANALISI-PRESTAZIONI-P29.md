# Analisi e ottimizzazione P29

Analisi della P28 effettiva e confronto con P29. I documenti erano già aggregati per mese (diario personale) o progetto; non è stato introdotto un documento per task. Le chiamate ripetute erano il costo evitabile, insieme alla preparazione sincrona delle sezioni vuote e alle risposte con rilettura dell’intera vista. Nessuna misura sul cloud: i conteggi seguenti sono invocazioni dei metodi nei servizi simulati, non round-trip di rete né secondi risparmiati.

## Confronto misurato

Stessi dati demo, cartella e documento mensile già esistenti. Il task è senza descrizione; P29 ha il flag deferEmptyTaskDocs attivo. Il primo task crea anche le intestazioni della coda. Il batch è di 10 note nello stesso mese. Le chiamate ai getter dei paragrafi, flush e tutti gli altri metodi non sono comprese nei conteggi selettivi sottostanti.

| Percorso e metodo | P28 | P29 |
| --- | ---: | ---: |
| Task senza descrizione: DocumentApp.openById | 1 | 0 |
| Task senza descrizione: saveAndClose | 1 | 0 |
| Task senza descrizione: getDisplayValues | 8 | 6 |
| Cambio stato: getDisplayValues | 20 | 5 |
| Cambio stato: scritture Entries | 3 | 2 |
| 10 note: DocumentApp.openById / saveAndClose | 10 / 10 | 1 / 1 |
| 10 note: scritture DocRefs / Previews | 10 / 10 | 1 / 1 |
| 10 note: tutte le scritture setValues misurate | 21 | 3 |
| 10 note: getDisplayValues | 44 | 8 |
| 10 note: createTextFinder | 51 | 1 |
| 10 note: letture dati Registry | 30 | 1 |

Le scritture del batch sono una per Entries, una per DocRefs, una per Previews. I tempi dipendono da dimensioni dei documenti, latenza servizi, prima apertura e attesa lock; non si promettono due secondi o un fattore di miglioramento temporale senza prova reale.

## Modifiche e chiamate ridotte

1. **ensureSections_ / addJournalImpl_**: raggruppa le voci per documento. noteDoc_ viene chiamata una volta per destinazione; una apertura Docs, una lettura del testo per recuperare i marcatori, una chiusura per documento. DocRefs e anteprime si accumulano in array e vengono scritti dopo i documenti. Le modifiche dei paragrafi richiedono ancora i metodi DocumentApp; non si dichiara che l’intera modifica Docs sia una singola API batch.
2. **ref_, managed_, folder_, root_, inside_**: snapshot di Registry/DocRefs e Map per identificativo, cartelle e controlli di appartenenza riutilizzati nella stessa richiesta. Eliminati TextFinder ripetuti su queste tabelle. La cache viene azzerata a ogni locked_: non usa CacheService tra richieste e non nasconde spostamenti/cancellazioni esterne tra salvataggi. Dopo scritture il relativo snapshot viene aggiornato o invalidato.
3. **upsertPreviews_**: aggiorna gli array in memoria, raggruppa righe esistenti adiacenti e aggiunge tutte le nuove righe con un append_ batch. Non riscrive l’intero archivio per una modifica. Controllo intestazione richExcerpt una volta per richiesta; rimosso il setValue.
4. **readEntries_ / migrazione**: retry di un invio legge blocchi contigui in due range, saltando il body legacy. Migrazione legge al massimo 15 righe complete in un range, crea sezioni in batch e salva il cursore una volta, anziché dopo ciascuna voce.
5. **setTaskStatus, setEntryTags, setEntryProjects, planTask**: risposte incrementali, senza state_ di seguito alla scrittura. Cambio stato: 7–9 insieme e completedAt in 13, due setValues al posto di tre setValue. Due range sono intenzionali: evitano di leggere e riscrivere il body legacy tra le colonne. Progetti: colonne 9–11 insieme. Conservati controlli della versione e dati del dettaglio nel client.
6. **saveNoteText**: quando testo e firma degli stili non cambiano, deadline/pianificazione del task si salvano su Sheets senza Docs e senza aggiornare l’anteprima. Il body legacy non viene toccato. Per modifiche reali del testo/stili rimangono la lettura del documento e il controllo fresco contro modifiche esterne; questi accessi non sono stati rimossi. Gli indici dei marcatori trovati durante la lettura degli stili vengono riutilizzati, eliminando un’ulteriore scansione per il salvataggio. La lettura stili percorre solo la sezione dopo la verifica dei marcatori.
7. **saveRecord_ Days/Weeks**: scrittura della pagina e risposta con dati comuni già elaborati in memoria, senza state_. Il client integra commonPatch e conserva voci, dettaglio e impostazioni.
8. **refreshNotePreviews / esportazione**: estratti manuali leggono un Doc per destinazione e scrivono anteprime in batch; rispondono con le sole voci aggiornate. L’esportazione carica gli allegati una volta per batch e prepara i task ancora in coda prima di esportarli.
9. **TaskDocQueue / processTaskDocQueue**: nuovo task senza descrizione salva Entries e la coda, senza chiamate Docs o Drive; il flag è attivo nel modulo task e nei bullet composti soltanto da task. Con descrizione, note complete o invii misti la scrittura Docs resta sincrona. La prima apertura del dettaglio prepara il documento e marca il lavoro completato; un worker opzionale elabora fino a 10 task, raggruppati per documento. Se il lock è occupato, il worker rinvia senza attendere 30 secondi. Il lock resta necessario e un worker già in esecuzione può fare attendere un salvataggio concorrente.

Il pattern usa array e setValues, mantenendo getDisplayValues per preservare i formati ISO/stringa del progetto. Sostituirlo indiscriminatamente con getValues introdurrebbe oggetti Date e richiederebbe una diversa normalizzazione. Non si caricano o riscrivono i body legacy durante la navigazione. Non ci sono getValue, setValue o appendRow nei due file backend P29. Restano scritture mirate per una singola modifica e gruppi contigui per dati sparsi; non si riscrive tutto il foglio per ridurre artificialmente il numero di chiamate.

## Coerenza e limiti

Richieste ripetute conservano gli ID. Interruzione dopo scrittura Docs e prima di DocRefs: la ripresa recupera i marcatori e legge testo/stili reali per l’anteprima, evitando duplicati e sovrascritture. Errori del worker restano in coda e vengono ritentati. Eliminazione del task rimuove anche la coda. ROOT_FOLDER_ID e manifest invariati.

Docs e Sheets non formano una transazione atomica: una risposta di errore può lasciare una fase già scritta e richiedere il retry dello stesso invio. Il codice conserva i meccanismi di ripresa. Il task in coda è già salvato su Sheets; prima della preparazione non ha ancora una sezione nel documento. La prima apertura può quindi richiedere più tempo. Il trigger non è stato installato e nessun dato reale è stato modificato.

Riferimento: https://developers.google.com/apps-script/guides/support/best-practices?hl=it — ridurre accessi ai servizi e raggruppare operazioni. I suggerimenti forniti dall’utente tramite Gemini coincidono con i primi quattro interventi; non costituiscono una misura della latenza né un codice da applicare senza verifica.
