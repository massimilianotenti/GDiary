# SPEC-004 — Usabilità, dati locali e sincronizzazione incrementale

**Stato:** Approvata per avvio sviluppo — fase 0 parziale, fase 1A locale, Entries raggruppate, Task con corpi differiti e fotografia delle continuazioni e dati comuni per periodo, scope cataloghi, delta comuni/legacy/cancellazione e lotto delle riflessioni implementati localmente; resto del piano da realizzare.

**Data:** 27 ottobre 2026.

**Base:** GDiary v2.0.4; ultimo deployment documentato Apps Script 75.

## 1. Obiettivo e vincoli

Aprire viste già disponibili, cercare e continuare a scrivere senza attendere
le chiamate Google. Mantenere Drive, Sheets e Docs come archivio personale e
Apps Script come servizio gestito, senza server aggiuntivi da amministrare.

Distinguere riduzione del tempo remoto e riduzione del tempo durante il quale
l'utente non può lavorare. Per il secondo obiettivo serve una copia locale;
la sola ottimizzazione delle chiamate non è sufficiente.

Conservare identità delle voci, formattazione, pianificazione, privacy, bozze,
conflitti e recupero dei salvataggi parziali. Il piano assume che le modifiche
dirette in Docs restino possibili, con riconciliazione in background. Trasformare
Docs in un semplice export sarebbe una scelta funzionale distinta.

Questa proposta non autorizza deploy, migrazioni o scritture sui dati reali.
Usare Demo.html e fixture sintetiche per sviluppo e verifiche locali.
Conservare bootstrap UTF-8, ROOT_FOLDER_ID segnaposto e staging di sei file.
Nuovi moduli frontend confluiscono nella build; gli helper backend restano
nei tre file .gs esistenti. Nessuna riscrittura generale Vue/legacy.

## 2. Evidenze della revisione

| Percorso | Problema osservato nel codice |
|---|---|
| `searchArchive`, DriveDocs.gs | Apre fino a cinque Docs per richiesta, percorre le voci e mantiene il lock globale durante le letture remote. |
| `processTaskDocQueue`, DriveDocs.gs | Mantiene lo stesso lock durante l'intero lotto Docs; `tryLock(0)` evita l'attesa del worker, non quella di un salvataggio successivo. |
| `getJournalPage`, JournalEditor.gs | Ricostruisce i candidati per ogni pagina; nell'archivio Task carica tutti i task e poi i corpi a pagine. |
| Cache contenuti | Anche gli hit sono preceduti da controlli Drive. |
| `state_`, Code.gs | Alcune collezioni comuni vengono lette per intero. |
| `storeDocContents_`, DriveDocs.gs | Aggiunge revisioni; la lettura cerca i frammenti della versione più recente. |
| `saveNotesContinuous`, shell.html | Disabilita gli editor durante invii sequenziali; le riflessioni sono salvate dopo, per giornata. |

Misure storiche documentate v68: pagina warm mediana 4,621 s; Task primo
risultato 5,198 s, completamento 16,153 s per 61 voci. Salvataggi semplici v70:
singole RPC 2,635–3,169 s. Non sono una nuova baseline v75 e non dimostrano
che tutti i picchi di 20 secondi dipendano dal lock.

## 3. Architettura proposta

```text
Editor e viste
    ↕ selettori, ricerca e transazioni locali
IndexedDB: copia remota + bozze + operazioni da inviare
    ↕ sincronizzazione versionata, riprendibile e idempotente
Apps Script
    ↕ commit applicativi recuperabili e registro delle modifiche
Sheets: record correnti, contenuti, indici e coda durevole
    ↕ worker con coordinamento delle scritture e controllo revisioni
Docs e struttura Drive esistenti
```

Sheets conserva i dati durevoli dell'app. La copia dei contenuti deve ricevere
anche le modifiche esterne validate: DocContent oggi non è automaticamente
una copia aggiornata di un Docs già sincronizzato. Gli indici sono derivati
ricostruibili; bozze e operazioni non confermate da Google non sono cache.

