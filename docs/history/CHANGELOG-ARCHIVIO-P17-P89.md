# Registro delle modifiche — Bullet Journal v3

Versione integrata v3 / P89. P18–P89 sono da verificare sul deployment reale; le sole prove cloud documentate riguardano alcuni percorsi di P17. Le due P22 dei PC sono distinte qui sotto. Il badge non verifica la versione del backend.

## P89 — Riquadro del campo giornaliero attivo

- Inizio e fine giornata mostrano un riquadro leggero intorno al campo in cui si sta scrivendo, come nel checkup settimanale.
- Valido per intenzione/riflessione formattate, campi semplici e dettagli personali di area/emozioni. Il riquadro scompare all’uscita dal campo senza cambiare dimensioni o allineamenti.
- Da P88 aggiornare solo Index.html e Changelog.html. Backend invariato.

## P88 — Scelte visibili per energia e checkup

- Energia percepita con scala compatta da 1 a 5, descrizione della scelta e Azzera per tornare a Non indicata.
- Stato del checkup con due scelte In corso / Completato e stato attivo evidenziato.
- Stile coerente con i controlli delle abitudini, quattro palette e mobile; navigazione da tastiera con frecce, Home ed End.
- Valori e salvataggi invariati. Da P87 aggiornare solo Index.html e Changelog.html.

## P87 — Salvataggio con progetti recuperati dall’archivio

- La validazione del diario accetta anche i collegamenti a progetti già presenti nelle vecchie voci e proposti dall’interfaccia, senza creare schede Projects automaticamente.
- Spazi intorno ai collegamenti e duplicati normalizzati. I collegamenti preesistenti sulla stessa voce restano preservati.
- Un progetto realmente sconosciuto identifica la voce da correggere, apre Progetti e tag e conserva testo e bozze per ritentare il salvataggio.
- Da P86 aggiornare JournalEditor.gs, Index.html e Changelog.html. Code.gs, DriveDocs.gs e appsscript.json invariati.

## P86 — Pianificazione visibile sui task

- Il campo data in testata ora ha l’etichetta visibile Scadenza, distinta da quando lavorare al task.
- Sotto i tag compare Pianificato con il giorno scelto, oppure Lavorazione con il periodo. Senza fine periodo: fino al completamento.
- Riepilogo aggiornato subito quando si cambiano le proprietà, anche nella vista filtrata Task aperti. Anni espliciti per intervalli a cavallo d’anno e date fuori dall’anno corrente.
- Da P85 aggiornare solo Index.html e Changelog.html. Backend invariato.

## P85 — La settimana, nello stile del diario

- Inizio settimana e checkup su un unico foglio, con intestazioni serif, icone e colori condivisi con il diario continuo.
- Campi di scrittura aperti e adattivi: focus/priorità e coppie di riflessioni, con linee inferiori allineate. Energia e stato conservati.
- Navigazione a sette giorni più leggibile, riepilogo numerico leggero e spiegazione dei conteggi apribile.
- Abitudini e pratiche a tutta larghezza: sette giorni visibili su desktop e scorrimento locale da tastiera su schermi stretti.
- Task della settimana raggruppati in sezioni apribili; completati inizialmente compressi, task aperti visibili. Azioni e diario della settimana conservati.
- Da P84 aggiornare solo Index.html e Changelog.html. Backend e formato dei dati invariati.

## P84 — Comandi descrizione compatti

- Etichette Mostra / Nascondi / Aggiungi per i task; tooltip ed etichette accessibili specificano descrizione.
- Colonna del comando adattata al testo e spazio riservato al menu con i puntini, anche su mobile.
- Da P83 aggiornare solo Index.html e Changelog.html. Backend invariato.

## P83 — Titoli e descrizioni più coerenti

- Titoli delle note a 18 px e dei task a 16 px, anche su mobile; pesi e allineamenti conservati.
- Comandi espliciti Mostra descrizione, Nascondi descrizione e Aggiungi descrizione, con piccola freccia di apertura/chiusura.
- Da P82 aggiornare solo Index.html e Changelog.html. Backend invariato.

## P82 — Task nel diario continuo

- Task aperti apre il diario con filtri Task / Aperti / Tutto l’archivio: un solo editor e gli stessi comandi.
- Filtri per stato, periodo, progetto, tag e testo, ordinamento per importanza/scadenza o data; ricerca anche nel corpo dopo 800 ms dall’ultimo carattere.
- Lettura automatica di tutte le pagine dei task; nessuna ricerca limitata ai primi 25 risultati. Le bozze modificate restano visibili anche cambiando filtri.
- Scorciatoia facoltativa in Impostazioni, preferenza di questo browser. Filtri task sempre accessibili dal diario; Tutto il diario ripristina la vista normale.
- Salvataggi di task di mesi diversi divisi per mese, con conferma dei batch riusciti e conservazione delle bozze in caso di errore.
- Da P81 aggiornare JournalEditor.gs, Index.html e Changelog.html.

## P81 — Linee dei campi affiancati

- Le linee di chiusura delle coppie Area/Piccolo gesto, Momento significativo/Emozioni e Difficoltà/Apprendimenti si allineano sul fondo della stessa riga.
- La riga cresce con il contenuto più alto; bordo di focus e layout mobile conservati.
- Da P80 aggiornare solo Index.html e Changelog.html. Backend invariato.

## P80 — Ritmo tipografico condiviso

- Testi delle note e delle riflessioni su una verticale comune, titoli e tag con ruoli distinti. Tag più a sinistra del testo; comandi a destra conservati.
- Interlinea 1,6 per corpo e riflessioni; checklist più compatte, margini coerenti per titoletti, paragrafi, elenchi e codice.
- Intestazioni mattina/sera più misurate, icone ridotte e allineate, anteprime sulla stessa verticale del testo. Quattro palette e mobile preservati.
- Stati delle abitudini con comandi compatti Da fare/Fatta/Non fatta, stato attivo evidente e protezione sulle microazioni.
- Riflessione estesa più vicina all’anteprima: campi vuoti contenuti e adattivi, pillole con icone, opzioni aggiuntive sotto Altre.
- Da P79 aggiornare solo Index.html e Changelog.html. Backend invariato.

## P79 — Menu senza barra visibile

- Barra di scorrimento della sidebar nascosta, scorrimento e accesso da tastiera mantenuti.
- Voce Novità e versioni rimossa dal menu; pannello sempre accessibile dal badge della versione.
- Include i rientri P78. Interlinea invariata. Backend invariato; da P77/P78 aggiornare solo Index.html e Changelog.html.

## P78 — Rientri più leggeri

- Titolo e corpo spostati di 8 px verso sinistra, mantenendo il loro allineamento. Tag desktop ancora più a sinistra del testo; comandi a destra conservati.
- Da P77 aggiornare solo Index.html e Changelog.html. Backend invariato.

## P77 — Titolo e corpo allineati

- Il corpo di note e descrizioni task inizia sulla stessa verticale del testo del titolo, includendo il rientro del campo di modifica. Posizione di tag e comandi invariata.
- Verifiche geometriche su quattro palette, focus e larghezze 320/390/1440 px. Backend invariato.
- Da P76 aggiornare solo Index.html e Changelog.html.

## P76 — Anteprime, scelte e suggerimenti tag

- Anteprime compresse con ellissi se troncate e comando esplicito per leggere il contenuto completo.
- Fine giornata: prima La mia riflessione, poi gli altri campi.
- Scelte multiple per aree della vita ed emozioni, conservando il testo personale esistente e l’inserimento libero.
- Suggerimenti sui tag dell’intero archivio (lettura della sola colonna tag), filtro sul termine corrente, supporto a più tag e a nuovi tag espliciti. Tastiera e form di inserimento/dettaglio/proprietà supportati.
- Da P75 aggiornare Code.gs, Index.html e Changelog.html.

## P75 — Riflessioni in una pagina più ariosa

