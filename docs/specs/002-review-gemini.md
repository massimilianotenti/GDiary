# Prompt di revisione tecnica per Gemini

Documento di supporto alla SPEC-002, non una nuova specifica né una decisione
architetturale. Copiare il testo sotto in Gemini. Non occorre condividere
credenziali, URL personali o contenuti del diario. Facoltativamente allegare
la SPEC-002 e i sorgenti indicati in fondo, dopo averli verificati.

---

Vorrei una revisione tecnica indipendente di un'app personale già funzionante.
Rispondi in italiano. Non limitarti a confermare le proposte: cerca anche
controesempi, costi nascosti e alternative più semplici. Non scrivere ancora
un'implementazione completa. L'obiettivo è decidere il prossimo intervento,
conservando affidabilità e dati esistenti.

Se descrivi limiti, quote o capacità attuali delle API Google, verificali su
documentazione ufficiale e cita le fonti, se disponi di ricerca web. Se non
puoi verificarli, dichiaralo. Distingui fatti del contesto, deduzioni e ipotesi.

## 1. Prodotto e obiettivi

GDiary è un diario personale usato quotidianamente: note e task nello stesso
flusso, testo formattato, progetti multipli, tag, riflessioni giornaliere,
checkup settimanale e tracker di abitudini. I task nelle diverse viste sono
gli stessi record, con identità stabile.

È una web app Google Apps Script personale, accessibile con il proprio
account. L'uso prevalente è da notebook; l'accesso smartphone non è prioritario
oggi ma non deve essere precluso. L'archivio ha attualmente pochi file, destinati
a crescere: un file Sheets, documenti Docs mensili e documenti per i progetti.
Le dimensioni effettive in byte, il numero di paragrafi e la crescita delle
versioni storiche non sono ancora misurati sistematicamente.

Il problema è l'attesa per caricamenti e salvataggi, anche di piccole modifiche.
Preferiamo interventi progressivi verificabili, prima di una riscrittura.

## 2. Architettura implementata

Browser HTML/Vue/DOM → google.script.run → Apps Script → Sheets e Docs su Drive.

- Il frontend è ibrido: Vue per il diario continuo, logica e altre viste DOM
  nel file shell. Non è una SPA Vue completamente separata.
- Sheets contiene metadati delle voci, pianificazioni, riflessioni, abitudini,
  log, indici e anche contenuti formattati persistenti in DocContent.
- DocContent conserva JSON suddiviso in frammenti; possono esserci più versioni
  dello stesso contenuto. Non è un archivio dei soli titoli.
- I salvataggi persistono in Sheets prima della sincronizzazione su Docs.
  TaskDocQueue conserva gli stati pending/error/done; un trigger o un comando
  manuale consolida i contenuti nei Docs. Più modifiche della stessa voce
  possono convergere in un unico aggiornamento del documento.
- DocRefs collega le voci a sezioni Docs delimitate da marcatori. JournalLayout
  conserva la posizione. I documenti possono essere modificati anche direttamente
  in Google Docs: esistono controlli di conflitto e formattazione non supportata.
- updatedAt controlla le versioni; requestId/clientId aiutano l'idempotenza.
- Esistono cache temporanee, bozze di scheda e preferenze locali. Non ci sono
  IndexedDB applicativo, outbox client, PWA o sincronizzazione offline completa.

## 3. Percorsi di lettura attuali

`getJournalPage` prepara i metadati, seleziona fino a 25 voci e recupera i corpi.
La risposta è limitata anche da un budget di dimensione.

Per ogni voce pending viene usato il contenuto persistito, che prevale sul Docs.
Per una voce sincronizzata si controlla la revisione del file Drive e si cerca
una cache della sezione, legata a documento, revisione, entryId e updatedAt.
Su hit si riusa il contenuto; su miss si recupera anche DocContent e si estrae
la sezione dal Docs.

Nella stessa richiesta ogni Docs necessario è aperto al massimo una volta.
Il suo corpo viene riutilizzato e attraversato per costruire un indice dei
marcatori; poi si estraggono le sezioni richieste, con testo e formattazione.
Questo non dimostra che tutte le interazioni con gli elementi DocumentApp
equivalgano a un unico trasferimento remoto: è una distinzione da valutare.

La revisione viene ricontrollata prima di memorizzare le sezioni lette in cache.
Le pagine successive sono nuove richieste: lo snapshot temporaneo di Docs e
tabelle viene ricreato. Le sezioni non ancora estratte possono richiedere la
riapertura dello stesso documento. La cache esistente è per sezione, non uno
snapshot completo già materializzato dell'intero mese.

Diverse tabelle Sheets sono già lette e indicizzate una volta per richiesta.
DocContent, invece, può comportare per ciascuna voce una ricerca delle righe,
letture delle intestazioni dei frammenti e letture dei payload, raggruppando
solo gli intervalli contigui di quella voce.

Nella vista task il client richiede tutte le pagine dell'archivio in sequenza
e le mostra al termine, per consentire filtri e ricerca nel corpo su tutti i
task. Il diario ordinario ha caricamento progressivo su richiesta.