## 4. Fasi, dipendenze e traguardi

| Fase | Risultato | Dipendenze |
|---|---|---|
| 0 | Baseline e fattibilità della persistenza | Nessuna |
| 1 | Minore contesa fra scritture e lavoro remoto | 0 e validazione protocollo worker |
| 2 | Task leggeri e letture limitate alla vista | 0 |
| 3 | Riapertura delle viste da dati locali | Prova storage della 0 |
| 4 | Feed incrementale e contenuti correnti | 2; indispensabile prima della 6 |
| 5 | Ricerca locale completa e aggiornabile | 3 e 4 |
| 6 | Salvataggi locali durevoli e invio in background | 3, 4 e riconciliazione Docs validata |
| 7 | Manutenzione storico e collaudo di crescita | 4; prima di dichiarare la scalabilità |

Primo traguardo: fasi 0–3, letture veloci e minori attese. Secondo: fasi 4–5,
ricerca e aggiornamenti incrementali. Terzo: fasi 6–7, scrittura non bloccante
e manutenzione. La fase 3 può memorizzare inizialmente le risposte delle API
attuali; non promette ancora ricerca completa o sincronizzazione efficiente.

## 5. Fase 0 — Baseline e prova tecnica

### Modifiche

- Estendere il tracing con attesa/durata lock, chiamate Sheets/Drive/Docs,
  righe e celle lette, byte, applicazione risposta e tempo al primo risultato.
  Separare cache browser, cache Apps Script e contenuto persistente Sheets.
- Creare fixture deterministiche da 1.000, 10.000 e 50.000 voci e casi
  499/500/501 per la soglia di `entrySearch_`. Includere task conclusi, anni
  di riflessioni/abitudini, documenti progetto grandi, rich text e contenuti
  lunghi; 1/10/100 revisioni per un sottoinsieme delle voci.
- Simulare RPC da 2/5/20 secondi, timeout dopo commit, risposte fuori ordine,
  due schede/dispositivi e worker concorrente a un salvataggio.
- Preparare una prova IndexedDB isolata con dati fittizi: riapertura browser,
  aggiornamento deployment, quota, storage indisponibile e browser mobile.
  Nel vero iframe Apps Script verificare origine, partizionamento e richiesta
  di persistenza; non considerare quest'ultima una garanzia assoluta.
- Definire un namespace stabile restituito dal server per archivio e, dove
  necessario, principale autenticato. Non basarlo solo su `location.pathname`,
  email presunte o identificativi temporanei. Non è un token di autorizzazione.

### Uscita

Rapporto baseline senza contenuti personali, matrice browser e decisione sulla
persistenza. Se l'iframe non offre stabilità sufficiente, mantenere il fallback
di sessione e valutare separatamente un frontend statico con origine stabile:
richiederebbe autenticazione e trasporto diversi da `google.script.run`.
La prova autenticata resta distinta dai test locali e dal deploy applicativo.

## 6. Fase 1 — Contesa e worker Docs

### 1A. Ricerca senza lock lungo

Implementata localmente con revisione, controlli live Docs e reset delle continuazioni: [verifica](../VERIFICA-RICERCA-SENZA-LOCK-LUNGO.md). Restano i limiti di scansione e dei writer precedenti descritti nel rapporto.

Separare le letture della ricerca dalla sezione critica. Non basta togliere
`locked_`: acquisire una fotografia versionata e rilevare modifiche concorrenti
fra metadati, pending e contenuti. Ripetere un lotto limitato o dichiararlo
parziale se cambia durante la lettura. Il pending deve prevalere sul Docs vecchio.
Eliminare il flush non necessario nel percorso di sola lettura; usare mappe
per riferimenti/allegati al posto di ricerche ripetute per ogni voce.

### 1B. Scrittura Docs coordinata