- Mattina e sera raggruppate in due sezioni, un solo Espandi/Comprimi per ciascuna, estratti quando compresse. Titoli serif, icone sole/luna e controlli coordinati con le palette.
- Campi senza grandi riquadri, più spazio per intenzione e riflessione; campi aggiuntivi affiancati su desktop e in colonna sul mobile. Testo libero conservato per aree/emozioni, senza sostituire risposte esistenti con opzioni predefinite.
- Checklist, riporto, editor rich, dati Days e protezione delle bozze conservati. Nome GDiary nella scheda e nella sidebar.
- Da P74 aggiornare Code.gs, Index.html e Changelog.html; modifica backend limitata al titolo della scheda.

## P74 — Riporto checklist riconoscibile

- Il comando distingue assenza di checklist aperte da checklist già presenti nel giorno corrente. Mostra checklist apre il blocco compresso senza ricopiare le voci.
- L’editor riconosce una riga checklist dalla casella reale anche se l’attributo della riga cambia durante l’editing; stato completato/non completato conservato.
- Backend invariato. Da P73 aggiornare solo Index.html e Changelog.html.

## P73 — Diario unico, pratiche e riporto checklist

- Abitudini e pratiche nel diario continuo, con riepilogo delle completate quando compresse e controlli/microazioni quando espanse. Salvataggio delle pratiche senza perdere le bozze della pagina.
- La voce Giorno è rimossa dal menu. Collegamenti alle date aprono la giornata nel diario continuo. La riflessione dettagliata conserva i sette campi testuali nella stessa pagina.
- Aprendo un inizio giornata vuoto, invito a riportare le checklist aperte del giorno di calendario precedente. Riporta/Non ora; comando manuale sempre disponibile. Formattazione e provenienza conservate, duplicati evitati e giorno precedente invariato. Salva pagina conserva il riporto.
- Menu desktop fermo, con scorrimento indipendente; layout mobile conservato.
- Da P72 aggiornare Code.gs, Index.html e Changelog.html. Da P71 o precedenti, aggiornare anche DriveDocs.gs; conservare ROOT_FOLDER_ID.

## P72 — Ricerca nel corpo delle note

- Ricerca nei contenuti salvati ancora in attesa dei Docs, anche senza DocRefs.
- Tutti i gruppi di documenti vengono esaminati automaticamente, con avanzamento visibile.
- Inizio/fine giornata restano esclusi dalla ricerca.

## P71 — Note private e riflessioni modificabili

- Ricerca automatica dopo 800 ms dall’ultimo carattere; focus e cursore conservati nei risultati. Invio cerca subito.

- Tag contrassegnabili come privati nella pagina Tag, con configurazione/versione conservate nelle proprietà dell'app. #privato attivo per default. Una nota/task con almeno un tag privato è nascosta per default.
- Mostra private / Nascondi private e Nuova nota privata. Visibilità temporanea: chiusura cambiando scheda, reload o dopo 5 minuti senza attività. Bozze conservate. Filtro delle viste, riepiloghi, allegati, risultati e dettagli; voci della coda Docs filtrate. Esportazione di progetto richiede la visibilità privata, poiché il documento esterno non viene filtrato.
- Inizio/fine giornata modificabili nel diario continuo con editor rich, checklist, formattazione e comprimi/espandi, senza progetti/tag. Campi condivisi con Giorno. Due colonne JSON aggiunte a Days al primo salvataggio; testo esistente e campi dettagliati conservati.
- Salva pagina registra note e riflessioni; eventuali conflitti conservano la bozza. Le riflessioni restano in Days, come prima: non entrano nella coda Docs.
- Da P69 aggiornare Code.gs, DriveDocs.gs, Index.html e Changelog.html. JournalEditor.gs e manifest invariati; conservare ROOT_FOLDER_ID.

## P69 — Cursore e cancellazione checklist

- Nuova riga checklist con cursore visibile dopo la casella anche prima di digitare. Il segnaposto locale del cursore non viene salvato nel testo.
- Backspace o Canc sulla riga checklist vuota elimina la casella e lascia una riga di testo. Invio sulla riga vuota continua a uscire dalla checklist.
- Test a 320/390/1440px, cancellazione, salvataggio/consolidamento/riapertura completati. Da P68 solo Index.html e Changelog.html. Backend invariato.
- Note private per tag: proposta ancora da implementare; nessun filtro di privacy attivo in questa versione.

## P68 — Formattazione estesa e checklist

- Titolo di livello 3, citazione e codice. Barrato, font Arial/Georgia/Times New Roman/Courier New, colore del testo ed evidenziatore. Barra in linea sotto l'intestazione, adattabile al mobile e alle palette.
- Checklist spuntabili dentro la nota, separate dai task del diario. Invio aggiunge una riga; Invio sulla riga vuota esce dalla checklist. Nei Docs sono conservate come simboli testuali ☐ / ☑: non sono caselle native interattive.
- Schemi di validazione, scrittura Docs e rilettura aggiornati insieme; formattazioni estranee restano protette. Cache contenuti con nuova chiave per evitare letture dello schema precedente.
- Corretto anche il comando Proprietà dal menu della voce: il clic che apre il pannello non deve chiuderlo come clic esterno.
- Da P67 aggiornare DriveDocs.gs, JournalEditor.gs, Index.html e Changelog.html. Conservare ROOT_FOLDER_ID personale.

## P67 — Centratura visiva del titolo

- Stile del titolo protetto dalle regole dei normali campi delle palette: sfondo trasparente e riquadro di focus del colore del tema.
- Spazio laterale e centratura ottica del testo corretti. Geometria invariata entrando in modifica, altezza comprensiva dei bordi e titoli lunghi senza tagli.
- Note/task verificati nelle quattro palette a 320/390/1440px. Backend invariato; da P66 soltanto Index.html e Changelog.html.

## P66 — Titoli e proprietà più naturali

- Campo titolo con bordi e spazi interni costanti: il calcolo dell'altezza include i bordi e non taglia il testo. Nessuno spostamento entrando in modifica; focus coerente con la palette.
- Proprietà delle voci chiuse con clic fuori dal pannello o Esc. Le modifiche restano nella bozza e richiedono Salva pagina. Clic sui campi/progetti interni non chiude il pannello; Esc restituisce il focus al pulsante Progetti e tag.
- Backend invariato. Da P65 aggiornare Index.html e Changelog.html e pubblicare una nuova versione.

## P65 — Palette in Impostazioni

- Aspetto: Carta calda, Salvia, Blu ardesia e Scuro, con anteprima immediata su tutte le viste e scelta conservata nel browser tramite localStorage. Preferenza locale, non sincronizzata tra dispositivi; se il browser blocca la memoria, messaggio esplicito e applicazione per la sessione.
- Colori condivisi per superfici, testo, campi, selezioni e dettagli. Icone SVG con contrasto verificato; tema scuro usa controlli nativi scuri. Non cambia la formattazione esplicita dei contenuti delle note.
- Comandi Progetti e tag / Comprimi ravvicinati e allineati a destra, con colonne comuni per note e task. Tema scuro ricontrollato su testi secondari, editor e schede abitudini.
- La selezione della palette non modifica note/task né attiva l'avviso di modifiche non salvate. Modalità di riflessione e suo salvataggio restano indipendenti.
- Backend invariato. Da P64 aggiornare Index.html e Changelog.html e pubblicare una nuova versione.

## P64 — Intestazioni allineate e stato delle bozze

- Data e ora sulla stessa intestazione delle note, con o senza titolo. Riga comandi a colonne fisse; Progetti e tag allineato anche nei task. Scadenza task separata dall'ora di annotazione.
- Bozze ripristinate confrontate con valori salvati: quelle identiche non generano avvisi. Modifiche annullate tornano pulite. Bozze realmente diverse conservate e annunciate, con protezioni dei conflitti invariate.
- Test locali di allineamento, geometria mobile, caricamento senza falso avviso e recupero reale completati. Backend invariato. Palette ancora pendenti.

## P63 — Titolo direttamente nella nota

- Titolo facoltativo sempre modificabile nella testata, senza aprire Proprietà. Eliminato il campo duplicato nel pannello; simbolo e ora coerenti dopo aggiunta/rimozione del titolo.
- Accesso diretto Progetti e tag, con progetti selezionabili uno per uno e scelta multipla senza Ctrl. Tag separati e proprietà task conservate.
- Stato delle modifiche aggiornato anche selezionando soltanto progetti. Test di salvataggio/rilettura, mobile e regressioni completati; backend P62 invariato.
- Palette in Impostazioni ancora da sviluppare, confermate come prossimo passaggio: Carta calda, Salvia, Blu ardesia e Scuro.

