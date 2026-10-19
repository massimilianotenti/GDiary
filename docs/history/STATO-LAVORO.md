# Punto di ripresa

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


Per i prossimi interventi leggere prima PIANO-SVILUPPO.md, registrato il 4 ottobre 2026: piano per fasi A–I concordato nel confronto con l’utente. Fase A attiva: P17 pronto e verificato localmente; deployment P17 confermato; stili B/I/U e 18 pt persistono sul cloud, salvataggio 4983 ms in una prova. Restano le verifiche cloud specifiche di link/elenchi e salvataggi giornata/checkup. Nessuna fase dichiarata completata. Non confondere i punti pianificati con i rilasci già implementati nel changelog.

La versione v2 resta intatta e utilizzabile. La nuova versione in questa cartella è v3.

Completato: integrazione backend per cartella Drive assegnata, sottocartelle diario/anno/progetto/allegati/esportazioni, Docs mensili e di progetto, sezioni con marcatori e bookmark, migrazione dei testi v2 a blocchi, letture mensili dei metadati tramite TextFinder senza trasferire i body, dettagli letti dal Doc su richiesta, esportazione progetto per NotebookLM in blocchi riprendibili. Obiettivi e abitudini preservati.

Test backend: work/test-v3-backend.cjs passato con servizi simulati. La demo v3 simula anche un editor Docs e la struttura Drive, senza connessione al cloud.

Completati anche test browser desktop/mobile v3, guida installazione/migrazione e pacchetto ZIP. La nuova anteprima è http://127.0.0.1:8766/Demo.html (per riavviarla: node work/serve-v3.cjs). Non è stato effettuato alcun deployment o modifica su Google Drive dell'utente. La cartella reale va configurata con ROOT_FOLDER_ID e setupDrive dopo autorizzazione Google.

Punti da comunicare: Docs gestiti con marcatori da preservare, modifica diretta del corpo nel Doc; titolo/data/collocazione fissi nella prima v3; ricerca locale ai metadati caricati; TextFinder esegue una ricerca lato Sheets ma non è un indice database; tabelle accessorie ancora da ottimizzare; non modificare le note durante un'esportazione. L'AI non riceve automaticamente dati.

Il confronto con Obsidian è stato verificato nelle fonti ufficiali: vault locale e backlink. Risposta da fornire: il progetto è un second brain orientato a diario/azione e Drive, mentre Obsidian offre già una rete di note portabili e strumenti per collegamenti; AI dipende dalla configurazione scelta. Il nostro prototipo non offre ancora backlink automatici o ricerca semantica.

Aggiornamento grafico: diario continuo con inserimento compatto e dettaglio laterale; settimana in due colonne; obiettivi con schede, progressi e tracker; selezionando una data del tracker si registrano azioni e riflessioni nel pannello laterale. Test browser passati anche per salvataggio delle azioni e della riflessione, oltre a inserimento e focus settimanale. Screenshot aggiornati: Diario-design.png, Settimana-design.png, Obiettivi-design.png, Mobile-design.png.

Scrittura diretta implementata con saveNoteText: confronto versione metadati e testo originale, aggiornamento della sola sezione del Doc, rifiuto elementi complessi. Bozze sessionStorage per note e inserimento rapido, recupero/confronto dopo reload, Ctrl+Invio, stati di salvataggio accessibili. Test browser: salvataggio testo multilinea, recupero bozza dopo reload e rifiuto del conflitto sul testo, oltre ai test design. Ancora da verificare i servizi Google reali. Il controllo Docs è ottimistico e non atomico rispetto alle modifiche esterne.

Checkup operativo aggiunto con TaskPlans, planTask, stato cancelled e azioni di completamento/programmazione/abbandono. Ricerca archivio searchArchive legge cinque Docs per blocco con cursore, risultati deduplicati e segnalazione errori; UI attivata con Invio. Test browser e batch backend (sette documenti in mesi diversi) passati. Per archivi esistenti rieseguire setup per creare TaskPlans. Ottimizzazione futura: indice di ricerca per evitare scansione metadati a ogni blocco; ricerca contenuto allegati e riflessioni giornaliere/settimanali non implementata.

Integrato design Stitch tramite StitchStyles.css incorporato in Index.html, font Google Fonts con fallback, masthead comune, sidebar lavanda, componenti condivisi e pannelli contestuali. Test desktop/mobile, scrittura, bozze, conflitti, ricerca archivio e azioni settimanali passati. Export originali conservati in outputs/Stitch-riferimenti. Alcuni testi dimostrativi delle note arricchiti solo nel generatore demo.

Implementata addCompleteNote in DriveDocs.gs e selezione modalità in Index.html, con titolo, corpo multilinea, idempotenza e bozza sessionStorage. Test work/test-complete-note.cjs passato. Aggiornare due file e nuova versione deployment, conservando ROOT_FOLDER_ID reale. Nessuna migrazione dei dati o riunione delle note esistenti.