Estendere la coda con versione richiesta, token worker, scadenza prenotazione,
tentativi e prossimo tentativo. Coordinare tutti gli scrittori dello stesso
documento, incluse cancellazioni e percorsi legacy: un lock per voce non basta.

1. Sotto lock breve scegliere un lotto con budget temporale, prenotare i
   documenti e fissare la versione da esportare.
2. Lavorare fuori dal lock globale solo se il protocollo impedisce due writer
   concorrenti sullo stesso Docs; conservare controlli di appartenenza,
   marcatori, baseline e formattazione.
3. Sotto lock breve confermare soltanto token/versione prenotati. Una versione
   successiva resta pending e riceve la baseline effettivamente esportata.
4. Dopo timeout riconoscere la scrittura già applicata; su conflitto conservare
   le varianti e fermare la voce interessata.

Una lease scaduta non prova che il worker precedente sia morto. Prima di
rilasciare il lock globale validare un meccanismo che impedisca sue scritture
tardive, eventualmente mediante controllo condizionale della revisione Docs.
Se DocumentApp non consente questa garanzia, mantenere il lock con lotti più
piccoli come miglioramento transitorio e valutare un writer Docs API separato.
Non presentare una semplice lease come soluzione sufficiente.

### Uscita

Test di worker interrotto, prenotazione scaduta, doppio worker, risposta persa,
nuova modifica durante export, cancellazione concorrente ed editing Docs.
Nessuna conferma della versione sbagliata; misure del lock prima/dopo.

## 7. Fase 2 — Letture proporzionate alla vista

Seguito locale: fotografia ordinata dei metadati per riusare le continuazioni
senza rileggere l'intero archivio. Revisione applicativa prima delle mutazioni,
token/cursore/scope verificati e ripartenza con bozze conservate; fallback in
assenza di cache. Primo passo dell'indice ricostruibile, non ancora un indice
persistente/incrementale per stato/periodo. Risultati in
[VERIFICA-INDICE-TASK](../VERIFICA-INDICE-TASK.md).

Seguito locale: elenco Task fino a 200 metadati per pagina e descrizioni
versionate a lotti da 25 all'apertura, per ricerca o prima del salvataggio.
Completata questa separazione, preservando ricerca parziale e bozze. Indici
persistenti dei candidati restano successivi; finestre comuni e scope cataloghi
sono implementati nei seguiti documentati in fondo.
Risultati in [VERIFICA-TASK-CONTENUTI-DIFFERITI](../VERIFICA-TASK-CONTENUTI-DIFFERITI.md).

Primo intervento locale completato il 27 ottobre: raggruppamento limitato
delle letture Entries oltre 500 voci, senza nuove API o cambi al caricamento
dei corpi. Riduce le chiamate nel caso frammentato; non completa la separazione
elenco/corpi o gli indici dei candidati descritti sotto. Risultati in
[VERIFICA-LETTURE-ENTRIES-BATCH](../VERIFICA-LETTURE-ENTRIES-BATCH.md).

### Modifiche

- Separare metadati Task e corpi: titolo, stato, date, pianificazione,
  importanza, progetti, tag, versione e anteprima bastano al primo elenco.
  Caricare i corpi visibili/aperti su richiesta, conservando i filtri esistenti.
- Applicare i filtri pertinenti sul server; non ripercorrere tutti i task
  conclusi per ogni pagina dei task attivi. Introdurre indici ricostruibili
  per stato/periodo e ordinamento stabile.
- Definire cursore e versione della fotografia. Una fotografia di ID con
  scadenza può essere un primo passo: la sua perdita richiede ripartenza
  controllata, senza perdere bozze o dichiarare completo un elenco parziale.
- Limitare Days, Weeks e HabitLogs all'intervallo richiesto; separare catalogo
  del ciclo e storico. Le risposte parziali non sostituiscono intere collezioni.
- Estendere le risposte incrementali ai percorsi che restituiscono ancora
  `state_()` completo, aggiornando tutti i consumatori del contratto.