## P62 — Diario: cache verificata e note senza titolo

- Lettura contenuti: indice marcatori costruito una volta per documento; cache temporanea delle sezioni verificata contro modifica Drive/versione voce. Test locale con zero Docs aperti a cache valida; tempi cloud ancora da misurare.
- La coda mantiene priorità sulla cache. Nessuna scrittura durante la lettura, dati autorevoli invariati, fallback in assenza/guasto cache. Contatore cache nel pannello tempi.
- Un solo pallino quando si aggiunge/rimuove il titolo; ora come riferimento visivo per note senza titolo; bordo inferiore selezione chiuso. Titolo resta facoltativo.
- Aggiornare DriveDocs.gs, JournalEditor.gs, Index.html e Changelog.html, conservando ROOT_FOLDER_ID. Fogli e trigger invariati. Palette in Impostazioni discusse, ancora da implementare.

## P61 — Tutte le pagine nello stile del diario

- Tema caldo persistente in Giorno, Settimana/checkup, Obiettivi/abitudini, Task, Progetti, Tag, File, Archivio e Impostazioni. Sidebar, titoli, pulsanti e campi coordinati.
- Barra di ricerca e corpo pagina allineati con larghezza massima comune. Riepiloghi compatti; colore distinto per scaduti. Layout adattati agli schermi stretti.
- Dettagli e finestre di cattura, sincronizzazione e novità coordinati. Le implementazioni e i salvataggi esistenti sono preservati.
- Bootstrap Vue P60.1 conservato. Test locali su nove viste, geometria 320/390 px, salvataggi giorno/settimana e finestre completati. Backend e manifest invariati; nessun deploy reale dell'agente.

## P60.1 — Caricamento Vue protetto

- Segnalata pagina bianca sul deployment P60: Unexpected end of input durante document.write nel pannello Google. La Demo locale non riproduce quel caricamento.
- Bundle incorporato come payload Base64 UTF-8 e decodificato dal browser, dopo l'HTML statico e prima dell'avvio. Nessun eval, CDN o cambiamento backend.
- Errore di avvio visibile e fallback al frontend precedente se il modulo non si inizializza. Identità del payload e percorso di errore verificati localmente; conferma cloud ancora richiesta.
- Aggiornare soltanto Index.html e Changelog.html e pubblicare una nuova versione dello stesso deployment. Fogli e trigger invariati.

## P60 — Un diario più piacevole

- Nuovo tema caldo: pagina chiara, sidebar coordinata, titoli tipografici, date a numero/giorno e icone SVG lineari. Selezione e comandi con colori e spaziature coerenti.
- Stato delle modifiche reattivo e riepilogo delle voci caricate: note e task aperti. L'aggiunta di voci conserva il DOM dell'editor; salvataggio esplicito e coda Docs invariati.
- Ricerca Ctrl/Cmd+K; Escape e clic esterno chiudono i menu rapidi. Nomi accessibili, focus visibile e rispetto della riduzione delle animazioni.
- Browser verificato da 320 px a desktop, oltre ai percorsi di salvataggio, bozze, task/date/stili e navigazione. Backend e manifest P59 invariati. Nessun deployment reale.

## P59 — Diario Vue e release con clasp preparata

- Pagina continua composta con Vue 3: gruppi giornalieri, componenti delle voci e ciclo di vita degli editor. Sidebar neutra, colonna di lettura comune, intestazione compatta e ricerca apribile.
- Comandi di inserimento/salvataggio unificati; una sola nota attiva con contorno ambra. Task compatti con scadenza e descrizione separata. Intenzione e riflessione rimangono visibili.
- DOM e focus degli editor conservati aggiungendo altre voci; nuova voce riceve il focus. Adattatore rich text e backend P58 riutilizzati, senza migrazioni dei fogli.
- Sorgenti Vue separati e compilazione self-contained in Index.html; solo sei file nel pacchetto Apps Script. Dipendenze e componenti non si copiano sul progetto Google.
- Clasp fissato a 3.4.1, configurazioni esempio e comando deploy: build/test, push, versione e aggiornamento dello stesso deployment. Login e identificativi personali non configurati; nessun deploy reale.
- Test backend, build, errori della release simulata e browser desktop/mobile superati. Prova autenticata della web app ancora da eseguire.

## P58 — Presentazione delle note, validazione e ritorno al diario

- Titoli nota più grandi e leggeri, simbolo a sinistra e data a destra; evidenziata una sola voce attiva. Formattazione apribile con Aa vicino al testo.
- Titolo nota facoltativo, titolo task obbligatorio su una sola riga; messaggi distinti per campi vuoti, lunghezza e marcatori. Errori visibili sulla voce con focus; bozze conservate.
- I blocchi nuovi completamente vuoti non bloccano il salvataggio. Dopo conferma riuscita, il cambio di menu non segnala modifiche pendenti.
- Pagina continua riutilizzata in memoria fino a 60 secondi durante la navigazione, con rilettura forzata tramite Aggiorna e invalidazione per versioni più recenti. Metadati di pianificazione aggiornati nella risposta, evitando una rilettura dei dati comuni dopo ogni salvataggio.
- Tempi separati per Pagina diario: metadati, contenuti e Docs aperti. Il ritorno Giorno → Diario verificato localmente senza nuova chiamata getJournalPage per una pagina recente.
- Piano per task collegati alle note e editor strutturato; preparazione dei soli file Apps Script per futuro clasp. Nessun framework installato o deploy automatico attivato.
- Prova sull'URL reale fermata alla pagina di accesso Google; nessuna modifica ai dati. Test locali superati; verifica cloud pendente.

## P57 — Un solo diario, note e task compatti

- Un'unica pagina ordinaria per leggere e scrivere: rimossa la scelta Vista elenco dalla barra del diario. La lettura precedente resta solo come recupero in caso di errore di caricamento.
- Note senza riquadri ripetuti, con testo modificabile sul posto; separatori leggeri e spazi ridotti. Task compatti con check, titolo e deadline, descrizione espandibile.
- Menu discreto ··· per proprietà, inserimento dopo una voce, bozza, dettaglio/allegati e link Docs; aggiunta per giorno per i contenuti storici.
- Titoli adattati alla larghezza e leggibili su mobile; compressione dentro la voce e comandi accessibili da tastiera/touch.
- Salva pagina, bozze, ordine nel giorno e sincronizzazione Docs invariati. Backend e trigger invariati.
- Verificati creazione/formattazione/date, task completati, identità dopo refresh, dettaglio, pagina di progetto e recupero bozza, geometria e titoli desktop/mobile. Prova cloud pendente.

## P56 — Espandi dentro la nota

- Corretto il contenimento del comando Comprimi/Espandi: il riquadro include il pulsante anche quando testo, proprietà e comandi aggiuntivi sono nascosti.
- Ordine di inserimento e salvataggio esplicito invariati: nuove voci in fondo al giorno, oppure subito dopo il blocco da cui si inserisce; Salva pagina registra le modifiche.
- Correzione solo frontend. Nessun cambiamento a backend, fogli, trigger o permessi.

## P55 — Editor continuo e pagine di progetto