## 4. Percorsi di salvataggio attuali

- Il diario raggruppa per mese e invia batch fino a 25 blocchi. Gestisce errori
  parziali tra batch e conserva le bozze fallite.
- Days e Weeks restituiscono l'intera tabella aggiornata due volte: nel campo
  diretto days/weeks e in commonPatch. Il client ha consumatori di entrambe.
- La registrazione di un'abitudine restituisce tutta la collezione dei log.
- Le riflessioni di più giornate vengono salvate con richieste successive.
- Le scritture protette usano il lock dello script e flush al termine.

## 5. Tracing reale raccolto

Prima sessione reale, 22 ottobre 2026, formato gdiary-performance-trace/v1.
Tempi in millisecondi, dimensioni in byte UTF-8 del JSON applicativo.

| Operazione | Voci | Client | Backend | Altri dati |
|---|---:|---:|---:|---|
| getJournalPage warm | 25 | 6445 | 4754 | metadata 1525; content 3229; 25 hit; 0 miss; 0 Docs aperti; 4 verificati; Sheets helper 353; Drive 503; risposta 58423 B |
| getJournalPage warm | 25 | 5057 | 3871 | metadata 1137; content 2733; 25 hit; 0 miss; 0 Docs aperti; 4 verificati; risposta 58423 B |
| getJournalPage mista | 25 | 22108 | 21251 | metadata 1446; content 19805; 5 hit; 19 miss; 1 pending; 5 Docs aperti; apertura Docs 4465; Sheets helper 9033; Drive 1769; risposta 26454 B |
| getJournalPage mista | 25 | 23813 | 22465 | metadata 3172; content 19292; 6 hit; 19 miss; 4 Docs aperti; apertura Docs 572; Sheets helper 10012; Drive 2575; risposta 27989 B |
| getJournalPage miss | 9 | 9159 | 7791 | metadata 925; content 6865; 0 hit; 9 miss; 3 Docs aperti; Sheets helper 2601; risposta 11737 B |
| getJournalPage warm/pending | 25 | 6498 | 4852 | 24 hit; 0 miss; 1 pending; 0 Docs aperti; 4 verificati; risposta 54730 B |
| setHabitLog | — | 3435 | 1997 | Sheets helper 351; lock 79; flush 87; richiesta 305 B; risposta 24444 B |
| saveDay, batch 1 | — | 2069 | 792 | lock 106; flush 144; richiesta 3395 B; risposta 87060 B |
| saveDay, batch 2 | — | 2777 | 996 | lock 67; flush 226; richiesta 2289 B; risposta 90000 B |
| saveJournalPage | 1 | 5046 | 3708 | Sheets helper 1424; queue 1509; lock 106; flush 54; richiesta 781 B; risposta 1099 B |
| getState | 90 | 4350 | 3029 | entries 1680; common 1166; risposta 158280 B |
| getState | 72 | 5908 | 4433 | entries 1811; common 2245; risposta 142228 B |
| getState | 90 | 3504 | 1691 | entries 998; common 160; risposta 74824 B |
| getState | 90 | 3810 | 2372 | entries 1569; common 160; risposta 74825 B |

I due saveDay appartengono alla stessa azione, durata totale 4889 ms.
Il saveJournalPage appartiene a un'azione Salva pagina da 5121 ms.
Le tre letture da 25, 25 e 9 voci sommano 55080 ms; non abbiamo ancora un
actionId di navigazione che provi che appartengano tutte alla stessa azione.

Rendering sincroni osservati: circa 0–169 ms; un evento di riuso vista locale
richiede 7 ms. Il tracciato non include il paint finale né mostra eventi Vue
separati sufficienti a concludere che tutta la pipeline grafica sia misurata.

Limiti importanti del tracing:

- I segmenti sono inclusivi: queue può includere letture/scritture Sheets;
  non sommare automaticamente i segmenti per ottenere il totale.
- Le metriche dei servizi coprono helper selezionati, non tutte le chiamate.
  sheetsCalls conta gli helper, non necessariamente le RPC fisiche a Google.
- clientMs meno totalMs comprende trasporto, scheduling/avvio piattaforma e
  serializzazione; circa 857–1813 ms nelle RPC osservate. Non è la sola rete.
- Un evento getState aggiuntivo da 3537 ms con cache:true e backend 1691 ms è
  un duplicato diagnostico del getState da 3504 ms, non una RPC aggiuntiva.
- È una singola sessione, senza distribuzione statistica e senza confronti
  controllati delle dimensioni dei documenti. Non abbiamo ancora un profilo
  specifico di CacheService, verifica permessi/revisioni e ricerca frammenti.

## 6. Proposte da mettere in discussione

La bozza SPEC-002 propone, nell'ordine:

1. Correggere i duplicati nel tracing e correlare la navigazione multi-pagina.
2. Recuperare DocContent in gruppi, evitando ricerche/letture per singola voce,
   con limiti a byte, righe e memoria. Evitare la lettura cieca di tutte le
   versioni storiche quando serve solo una pagina.