- Raggruppare salvataggi di riflessioni su più giornate con esiti per record;
  non promettere atomicità tra fogli senza un protocollo che la garantisca.

### Uscita

Filtri, conteggi e riepiloghi settimanali equivalenti; primo elenco senza
lettura di tutti i corpi. Budget di righe/byte e chiamate documentato, senza
crescita proporzionale allo storico concluso nella lettura ordinaria dei task
attivi. Focus, selezione, scroll e bozze restano stabili durante i caricamenti.

## 8. Fase 3 — Copia locale delle letture

### Schema e integrazione

Creare moduli dedicati sotto `frontend/`, importati dalla build e collegati
alla shell tramite un'interfaccia piccola. Mantenere una sola identità per voce.

| Store IndexedDB | Dati |
|---|---|
| `archiveMeta` | Namespace, schema, epoca, cursore, copertura, ultimo sync |
| `entries` | Metadati canonici per ID/versione |
| `contents` | Corpo/rich per ID/versione e stato verifica Docs |
| `commonRecords` | Giorni, settimane, obiettivi, abitudini e pianificazioni |
| `drafts` | Bozze con versione di partenza e revisione locale |
| `outbox` | Riservato alla fase 6, inizialmente non attivo |

Applicare dati e cursori in transazione. Separare copia remota e bozza:
risposte tardive possono aggiornare la prima, mai sovrascrivere l'editor sporco.
Migrare le bozze di sessione solo dopo scrittura locale confermata.

Mostrare subito i dati disponibili e l'ultimo aggiornamento; rivalidare in
background. La scadenza di 60 secondi deve pianificare una rilettura, non
distruggere la sessione. Applicare differenze per ID preservando i nodi editor.

### Privacy e fallimenti

Offrire disattivazione e cancellazione della copia locale, distinguendola
da bozze/outbox. Nessuna pulizia automatica dei dati non sincronizzati.
I tag privati mascherano la UI, non cifrano lo storage: comunicarlo senza
modificare implicitamente le preferenze di conservazione. Una copia precedente
non autorizza accessi remoti quando l'autorizzazione non è più valida.

### Uscita

Riapertura senza RPC bloccante, fallback con IndexedDB indisponibile,
isolamento archivi, quota, riavvio, migrazione schema e risposte obsolete.
In questa fase il salvataggio confermato resta quello Google, non offline.

## 9. Fase 4 — Protocollo incrementale e contenuti aggiornati

### 4A. API proposte

Nomi indicativi da stabilizzare con test di contratto:

| API | Contratto |
|---|---|
| `getSyncManifest` | Identità archivio, epoca, protocollo, capacità, cursore e client minimo |
| `getSnapshotPage` | Bootstrap per record/byte, checkpoint, copertura e cursore |
| `getChanges` | Upsert/tombstone dopo un cursore, limite, nuovo cursore e altre pagine |
| `getContentsBatch` | Contenuti/versioni di un insieme limitato di voci |
| `applyOperations` | Dalla fase 6: esiti per operationId, versione canonica, conflitto o errore |

Il bootstrap cattura un checkpoint, carica prima mese corrente/task attivi e
poi lo storico; recupera le modifiche concorrenti senza buchi. Cancellazioni
fra pagine non devono resuscitare voci. Un cursore oltre retention richiede
nuova fotografia, preservando bozze/outbox. Il trasporto è almeno una volta;
applicazione dei delta idempotente.

### 4B. Commit recuperabili su Sheets

Definire strutture additive per operazioni, sequenza commit, modifiche per
entità e puntatore alla versione corrente di DocContent. Non usare il solo
timestamp come cursore totale e non assumere transazioni ACID tra servizi.

Progettare prepare/apply/commit con payload recuperabile e ID idempotente.
Il feed pubblica solo commit completi; una scrittura interrotta deve essere
recuperata prima che il checkpoint possa saltarla. Anche le letture devono
vedere metadati e contenuti coerenti con il commit dichiarato. Eseguire fault
injection dopo ogni passaggio prima di adottare il protocollo.