- Diario modificabile per blocchi: note multilinea, task, formattazione e proprietà nella pagina, con titolo nota facoltativo ricavato dal testo.
- Deadline accanto al task; importanza, pianificazione, periodo di lavoro e stato in Altre proprietà. Gli errori aprono i campi coinvolti.
- Note richiudibili, inserimento dopo un blocco e scorciatoie Ctrl/Cmd+Invio (+Shift per task). Il testo incollato resta una sola nota.
- Pagina modificabile del progetto con le stesse voci del mese; nessuna duplicazione del contenuto e progetto ereditato dai nuovi blocchi.
- Salva pagina invia solo modifiche/nuove voci, in gruppi fino a 25; identificativi stabili, controllo versione e scritture limitate alle righe cambiate. JournalLayout conserva la posizione dei blocchi.
- Salvataggio senza chiamate Docs; contenuto/versioni su DocContent e replica con il trigger esistente. Anche il precedente modulo Nota completa, rimasto sincrono nella P54, usa ora la coda.
- Modifica del titolo con aggiornamento della sezione Docs e controllo dei conflitti sui titoli esterni; metadati soli senza nuova operazione Docs.
- Caricamento progressivo, bozze della scheda separate per mese/progetto e recupero dopo reload. Protezioni per contenuti avanzati e ritorno alla Vista elenco.
- Test locali backend/browser desktop/mobile e regressioni superati; verifica cloud e tempi reali pendenti. Nuovo file JournalEditor.gs da aggiungere nel progetto Apps Script.
- Analisi Agenda/NotePlan e direzione del prodotto documentate. Task interni alle note, export/import Markdown/JSON, offline completo e versione per più utenti restano sviluppi futuri.

## P54 — Salvataggio persistente e coda Docs estesa

- Nuove note e task con o senza descrizione, modifiche al testo e agli stili: salvataggio persistente su Sheets, sincronizzazione Docs tramite lo stesso processTaskDocQueue.
- DocContent conserva versioni del contenuto in segmenti da massimo 30.000 caratteri; la formattazione non dipende dalla memoria del browser. La versione precedente resta conservata.
- Un record in coda per voce: modifiche successive confluiscono nella versione più recente. Creazioni aggregate per destinazione e aggiornamenti per documento; test di due aggiornamenti sullo stesso Doc: una apertura.
- Apertura dettaglio di contenuti in attesa senza preparare Docs. Stato di attesa/errore esplicito; testo disponibile subito nell’app.
- Pannello Sincronizzazione Docs con attese, errori, ultimi 20 completamenti, aggiornamento manuale e Sincronizza ora (batch massimo 10).
- Aggiornamenti della coda limitati alle righe effettivamente cambiate. Metadati, riflessioni, obiettivi e abitudini restano salvataggi diretti su Sheets.
- Errori Docs ritentati; conflitti con modifiche esterne non sovrascrivono automaticamente il documento. Sblocco esplicito con copia del contenuto Docs del conflitto.
- Cancellazioni ancora sincrone quando il Doc esiste; rimozione delle versioni e della coda impedisce la ricreazione. Esportazione progetto bloccata finché ci sono sincronizzazioni pendenti.
- Test locali di persistenza, formattazione, raggruppamento, errori/ritentativi, conflitti, cancellazione e pannello superati. Verifica visiva, tempi e concorrenza cloud pendenti. Nessun autosalvataggio o editor continuo introdotto.

## P53 — Integrazione P52 e pacchetto coerente

- Conservate P48 locale e tutte le novità P49–P52: cache, stati abitudini, descrizioni separate, singola occorrenza task nel diario.
- Corretto il formato del changelog per il renderer effettivo; Demo allineata al codice distribuito.
- Invalidazione cache corretta anche negli inserimenti con tabella già caricata in memoria.
- Lettura numeri zero e booleani preservata; celle data legacy lette nel formato visualizzato. ROOT_FOLDER_ID locale conservato.
- Test locali eseguiti; deployment e prestazioni cloud da verificare. Nessun dato reale modificato.

## P52 — Task senza ripetizioni nel diario (12 ottobre 2026)

- Il diario continuo mostra ogni task solo nella data assegnata all’inserimento, anche con periodo di lavorazione, giorno pianificato o scadenza.

- Le label di pianificazione, lavorazione e scadenza rimangono visibili.

- Vista giorno, settimana/checkup e task aperti conservano le regole precedenti.

- Il filtro mensile del backend segue la data di inserimento, mantenendo i task nel mese corretto anche quando la lavorazione attraversa più mesi.

- Nessuna migrazione P52; il pacchetto include P51 con le descrizioni separate. Verifica locale effettuata, verifica cloud pendente.

## P51 — Titoli e descrizioni di obiettivi e azioni (11 ottobre 2026)

- Obiettivi e azioni hanno titolo e descrizione separati nei moduli di creazione e modifica.

- La descrizione dell’obiettivo si consulta sulla sua scheda; nelle azioni compare solo il titolo dell’obiettivo collegato.

- Le azioni mostrano la propria descrizione nell’elenco e nelle registrazioni giornaliere.

- Colonna description aggiunta in coda a Goals e Habits senza modificare titoli, ID o registrazioni esistenti. I vecchi testi non vengono divisi automaticamente.

- Distribuire Code.gs, Index.html e Changelog.html. Eseguire setup per aggiungere le intestazioni; validazione locale effettuata, verifica cloud da eseguire.

## P50 — Stati uniformi delle abitudini (11 ottobre 2026)

- Abitudini semplici e composte mostrano Da registrare/Da completare, Fatta e Non fatta.

- Nelle pratiche composte Fatta è selezionabile solo quando tutte le microazioni sono spuntate.

- Il completamento restituito dal server rimane visibile nel selettore; deselezionare una microazione riporta la pratica a Da completare.

- Backend invariato: controlli e promozione automatica erano già presenti. Verifica cloud pendente.

- Deployment da P49: Index.html e Changelog.html. Nessun nuovo permesso o migrazione.

## P49 — Ottimizzazione caricamento (11 Ottobre 2026)

- Sostituzione getDisplayValues con getValues: In DriveDocs.gs, tutte le funzioni di lettura (objectAt_, objectsSearch_, readEntries_, entrySearch_, ioRows_) utilizzano ora getValues() convertendo esplicitamente i valori in stringa. Questo evita il ricalcolo dei formati visivi da parte di Sheets, con un beneficio da misurare sul deployment.

- Caching dei dati comuni: In Code.gs è stata introdotta la funzione cachedRows_ che sfrutta CacheService.getScriptCache(). I fogli leggeri e statici (Projects, Goals, Habits, TaskPlans) vengono memorizzati in cache per 6 ore (21600 secondi).

- Invalidazione cache coerente: La funzione ioInvalidate_ in DriveDocs.gs è stata aggiornata per rimuovere esplicitamente le chiavi di cache (DB_Projects, DB_Goals, ecc.) quando avvengono modifiche, garantendo che l'interfaccia legga sempre dati aggiornati dopo un salvataggio.

- Le modifiche riguardano esclusivamente le performance del backend; Index.html e il funzionamento dell'interfaccia utente restano invariati. Tempi di risposta server e client da misurare post-deployment.

## P48 — Riquadro task scaduti

- Giorno e Settimana: task aperti con deadline precedente a oggi, inclusi i periodi precedenti. Esclusi completati, annullati e senza deadline; pianificazione e lavorazione non determinano la scadenza.

- Riquadro rosso tenue cliccabile per aprire/richiudere l’elenco; titoli aprono il dettaglio. Riferimento a oggi esplicito anche nelle viste storiche.

- Calcolo locale senza nuove chiamate API. Backend e trigger invariati; test locali superati, cloud pendente.

## P47 — Allineamento check, icona e testo

- Titolo abitudine con check, SVG e testo centrati verticalmente tramite flex.

- Microazioni con checkbox uniforme e testo centrato, anche su più righe; testo senza maiuscolo forzato per leggibilità.

- Backend invariato; sintassi verificata, verifica visiva cloud pendente.

## P46 — Colori dei task coerenti fra viste

- Task bianchi in tutte le liste, compresa Settimana e checkup; colore crema e bordo arancione solo sul task selezionato.

- Pannello dettaglio lavanda; completamento indicato da check e titolo barrato, senza sfondo speciale.

- Checkup in una colonna quando il dettaglio laterale è aperto, evitando tre colonne troppo strette.

- Verifica browser demo: bianco in diario/task/settimana, selezione crema/bordo arancione e dettaglio lavanda. Backend invariato; cloud pendente.

## P45 — Cornice unica e verifica browser delle viste

- Sostituite le regole P37/P44 di larghezza per vista con una cornice comune da 1200 px per diario, giorno, settimana, abitudini e task.

- Contenuto a tutta colonna quando non c’è dettaglio; eliminato restringimento al testo causato da justify-self:start.

