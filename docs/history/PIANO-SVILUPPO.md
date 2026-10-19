# Piano di sviluppo per fasi

## Stato corrente — P71 integrata

Tag privati implementati (configurazione server persistente, visibilità solo in memoria). Nuova nota privata, mostra/nascondi, inattività. Riflessioni giornaliere rich modificabili in diario/Giorno; Days.intentionRich/reflectionRich aggiunte al primo save. Aggiornare quattro file da P69: Code/DriveDocs/Index/Changelog. Nessun deploy reale.

### P69

Checklist: cursore dopo casella nelle righe nuove, Backspace/Canc rimuove la casella vuota. Backend invariato. Note private per tag ancora da implementare: tag configurabili come nascosti, modalità Mostra private temporanea su tutte le viste. Nessun filtro attivo ora.

### P68

Editor: H3/citazione/codice, barrato, quattro font, colore/evidenziatore e checklist. Docs: checklist con simboli, non native; stili estesi con rilettura e validazione. Aggiornare quattro file, conservando ROOT_FOLDER_ID.

### P67

Titolo con centratura ottica corretta e regole delle palette isolate dai campi di modulo. Verifica Blu ardesia e quattro palette, note/task e mobile. Backend invariato.

### P66

Titoli: riquadro e testo con spazi/bordi costanti e altezza corretta. Proprietà: chiusura con clic esterno o Esc, preservando i valori della bozza. Test locali completati; backend invariato.

### P65

Palette implementate: quattro scelte in Impostazioni > Aspetto, applicate immediatamente e conservate per browser. Icone e controlli coerenti su tutte le viste. Da P64 soltanto Index e Changelog; nessun deployment Google eseguito.

### P64

P64: note con/senza titolo condividono data/ora in testata. Colonne comandi allineano Progetti e tag nei task. Bozze identiche e modifiche annullate pulite; bozze realmente diverse recuperate con messaggio esplicito, conflitti server invariati. Test locali completati. Backend P62/P63 identico; aggiornare Index e Changelog. Palette in Impostazioni ancora da implementare come prossimo passaggio.

### P63

P63: titolo nota sempre diretto, pannello Progetti e tag compatto con scelta multipla tramite pulsanti. Stato modifiche e roundtrip verificati. Da P62 aggiornare solo Index e Changelog; backend identico. Palette selezionabili in Impostazioni ancora pendenti e confermate dall’utente come prossimo sviluppo (Carta calda, Salvia, Blu ardesia, Scuro), con contrasto icone e preferenza persistente.

### P62

P62: log cloud mostrano 15–23 secondi nella lettura contenuti. Indice sezioni per Doc e cache verificata tramite revisione Drive/versione voce; coda prioritaria. Doppio pallino e bordo risolti; ora visuale per note senza titolo. Nuovi test cache e browser completati, tempi cloud da confermare. Aggiornare DriveDocs, JournalEditor, Index e Changelog, conservando ROOT_FOLDER_ID. Palette selezionabili discusse, non ancora implementate.

### P61

P61: tema comune a tutte le viste e pannelli. Larghezza/allineamento uniformi, titoli e campi coordinati, riepiloghi compatti e responsive. Test locali di nove viste e salvataggi giorno/settimana completati. P60.1 confermata funzionante dall’utente sul cloud; P61 da pubblicare manualmente con Index/Changelog. Backend e trigger invariati. Guida: AGGIORNAMENTO-P61.md.

### P60.1

P60.1: segnalato Unexpected end of input in document.write sul deployment P60. Bootstrap Vue con payload UTF-8/Base64, esecuzione dopo HTML statico, errore visibile/fallback. Test locali completi e guasto simulato superati; esito sul cloud da confermare. Nessuna modifica backend o dati. Guida: AGGIORNAMENTO-P60.1.md.

### P60

P60: identità visiva del diario aggiornata, superficie calda, data tipografica, icone SVG coerenti e comandi curati. Stato delle modifiche e conteggio task reattivi; Ctrl/Cmd+K, Escape e clic esterno. Editor e backend P59 conservati. Test locali e geometria da 320 a 1440 px completati; niente deployment o modifiche Google reali. Aggiornamento: Index e Changelog. Guida: AGGIORNAMENTO-P60.md.

### P59