Matrice obbligatoria delle mutazioni: note/task, status, tag, progetti,
pianificazione, giorni, settimane, obiettivi, abitudini, allegati, impostazioni
pertinenti, eliminazioni e import Docs. Nessuna API legacy può modificare dati
senza aggiornare il registro. Un feed incompleto renderebbe inaffidabile il client.

### 4C. Modifiche dirette in Docs

Rivalidazione iniziale in background con budget e comando Aggiorna; valutare
poi Drive `changes` per individuare file mutati. Il feed Drive riguarda file,
non singole voci e non sostituisce il registro applicativo.

Estrarre una volta le sezioni del documento cambiato; confrontare le baseline
e aggiornare copia applicativa e indice solo per sezioni valide. Con modifiche
pending conservare varianti e conflitto, senza scegliere per timestamp.
Gestire formattazione non supportata, marcatori alterati, cestino, spostamento
fuori archivio e perdita accesso. Conservare i controlli remoti di appartenenza.

### Uscita

Convergenza di due client, bootstrap con scritture concorrenti, eliminazioni,
cursore scaduto, import Docs e commit interrotto. Una modifica ordinaria non
richiede più download completo. Le versioni dei dati locali indicano anche
quanto recentemente sono state riconciliate con i documenti esterni.

## 10. Fase 5 — Ricerca locale completa

Indicizzare titolo, testo completo, tag, progetti, date e titoli allegati.
Conservare la semantica di sottostringa della ricerca corrente: un indice
soltanto per parole non equivale a `includes`. Confrontare scansione locale,
n-grammi o candidati indicizzati con verifica sul testo. Usare un worker se
necessario, verificandolo nella build e nel contenitore Apps Script.

Aggiornare per ID/versione dopo delta, import Docs e cancellazioni; dalla
fase 6 le modifiche locali pending prevalgono sulla copia remota. I risultati
e le anteprime rispettano il mascheramento privacy; invalidarli al cambio
delle impostazioni. Le anteprime di 220 caratteri non sostituiscono il corpo.

Mostrare «ricerca nei dati scaricati» fino a copertura completa; mantenere
una ricerca remota transitoria. Non interpretare un risultato locale vuoto
come assenza dall'intero archivio quando il bootstrap è incompleto.

**Uscita:** equivalenza su corpo, accenti, punteggiatura, sottostringhe,
pending, cancellazioni e Docs modificati; indicizzazione riprendibile senza
bloccare l'editor. Misurare separatamente indicizzazione e ricerca a indice pronto.

## 11. Fase 6 — Salvataggio locale durevole

### Protocollo

Migrare prima note/task, poi giorni/settimane/abitudini, infine le altre API.
I percorsi non migrati rimangono esplicitamente online: niente promessa di
offline completo prima della copertura di tutte le mutazioni.

Operazione: operationId, entità, baseVersion, payload, revisione locale,
dipendenze, tentativi e stato. Le nuove voci hanno identità stabile dal client,
validata dal server e compatibile con requestId/clientId esistenti.

1. Validare e scrivere snapshot locale + outbox nella stessa transazione.
2. Solo dopo il commit locale mostrare conferma e lasciare l'editor utilizzabile.
   Su errore storage conservare il testo e offrire invio remoto, senza falsa
   conferma di durabilità locale.
3. Inviare lotti limitati ordinati per entità/dipendenze. Coordinare le schede
   con una lease recuperabile, mantenendo l'idempotenza server come protezione
   anche quando il coordinamento locale fallisce.
4. L'ACK conferma solo l'operazione inviata: una bozza successiva resta sporca;
   aggiornare la baseline delle operazioni dipendenti senza perdere il testo.
5. Retry con backoff/jitter per errori temporanei; conflitti con entrambe le
   versioni conservate e scelta esplicita, mai ultimo writer vince.