Prestazioni: cache in memoria16 viste con background, epoch per risposte obsolete e protezione bozze; comuni TTL60s, refresh forzato; anteprime separate e differite; riferimenti Docs rimossi da state_; objectsSearch_ raggruppa righe. Diagnostica client/server aggiunta. Test performance, scrittura, checkup/ricerca, note complete, backend e batch passati. Ancora da misurare sul cloud; salvataggi continuano a restituire state_ (delta non implementato). Istruzioni AGGIORNAMENTO-PRESTAZIONI.md.

Estratti220 nel foglio Previews, creazione lazy, storePreview_ alla creazione e al salvataggio, inclusi in state_. Rimossa lettura automatica getJournalPreviews dal frontend. refreshNotePreviews manuale prime12 voci. Test estratti, scrittura/conflitti, nota completa e backend passati.

P4: deriveCachedView ricava giornate da una cache mensile completa e obiettivi dai comuni recenti, TTL60. Diagnostica Vista dai dati disponibili. Aggiornamento solo Index.html. Nessun prefetch aggiuntivo; task/settimana/progetti restano richieste mirate per garantire copertura fuori mese. Test derived-views, week-search e writing passati.

P5: primo getState con deferCommon; getCommonState separato in background; ensureCommon singola promessa condivisa e go attende viste dipendenti; protezione risultati tardivi tramite timestamp comuni. Aggiornamento Code.gs e Index.html soltanto. Test initial-load, writing e design passati.

Eliminazione note implementata con deleteNote e conferma per voce nelle liste. Ripulisce Entries/Files/DocRefs/Previews/TaskPlans; rimuove solo sezione marcata valida, gestisce entrambi i marcatori assenti, rifiuta parziali/duplicati/sovrapposti. Test backend e UI passati. Aggiornare Index.html e DriveDocs.gs mantenendo ROOT_FOLDER_ID. Nessun cestino note; rigenerare esportazioni dopo eliminazioni.

P6: addCompleteNote restituisce delta singola voce senza state_, frontend applica alla vista pertinente e invalida cache, conserva dati comuni. Misure backend totale/attesa lock/Sheets/sezione Docs e riferimenti/finalizzazione. Aggiornare DriveDocs.gs e Index.html insieme mantenendo ROOT_FOLDER_ID. Test save-delta, complete-note, excerpts e delete-note passati. update dettaglio ancora full-state.

P7: Aggiorna fisso nella masthead, Apri nota esplicito per voce, chiusura dettaglio render completo e riapertura verificata in giorno/diario, pannello uniforme, ripristino icone menu colorate e badge v3 P7 visibile. Aggiornamento soltanto Index.html se backend P6 già installato. Test detail-consistency e complete-note passati.

P9 (2026-10-04): editor rich text implementato in Index.html e DriveDocs.gs. Modello {kind,runs}; attributi Docs reali, titoli H1/H2, liste semplici, dimensioni e link. Bozze preservano rich. Incolla semplice. Dettaglio letto con un solo openById. Contenuti complessi/alcuni stili avanzati bloccati; anteprime restano plain. Test work/test-rich.cjs, test-rich-ui.cjs e test-rich-drafts.cjs passati. Pacchetto locale aggiornato, nessun deployment cloud effettuato. Istruzioni AGGIORNAMENTO-FORMATTAZIONE.md. Code.gs invariato.

P10: changelog modale tramite menu Novità e versioni o badge cliccabile. Nessuna richiesta backend, bozze conservate. Fonte CHANGELOG.md incorporata in Index con work/sync-changelog.cjs. Corretto riferimento e.richUnsupported fuori contesto in renderDay, introdotto durante P9. Per deployment solo Index se backend P9 presente.

P11: rimosso sottotitolo Secondo Cervello · Precisione Analogica su richiesta dell’utente. Intestazione Diario personale, badge P11 e Aggiorna. Modifica solo Index.html, nessun backend o dato modificato.

P12: versione nel footer sidebar accanto a Bullet Journal, barra comune ricerca/Aggiorna/Nuova nota in tutte le viste. polishJournal non sposta più ricerca, pulsante o stato. Aggiornare solo Index.html.

P13: icone create in menuButton, dimensioni esplicite. objectsSearch_ bulk fino500 righe, weekEntries_ filtro unico archivio piccolo, state_ salta allegati/estratti se no voci e separa previewsMs. Modificati Code.gs, DriveDocs.gs, Index.html. Misurare latenza cloud.

P14: ulteriore riferimento e.richUnsupported fuori contesto trovato e rimosso da renderWeek. P10 aveva corretto soltanto renderDay. Test menu P13 era insufficiente: errori catturati da run non generano pageerror. Aggiunta verifica esplicita contenuto completo del checkup e salvataggio. Aggiornare Index.html.