P59: prima migrazione Vue del diario continuo, grafica neutra e colonna di lettura comune, ricerca apribile, comandi unificati. Componenti e stili sorgenti in frontend; Index/Demo generati da Vite. Editor rich text isolato in adattatore, API e backend identici a P58. Build genera sei file Apps Script. Clasp 3.4.1 e comando deploy pronti; login/Script ID/deployment personale da configurare. Test backend, build, release simulata e browser desktop/mobile completati; nessun deploy o dato reale modificato. Guida: AGGIORNAMENTO-P59.md e DEPLOY-AUTOMATICO.md.

### Passaggi precedenti

P58: simbolo/data, titoli leggeri e una voce attiva; Aa apre la formattazione. Validazione precisa e blocchi vuoti ignorati. Cache pagina 60 secondi e nuovi tempi contenuti. JournalEditor aggiornato oltre a Index e Changelog. Test locali superati; URL reale richiede autenticazione, nessun dato modificato. Piano successivo: PIANO-EDITOR-AGENDA.md. Preparazione deploy locale disponibile, nessun deploy eseguito.

P57: diario unificato, note sul posto, task compatti con descrizione espandibile e menu proprietà/allegati. Nessuna scelta ordinaria fra elenco e pagina; backend invariato. Test locali desktop/mobile e persistenza superati; cloud pendente. Salvataggio esplicito conservato. Git non inizializzato: stato, piano e changelog costituiscono il contesto trasferibile fra postazioni.

P56: correzione del riquadro Comprimi/Espandi, solo frontend; salvataggio esplicito invariato. Verifica geometrica desktop/mobile locale; cloud pendente.

P55: editor continuo e pagina di progetto, titoli nota facoltativi, salvataggi batch senza Docs, bozze per mese/progetto, compressione e validazione visibile. JournalEditor.gs nuovo file da installare. Test locali superati; deployment e misure cloud pendenti. Analisi e prossimi passi in DIREZIONE-PRODOTTO.md. Nessun dato reale modificato.

P54: contenuto/versioni persistenti su DocContent, queue estesa a creazione e modifica testo note/task, pannello coda, trigger compatibile, conflitti protetti. Test locali superati; prestazioni e verifica visiva cloud pendenti. Cancellazioni Doc restano sincrone.

P53: integrato ramo esterno P52, descrizioni proprie per obiettivi e azioni; diario con una occorrenza task. Migrazione setup richiesta. Cache P49 da misurare sul cloud; concorrenza cache ancora da verificare. ROOT locale conservato.

P48: riquadro scaduti cliccabile in Giorno e Settimana; deadline precedente a oggi, tutti i periodi. Nessuna nuova API; backend invariato. Test locali superati, cloud pendente.

P47: check, icona e titolo centrati verticalmente, microazioni allineate e leggibili. Backend invariato; verifica visiva cloud pendente.

P46: colori task uniformi (bianco, selezione crema, dettaglio lavanda) e checkup a colonna singola col dettaglio aperto. Verifica browser locale superata; cloud pendente.

P45: cornice unica 1200 px per tutte le viste e colonne uniformi col dettaglio, test browser desktop e mobile superati. Sostituisce limiti differenziati P37/P44. Cloud P45 pendente. P39: utente conferma ripresa del funzionamento sul deployment; concorrenza durante trigger non ancora confermata.

P44: punto di partenza comune tra viste, barra e contenuto, con limiti di lettura conservati. Backend invariato; verifica visiva cloud/mobile pendente.

P43: check abitudini semplici accanto al titolo, obiettivo su riga distinta. Checklist composte invariate; verifica cloud/mobile pendente.

P42: lista abitudini e schede più compatte, spazi aggiuntivi solo negli editor aperti. Backend invariato; verifica visiva cloud/mobile pendente.

P41: scheda obiettivo a griglia con icona separata, titolo e progresso senza sovrapposizione. Backend invariato; controllo visivo cloud/mobile pendente.

P40: campi obiettivi/abitudini bianchi con bordo e focus visibile, esempi nei campi vuoti. Backend invariato; controllo visivo cloud/mobile pendente.

P39: getState/getCommonState senza lock e senza scritture, salvataggi e worker restano protetti. Consistenza eventuale durante operazioni concorrenti. Test locali e regressioni superati; cloud pendente.

P38: 40 icone SVG a contorno, selettore a griglia con ricerca italiana e compatibilità delle emoji precedenti. Test locali superati; verifica visiva cloud/mobile pendente.

P37: larghezze massime per vista (900/1100/1400 px), contenuto centrato e spazio aggiuntivo al dettaglio. Sintassi verificata; verifica visiva cloud e mobile pendente.