Accorpare solo modifiche non ancora inviate. Non cambiare payload di un ID
già inviato, neppure dopo timeout dall'esito incerto. Idempotenza anche per
edit/delete, con retention ricevute documentata. Operazioni oltre tale finestra
richiedono riconciliazione, non replay cieco.

### Stati dell'interfaccia

- «Salvato su questo dispositivo»: transazione locale completata.
- «Salvato su Google»: commit remoto confermato.
- «Docs aggiornato»: versione esportata confermata.
- Errore o conflitto: motivo e azione di recupero, con testo conservato.

Il browser invia mentre il client è in esecuzione. Chiudere la scheda lascia
le operazioni locali per la prossima apertura; il trigger Google completa
solo quelle già ricevute. Il piano non introduce una PWA né garantisce che
l'interfaccia Apps Script si apra da zero senza rete.

**Uscita:** riavvio, timeout dopo commit, doppio invio, due dispositivi,
editing durante ACK, quota e conflitto delete/edit: zero duplicati, perdita
di testo o falsa conferma Google.

## 12. Fase 7 — Crescita e manutenzione

- Indice corrente DocContent con versione e frammenti verificabili; storico
  fuori dal percorso ordinario. Gli indici di riga non sono identità e vanno
  aggiornati/invalidati quando le righe vengono spostate o cancellate.
- Separare lavori attivi e ricevute completate, evitando scansioni dell'intera
  cronologia nella sincronizzazione ordinaria.
- Retention esplicita per revisioni, feed, tombstone e ricevute; proteggere
  baseline dei conflitti e lavori pending. Implementare prima dry-run e
  controllo referenze, poi compattazione a checkpoint recuperabile.
- Migrazioni additive, versionate e ripetibili. Conservare il percorso precedente
  finché la nuova rappresentazione non è verificata.
- Valutare partizioni per anno/periodo soltanto se richieste dalle misure;
  evitare un nuovo file Drive per ogni piccola modifica.

Non promettere crescita illimitata su Sheets. Definire capacità supportata
in voci, byte e revisioni; verificare quote/limiti Google vigenti prima delle
scelte di produzione. La pulizia dello storico reale richiede autorizzazione
specifica e non fa parte della semplice pubblicazione del codice.

## 13. Criteri prestazionali e test

Obiettivi da validare, non risultati acquisiti. Per i benchmark locali usare
almeno 30 ripetizioni per scenario, p50/p95 e hardware/browser dichiarati.
Per Google dichiarare campione e condizioni, senza dedurre causalità da pochi
campioni non alternati. Nessun contenuto o identificativo personale negli export.

| Operazione | Obiettivo iniziale |
|---|---|
| Vista presente in IndexedDB | p95 entro 500 ms dopo disponibilità frontend |
| Ricerca locale, indice pronto | p95 entro 200 ms su 10.000 voci di riferimento |
| Conferma locale modifica ordinaria | p95 entro 200 ms |
| RPC simulata da 20 s | Editor e navigazione utilizzabili |
| Singola modifica remota | Delta limitato ai record interessati |
| Crescita 10.000 → 50.000 voci | Degrado documentato; nessuna scansione integrale nel percorso ordinario della singola voce |

Separare caricamento HTML Apps Script, primo bootstrap e riapertura locale.
La soglia 50.000 è uno stress test, non una promessa di capacità. Misurare
anche consumo memoria, volume DB e tempi di bootstrap/ricostruzione indice.

Suite nuove indicative: `test:storage`, `test:sync`, `test:queue-concurrency`,
`test:search-index`, `test:scale`. Integrare le regressioni significative nelle
suite attuali, senza duplicazioni puramente meccaniche.

Per modifiche applicative: build e npm test; test:release per diario/task;
tracing, progressive, incremental e test privacy/rich pertinenti. Demo.html
per prove browser con latenza/guasti. I mock verificano correttezza e numero
di operazioni, non la velocità reale delle API Google.

## 14. Rilascio e rollback

