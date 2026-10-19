# Evoluzione del diario — piano operativo

Concordato il 14 ottobre 2026. Il giorno rimane l'ingresso principale; un progetto non è obbligatorio. Salva pagina resta il comando di persistenza, con bozze della scheda e replica nei Docs tramite coda. I passi successivi non sono funzioni già consegnate.

## 1. Presentazione e comandi — P60 realizzata, cloud da verificare

- Titoli nota più grandi e leggeri; piccolo simbolo a sinistra e data di annotazione a destra.
- Una sola voce attiva, con bordo e fondo discreti; le altre rimangono bianche.
- Formattazione apribile con Aa vicino al testo, senza barra permanente su ogni nota. I comandi esistenti conservano testo e stili.
- Task compatti, descrizioni espandibili e menu proprietà/allegati conservati dalla P57.
- Validazione del contenuto vicina alla voce: titolo task su una riga, titolo nota facoltativo, limiti e marcatori distinti. Blocchi nuovi completamente vuoti ignorati al salvataggio; bozze con contenuto o proprietà significative restano da correggere.

Criteri locali: nessuna perdita di testo/stili o identità, proprietà e calendari usabili, una sola selezione, compressione contenuta, titoli leggibili a 390 px, nessuna eccedenza orizzontale. Prova del deployment ancora pendente: l'URL ricevuto richiede un accesso Google che il browser isolato non possiede.

P60 aggiunge il tema caldo del diario, icone e date coerenti, riepilogo e stato delle modifiche reattivi. Salvataggi e task interni alle note restano sviluppi distinti.

## 2. Relazione fra note e task — prossimo sviluppo backend

Ogni task rimane una sola riga Entries, con il proprio ID, titolo, descrizione, stato, deadline e pianificazione. La nota conserva un proprio ID. Una relazione separata lega il task alla nota e a una posizione stabile nel suo contenuto; non copiamo il titolo o la descrizione della nota dentro il task.

Proposta da implementare: EntryRelations con taskId, noteId, blockId e updatedAt. Ogni task può avere al massimo una nota di origine; più viste possono mostrarlo. Un task autonomo rimane valido senza relazione. Alla creazione eredita data e progetti della nota, ma le successive modifiche alle date operative sono indipendenti. L'ereditarietà iniziale non implica aggiornamenti nascosti di tutti i task quando si cambia progetto della nota.

Le note esistenti non devono subire una conversione automatica. I task indipendenti non vengono legati sulla base di somiglianze testuali. Una nuova relazione deve essere esplicita, validata e protetta da controllo di versione. La relazione deve vietare cicli e task collegati a note inesistenti.

Criteri: un task creato nella nota appare una sola volta in Task aperti; aggiornare da una vista è visibile nell'altra; nessun duplicato dopo ritentativi. Scollegare conserva il task autonomo. Cancellare una nota che contiene task richiede una scelta esplicita o un blocco dell'operazione, evitando orfani o eliminazioni implicite.

## 3. Editor con paragrafi e attività nella stessa nota

Occorre un modello di blocchi con ID stabili: paragrafo, elenco, codice e riferimento a task. Un riferimento contiene taskId e blockId, non una copia dei metadati dell'attività. Il salvataggio distingue il testo della nota dagli aggiornamenti dei task collegati.

L'interazione prevista è un comando per aggiungere un'attività nella nota oppure convertire una riga selezionata. Invio continua il testo; la conversione non deve interpretare automaticamente testo incollato, comandi Git o esempi. Un task inserito mostra check e titolo, e offre scadenza e descrizione senza uscire dalla nota. Gli aggiornamenti si persistono con Salva pagina.

La vista del diario può mostrare la nota con le attività interne; nella stessa vista il task non ricompare come voce autonoma. Le viste operative, come Giorno e Task aperti, possono mostrarlo con il collegamento alla nota originale. Data di annotazione della nota e pianificazione del task mantengono ruoli distinti.

Criteri: paragrafi prima/dopo il task preservati, riordino stabile, undo locale prima del salvataggio, campi e formattazione propri di ogni contenuto, sincronizzazione degli stati fra viste, bozze recuperabili con relazioni intatte.

## 4. Replica Docs ed export

Il worker deve conoscere i riferimenti ai task prima di poter rendere una nota mista nei Docs. Una modifica a un'attività collegata deve invalidare anche la rappresentazione della nota che la contiene. La coda deve raggruppare per documento e consolidare le versioni; non basta aggiungere un checkbox nel DOM o nel Doc.

Il progetto dovrà definire come rappresentare i task collegati nei Docs, preservando ID, confini di sezione e gestione dei conflitti con modifiche esterne. I metadati dei task restano autorevoli nelle relative Entries/TaskPlans. Il contenuto della nota non deve importare nel database una seconda attività quando si rilegge il Doc.

Criteri: due modifiche prima del trigger producono lo stato finale; un conflitto non perde né la bozza né il Doc; export/import JSON conserva relazioni e blocchi; Markdown rimane leggibile. Nessuna scrittura Docs nel salvataggio interattivo.

## 5. Frontend modulare — prima migrazione Vue realizzata in P59

Vue 3 gestisce la pagina continua, la composizione dei giorni, le voci e il loro ciclo di vita. La prima migrazione preserva l'editor rich text tramite un adattatore DOM isolato e conserva il contratto di salvataggio P58. Gli editor già aperti non vengono ricreati quando si aggiunge un'altra voce. Le altre viste sono ancora implementate dal frontend precedente.

Vite incorpora runtime e CSS in Index.html; il backend resta Apps Script V8, senza server Node in produzione. Seguiranno componenti nativi per proprietà e task, e la scelta dell'editor a blocchi per attività collegate alle note. L'introduzione di EntryRelations e dell'export corrispondente resta distinta dalla migrazione grafica.

Sorgenti: frontend/components, frontend/main.js, frontend/diary.css e frontend/shell.html. Build e prove in README.md. Fonti: [Vue quick start](https://vuejs.org/guide/quick-start.html), [Vite build](https://vite.dev/guide/build.html), [restrizioni HTML Service](https://developers.google.com/apps-script/guides/html/restrictions).

## 6. Git, test e deploy automatico

Il codice, questo piano e STATO-LAVORO.md costituiscono il contesto trasferibile fra postazioni. Git non è stato inizializzato o pubblicato. P59 prepara i sei file Apps Script con npm run build e include clasp e il comando di release; il percorso per clasp e pipeline è in DEPLOY-AUTOMATICO.md. Autenticazione, Script ID e ambienti test/produzione restano da configurare.

Prima di test che scrivono dati reali occorre identificare una copia di test. L'URL ricevuto viene trattato come produzione per sola lettura. Nessun deployment, modifica di condivisioni o accesso all'account è stato eseguito.

## Prossimo passaggio richiesto: palette selezionabili

Promemoria utente del 14 ottobre 2026: la scelta delle palette in Impostazioni è ancora da sviluppare, dopo il titolo diretto e i metadati nota della P63. Temi: Carta calda, Salvia, Blu ardesia, Scuro. Usare ruoli cromatici centralizzati, preferenza persistente e icone/stati con contrasto adeguato. Nessun tema alternativo implementato nella P63.
