# Versione attuale P81

Da P80 aggiornare Index.html e Changelog.html. Vedi AGGIORNAMENTO-P81.md.

# Versione attuale P80

Da P79 aggiornare Index.html e Changelog.html. Vedi AGGIORNAMENTO-P80.md.

# Versione attuale P79

Da P77/P78 aggiornare Index.html e Changelog.html. Vedi AGGIORNAMENTO-P79.md.

# Versione attuale P77

Da P76 aggiornare solo Index.html e Changelog.html. Vedi AGGIORNAMENTO-P77.md.

# Versione attuale P76 — GDiary

Aggiornamento: Code.gs, Index.html e Changelog.html da P74. Vedi AGGIORNAMENTO-P76.md.

# Diario continuo v3 — Drive, Docs e letture mirate

**Tag separati dai progetti:** nuove etichette in Entries.tags; #nome nei nuovi bullet è un tag. Per i dati precedenti usare la conversione esplicita nella pagina Progetti. Le descrizioni e gli aggiornamenti storici successivi conservano la semantica delle rispettive versioni.

Versione corrente: **P73 integrata**. Per aggiornare leggere AGGIORNAMENTO-P73.md e README.md; per differenze e verifiche storiche leggere INTEGRAZIONE-P24.md. Le sezioni successive includono descrizioni storiche: il changelog distingue le due P22. Intenzione e riflessione restano in Sheets, con sette campi separati facoltativi quando si attiva Dettagliata. Progetti: selezione multipla, rinomina con slug stabile e associazioni modificabili.

**P60:** nuova resa visiva, stato reattivo delle modifiche e comandi più curati. Da P59 aggiornare Index.html e Changelog.html. Backend e trigger invariati; nessun deploy reale.

**P59:** diario continuo composto con Vue e grafica riorganizzata. Da P58 aggiornare soltanto Index.html e Changelog.html. Il file Index è già compilato; i componenti sorgenti non vanno copiati in Apps Script. Per sviluppare usare npm run build. Clasp è incluso e il comando deploy è preparato; autenticazione e identificativi personali restano da configurare. Backend, fogli e trigger invariati rispetto a P58.

**P58:** aspetto note aggiornato, validazione sul campo e ritorno al diario recente senza rilettura dei contenuti. Aggiornare Index.html, JournalEditor.gs e Changelog.html. Piano dei task interni in PIANO-EDITOR-AGENDA.md; deploy predisposto ma non attivato.

**P57:** diario unico con note modificabili e task compatti, menu ··· per proprietà e allegati. Da P55/P56 aggiornare Index.html e Changelog.html. Per la prima installazione dell’editor seguire anche AGGIORNAMENTO-P55.md.

**P55:** scrittura direttamente nel diario e nella pagina di un progetto, con Salva pagina, note richiudibili e task con scadenza. Aggiungere JournalEditor.gs oltre ad aggiornare DriveDocs.gs, Index.html e Changelog.html. Trigger invariato. Vedere DIREZIONE-PRODOTTO.md per la distinzione fra funzioni presenti ed evoluzioni proposte.

**P54/P55:** note e descrizioni sono conservate subito su Sheets (DocContent, versioni segmentate) e replicate in Docs tramite coda. Non cancellare DocContent o TaskDocQueue. Il nuovo pannello mostra la sincronizzazione.

## Cosa è implementato

La v3 conserva le funzioni v2 (giorni, settimane, obiettivi trimestrali, abitudini, task, file collegati) e aggiunge una cartella Drive assegnata, creazione di sottocartelle, documenti mensili e di progetto, letture mirate dei riferimenti e esportazione per NotebookLM.

La demo **Demo.html** simula anche Drive e Docs. Usa dati dimostrativi di ottobre 2026, con una data server fissa per le verifiche; le bozze dell’editor restano nella scheda dopo reload, mentre l’archivio simulato viene ricreato. Il pulsante Apri e scrivi in Google Docs apre un editor dichiaratamente simulato; nell'app reale apre il vero Google Doc. La demo non trasmette dati a Google e non conserva i salvataggi dell’archivio simulato dopo una ricarica. La v2 resta disponibile separatamente.

## Installazione o aggiornamento