P36: icone selezionabili e persistenti per obiettivi e abitudini, inclusa Nessuna icona. Schema icon compatibile e progresso preservato. Test locali superati; cloud e mobile pendenti.

P35: abitudini composte con checklist obbligatoria, modifica e archiviazione con storico conservato. Colonne compatibili Habits.steps/archived e HabitLogs.checklist. Test locali e regressioni P29 superati; verifica cloud e mobile pendente.

P34: validazione pianificazione nel modulo task, messaggi vicini ai campi e focus, errori server anche nel dialog. Test locali superati; cloud pendente.

P33: Giorno nel menu apre sempre la data corrente Europe/Rome; i collegamenti alle date mantengono la scelta. Test locale superato; cloud pendente.

P32 corregge apertura della vista settimanale (tags is not defined): conteggio tramite entryProjects. Rendering verificato localmente; cloud da confermare.

P31 aggiunge importanza dei task (Normale, Urgente, Emergenza) in TaskPlans, moduli e liste, con ordinamento per priorità e poi deadline. Verifiche locali superate; cloud pendente.

P30 carica le note di rilascio da Changelog.html solo alla prima apertura, con cache nella pagina e riprova in caso di errore. Index passa da circa 160 KB a 138 KB. Nessun cambiamento al percorso di salvataggio P29. Verifiche locali superate; caricamento sul deployment da confermare.

P29 ottimizza i salvataggi con batch Docs/Sheets, cache per richiesta, risposte incrementali e coda per task senza descrizione. Worker disponibile, trigger non installato. Conteggi simulati verificati, tempi cloud ancora da misurare.

P28 implementa deadline, giorno pianificato e periodo di lavorazione nei nuovi task e nel dettaglio, con visualizzazione per data nel diario/Giorno. Nuova nota apre una nota completa multilinea. P27 e separazione tag/progetti P26 conservate. Verifiche locali superate; cloud e mobile P28 pendenti.

Questo riepilogo prevale sui riferimenti storici sottostanti. P26 separa tag e progetti: i vecchi hashtag salvati restano collegamenti progetto finché l’utente non sceglie la conversione esplicita. Integrati il ramo attivo P23 e il ramo progetti P22 dell'altro PC. Fase A ancora aperta; nessuna fase successiva dichiarata completata. Nessun dato reale Drive/Sheets letto o modificato durante questa integrazione.


Registrato il 4 ottobre 2026, sulla base del confronto con l’utente e delle immagini del metodo #365. Questo file è una checklist di lavoro: non descrive funzionalità già implementate. Per i rilasci leggere CHANGELOG.md.

## Decisioni condivise

- Progetti: contenitori di note, task e file; significato invariato.
- Obiettivi: risultati trimestrali; nessuna gerarchia di sotto-obiettivi.
- Azioni: il completamento dipende dalla definizione dell’azione. Non serve introdurre quantità obbligatorie o soglie numeriche automatiche.
- Esiti concordati: Completata, Parziale, Non fatta. Da registrare è lo stato iniziale; Non prevista indica un giorno escluso dal programma.
- Parziale non equivale a completata e non assegna un completamento frazionario.
- Azioni svolte e risultati degli obiettivi hanno riepiloghi distinti.
- Migliorare vista Giorno e checkup settimanale usando le viste esistenti.
- Tappe degli obiettivi: idea da sperimentare, non ancora decisione definitiva.

## Stato e procedura

Fase attiva: A — consolidamento e verifica, avviata il 4 ottobre 2026 su richiesta dell’utente. Le verifiche cloud sono in corso sul deployment fornito; le altre fasi restano aperte.

Per ogni fase: scegliere il passo, implementarlo, verificare il comportamento completo, aggiornare questo piano e CHANGELOG.md, indicare i file da pubblicare. Distinguere sempre test locali e verifica nell’account Google. Una modifica al piano non è un rilascio dell’app.

## Fase A — Consolidamento (punto 1)

- [ ] Verificare il deployment P14 nell’account: diario, giorno, settimana, obiettivi, task e progetti.
- [ ] Verificare creazione, modifica, salvataggio e riapertura delle note formattate sul cloud.
- [ ] Verificare icone, barra comune e changelog su desktop/mobile nel deployment reale.
- [ ] Misurare primo caricamento e salvataggi, distinguendo attesa client e costo server.
- [x] Estendere le verifiche agli errori intercettati dall’app: test-phase-a-errors.cjs passa.