3. Restituire soltanto record modificati da Days/Weeks/HabitLogs e applicare
   upsert sul client, evitando duplicazioni e successive riletture complete.
4. Mostrare la prima pagina task mentre arrivano le successive, distinguendo
   esplicitamente risultati parziali e completi e preservando editor e bozze.

L'utente propone anche una variante da valutare prima di fissare questa bozza:
leggere per intero i documenti interessati (mese/progetti), materializzare i
record e poi mostrare solo le pagine necessarie. La granularità di recupero
non deve necessariamente coincidere con le 25 voci visualizzate.

Alternative considerate:

- Snapshot completo dei dati necessari nel browser, con paginazione locale.
- Snapshot sul backend, riutilizzato dalle pagine successive.
- Strategia adattiva: documento/mese intero se piccolo, blocchi se grande.
- Prima pagina rapida e prefetch del resto, con budget e controllo revisioni.
- A medio termine IndexedDB come copia operativa locale, seguita da outbox e
  sincronizzazione robusta. Questo eliminerebbe molte attese interattive ma
  richiede identità archivio, revisioni, cancellazioni, conflitti e recupero.

La scelta desktop con file locali e Drive Desktop è stata discussa, ma non
vogliamo sacrificare l'accesso smartphone. Nessuna migrazione è stata decisa.

## 7. Vincoli non negoziabili

- Identità unica delle voci e nessuna duplicazione tra viste.
- Nessuna perdita di bozze, formattazione, checklist o scritture pending.
- Controlli di concorrenza e idempotenza; recupero dei salvataggi parziali.
- Modifiche dirette in Docs rilevate o gestite con una politica esplicita:
  non migliorare i tempi semplicemente ignorandole o sovrascrivendole.
- Privacy mantenuta in schermate, filtri, conteggi, bozze e diagnostica.
- Non sostituire dati completi con una patch parziale per errore.
- Nessuna sincronizzazione in background affidata soltanto alla permanenza
  della scheda aperta se ci sono dati non ancora persistiti.
- Nessun dato personale nei log esportati o nel repository.

## 8. Domande e formato della risposta

1. Quali sono i colli di bottiglia dimostrati e quali soltanto probabili?
   Spiega soprattutto perché una pagina con 25 cache hit può ancora costare
   4–5 secondi backend. Quali misure mancano per distinguerne le cause?
2. Che cosa cambieresti nella SPEC-002, anche eliminando interventi poco utili?
3. Confronta lettura per pagina, documento intero, snapshot client/server e
   prefetch adattivo. Valuta prima visualizzazione, navigazioni successive,
   consistenza, invalidazione, quantità trasferita e crescita dell'archivio.
4. Con pochi Docs attuali, dove materializzeresti i dati e con quale chiave di
   versione? Come eviteresti di rileggere lo stesso Docs per pagine diverse?
   Non dare per garantita la persistenza della memoria Apps Script fra RPC.
5. Quali metadati andrebbero acquisiti con i corpi? Quando conviene riutilizzare
   DocContent già persistito anche per voci sincronizzate? Valuta esplicitamente
   il rischio di non rilevare modifiche dirette in Docs.
6. Una lettura documentale unica con preservazione rich-text è realizzabile
   con DocumentApp, o valuteresti Docs API/Sheets API batch? Quali vantaggi,
   complessità, permessi, quote e aspetti non dimostrati comporta ciascuna?
7. Quali limiti adattivi useresti? Proponi un metodo per ricavarli da byte,
   paragrafi, voci, tempi e numero di versioni, senza inventare soglie universali.
8. Le risposte incrementali dei salvataggi sono una priorità reale? Quale
   miglioramento strutturale possiamo aspettarci e quale beneficio temporale
   richiede una prova? Considereresti anche batching di giornate o UI ottimistica?
9. Proponi tre esperimenti a basso rischio, ciascuno con ipotesi, cambiamento
   minimo, misure, casi di errore e criterio per proseguire o scartarlo.
10. Quando le ottimizzazioni attuali smettono di essere convenienti rispetto
    a IndexedDB? Indica segnali misurabili, senza promettere latenze precise.

Organizza la risposta in: diagnosi con livello di confidenza; tabella delle
alternative; raccomandazione motivata anche se diversa dalle nostre idee;
piano dei tre esperimenti; rischi e domande ancora aperte. Includi pseudocodice
solo se chiarisce il protocollo. Non presumere di avere accesso ai sorgenti
completi o ai dati personali e non fingere misure non effettuate.

## 9. Sorgenti eventualmente disponibili per approfondire

Possiamo fornire separatamente `JournalEditor.gs` (getJournalPage),
`DriveDocs.gs` (docContent_, cache tabelle, DocRefs e coda), `Code.gs`
(saveRecord_, stato e abitudini), estratti di `frontend/shell.html`
(api, tracing e loadContinuous) e la SPEC-002. Dimmi quali estratti servono
prima di dedurre dettagli che questo contesto non consente di verificare.