## P18 — 5 ottobre 2026
Frontend e Code.gs aggiornati: obiettivi modificabili, moduli separati, ricorrenza libera weekly:N (1–7), collegamento obiettivo visibile, messaggio settimane vuote corretto. Demo verificata: modifica titolo conserva collegamenti; creazione weekly:3 e completamento aggiornano tracker/checkup a 1/3. Test backend v3 passato. Pubblicazione cloud P18 pendente. Una registrazione per giorno, settimana lunedì–domenica, nessuna riproporzione nelle settimane parziali. DriveDocs.gs invariato.

## P19 — Scadenze e task
Code.gs accetta scadenze italiane DD/MM/YYYY con validazione reale. Index.html: Nuovo task in vista Task aperti apre modulo calendario; inserimento misto nascosto in questa vista. Verificati parser (ISO, italiano, date impossibili, bisestile) e creazione demo con scadenza 11 ottobre. Deployment Index.html + Code.gs, include P18; cloud pendente.

P19 aggiunte: eliminazione ultima sezione Docs conserva paragrafo vuoto finale (regressione con vincolo simulato passata). Date moduli vuoti ricavate da oggi Europe/Rome, bozza preservata; verificato calendario 05/10/2026 nella demo. Deployment ora tutti e tre i file Index.html, Code.gs, DriveDocs.gs, preservando ROOT_FOLDER_ID. Non modificata la data del task reale salvato al 4 ottobre.

## P20 — Anteprime formattate
Colonna Previews.richExcerpt (4) aggiunta automaticamente alla scrittura; segmenti testo/bold/italic limitati a 220 caratteri. Stato restituisce previewRich, UI mostra 200 caratteri con DOM sicuro. Creazione e salvataggio persistono gli stili senza letture Docs aggiuntive; aggiornamento manuale estratti rilegge stili per note precedenti. Verificati persistenza backend, limite e UI grassetto 700 dopo creazione e Aggiorna. Test backend v3 e save P17 passati. Deployment tre file, mantenere ROOT_FOLDER_ID; cloud pendente.

## P21 — Sidebar
Sidebar desktop sticky con altezza viewport e scroll autonomo. Verificata nella demo a fondo pagina: top 0, altezza 720, position sticky. Mobile invariato. Changelog/ZIP aggiornati. Da cloud P17 deploy tutti e tre i file per includere P18–P20, preservare ROOT_FOLDER_ID.


## P22 — Spunti per intenzione e riflessione (5 ottobre 2026)
- Spunti facoltativi e richiudibili accanto ai campi esistenti della giornata.
- Mattina: attenzione, gratitudine e area della vita; sera: momenti significativi, emozioni, difficoltà e apprendimenti.
- Checkup: spunti personali accanto alle domande esistenti, senza nuovi campi.
- Nessuna risposta obbligatoria o modifica allo schema dei dati e al salvataggio.
- Deployment: solo Index.html rispetto a P21; da P17 aggiornare anche Code.gs e DriveDocs.gs mantenendo ROOT_FOLDER_ID.
- Verifica locale di sintassi e costruzione dei moduli; verifica cloud pendente.



## P23 — Riflessione giornaliera configurabile (5 ottobre 2026)
- Impostazione persistente Essenziale/Dettagliata, condivisa fra dispositivi della stessa app.
- Sette risposte facoltative separate in Days: gratitude, lifeArea, smallStep, meaningfulMoment, feelings, difficulties, learning.
- Colonne aggiunte dopo updatedAt, senza spostare o suddividere testi precedenti.
- I campi nascosti e quelli non inviati restano conservati, anche salvando dal pannello delle abitudini.
- Conflitti controllati sia sulle giornate sia sulle impostazioni.
- Deployment: Code.gs e Index.html rispetto a P21/P22; DriveDocs.gs resta P21. Nessun nuovo permesso; impostazione iniziale Essenziale.
- Verifiche locali con servizi simulati; cloud da verificare.


Verifica P23: work/verify-p23.cjs passato con servizi simulati: compatibilità vecchie righe, migrazione additiva, risposte separate, dati nascosti e salvataggi parziali, svuotamento esplicito, conflitti giornata/impostazioni, rifiuto colonne estranee e costruzione moduli in entrambe le modalità. Nessuna prova browser visiva o cloud effettuata in questa chat.


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


### Provenienza — P22 altro PC
## P22 — Progetti, primo passo
Selettori multipli in capture e task, rinomina nome/descrizione mantenendo slug, nuovo setEntryProjects con conflitto updatedAt e validazione esistenti. Documenti non spostati. UI dettaglio Modifica progetti collegati separata dal salvataggio testo. Test backend/demo passati; cloud pendente. # nei bullet conserva semantica progetto. Tag liberi, @, unione duplicati e ricerca dedicata picker da sviluppare. Deploy Code.gs e Index.html da P21; da P17 tutti tre file.


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