- Con dettaglio: stessa cornice e stesso bordo sinistro, colonne 796/380 px più 24 px di distanza sul desktop grande. Sotto 1100 px dettaglio sotto il contenuto.

- Gutter di scorrimento stabile, per evitare spostamenti al passaggio tra pagine lunghe/corte. Padding e barra comuni.

- Verifica browser demo: cinque viste a 1920 px, stessa x=480.5 e larghezza=1200; dettaglio verificato. Mobile 390 px: nessun overflow orizzontale e larghezze uguali. Cloud pendente.

## P44 — Allineamento comune fra viste

- Un solo punto di partenza per barra ricerca, messaggi, inserimento e contenuto, basato su una cornice comune di 1400 px.

- Limiti di lettura 900/1100/1400 px conservati; le viste più strette non vengono più centrate indipendentemente.

- Padding laterale uniforme fra diario e altre viste. Backend invariato; controllo visivo cloud/mobile pendente.

## P43 — Check accanto al nome dell’abitudine

- Nelle abitudini semplici il check è accanto al titolo, con etichetta cliccabile; obiettivo associato su riga separata.

- Pratiche composte conservano check per microazione e completamento automatico della checklist.

- Backend invariato; sintassi verificata, controllo visivo cloud/mobile pendente.

## P42 — Abitudini più compatte

- Ridotti padding, distanze fra righe e spazio del comando Modifica abitudine quando chiuso.

- Moduli aperti mantengono separazione e campi leggibili; anche schede obiettivo e moduli di creazione chiusi più compatti.

- Backend invariato; sintassi verificata, verifica visiva cloud/mobile pendente.

## P41 — Icona obiettivo senza sovrapposizione

- Scheda obiettivo con colonna dedicata all’icona (42 px), spazio separato per titolo e risultato; moduli a tutta larghezza.

- Rimosso il posizionamento assoluto dell’emblema che sovrapponeva le nuove icone SVG al testo. Titoli lunghi possono andare a capo.

- Backend invariato; sintassi verificata, controllo visivo cloud/mobile pendente.

## P40 — Campi di obiettivi e abitudini riconoscibili

- Campi modificabili bianchi con bordo visibile sulle schede colorate; contorno di focus, altezza e spaziatura uniformi.

- Esempi nei campi vuoti di obiettivi, pratiche e microazioni; campi sola lettura distinti.

- Backend invariato. Sintassi verificata; controllo visivo cloud/mobile pendente.

## P39 — Navigazione senza attesa del lock di scrittura

- getState e getCommonState usano letture senza ScriptLock, con cache della singola richiesta reinizializzata. Navigazione non attende il worker Docs o altre scritture.

- Verificato che questi percorsi non scrivono dati o schema e non preparano documenti. Salvataggi, dettaglio con preparazione Docs e worker mantengono il blocco.

- Consistenza eventuale: durante scritture concorrenti una lettura può essere temporaneamente non allineata; aggiornare dopo la fine dell’operazione. Nessuna garanzia di snapshot atomico fra fogli.

- Test locali su sette viste/dati comuni e protezione scritture, regressioni P29/P35/P36 superati. Verifica cloud durante trigger pendente.

## P38 — Icone a contorno con ricerca

- Raccolta di 40 icone SVG monocromatiche, con tratto uniforme e nomi italiani.

- Selettore a griglia ricercabile per nome nei moduli obiettivi/abitudini; Nessuna icona e Aspetto attuale preservati.

- Emoji precedenti visualizzate come icone equivalenti, senza migrazione manuale. Nuove scelte salvate come identificativi stabili.

- Test locali ricerca/scelta/conversione e regressioni P35/P36 superati; verifica visiva cloud/mobile pendente.

## P37 — Larghezza di lettura sui monitor grandi

- Contenuto centrato a destra del menu: Giorno/Impostazioni massimo 900 px, diario/task/progetti e altre liste 1100 px, settimana/abitudini 1400 px.

- Con dettaglio aperto il layout può arrivare a 1400 px; pannello di 420 px sui desktop grandi, mantenendo il giorno entro 900 px. Dettaglio espanso fino a 1120 px.

- Larghezze fluide sui monitor piccoli; sidebar e dati invariati. Sintassi frontend verificata; verifica visiva cloud/mobile pendente.

## P36 — Icone scelte dall’utente

- Selettore icona in creazione e modifica di obiettivi e abitudini: raccolta di simboli, Nessuna icona oppure Aspetto attuale.

- Icona persistente nelle schede obiettivi, lista azioni, abitudini del giorno e tracker; scelta indipendente fra obiettivo e azioni.

- Goals H icon e Habits I icon aggiunte automaticamente al primo salvataggio. Valori precedenti vuoti mantengono l’aspetto storico; aggiornamenti del progresso preservano l’icona.

- Test locali persistenza/modifica/nessuna/validazione e regressioni P35/P29 superati; verifica cloud e mobile pendente.

## P35 — Abitudini composte, modifica ed eliminazione

- Una pratica può contenere fino a 30 microazioni: checklist nel giorno e completamento solo quando tutte sono spuntate. Una sola riga nel tracker.

- Nel modulo di creazione: microazioni facoltative, una per riga. Le abitudini semplici conservano il comportamento precedente.

- Modifica titolo, microazioni, inizio e giorni/frequenza dalla lista abitudini, conservando ID e registrazioni. Controllo delle modifiche concorrenti.

- Eliminazione con conferma mediante archiviazione: abitudine rimossa dalle attività previste, registrazioni conservate.

- Habits aggiunge steps e archived; HabitLogs aggiunge checklist con snapshot dei passaggi per data. Schema esteso al primo salvataggio; intestazioni occupate bloccano la scrittura.

- Verifiche locali su completamento parziale/totale, snapshot storico, conflitti e archiviazione superate; regressioni P29 superate. Deployment e UX cloud/mobile da confermare.

## P34 — Errori visibili nel modulo task

- Validazione locale di giorno/periodo incompatibili, fine senza inizio e intervallo invertito, in nuovo task e dettaglio.

- Messaggio vicino ai campi, evidenziazione e focus sul campo da correggere; invio bloccato prima della chiamata server. I dati compilati restano nel modulo.

- Errori server mostrati anche nel dialog aperto. Backend invariato; verifiche locali superate, cloud da confermare.

## P33 — Giorno corrente dal menu

- La voce Giorno del menu apre la data corrente Europe/Rome, calcolata al clic, anche dopo aver visitato una data passata.

- I collegamenti a date specifiche e il calendario mantengono la data scelta. Backend invariato.

## P32 — Correzione apertura della settimana

- Corretto il riferimento tags non definito nel riepilogo settimanale: il conteggio dei progetti usa entryProjects e ignora i tag liberi.

- Verificato rendering completo con progetti multipli, tag distinti e settimana vuota in Index e Demo. Backend e dati invariati.

## P31 — Importanza dei task

- Livelli Normale (predefinito), Urgente ed Emergenza, separati dalle date e salvati nella colonna importance di TaskPlans.

- Selettore nel nuovo task e nel dettaglio, bozze e rilettura; etichette nelle liste.

- Task aperti ordinati per importanza, poi deadline. Collocazione nel diario invariata. Programmazione settimanale conserva l’importanza.

- Colonna aggiunta al primo salvataggio senza migrare i task esistenti; colonne occupate vengono segnalate. Salvataggio rapido P29 preservato.

- Verifiche locali con servizi simulati superate; deployment e interfaccia cloud da confermare.

## P30 — Changelog caricato su richiesta (5 ottobre 2026)

- Registro spostato da Index.html nella risorsa Changelog.html del progetto Apps Script.

- Novità e versioni mantiene le sezioni espandibili, caricando la risorsa solo alla prima apertura tramite getAppChangelog. Richiesta condivisa e cache in memoria della pagina; errore leggibile e Riprova.

- Endpoint senza accesso a Sheets/Docs/Drive e senza lock; nessuna lettura del changelog durante navigazione e salvataggi.

- Demo carica lo stesso file via fetch quando si apre il registro; il contenuto viene reso come testo, senza eseguire HTML.

- Da P29 pubblicare Code.gs, Index.html e aggiungere Changelog.html; DriveDocs.gs invariato. ROOT_FOLDER_ID e manifest preservati. Tempi cloud e mobile P30 pendenti.