Verifica P17 locale: formattazione e risposta minima passano; giornata e checkup salvati e riaperti nella demo; layout mobile 390 px provato. Cloud P17: modifica/salvataggio/riapertura con grassetto, corsivo, sottolineatura e 18 pt verificati; salvataggio 4983 ms in una prova. Link/elenchi e pagine giorno/checkup verificati localmente, prove specifiche cloud ancora pendenti. La fase A resta aperta.

Già disponibile: test locale specifico P14 di costruzione completa del checkup, salvataggio/riapertura, icone e vista Giorno. Non sostituisce la verifica cloud e non copre tutte le operazioni.

Criterio di conclusione: percorsi quotidiani verificati, problemi aperti annotati e tempi cloud registrati senza confonderli con quelli della demo.

## Fase B — Azioni e tracker (punti 2–3)

- [ ] Aggiungere Parziale al modello e alle registrazioni, mantenendo compatibili i dati esistenti.
- [ ] Mostrare Completata, Parziale, Non fatta e Da registrare nei controlli giornalieri.
- [ ] Distinguere Non prevista dai mancati completamenti.
- [ ] Permettere correzione e ritorno a Da registrare.
- [ ] Aggiungere una nota facoltativa sull’esecuzione.
- [ ] Uniformare simboli, colori ed etichette accessibili del tracker.
- [ ] Distinguere giorni trascorsi, corrente e futuri.
- [ ] Separare i conteggi: completate, parziali, non fatte, da registrare; escludere i giorni non previsti.

Criterio di conclusione: un’azione da 45 minuti svolta per 15 può essere registrata Parziale; un’azione definita semplicemente come allenamento può essere Completata. Nessun giorno futuro o vuoto diventa automaticamente Non fatto.

## Fase C — Giorno operativo (punto 4)

- [ ] Aggiungere una scheda compatta sopra il diario con le azioni previste per la data selezionata.
- [ ] Mostrare l’obiettivo collegato a ciascuna azione.
- [ ] Consentire registrazione rapida e nota facoltativa.
- [ ] Mostrare task programmati, distinguendoli dalle scadenze.
- [ ] Conservare intenzione, riflessione e diario libero; ridurre la scheda quando vuota.

Criterio di conclusione: registrare le azioni del giorno e capire le attività previste senza cambiare vista, anche su mobile.

## Fase D — Settimana operativa (punto 5)

- [ ] Separare visivamente Pianificazione e Revisione nella stessa pagina.
- [ ] Pianificazione: focus, priorità, azioni, task programmati e scadenze.
- [ ] Permettere di selezionare task reali come priorità anziché ricopiarli come testo.
- [ ] Assegnare un giorno ai task prioritari senza duplicarli.
- [ ] Revisione: riepilogo nuovi stati, completati/incompleti e risultati degli obiettivi separati dalle azioni.
- [ ] Mantenere riflessioni su risultati, ostacoli e cambiamenti per la settimana seguente.
- [ ] Decidere sugli incompleti: completare, riprogrammare o abbandonare.

Criterio di conclusione: preparazione e revisione usano le stesse attività del diario/progetto, senza copie indipendenti.

## Fase E — Checkup conservato (punto 6)

- [ ] Alla chiusura salvare fotografia dei conteggi e data di chiusura.
- [ ] Conservare riflessioni e decisioni.
- [ ] Distinguere il riepilogo concluso dai dati correnti.
- [ ] Consentire riapertura esplicita e definire come conservare le revisioni.

Criterio di conclusione: completare un task in seguito non altera silenziosamente i numeri di un vecchio checkup.

## Fase F — Scheda obiettivo (punto 7)

- [ ] Esplicitare risultato desiderato e criterio di raggiungimento.
- [ ] Mostrare periodo e progresso del risultato.
- [ ] Mostrare azioni collegate e andamento distinto.
- [ ] Mostrare eventuale progetto collegato.

Criterio di conclusione: l’utente distingue quanto ha agito da quanto è avanzato il risultato; nessun aggiornamento automatico del risultato basato sulle checkbox.

## Fase G — Tappe, proposta da provare (punto 8)

- [ ] Valutare con un esempio reale se le tappe sono utili.
- [ ] Se adottate: inserirle nella scheda obiettivo con nome, settimana e stato.
- [ ] Collegare task esistenti e mostrare le tappe nella settimana.
- [ ] Consentire completamento manuale e riprogrammazione senza duplicazioni.