Capacità separate per letture locali, feed, indice e outbox; attivazione per
traguardo dopo i test. Documentare protocollo minimo e recupero per ogni rilascio.

Disattivare la copia locale può tornare alle API correnti. Disattivare l'outbox
non può cancellarla: lasciare operazioni visibili/esportabili con percorso di
invio o recupero. Un downgrade incompatibile rifiuta nuove operazioni senza
perdere quelle locali. Conservare il lavoro prima di chiedere aggiornamento
client; non eliminare il DB per risolvere una migrazione fallita.

## 15. Pacchetti di implementazione

| Ordine | Pacchetto revisionabile | File principali |
|---|---|---|
| 1 | Tracing lock e fixture crescita | Code.gs, shell.html, tests/ |
| 2 | Prototipo IndexedDB e identità archivio | frontend/, Code.gs, tests/ |
| 3 | Ricerca coerente senza lock lungo | DriveDocs.gs, tests/ |
| 4 | Worker coordinato; lotti ridotti come fallback | DriveDocs.gs, Code.gs, tests/ |
| 5 | Task metadati/corpi separati | JournalEditor.gs, DiaryPage.vue, shell.html |
| 6 | Dati comuni per intervallo e risposte incrementali | Code.gs, shell.html, tests/ |
| 7 | Repository locale e riapertura viste | frontend/, componenti, Demo.html tramite build |
| 8 | Commit recuperabili, ricevute e feed completo | Tutti i .gs, tests/ |
| 9 | Bootstrap coerente e riconciliazione Docs | DriveDocs.gs, frontend/, tests/ |
| 10 | Indice e ricerca locale | frontend/, shell.html, tests/ |
| 11 | Outbox e conflitti prima note/task, poi altre entità | frontend/, .gs, componenti, tests/ |
| 12 | Retention, compattazione e stress test | .gs, tests/, docs/ |

Ogni pacchetto ha criteri di uscita propri e non deve essere pubblicato insieme
a tutto il resto. Non fissare una data di completamento prima delle prove su
persistenza iframe, writer Docs e commit recuperabili: sono le maggiori
incertezze tecniche. Una stima attendibile segue i pacchetti 1–2 e il disegno
validato dei pacchetti 4 e 8.

## 16. Documentazione e stato delle verifiche

Avvio autorizzato il 27 ottobre: tracing lock/lettore, fixture di crescita e
prototipo IndexedDB sintetico implementati. Risultati e limiti in
[VERIFICA-AVVIO-SPEC-004](../VERIFICA-AVVIO-SPEC-004.md). Restano da validare
il vero iframe Apps Script e l'identità prima della cache applicativa.

Aggiornare ARCHITETTURA, MODELLO-DATI, SPECIFICHE, SVILUPPO e HANDOFF soltanto
per funzionalità effettivamente implementate; rapporto di verifica per traguardo.

La parte restante descrive funzionalità proposte, non disponibili. Nessun
accesso ai dati del diario, migrazione o nuovo deployment durante questa tranche.

Letture temporali limitate al diario e contratto di copertura: [verifica locale](../VERIFICA-DATI-COMUNI-PERIODO.md). Finestre estese a Settimana/Abitudini: [verifica del seguito](../VERIFICA-SETTIMANA-ABITUDINI-PERIODO.md).

Cataloghi senza storico e delta canonici di obiettivi, abitudini, progetti e impostazioni: [verifica locale](../VERIFICA-CATALOGHI-DELTA.md). Altri percorsi legacy restano da implementare. Lotto riflessioni completato nel seguito: [verifica](../VERIFICA-RIFLESSIONI-LOTTO.md).

Allegati, aggiornamento legacy e conversione progetto/tag ora rispondono con delta: [verifica](../VERIFICA-DELTA-LEGACY.md). La cancellazione ha ora [risposta incrementale](../VERIFICA-CANCELLAZIONE-DELTA.md); contesa Docs invariata.