1. Fai una copia del tuo Sheet v2 in Drive come backup. Usa inizialmente una copia di prova, con pochi dati, per verificare la v3 nel tuo account.
2. Crea una cartella privata su **Il mio Drive**, ad esempio `Bullet Journal`. Copia l'ID dall'URL `https://drive.google.com/drive/folders/ID`.
3. Apri Apps Script dal Sheet associato. Sostituisci Code.gs e Index.html con i file v3. Aggiungi un secondo file script chiamato **DriveDocs** e incolla DriveDocs.gs. Aggiungi anche il file script **JournalEditor** con JournalEditor.gs e il file HTML **Changelog** con Changelog.html.
4. Sostituisci il manifest con appsscript.json. I nuovi scope sono Google Drive e Google Docs, oltre a Sheets. Google richiederà una nuova autorizzazione.
5. In DriveDocs.gs sostituisci `INCOLLA_ID_CARTELLA` nella costante `ROOT_FOLDER_ID` con l'ID scelto.
6. Esegui **setupDrive** dall'editor. Crea le schede aggiuntive, assegna la directory, sposta il solo Sheet associato dentro quella directory e crea Diario, Progetti ed Esportazioni NotebookLM. Non sposta altri tuoi file.
7. Per note già salvate in v2 esegui **migrateDocsBatch**. Ogni esecuzione tratta fino a 15 voci. Ripeti finché il valore `remaining` è zero. La migrazione copia il corpo delle vecchie note nei Docs e conserva il testo precedente nel Sheet; fai comunque il backup. Non converte automaticamente un diario annuale esterno.
8. Pubblica una **nuova versione** della web app: esegui come me, accesso solo io. Apri l'URL `/exec` con lo stesso account.

Non ho configurato né pubblicato l'app sul tuo account Google. I test sono locali con servizi simulati e browser reale; resta necessaria la prova sul cloud. Il codice usa DriveApp per Il mio Drive: i Drive condivisi non sono stati supportati o verificati.

Il permesso Drive è ampio: la directory è un confine imposto dal codice, non una limitazione OAuth alla sola cartella. Lo script non modifica condivisioni. I file creati nella cartella seguono le relative condizioni di accesso: scegli una cartella privata.