## P29 — Salvataggi batch e task differiti (5 ottobre 2026)

- Sezioni raggruppate per documento: una apertura/chiusura Docs per destinazione, DocRefs e nuove anteprime scritti in batch.

- Registry/DocRefs in Map e snapshot per richiesta; cartelle e controlli Drive riutilizzati nella richiesta, cache invalidata alle scritture e azzerata a ogni operazione.

- Task senza descrizione: coda persistente TaskDocQueue; nessuna apertura Docs al salvataggio. Preparazione alla prima apertura o tramite worker opzionale processTaskDocQueue. Trigger non installato automaticamente.

- Worker fino a 10 task, raggruppati per Doc; errori persistenti e retry, rinvio immediato se lock occupato. Esportazione compatibile con task ancora in coda.

- Modifiche stato/tag/progetti/pianificazione e pagine Days/Weeks con risposte incrementali, senza rilettura state_. Dettaglio e impostazioni conservati dal client.

- Sola modifica deadline/pianificazione: zero aperture Docs, corpo e stili invariati; modifiche reali testo/stili mantengono controlli di concorrenza e lettura fresca del Doc.

- Anteprime aggiornate per range contigui e nuovi record batch; migrazione legge 15 righe insieme e salva il cursore una volta; aggiornamento estratti ed esportazione riducono letture ripetute.

- Nessun getValue/setValue/appendRow nei backend; scritture mirate e batch setValues senza riscrittura indiscriminata dell’archivio.

- Confronto simulato 10 note stesso Doc: aperture/chiusure 10→1, scritture DocRefs/Previews 10→1 per foglio, setValues complessivi 21→3. Tempi cloud non misurati e non garantiti.

- Regres­sioni backend/UI e browser demo desktop superati. Pubblicare i tre file; conservare ROOT_FOLDER_ID. Nessun deployment o trigger reale eseguito.

## P28 — Pianificazione task e nota multilinea (5 ottobre 2026)

- Nuovo task e Dettaglio task: deadline/scadenza indipendente, giorno pianificato oppure periodo con inizio e fine facoltativa. Date tutte facoltative; periodo e giorno singolo sono alternative.

- Deadline riusa Entries.due. TaskPlans conserva entryId/date/updatedAt e aggiunge workStart/workEnd alle colonne 4/5 quando si salva; verifica delle intestazioni e compatibilità con i tre campi precedenti. Nessun setup aggiuntivo.

- Diario: periodo prima del giorno pianificato, poi deadline, poi inserimento. Periodo senza fine visibile dall’inizio fino a oggi/completamento; periodo con fine visibile nei giorni indicati. Il task rimane in Task aperti se incompleto. Una sola voce salvata, ripetuta nella vista.

- Pagina Giorno e cache della giornata seguono la stessa pianificazione. Lettura indice task fuori dal mese di inserimento per ritrovare le scadenze/pianificazioni del periodo; nessuna lettura Docs per navigare. Prestazioni cloud da misurare.

- Dettaglio task, Salva task, campi modificabili con bordo e sfondo chiaro; stato ancora salvato alla scelta. Titolo/data inserimento rimangono informazioni di riferimento; progetti e tag hanno editor dedicati.

- Bozze descrizione e pianificazione conservate insieme. Date impossibili, fine prima dell’inizio, fine senza inizio e giorno/periodo contemporanei rifiutati dal backend.

- Nuova nota propone Nota completa (un solo testo); Più voci · una per riga è una scelta esplicita. Bozze precedenti mantengono la modalità originale. Il testo GIT multilinea verificato come una sola nota. Nessuna fusione automatica delle note già create.

- Verifiche backend/UI simulate e browser desktop superate. Cloud e browser mobile P28 pendenti. Pubblicare Code.gs, DriveDocs.gs e Index.html insieme, mantenendo ROOT_FOLDER_ID.

## P27 — Diario e descrizione task (5 ottobre 2026)

- Selettore progetto e pulsante NotebookLM distanziati, con disposizione adattabile allo spazio disponibile.

- Conteggi voci, task aperti e file collegati con dimensioni uniformi e tre colori distinti.

- Diario continuo: intenzione e riflessione sotto la rispettiva data, anche nei giorni senza voci. Sono gli stessi campi Days della pagina Giorno; nessuna lettura Docs aggiuntiva. Le ricerche e le viste progetto/tag conservano la lista delle sole voci.

- Nuovo task con titolo e descrizione multilinea facoltativa. La descrizione è il corpo della sezione in Google Docs, modificabile nel dettaglio e visibile nell'estratto. Nessuna nuova colonna Sheets.

- Creazione con risposta incrementale, idempotenza e recupero delle creazioni interrotte conservati.

- Pianificazione distinta dalla deadline e periodo di lavorazione: proposta in discussione, non implementata in P27. Il diario continua a raggruppare i task per data di inserimento.

- Verifiche locali backend/UI e browser desktop demo superate; verifica cloud e browser mobile P27 pendenti.

- Da P26 aggiornare Code.gs e Index.html; DriveDocs.gs non cambia. Da P24/P25 aggiornare tutti e tre i file per includere P26.

## P26 — Tag separati dai progetti (5 ottobre 2026)

- Entries.tags nella nuova colonna 14; lettura compatibile con archivi a 13 colonne, aggiunta della sola intestazione quando si scrive. Nessuna riclassificazione automatica delle voci precedenti.

- Nuovi bullet: #nome è un tag. I progetti sono scelti nel selettore dedicato. Bozze precedenti recuperate mantengono la semantica progetto dei loro hashtag al primo salvataggio.

- Campi separati per tag in nota completa e nuovo task; editor tag e progetti nel dettaglio con controllo della versione.

- Pagina Tag: elenco etichette e ricerca esatta nell'archivio; badge #tag distinti dai badge progetto. I tag non alimentano il menu Progetti.

- Ricerca locale/archivio ed esportazioni NotebookLM includono i tag; non sono previste analisi AI automatiche.

- Conversione esplicita progetto → tag con anteprima del numero di voci dell'intero archivio, verifica delle versioni e blocco se esistono obiettivi collegati. Elimina la sola scheda Projects, conserva cartelle, Docs, testi, altri progetti e tag.

- Editor classificazione scrivono soltanto le colonne interessate, preservando il body legacy; il dettaglio mantiene testo, stili e link dopo il salvataggio.

- P25 senza state_ dopo creazione task/bullet conservata; lettura tag insieme a completedAt, senza leggere il body o i Docs durante navigazione.

- ROOT_FOLDER_ID e manifest preservati; nessuna nuova autorizzazione. Deployment: Code.gs, DriveDocs.gs e Index.html insieme.

- Verifiche: backend simulato, archivio >500 righe, regressioni P23–P25 e browser desktop su demo (task, nota completa, pagina Tag, modifica tag e mantenimento corpo/link). Conversione verificata nel backend simulato; cloud e mobile P26 pendenti.

- @progetto, unione di progetti duplicati e ricerca nel selettore progetti restano non implementati.

## P25 — Task e bullet senza rilettura completa (5 ottobre 2026)

- addJournal restituisce soltanto le voci della richiesta, senza state_ e senza rileggere dati comuni o allegati.

- Conservati batch multi-riga, idempotenza requestId e recupero dei Docs dopo un tentativo interrotto.

- Client inserisce subito il task anche in Task aperti e aggiorna le cache senza ricaricare i dati comuni.

- Diagnostica addJournal misura l'intero backend: validazione, lock, Sheets, Docs/riferimenti, risposta e finalizzazione.

- I valori server precedenti misuravano soltanto state_, non tutta la creazione. Il tempo residuo client non è attribuito automaticamente alla rete.

- Conservate tutte le funzioni integrate P24. Deployment: Code.gs e Index.html; DriveDocs.gs invariato.

- Test locali con servizi simulati; tempi e funzionamento cloud da misurare dopo pubblicazione.

## P24 — Integrazione dei due PC (5 ottobre 2026)

- Conservate le funzioni comuni P18–P21, inclusi obiettivi, azioni weekly:N, date italiane, anteprime formattate e sidebar sticky.