Criterio di conclusione: poche tappe importanti aiutano a pianificare senza aumentare il lavoro di manutenzione.

## Fase H — Recupero e protezione (punto 9)

Può essere anticipata se continuano modifiche manuali ai Docs o emergono problemi sui riferimenti.

- [ ] Implementare cestino note e ripristino.
- [ ] Controllare coerenza fra riferimenti Sheets e sezioni Docs.
- [ ] Segnalare documenti mancanti o marcatori danneggiati.
- [ ] Preparare una procedura di recupero che presenti il problema prima di modificare l’archivio.

Criterio di conclusione: eliminazioni recuperabili e problemi dei riferimenti diagnosticabili senza pulire manualmente Registry o altri fogli.

## Fase I — AI, successiva al consolidamento (punto 10)

- [ ] Definire selezione esplicita di settimana/progetto/obiettivo da analizzare.
- [ ] Preparare sintesi e confronto piano–azioni–risultati.
- [ ] Fornire riferimenti alle note usate.
- [ ] Lasciare all’utente decisioni e modifiche a task e obiettivi.

Criterio di conclusione: l’analisi usa fonti selezionate e rintracciabili. Nessuna API AI è già collegata; servizio, permessi e costi saranno valutati in questa fase.

## Registro dei passi completati

Nessuna fase di questo piano completata al momento della registrazione. Le funzionalità precedenti restano documentate nel changelog fino a P14. Aggiornare qui fase, modifica, test locali, eventuale verifica cloud e versione del rilascio dopo ciascun intervento.


## Estensione riflessioni — P22
Spunti facoltativi nei campi esistenti di giorno e checkup. Nessun nuovo campo o revisione mensile. Fase A ancora aperta; verifica cloud pendente.


## P23 — Riflessione giornaliera configurabile (5 ottobre 2026)
- Impostazione persistente Essenziale/Dettagliata, condivisa fra dispositivi della stessa app.
- Sette risposte facoltative separate in Days: gratitude, lifeArea, smallStep, meaningfulMoment, feelings, difficulties, learning.
- Colonne aggiunte dopo updatedAt, senza spostare o suddividere testi precedenti.
- I campi nascosti e quelli non inviati restano conservati, anche salvando dal pannello delle abitudini.
- Conflitti controllati sia sulle giornate sia sulle impostazioni.
- Deployment: Code.gs e Index.html rispetto a P21/P22; DriveDocs.gs resta P21. Nessun nuovo permesso; impostazione iniziale Essenziale.
- Verifiche locali con servizi simulati; cloud da verificare.



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


### Prossime verifiche della fase A
- [ ] Pubblicare P24 e verificare riflessioni separate con disattivazione/riattivazione della modalità dettagliata.
- [ ] Verificare selezioni multiple in note/task, rinomina con slug invariato e cambio associazione senza spostamento Docs.
- [ ] Confermare sul cloud P18–P21 e i percorsi P17 ancora pendenti.
- [ ] Misurare caricamento e salvataggi sul deployment reale.


## P25 — Task e bullet senza rilettura completa (5 ottobre 2026)
- addJournal restituisce soltanto le voci della richiesta, senza state_ e senza rileggere dati comuni o allegati.
- Conservati batch multi-riga, idempotenza requestId e recupero dei Docs dopo un tentativo interrotto.
- Client inserisce subito il task anche in Task aperti e aggiorna le cache senza ricaricare i dati comuni.
- Diagnostica addJournal misura l'intero backend: validazione, lock, Sheets, Docs/riferimenti, risposta e finalizzazione.
- I valori server precedenti misuravano soltanto state_, non tutta la creazione. Il tempo residuo client non è attribuito automaticamente alla rete.
- Conservate tutte le funzioni integrate P24. Deployment: Code.gs e Index.html; DriveDocs.gs invariato.
- Test locali con servizi simulati; tempi e funzionamento cloud da misurare dopo pubblicazione.


Verifica P25: verify-p25.cjs passato per delta senza state_, batch, idempotenza, retry dopo interruzione, estratti di note modificate e inserimento nelle viste pertinenti. Regressioni verify-p23.cjs e verify-integration.cjs passate. Nessuna prova cloud o browser visiva P25.


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


## Evoluzione editor continuo

Richiesta utente: continuità anche nella scrittura, oltre al diario continuo in lettura. Da progettare come editor dedicato; non si tratta soltanto di autosalvataggio. La P54 introduce la persistenza necessaria ma mantiene i comandi e i moduli attuali.