Fonti API: [Drive Service](https://developers.google.com/apps-script/reference/drive/), [Document tabs](https://developers.google.com/apps-script/reference/document/document-tab), [web app e identità di esecuzione](https://developers.google.com/apps-script/guides/web).

## Struttura della directory

```text
Bullet Journal/
  Indice (il Google Sheet associato)
  Diario/
    2026/
      2026-10 — Diario
  Progetti/
    casa/
      casa — Note
      Allegati/
  Esportazioni NotebookLM/
    casa — Fonti NotebookLM
```

Cartelle e documenti vengono registrati per ID in Registry, non cercati nuovamente per nome a ogni utilizzo. Puoi rinominarli mantenendo i collegamenti. Un documento gestito spostato fuori dalla directory o nel cestino causa un errore: non viene ricreato automaticamente rischiando di perdere lo storico. Ripristina la collocazione.

Un nuovo progetto crea la cartella e Allegati; il documento delle note viene creato alla prima nota. Una nota personale va nel diario del mese; una nota di progetto va nel documento del primo progetto associato. Più tag permettono di visualizzare la stessa nota in più progetti, conservando un solo originale.

Gli allegati esistenti rimangono link ai file originali. La sottocartella Allegati è predisposta, ma l'upload diretto non è implementato: puoi caricare file lì tramite Drive e collegarli nell'app.

## Scrittura e dettaglio delle note

Nella P55 il diario continuo è modificabile e il titolo può essere aggiornato nella pagina. Testo e stili vengono salvati su Sheets e replicati nei Docs dalla coda; il dettaglio originale resta disponibile da Vista elenco. Le descrizioni sottostanti riportano anche comportamenti storici: per il rilascio corrente prevale AGGIORNAMENTO-P55.md.

L'inserimento rapido crea una voce nell'indice e una sezione nel relativo Doc. Il dettaglio legge il corpo dal Doc soltanto quando apri la voce. Premi **Apri e scrivi in Google Docs** e scrivi tra i marcatori:

```text
[BJ:ID_NOTA]
Il testo completo della nota, anche su più paragrafi.
[END:ID_NOTA]
```

Preserva i marcatori, mantienili una sola volta e non spostare la sezione in un'altra scheda del documento. Il bookmark porta vicino al titolo della sezione. Questa prima versione lavora nella prima scheda dei Docs creati dall'app. Titolo, data e ambito della voce sono fissi nell'interfaccia v3; scadenza e stato dei task restano modificabili. Le modifiche libere a titoli o sezioni aggiunte direttamente in Docs non vengono importate nell'indice.

Quando torni nell'app, riapri la voce per rileggere il testo aggiornato. La lettura restituisce testo semplice: la formattazione ricca resta nel Doc. La nota non viene riscritta dall'app, evitando sovrascritture della digitazione in Docs.

Le pagine Giorno e Settimana, incluse riflessioni e checkup, restano per ora salvate in Sheets. La loro trasposizione come sezioni gestite nei Docs mensili è una fase successiva. Anche lo snapshot immutabile della revisione e la data programmata distinta dalla scadenza non sono ancora implementati.

## Letture e limiti prestazionali

Il diario carica i metadati del mese corrente; i pulsanti cambiano mese. Non carica automaticamente i corpi dei documenti. La vista progetto recupera i metadati associati a quel progetto anche da altri mesi. Le viste task e settimana recuperano anche task pertinenti fuori dal periodo del diario.

La ricerca UI è limitata ai riferimenti già caricati (titoli, tag, date e file disponibili), non al testo di tutti i Docs. Il Sheet usa TextFinder su colonne di metadati per individuare righe e legge i gruppi consecutivi. Questo evita di trasferire tutti i testi e tutte le righe all'app, ma la ricerca lato Sheets può comunque scansionare la colonna: non è un indice database e non garantisce tempi costanti.

Tabelle accessorie di obiettivi, abitudini, pagine e log vengono ancora lette integralmente; per una storia di molti anni andranno paginate. Dopo una modifica viene riletta la vista corrente, non ancora restituito un delta minimo. La v3 è un miglioramento concreto del caricamento, non un'ottimizzazione definitiva.

## Fonti per NotebookLM

Apri un progetto e premi **Prepara fonti per NotebookLM**. Viene creato o aggiornato un Doc dedicato sotto Esportazioni NotebookLM, con note in ordine cronologico, corpi letti dagli originali, stato/scadenza dei task e link alle fonti e agli allegati.

L'esportazione procede a blocchi di 10 note per chiamata. Se la connessione cade, torna nel progetto e premi lo stesso pulsante: riprende il job in corso. I marcatori di esportazione evitano di aggiungere due volte una nota già scritta durante un tentativo interrotto. Fino al completamento il documento è contrassegnato In corso. Una nuova esportazione completata mantiene l'ID del Doc e riscrive il solo documento generato, non gli originali.

Non modificare o aggiungere le note del progetto durante l'esportazione: questa prima versione non crea una fotografia transazionale degli originali. Non modificare manualmente i documenti generati: le tue modifiche verrebbero sostituite alla successiva esportazione.

Il pulsante **non invia nulla a NotebookLM e non esegue analisi AI**. Aggiungi tu il Doc al notebook del progetto. I link agli allegati non importano il loro contenuto: aggiungi separatamente PDF e altri file pertinenti. La sincronizzazione effettiva delle fonti va verificata nel notebook prima dell'analisi.

## Prova consigliata nel tuo account

1. Crea una nota personale e una nota #casa; verifica cartelle, Docs e bookmark.
2. Scrivi qualche paragrafo nel Doc e riapri il dettaglio.
3. Crea una nota nel mese precedente e verifica il cambio mese.
4. Apri Casa e verifica che raccolga entrambe le date.
5. Completa un task, salva focus e registra un'abitudine; ricarica per controllare la persistenza.
6. Esporta Casa e verifica il testo completo nel documento per NotebookLM.

Test locali passati: creazione idempotente, mesi mirati senza body Sheets, progetto trasversale, lettura dei Docs, migrazione legacy, esportazione riprendibile, confine della cartella, editor simulato e rilettura, interfaccia desktop/mobile. Non sostituiscono la verifica di permessi e servizi nel tuo account.

## Interfaccia aggiornata

Il diario continuo lascia spazio alle note e apre l'inserimento con Nuova nota. Il dettaglio laterale mostra il contenuto letto dal Doc e il collegamento per modificarlo. La settimana affianca pianificazione e checkup. Gli obiettivi trimestrali mostrano progressi e habit tracker: clicca una data prevista per registrare l'azione e la riflessione del giorno nel pannello laterale. Le immagini *-design.png mostrano l'interfaccia implementata con dati di esempio.

## Scrittura e salvataggio

Il pannello Testo della nota permette di scrivere testo semplice direttamente nell'app e salvarlo nella sezione del Google Doc originale. Salva nota salva anche la scadenza dei task. Ctrl+Invio invia il modulo attivo. Le modifiche da salvare, il salvataggio e gli errori sono mostrati nella barra superiore. Le bozze dell'inserimento rapido e del testo delle note sono conservate in sessionStorage nella stessa scheda del browser: sopravvivono al ricaricamento, non sono sincronizzate e possono andare perse chiudendo la scheda. Una bozza recuperata si confronta con il testo attuale prima di ripristinarla. Il salvataggio confronta il testo letto e la versione dei metadati e rifiuta le modifiche se trova cambiamenti. Google Docs non offre un blocco condiviso con questo controllo: evitare modifiche simultanee nello stesso momento dall'app e da Docs. L'editor riscrive i paragrafi della singola nota come testo semplice; usare Google Docs per preservare formattazione avanzata. Se la sezione contiene tabelle o altri elementi complessi, la modifica dall'app viene rifiutata. Limite editor: 100.000 caratteri. Nessun salvataggio automatico su Drive.

## Checkup operativo e ricerca archivio

Nella settimana ogni task aperto offre Completa, Prossima settimana e Abbandona. Prossima settimana programma il task per il lunedì successivo nel nuovo foglio TaskPlans, senza spostare la nota o cambiare la scadenza. Prepara la prossima settimana apre la pianificazione successiva. Salvare prima eventuali riflessioni in modifica. I task abbandonati restano nel diario; dal dettaglio si possono riaprire. Eseguire setup (o setupDrive) per aggiungere TaskPlans a un archivio esistente.

La casella di ricerca filtra normalmente il periodo; premere Invio o Cerca in tutto l'archivio avvia una ricerca letterale senza distinzione maiuscole/minuscole nei titoli, tag, date, nomi dei file collegati e corpi delle note nei Docs gestiti. I testi sono letti a blocchi di cinque documenti; Continua ricerca completa i blocchi successivi. Le sezioni illeggibili sono segnalate come risultati incompleti. Non legge il contenuto degli allegati né cerca tra file Drive non indicizzati. Non è ricerca semantica. La prima versione legge tutti i metadati per ogni blocco, mentre i corpi vengono caricati a blocchi solo su richiesta.

## Design Stitch integrato

L'interfaccia usa palette e tipografia delle esportazioni Stitch: Plus Jakarta Sans, JetBrains Mono, superfici lavanda, accento ambra e schede arrotondate. I font vengono caricati da Google Fonts; in assenza di rete si usano font di sistema. Non è necessario caricare Tailwind: gli stili sono incorporati in Index.html. StitchStyles.css documenta il livello grafico applicato. Il backend resta quello esistente. Miniature di schermate, stati di sincronizzazione fittizi e funzioni non disponibili degli export sono esclusi; i messaggi mostrano le operazioni effettive. Diario e obiettivi mantengono il dettaglio laterale su desktop e lo dispongono verticalmente su mobile.

Inserimento Nota completa disponibile: vedere AGGIORNAMENTO-NOTA-COMPLETA.md per aggiornare l'app già pubblicata. Titolo e corpo multilinea creano una sola sezione in Docs. I bullet rapidi restano una voce per riga.

Aggiornamento più recente: P9, formattazione delle note. Leggere AGGIORNAMENTO-FORMATTAZIONE.md per aggiornare soltanto Index.html e DriveDocs.gs.

P10: changelog consultabile dall’app; istruzioni AGGIORNAMENTO-CHANGELOG.md.

P73: diario continuo unico con abitudini espandibili, riporto checklist e menu desktop fermo. Leggere AGGIORNAMENTO-P73.md.