- Integrata P22 dell'altro PC: selettori multipli, rinomina con slug stabile, modifica delle associazioni tramite setEntryProjects senza spostare i Docs.

- Conservate P22 di questa chat (spunti personali nel checkup) e P23 (riflessione giornaliera Essenziale/Dettagliata, sette risposte separate, impostazione persistente).

- Correzioni tecniche: versione della rinomina sempre crescente; selettore task aggiornato dopo rinomina, selezione svuotata dopo creazione; metadati del dettaglio mostrano i nomi aggiornati.

- Conservati dati giornalieri nascosti/non inviati, compatibilità Days a quattro colonne e migrazione additiva; nessun testo precedente viene suddiviso automaticamente.

- DriveDocs.gs, ROOT_FOLDER_ID e manifest identici al ramo attivo; nessuna modifica alle proprietà personali durante l'integrazione.

- Tag liberi separati, @progetto, unione duplicati e ricerca dedicata nel selettore non implementati in nessuno dei rami. #nome conserva il significato di collegamento progetto.

- Verifica locale: verify-p23.cjs e verify-integration.cjs passati con servizi e DOM simulati; nessuna verifica browser visiva o cloud eseguita per P24.

- Deployment da P21/P22 di uno dei PC o P23: Code.gs e Index.html. Da P17 aggiornare anche DriveDocs.gs preservando ROOT_FOLDER_ID. Manifest e permessi invariati.

## P23 — Riflessione giornaliera configurabile (5 ottobre 2026)

- Impostazione persistente Essenziale/Dettagliata, condivisa fra dispositivi della stessa app.

- Sette risposte facoltative separate in Days: gratitude, lifeArea, smallStep, meaningfulMoment, feelings, difficulties, learning.

- Colonne aggiunte dopo updatedAt, senza spostare o suddividere testi precedenti.

- I campi nascosti e quelli non inviati restano conservati, anche salvando dal pannello delle abitudini.

- Conflitti controllati sia sulle giornate sia sulle impostazioni.

- Deployment: Code.gs e Index.html rispetto a P21/P22; DriveDocs.gs resta P21. Nessun nuovo permesso; impostazione iniziale Essenziale.

- Verifiche locali con servizi simulati; cloud da verificare.

## P22 (questa chat) — Spunti per intenzione e riflessione (5 ottobre 2026)

- Spunti facoltativi e richiudibili accanto ai campi esistenti della giornata.

- Mattina: attenzione, gratitudine e area della vita; sera: momenti significativi, emozioni, difficoltà e apprendimenti.

- Checkup: spunti personali accanto alle domande esistenti, senza nuovi campi.

- Nessuna risposta obbligatoria o modifica allo schema dei dati e al salvataggio.

- Deployment: solo Index.html rispetto a P21; da P17 aggiornare anche Code.gs e DriveDocs.gs mantenendo ROOT_FOLDER_ID.

- Verifica locale di sintassi e costruzione dei moduli; verifica cloud pendente.

## P22 (altro PC) — Progetti selezionabili e correggibili (5 ottobre 2026)

- Nuove note e task: selezione multipla dei progetti esistenti invece del campo libero. Creazione esplicita dalla pagina Progetti.

- Modifica progetto: nome e descrizione con identificativo slug conservato; cartelle e documenti restano collegati.

- Dettaglio nota/task: Modifica progetti collegati aggiorna le associazioni e conserva il documento originale nel suo percorso.

- Liste e breadcrumb mostrano il nome del progetto, anche dopo la rinomina.

- Compatibilità: #nome nei bullet resta un collegamento progetto; tag separati, sintassi @ e unione duplicati ancora da sviluppare.

- Test backend e demo: rinomina conserva associazioni, cambio progetto conserva testo, collegamento sconosciuto rifiutato.

- Deployment: Code.gs e Index.html da P21. Da P17 includere anche DriveDocs.gs aggiornato, preservando ROOT_FOLDER_ID.

## P21 — Menu laterale fermo durante lo scorrimento (5 ottobre 2026)

- Desktop: sidebar sticky alta quanto la finestra, con scorrimento autonomo per menu e progetti lunghi.

- Mobile: navigazione superiore conserva la disposizione esistente.

- Solo Index.html rispetto a P20; da P17 aggiornare tutti e tre i file per includere P18–P20.

## P20 — Anteprime con grassetto e corsivo (5 ottobre 2026)

- Estratti formattati limitati a 220 caratteri nel foglio Previews, colonna richExcerpt aggiunta automaticamente alla prima scrittura.

- Diario e altre liste rendono grassetto e corsivo con elementi testuali sicuri; dimensioni e impaginazione restano uniformi.

- Creazione e modifica aggiornano la preview senza nuove letture Docs; Aggiorna estratti da Google Docs aggiorna anche gli stili di note esistenti.

- Anteprime precedenti senza stili rimangono leggibili; nessuna lettura automatica Docs alla navigazione.

- Deployment: Code.gs, DriveDocs.gs e Index.html, conservando ROOT_FOLDER_ID. Include P18 e P19.

## P19 — Scadenze italiane e inserimento task (5 ottobre 2026)

- Bullet rapidi: scadenze DD/MM/YYYY e YYYY-MM-DD convertite in ISO; date impossibili rifiutate.

- Task aperti: Nuovo task con testo, data inserimento, progetti e calendario scadenza facoltativa; nessun simbolo richiesto.

- Eliminazione nota in fondo al documento: conserva un paragrafo finale vuoto, evitando il vincolo di Google Docs sull’ultimo paragrafo.

- Deployment: Index.html, Code.gs e DriveDocs.gs. Include P18; conservare ROOT_FOLDER_ID.

- Moduli vuoti aperti con la data corrente di Roma; data del diario esplicitamente etichettata. Le bozze e le voci già salvate mantengono la propria data.

- Verifica locale parser e demo; cloud da verificare.

## P18 — Obiettivi modificabili e azioni flessibili (5 ottobre 2026)

- Pulsante in una riga dedicata, allineato a sinistra con i campi e separato di 18 px dal campo Progetto facoltativo.

- Modifica del testo, risultato atteso e progetto di un obiettivo, conservando ID, progresso e azioni collegate.

- Moduli obiettivo e azione separati; pulsante Crea azione sotto i giorni.

- Frequenza libera da 1 a 7 volte a settimana, alternativa ai giorni fissi; una registrazione al giorno. Totale non riproporzionato nelle settimane parziali.

- Nome dell’obiettivo visibile nella lista delle azioni; messaggio esplicito per settimane senza azioni attive.

- Deployment: Index.html e Code.gs. DriveDocs.gs invariato. Nessuna nuova colonna: Habits.days usa weekly:N per le frequenze libere.

## P17 — Formattazione e salvataggi delle note

- Il link viene impostato prima degli stili espliciti: la sottolineatura non viene affidata ai valori predefiniti del collegamento.

- Supportati nella lettura i normali colori blu dei link; stili avanzati non supportati restano protetti da modifiche nell’editor.

- Modifica della nota: risposta con la sola voce aggiornata, senza state_ e senza riaprire il Doc per costruire la risposta. Restano controllo della versione, testo, stili e marcatori.

- Confronto degli stili indipendente da campi riordinati, dimensione predefinita e suddivisione equivalente dei segmenti; le vere modifiche concorrenti restano rilevate.

- Tempi di modifica separati: attesa lock, lettura Sheets, lettura Docs, controllo conflitti, scrittura Docs, scrittura Sheets, estratto, risposta e finalizzazione. Non si promette una durata cloud prima di misurarla.

- Elementi consecutivi dell’elenco raggruppati nella stessa lista, anche nel Doc: la numerazione prosegue alla riapertura.

- Inserimento link con finestra e campo URL, utilizzabile anche su mobile.

- Test backend e demo: sottolineatura, grassetto, corsivo, dimensioni, titoli, elenchi e link; risposta minima, conflitti e stili avanzati protetti. Salvataggio/riapertura giornata e checkup nella demo; layout mobile a 390 px.

- Deployment: DriveDocs.gs e Index.html, conservando ROOT_FOLDER_ID. Code.gs invariato. Verifica cloud P17 ancora da eseguire.

## P16 — Lettura esplicita degli stili di Google Docs

- Lettura di grassetto, corsivo, sottolineatura, dimensioni, link e attributi protetti con i metodi specifici di Text, anziché dalla mappa generica getAttributes.

- Verifica cloud P15: il documento originale conserva grassetto e corsivo; il dettaglio dell’app li perde durante la lettura.

- Test locali: roundtrip e lettura con mappa attributi vuota ma getter specifici valorizzati; conflitti reali ancora protetti.

- Deployment: DriveDocs.gs e Index.html (versione e changelog). Verifica cloud P16 ancora necessaria.

## P15 — Correzione falso conflitto della formattazione

- Il confronto degli stili ignora l’ordine delle proprietà JSON, che può cambiare nel trasporto Apps Script.

- Rimane attivo il controllo delle vere modifiche concorrenti in Google Docs.

- Test: il confronto precedente riproduce il falso conflitto; quello corretto salva con campi riordinati e rifiuta stili realmente cambiati.

- Deployment: DriveDocs.gs e Index.html (badge e changelog), conservando le impostazioni personali. Code.gs non modificato rispetto a P13.

- Verifica cloud della correzione ancora da eseguire dopo la pubblicazione.

## P14 — Correzione errore nel checkup settimanale

- Rimosso il riferimento a e.richUnsupported fuori contesto in renderWeek, causa di e is not defined.

- L’errore interrompeva la costruzione della vista e, prima di P13, la successiva aggiunta delle icone.

- Verifica specifica di form checkup completo, salvataggio e riapertura; il solo test di navigazione precedente non rilevava l’errore catturato da run.

- Deployment: solo Index.html se il backend P13 è già installato.

## P13 — Menu e letture settimanali

- Icone SVG colorate create insieme ai pulsanti del menu, con dimensioni esplicite.

- Per tabelle accessorie fino a 500 righe, lettura unica e filtro in memoria al posto di ricerca più rilettura.

- Settimana piccola: filtro unico sui metadati, conservando task aperti fuori settimana e completamenti utili al checkup. Percorso mirato mantenuto per archivi grandi.

- Nessuna lettura file o estratti se la vista non contiene voci; tempi estratti separati dai file.

- Deployment: Code.gs, DriveDocs.gs e Index.html, preservando ROOT_FOLDER_ID. Nessuna migrazione o nuovo permesso.

- Latenza Google reale da misurare dopo il deployment; cache locale invariata.

## P12 — Barra dei comandi uniforme

- Versione accanto a Bullet Journal in fondo al menu laterale, sempre cliccabile per il changelog.

- Cerca nel periodo, Aggiorna e Nuova nota nella stessa barra in tutte le viste, incluso il diario continuo.

- Navigazione mensile separata dalla ricerca; disposizione mobile con ricerca sopra i pulsanti.

- Deployment: solo Index.html; backend e dati invariati.

## P11 — Intestazione semplificata

- Rimossa la dicitura Secondo Cervello · Precisione Analogica.

- Intestazione con Diario personale, versione e pulsante Aggiorna.

- Deployment: solo Index.html; nessuna modifica ai dati o al backend.

## P10 — Changelog consultabile nell’app

- Novità e versioni nel menu e badge versione cliccabile.

- Registro incorporato nel frontend, senza chiamate Drive/Sheets; apertura e chiusura conservano la nota e le bozze.

- Cronologia a sezioni espandibili, consultabile anche da mobile.

- Descrizione del pulsante Aggiorna e separazione delle etichette nell’intestazione.

- Corretto un controllo rich text fuori contesto che impediva di aprire la vista Giorno.

- Test locali browser: apertura/chiusura, Escape, bozza conservata, zero chiamate backend e mobile.

- Deployment: solo Index.html se P9 è già installata. Da versioni precedenti includere anche DriveDocs.gs di P9.

## P9 — Editor formattato nelle note

- Barra di formattazione nell'inserimento Nota completa e nel dettaglio.

- Stili salvati come attributi e paragrafi/list item nel Google Doc e riletti su richiesta; anteprime testuali.

- Bozze formattate, protezione di marcatori, conflitti di stile e blocco dei contenuti avanzati non supportati.

- Test backend simulato e browser desktop/mobile passati; cloud da verificare.

- Deployment: Index.html e DriveDocs.gs insieme, preservando ROOT_FOLDER_ID. Nessun setup o nuovo permesso.

## P8 — Dettaglio espandibile

- Dettaglio più largo sui desktop ampi e pulsante Espandi/Riduci nota con bozza conservata.

- Test browser salvataggio, chiusura/riapertura ed espansione passati.

- Deployment: Index.html; Code.gs invariato.

## P7 — Interfaccia e versione visibile

- Aggiorna fisso nell'intestazione, disponibile anche con dettaglio chiuso.

- Apri nota esplicito nelle liste; chiusura e riapertura ripetute verificate in diario e giorno.

- Pannello nota uniformato tra viste, icone menu nuovamente colorate.

- Badge v3 / P7 sempre visibile.

- Test locali browser desktop/mobile e note complete passati.

- Deployment: Index.html; se il backend è ancora P5 aggiornare anche DriveDocs.gs per includere P6, preservando ROOT_FOLDER_ID.

## P6 — Creazione nota completa

- Risposta con sola nota creata, senza rilettura completa della vista.

- Misure backend di attesa lock, Sheets, sezione Docs/riferimenti e finalizzazione.

- Test locali passati; latenza sul cloud da confrontare.

- Deployment: DriveDocs.gs e Index.html insieme.

## P5 — Primo caricamento progressivo

- Diario prima dei dati comuni, richiesta condivisa in background.

- Viste dipendenti attendono i dati necessari.

- Prova cloud riportata: diario 1.773 ms; comuni separati 2.845 ms; cache 3–5 ms. Valori osservati, non garanzie.

- Deployment: Code.gs e Index.html.

## P4 — Viste dai dati disponibili

- Giornate ricavate da un mese completo già caricato; obiettivi dai dati comuni recenti.

- Primo passaggio verso queste viste senza chiamata server se dati recenti.

- Task, settimana e progetto mantengono copertura fuori periodo tramite server.

- Deployment: Index.html.

## P3 — Diagnostica cache

- Versione nel pannello tempi e motivi delle richieste.

- Confermato sul cloud il ritorno a una vista in circa 2 ms.

## Prestazioni precedenti a P3

- Cache sessione delle ultime16 viste, TTL60 secondi; Aggiorna forza rilettura.

- Protezione da risposte obsolete e modifiche in corso.

- Estratti220 caratteri nel foglio Previews, aggiornati alla scrittura dall'app.

- Rimossa lettura automatica Docs per le anteprime; aggiornamento manuale delle prime12 voci.

- Letture Sheets raggruppate, database riutilizzato nella singola operazione.

## Funzioni v3 precedenti alla numerazione P

- Note complete: titolo e corpo multilinea; bullet rapidi: una voce per riga.

- Scrittura nel dettaglio e salvataggio nel Doc; bozze temporanee nella stessa scheda del browser; controllo ottimistico dei conflitti.

- Eliminazione coordinata di note e riferimenti; caso documento già svuotato gestito. Nessun cestino note.

- Diario mensile Docs, note progetto Docs, Sheets come indice, cartella Drive assegnata.

- Giornata, settimana/checkup, task, programmazione successiva e abbandono.

- Obiettivi trimestrali e habit tracker; ricerca letterale archivio a blocchi.

- Link allegati e esportazione progetto per NotebookLM (aggiunta manuale delle fonti).

- Interfaccia adattata alle esportazioni Stitch.

Le modifiche senza etichetta P non hanno una data/versione di rilascio univoca registrata. Non vengono attribuite retroattivamente date non verificate. I test locali usano servizi simulati; le osservazioni cloud provengono dall'utente.

```eof

I've generated the complete updated `Changelog.html` containing the new `P49` entry for today's performance optimizations. You should replace the contents of your `Changelog.html` file in the Apps Script editor with this new text. Also, remember to bump the version number in `Index.html` if you are tracking the P-versions there (e.g. from `v3 / P48` to `v3 / P49`).
