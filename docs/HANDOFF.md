# Passaggio di consegne — 17 ottobre 2026

## Repository locale — SPEC-004 pacchetto 7 parziale, solo sintetico

Fondamenta IndexedDB implementate: scope archivio/principale/epoca, lotti
atomici con checkpoint e revisione CAS, corpi versionati, bozze indipendenti,
invalidazione/cancellazione remota senza perdere bozze o outbox riservata.
Prova manuale nella diagnostica su DB separato con soli marcatori inventati;
nessuna apertura automatica o RPC. Copia applicativa ancora disabilitata:
cacheReady resta false e nessuna vista usa il repository.
[Contratto, verifiche e limiti](VERIFICA-REPOSITORY-LOCALE.md).
Build, npm test, test:repository e test:release superati; Index/Demo rigenerati.
Restano riapertura viste, integrazione risposte server e collaudo iframe reale.
Nessun deploy o dato reale; ultimo online documentato resta Apps Script 75.

## Identità archivio — SPEC-004 pacchetto 2 parziale, solo locale

Nuovo getSyncManifest: archiveId/epoch persistenti per DB_ID+ROOT_ID e
principalId separato in UserProperties, dopo confronto utente attivo/effettivo
non vuoti. Nessuna email o ID Drive restituiti. Controlli live di accesso,
lock breve non bloccante, identità corrotte non sostituite e retry dei metadati
incerti. Capacità di copia locale/feed/outbox tutte disabilitate.
Modulo frontend archive-identity e verifica manuale nella diagnostica, senza
RPC all'avvio o aperture IndexedDB; risposte obsolete e fallimenti revocano
lo scope. Nuovo scope userinfo.email nei sorgenti, da autorizzare al futuro
deploy. Access MYSELF e USER_DEPLOYING invariati.
[Verifica, contratto e limiti](VERIFICA-IDENTITA-ARCHIVIO.md).
Build, npm test, test:identity, test:storage, test:release e test:tracing superati.
Index/Demo e sei file di staging rigenerati. Commit worker precedente 3da5df2.
Manca ancora la verifica sul vero iframe Google: pacchetto 2 non chiuso.
Nessun deploy, setup o dato reale; ultimo online documentato Apps Script 75.

## Worker a lotti piccoli — SPEC-004 fase 1B parziale, solo locale

Una voce per acquisizione del lock, rilascio/flush fra le voci, rilettura della
coda a ogni unità. Massimo 10 identità e budget morbido di 5 secondi; stop su
busy o esito di creazione/chiusura Docs incerto. Nuove versioni fra unità restano
pending, errori non ripetuti nello stesso passaggio. UI mostra progresso e
lavoro rimasto; tracing distingue occupazione totale e massima del lock.
È l'alternativa intermedia della SPEC: scritture ancora sotto il lock globale,
una singola chiamata lenta può oltrepassare il budget, costo totale potenzialmente
maggiore. Writer condizionale e coordinamento completo restano da sviluppare.
[Verifica, fonti e limiti](VERIFICA-WORKER-LOTTI-PICCOLI.md).
Build, npm test, test:worker-chunks, test:release, test:locks, test:tracing,
test:search-concurrency e P54 superati. Index/Demo e sei file di staging
rigenerati; nessun deploy, trigger nuovo o dato reale. Ultimo online Apps Script 75.

## Ricerca senza lock lungo — SPEC-004 fase 1A, solo locale

searchArchive ora legge fuori dal lock globale, con tre controlli brevi
tryLock(0) di configurazione/revisione e senza flush. Nuova SEARCH_REVISION
prima delle mutazioni pertinenti, una volta per richiesta IO; mappe di refs,
allegati e pending. Precedenza del pending mantenuta. Controlli live di
revisione/archivio/cestino prima e dopo i Docs. Writer concorrenti invalidano
il lotto; continuazioni legate a scope/query/revisione. UI scarta tutte le
pagine al reset e propone retry, senza pubblicare pagine incomplete nello
stato canonico. Errori Docs segnalati come ricerca parziale.
[Contratti, prove e limiti](VERIFICA-RICERCA-SENZA-LOCK-LUNGO.md).
Build, npm test, test:search-concurrency, test:release, test:tracing,
test:delete-delta, test:progressive, test:task-index, test:locks e test:scale superati.
Index/Demo e sei file di staging rigenerati; mock con revisioni file.
Il worker mantiene il proprio lock lungo; il browser attende ancora la ricerca.
Nessun deploy o dato reale; ultimo online documentato resta Apps Script 75.

## Cancellazione con delta — SPEC-004, solo locale

Con incrementalCommon:true, deleteNote risponde con deletedEntryIds e
alreadyAbsent, senza ricostruire state_(). Il client elimina entry, collegamenti,
pianificazione e copie in archivio/cache; preserva bozze estranee e sostituisce
la sessione del diario per scartare richieste precedenti. Retry dopo risposta
persa gestito dal ramo già assente. Versioni, marcatori e controlli live Drive
invariati; nessuna atomicità o revisione del lock Docs introdotta.
[Verifica e limiti](VERIFICA-CANCELLAZIONE-DELTA.md).
Build, npm test, test:delete-delta, test:release, test:tracing,
test:progressive, test:incremental e test:legacy-deltas superati.
Index/Demo e sei file di staging rigenerati. Nessun deploy o dato reale;
ultimo online documentato resta Apps Script 75.

## Delta dei percorsi legacy — SPEC-004, solo locale

Con incrementalCommon:true, addFileLink restituisce il solo allegato canonico
(anche se duplicato), updateEntry i metadati versionati, convertProjectToTag
le patch dei soli campi mutati con rimozione progetto e tag aggiunti. Nessuna
ricostruzione state_() dopo queste scritture. Client: merge per identità,
contenuti/privacy conservati, niente record incompleti per voci non caricate,
cache invalidate e bozze mantenute con versioni originali. I client senza
opt-in restano compatibili. Conversione ancora proporzionale ai record coinvolti;
La cancellazione è trattata nel seguito sopra; contesa dei writer Docs invariata. [Verifica e limiti](VERIFICA-DELTA-LEGACY.md).
Build, npm test, test:legacy-deltas, test:release, test:tracing e
test:incremental superati. Index/Demo e sei file di staging rigenerati.
Nessun deploy o dato reale; ultimo online documentato resta Apps Script 75.

## Riflessioni multigiornata in lotto — SPEC-004, solo locale

Nuova saveDays: fino a 10 date/500.000 byte, una RPC e un lock/flush, letture
solo delle giornate richieste. Esito per data e upsert dei soli record
confermati; conflitti e campi invalidi non bloccano le altre giornate.
Un errore di scrittura inatteso interrompe le successive, senza falsa conferma.
Salva pagina raggruppa ora le riflessioni: tre giorni una RPC, ventuno 10/10/1.
Bozze mantenute su errore, conflitto, risposta persa o malformata; nuove modifiche
durante ACK restano sporche con baseline aggiornata. saveDay singolo invariato.
Niente atomicità del lotto o idempotenza operationId: un commit senza risposta
può dare conflitto al retry, conservando la bozza. Dettagli e verifiche in
[VERIFICA-RIFLESSIONI-LOTTO.md](VERIFICA-RIFLESSIONI-LOTTO.md).
Build, npm test, test:day-batch, test:release, test:cycle, test:progressive,
test:tracing, test:incremental e P75 superati. Index/Demo e sei file di staging
rigenerati. Nessun deploy o accesso ai dati reali; ultimo online resta v75.

## Cataloghi e risposte incrementali — SPEC-004, solo locale

Il frontend richiede delta canonici per obiettivi, abitudini (anche archivio),
progetti e impostazioni delle riflessioni. Niente state_() dopo queste scritture;
merge per identità e settingsPatch senza perdere bozze o versioni. Compatibilità
completa per client senza opt-in. Le viste senza periodo richiedono lo scope
catalogs senza storico temporale; Impostazioni/Sync omettono anche le voci del
mese. Restano completi i cataloghi scaduti e altri percorsi legacy; il lotto
multigiornata delle riflessioni è implementato nel seguito sopra.
Fixture con 50.000 record storici per tabella: lettura cataloghi invariata a
28 celle, non una misura della latenza Google. Dettagli e verifiche in
[VERIFICA-CATALOGHI-DELTA.md](VERIFICA-CATALOGHI-DELTA.md).
Build, npm test, test:catalog-deltas, test:cycle, test:release,
test:common-periods, test:common-window, test:incremental, test:tracing e P87
browser superati. Index/Demo e sei file di staging rigenerati.
Nessun deploy o dato reale; ultimo online documentato resta Apps Script 75.

## Settimana e Abitudini per periodo — SPEC-004, solo locale

Estese le finestre alle due viste: Settimana legge il periodo visibile e il
checkup; Abitudini legge la giornata e le settimane indipendenti del tracker
e del giorno scelto, senza i periodi intermedi. Slice con ranges per unioni
separate, scope week/date e merge limitato agli intervalli. Durante la lettura
il vecchio modulo rimane montato e disabilitato; errori ripristinano selezione,
bozze rich e versioni. Le risposte della vista precedente vengono invalidate.
Fixture con 50.000 righe storiche per tabella: 126/124 celle contro 1.450.283
della lettura completa, non una misura della latenza Google. In questa tranche le viste senza
finestra mantenevano la lettura completa; il seguito sopra introduce catalogs.
Build, npm test, test:common-periods, test:common-window, test:release,
test:cycle, test:incremental, test:diary-goals, test:tracing, P85 e P88 superati.
Dettagli e limiti in
[VERIFICA-SETTIMANA-ABITUDINI-PERIODO.md](VERIFICA-SETTIMANA-ABITUDINI-PERIODO.md).
Index/Demo e sei file di staging rigenerati. Nessun deploy o dato reale;
ultimo online documentato resta Apps Script 75.

## Dati comuni del diario per periodo — SPEC-004, solo locale

Il diario legge Days del mese più il giorno precedente, HabitLogs delle
settimane interessate e Weeks del focus corrente. Contratto esplicito
commonSlices/commonScope; cataloghi riutilizzati separatamente per 60 secondi.
Merge limitato agli intervalli, cache vista subordinata alla copertura e
risposte ritardate scartate dopo salvataggi confermati. In questa prima tranche le altre viste facevano
fallback completo; il seguito sopra estende le finestre a Settimana e Abitudini. Fixture con 50.000 giorni/log fuori
periodo: 85 celle lette contro 950.124 della lettura completa, non latenza reale.
Dettagli, verifiche e limiti in
[VERIFICA-DATI-COMUNI-PERIODO.md](VERIFICA-DATI-COMUNI-PERIODO.md).
Nessun deploy o dato reale; Index/Demo e sei file di staging rigenerati.

## Fotografia Task per le continuazioni — SPEC-004, solo locale

Implementato lo step successivo: prima pagina dei metadati da Sheets, poi
fotografia ordinata temporanea in CacheService, fino a 200 record per pagina.
Token/offset/cursore, scope e revisione verificati. Nella fixture da 50.000
voci le continuazioni passano da 389 letture/849.992 celle a zero letture
Sheets. Restano chiamate Cache/Properties e costo della prima scansione.
Nuova proprietà runtime TASK_INDEX_REVISION invalidata prima delle scritture
pertinenti, una volta per richiesta. Nessun setup o nuovo foglio.
Cache persa/scaduta o dati cambiati: stato parziale e retry con bozze conservate;
fallback senza indice dopo problemi cache. Worker Docs e salvataggi canonici
mantengono i contratti precedenti. Dettagli in
[VERIFICA-INDICE-TASK.md](VERIFICA-INDICE-TASK.md).
Build, npm test, test:task-index, test:scale, test:locks, test:tracing,
test:release, test:task-deferred, test:progressive, test:incremental e P82
superati; Index e Demo rigenerati, sei file di staging verificati.
Nessun deploy o accesso ai dati reali; ultimo online documentato Apps Script 75.

## Task: elenco e descrizioni separati — seguito SPEC-004, solo locale

Implementato lo step successivo: la vista Task carica metadati a pagine fino
a 200, senza Drive/Docs/DocContent. Le descrizioni vengono richieste
all'apertura, per la ricerca nei testi o prima di salvare una modifica che
non ha ancora il corpo originale. Nuova API versionata `getJournalContents`,
massimo 25 voci e controlli della versione prima/dopo la lettura; lettore
contenuti condiviso col diario normale. Ricerca parziale, retry, privacy,
bozze e risposte obsolete gestiti senza usare placeholder nei salvataggi.
Tracing measurementVersion 4: `metadataOnly` distingue la nuova navigazione
dell'elenco dal completamento dei corpi delle versioni precedenti.
Dettagli in [VERIFICA-TASK-CONTENUTI-DIFFERITI.md](VERIFICA-TASK-CONTENUTI-DIFFERITI.md).
Build, npm test, test:task-deferred, test:release, test:progressive,
test:incremental, test:tracing, test:scale, test:locks e P82 superati.
Index e Demo rigenerati; nessuna dipendenza o autorizzazione Google nuova.
Nessun deployment o accesso ai dati reali; ultimo online documentato Apps Script 75.

## Letture Entries raggruppate — seguito SPEC-004, solo locale

Implementato su richiesta lo step successivo: `entrySearch_` oltre 500 voci
usa `readEntries_` con intervalli limitati a 256 righe e amplificazione massima
otto. Restituisce solo i record richiesti; corpo storico escluso, ordine e
contratti preservati. Nessuna nuova API o modifica ai salvataggi/lock.
Nel dataset sintetico da 50.000 voci le letture per pagina Task scendono da
20.003 a 389; le celle aumentano da 340.028 a 849.992. È un risultato sul
lavoro simulato, non una misura della latenza Google. Dettagli e limiti in
[VERIFICA-LETTURE-ENTRIES-BATCH.md](VERIFICA-LETTURE-ENTRIES-BATCH.md).
Test dedicato `test:entry-batch`, incluso in npm test; budget in test:scale.
Build, npm test, test:scale, test:locks, test:tracing, test:release,
test:progressive, test:incremental e P82 superati; Index e Demo rigenerati.
Nessun deployment: ultimo online documentato resta Apps Script 75.

## Avvio SPEC-004 — 27 ottobre 2026, solo locale

Autorizzato l'avvio degli sviluppi del piano prestazionale. Prima tranche:
tracing measurementVersion 3 con attesa/occupazione lock e volume del lettore
Sheets, fixture di crescita e prova IndexedDB manuale con soli dati fittizi
in Impostazioni → Diagnostica prestazioni. Nessuna cache applicativa, outbox,
modifica al protocollo di salvataggio o al lock del worker. Nessun deploy:
ultimo online documentato resta Apps Script 75.
Risultati, baseline e limiti in [VERIFICA-AVVIO-SPEC-004.md](VERIFICA-AVVIO-SPEC-004.md).
Build, npm test, test:locks, test:storage, test:scale, test:tracing,
test:release, test:progressive e test:incremental superati su dati simulati.
La prova nel vero iframe Google e l'identità stabile dell'archivio restano
da validare prima di conservare dati applicativi in IndexedDB.

## Stato consegnato

GDiary v2.0.3. Sorgenti estratti dalla cartella storicamente chiamata BulletJournal-v3; il nome precedente non indica la versione corrente. Nessun accesso ai dati dell'utente, nessun deployment Google e nessuna creazione di repository GitHub eseguiti durante questo passaggio.

Ultime modifiche applicative:

- v2.0.1: numero di release completo; preferenze browser separate per apertura di inizio/fine giornata e abitudini.
- v2.0.2: frecce Espandi/Comprimi coerenti con Mostra/Nascondi dei task e spazio corretto accanto al menu mobile.
- v2.0.3: cinque riepiloghi settimanali compatti dei task; «Rivedi nel diario» attiva i filtri pertinenti e «Torna al checkup» riapre la settimana. Rimossi i vecchi comandi di gestione task dal checkup. Giorno pianificato e intervalli di lavorazione sovrapposti alla settimana sono inclusi.

Preparazione repository: test browser resi portabili tramite CHROME_PATH o Chromium Playwright; immagini di test dirette ad artifacts quando prima dipendevano da cartelle esterne; documentazione storica separata. Nessun cambiamento funzionale aggiuntivo all'app.

## Vincoli da conservare

- Una sola identità per voce: task nel diario, nei progetti e nei filtri sono gli stessi record.
- Salvataggio Sheets prima della sincronizzazione Docs. «In attesa» può riferirsi a Docs, non a una perdita del salvataggio Sheets.
- Titolo nota facoltativo, titolo task richiesto e su una sola riga.
- Conservare bozze, formattazione, protezione dai conflitti e privacy anche cambiando vista o dopo errori parziali di salvataggio.
- Le preferenze locali non devono sporcare i dati del diario.
- Non pubblicare automaticamente né cambiare ROOT_FOLDER_ID, permessi o dati reali senza una richiesta pertinente.

## Come riprendere con un assistente

Aprire questa cartella come progetto e chiedere: «Leggi README.md, docs/HANDOFF.md, docs/SPECIFICHE.md e docs/ARCHITETTURA.md. La base è v2.0.3. Prima di cambiare codice verifica lo stato dei file e usa Demo.html per i test locali. L'attività da svolgere è: …».

La conversazione precedente non è necessaria per compilare il progetto; le discussioni future sono riassunte in ROADMAP.md. I documenti in history possono descrivere funzioni o decisioni superate. Non eseguire i loro comandi alla cieca.

## Stato delle ipotesi locali

Aggiornamento 22 ottobre 2026: implementata localmente la
[SPEC-001](specs/001-tracing-prestazioni.md), diagnostica prestazioni opzionale
in Impostazioni con export JSON filtrato, misure RPC/backend/rendering e batch
di salvataggio correlati. Pubblicazione autorizzata eseguita il 22 ottobre:
deployment esistente aggiornato alla versione Apps Script 63, stesso URL.
Inclusa la correzione dell'allineamento dei comandi nota/task. Il collaudo
autenticato e la raccolta della baseline reale restano da effettuare.

Successivamente raccolta una prima baseline reale e avviata la fase 0 della
SPEC-002: estensione locale del tracing con tempi esclusivi, dettaglio
DocContent/cache, motivi osservabili dei miss, correlazione delle pagine e
benchmark get/getAll facoltativo. Estensione pubblicata su richiesta nella
versione Apps Script 64, mantenendo lo stesso URL; le ottimizzazioni applicative
restano proposte in attesa delle nuove misure.

IndexedDB, sincronizzazione offline bidirezionale, PWA ed Electron sono stati discussi, ma NON implementati. Non sostituire il salvataggio corrente basandosi soltanto sulla discussione. La prossima eventuale fase deve validare persistenza e identità dell'archivio nel contesto Apps Script.


## Aggiornamento locale — 23 ottobre 2026

Baseline measurementVersion 2 raccolta il 22–23 ottobre e aggregata nella
SPEC-002, senza conservare export originali. Autorizzato e implementato
l'esperimento E: getAll/putAll per pagina, controlli revisione e pending
preservati; tracing additivo cacheGetAll/cachePutAll e Demo aggiornata.
Pubblicazione esplicitamente richiesta ed eseguita il 23 ottobre 2026:
versione Apps Script 65 sul deployment esistente, stesso URL e accesso privato.
Backup dei sei sorgenti remoti fuori repository e confronto con la base
prima del push; nessuna modifica remota divergente. Nessun accesso ai contenuti
del diario né setupDrive.
DocContent raggruppato, progressivo task e modifiche dei controlli Drive
restano successivi. Risultati locali e limiti in docs/VERIFICA-CACHE-BULK.md.


Collaudo reale successivo via Chrome dedicato autenticato dall'utente e
Playwright: cinque letture pagina e cinque navigazioni Task riuscite, tutte
hit; coda zero pending/errori prima e dopo. Pagina mediana 4,499 s client,
cache 38 ms; Task mediana 16,680 s su 61 voci / tre pagine. Nessuna scrittura
sui dati del diario. Dettagli e limiti in VERIFICA-CACHE-BULK.md.


Seguito autorizzato sui controlli Drive: implementato localmente il riuso
nella stessa richiesta degli antenati sul solo percorso verificato da
inside_, con tracing di appartenenza/genitori/radice/cestino. Nessuna cache
tra richieste. Build, npm test, test:tracing, test:release e test browser
P82/P85 passati. Pubblicazione esplicitamente richiesta ed eseguita il 23 ottobre 2026:
questo seguito è attivo nella versione Apps Script 66, stesso deployment e URL. Dettagli in docs/VERIFICA-CONTROLLI-DRIVE.md.


Collaudo reale versione 66 completato su richiesta con Playwright/Chrome:
cinque letture pagina e cinque navigazioni Task, tutte riuscite e tutte hit;
coda zero pending/errori. Mediane pagina 5,629 s, Task 14,462 s, rispetto a
4,499 / 16,680 s della versione 65: risultato misto, nessun miglioramento
complessivo dimostrato. driveParents pagina mediana 1,785 s, cestino 6 ms;
riuso antenati osservato. Dettagli in VERIFICA-CONTROLLI-DRIVE.md. Nessuna
scrittura ai dati reali. Il confronto prestazionale non è un A/B alternato.


## Task progressivi — pubblicati nella versione 67

Autorizzata come prossima azione dopo il commit c1e2e72. Ogni pagina task è
visibile prima delle successive, con risultati esplicitamente parziali,
errori e retry conservativo. Editor/bozze/ricerca preservati, sessioni obsolete
ignorate e una richiesta pagina in volo. firstResultMs misura prima patch DOM,
non paint. Build e test locali passati; dettagli in VERIFICA-TASK-PROGRESSIVI.md.
Deploy successivamente richiesto ed eseguito il 23 ottobre 2026: versione
Apps Script 67 sul deployment esistente, stesso URL e accesso privato.
Backup remoto fuori repository confrontato con la base 66, nessuna divergenza.
Tutti i controlli della procedura passati; nessun setupDrive o modifica diretta
dei dati del diario. Collaudo autenticato del progressivo successivamente completato (vedi sotto).


Collaudo reale v67 richiesto dall'utente: cinque letture pagina e cinque
navigazioni Task riuscite. Primo risultato DOM task mediana 5,067 s,
completamento 16,058 s; primi risultati disponibili 10,129–14,486 s prima
della fine delle rispettive navigazioni. Stato parziale e preservazione
nodo editor/focus/selezione verificati senza modifiche. Coda zero pending/errori;
contenuti finali equivalenti nelle ripetizioni. Nessun miglioramento del tempo
totale dimostrato. Dettagli e limiti in VERIFICA-TASK-PROGRESSIVI.md.


## DocContent raggruppato — seguito al commit 74f0a7f

Implementato su autorizzazione il passo A: ricerca degli ID necessari alla
pagina in finestre limitate, lettura dei soli frammenti correnti raggruppati,
fallback individuale oltre budget bulk, errori localizzati e snapshot solo
nella richiesta. Test locali passati, dettagli/limiti in VERIFICA-DOCCONTENT-BATCH.md.
Deploy richiesto ed eseguito: versione Apps Script 68, stesso deployment/URL
e accesso privato. Backup remoto confrontato con la base 67 senza divergenze,
controlli superati. Collaudo reale richiesto ma non completato; nessun setupDrive.

Ripresa dopo interruzione: rieseguiti build, npm test, test:tracing,
test:release e test:progressive con esito positivo. Rafforzati i test A per
input vuoti/duplicati, limite 25 ID, isolamento dello snapshot tra richieste,
recupero dopo errori di ricerca/intestazioni e bypass esplicito della cache.
La sessione Chrome precedente era inizialmente indisponibile. Nessun nuovo
deploy durante la ripresa. B resta una proposta successiva.

Collaudo reale v68 successivamente completato su richiesta dopo accesso Google
dell'utente nel Chrome dedicato. Cinque letture warm e cinque con bypass cache:
tutte riuscite, 25 voci e contenuti canonici equivalenti, zero errori. Mediane
client warm 4,621 s, bypass 10,504 s; DocContent batch sul bypass 434 ms,
una ricerca su 74 righe, zero fallback. Cinque navigazioni Task riuscite,
61 voci/tre pagine tutte hit; primo risultato DOM mediano 5,198 s e
completamento pagine 16,153 s, escluso l'eventuale getState precedente.
Stato parziale, nodo editor/focus/selezione conservati senza modifiche.
Coda prima/dopo zero pending/errori, 64 completate. Nessun salvataggio del
diario, setupDrive o nuovo deploy. Nessun miglioramento temporale complessivo
dimostrato; dettagli e limiti in VERIFICA-DOCCONTENT-BATCH.md.


## Release 2.0.4 — Apps Script 69

Versione funzionale aggiornata da 2.0.3 a 2.0.4 per documentare il recupero
raggruppato di DocContent. Il changelog descrive il beneficio strutturale e
specifica che non è dimostrata una riduzione del tempo totale. package.json,
lockfile, Demo, sorgenti UI e Changelog sono aggiornati; Index.html rigenerato
con la build. Dopo il backup e il confronto dei sei file della versione 68
(identici salvo Index.html e Changelog.html), il deployment esistente è stato
aggiornato alla versione 69, stesso URL e accesso privato. Descrizione:
«GDiary v2.0.4 - recupero DocContent raggruppato». ROOT_FOLDER_ID è stato
passato solo tramite variabile temporanea ricavata dal backup remoto, senza
modificare i sorgenti o stampare l'identificativo. Build, test della procedura
di deploy e test:release superati. Chrome autenticato conferma che l'interfaccia
mostra v2.0.4. Nessun setupDrive o modifica ai dati del diario.


## Risposte di salvataggio incrementali — sviluppo locale

Implementato su richiesta il passo B della SPEC-002: Days, Weeks e HabitLogs
restituiscono il solo record canonico salvato tramite `commonUpserts`.
Frontend aggiornato nelle viste giorno, settimana, diario continuo e tracker.
Nessuna rilettura completa compensativa; preservati versioni, campi e record
estranei. Nessun deploy né accesso ai dati reali.
Verifiche e limiti in VERIFICA-SALVATAGGI-INCREMENTALI.md.

Deploy successivamente richiesto ed eseguito il 23 ottobre 2026: versione
Apps Script 70 sul deployment esistente, stesso URL e accesso privato.
Prima della pubblicazione rieseguiti build, npm test, test:incremental,
test:release, test:tracing, test:progressive e P85/P80/P75: tutti positivi,
come i controlli aggiuntivi della procedura di deploy. Backup remoto dei sei
file fuori repository; HEAD remoto e versione 69 coincidenti con la base Git.
Verifica successiva: deployment alla versione 70 e sei sorgenti pubblicati
identici allo staging. ROOT_FOLDER_ID passato solo tramite ambiente allo
staging, sorgente condiviso invariato. Nessun setupDrive o modifica ai dati
del diario. Collaudo autenticato dei salvataggi reali non eseguito.

Collaudo autenticato v70 successivamente completato su richiesta nel Chrome
Windows dedicato. Due navigazioni Task con 64 identità distinte e due aperture
settimana riuscite; diario caricato senza errori. Tre salvataggi reali con gli
stessi valori (giorno, settimana, abitudine): solo updatedAt modificato,
risposte con un record canonico, nessuna rilettura completa compensativa.
Tre tentativi con versioni obsolete rifiutati. Rilettura finale conferma tutti
i contenuti/formattazione e i record estranei invariati; coda zero pending,
zero errori, 67 completate prima e dopo. Misure singole RPC 2,635/2,693/3,169 s,
non un confronto A/B. Dettagli in VERIFICA-SALVATAGGI-INCREMENTALI.md.
Nessun nuovo deploy o setupDrive durante il collaudo.

## Design Obiettivi e abitudini — SPEC-003 locale

Avviato su richiesta lo sviluppo della proposta completa: stile e gerarchia
coerenti con diario/settimana, una superficie, tracker a tutta larghezza e
giornata nel flusso. Rimossi i vecchi adattamenti DOM della vista. Funzioni
di creazione, modifica, risultato, registrazione e archiviazione conservate;
riflessione rich senza riscrivere l'intenzione. Bozze separate per form nella
scheda e versione originaria preservata dopo altri salvataggi. Nuovo comando
test:cycle e verifica in docs/VERIFICA-DESIGN-OBIETTIVI.md. Nessun nuovo deploy
o accesso ai dati reali: Apps Script 70 mantiene il design precedente.

Deploy del nuovo design successivamente richiesto ed eseguito il 23 ottobre
2026: Apps Script 71, stesso deployment, URL e accesso privato. Build, npm test,
test:cycle, test:release, test:incremental e controlli della procedura superati.
Backup remoto dei sei file fuori repository: HEAD/versione 70 uguali alla
base Git; nessuna divergenza. Sei sorgenti pubblicati verificati identici allo
staging, manifest privato conservato e ROOT_FOLDER_ID passato solo tramite
ambiente. Nessun setupDrive o modifica ai dati del diario.

Verifica autenticata del design 71 completata in sola lettura nel Chrome
Windows dedicato: quattro sezioni e superficie unica, tracker completo di
nove colonne senza overflow desktop, apertura settimana e ritorno al ciclo
riusciti. Nessuna bozza pendente; coda zero pending/errori e 67 completate
prima e dopo. Nessun salvataggio reale durante questa verifica.

## Promemoria obiettivi in cima al diario — sviluppo locale

Su richiesta, aggiunti titoli e descrizioni degli obiettivi del trimestre
del mese visualizzato, prima delle giornate. Nessun titolo/descrizione nuovo
per il ciclo: si usano i record Goals esistenti. Riquadro sempre aperto,
descrizioni complete e multilinea; senza obiettivi non compare. Presente
anche nel diario di progetto, escluso dalla vista Task e coperto nel fallback
senza Vue. Nessuna nuova RPC o scrittura. Build, npm test, test:diary-goals,
test:release, test:progressive e test:incremental superati su Demo.html.
Verificati confini trimestre/anno, HTML trattato come testo, arrivo ritardato
dei dati comuni senza perdere bozza/nodo/focus/selezione e quattro palette a
320/390/768/1440 px. Nessun deploy: online resta Apps Script 71.

Deploy del promemoria successivamente richiesto ed eseguito il 23 ottobre
2026: Apps Script 72 sul deployment esistente, stesso URL e accesso privato.
Prima del push rieseguiti build, npm test, test:diary-goals, test:release,
test:progressive e test:incremental, tutti positivi, come i controlli
aggiuntivi della procedura. Backup dei sei sorgenti remoti fuori repository:
HEAD e versione 71 coincidenti con la base Git, nessuna divergenza.
ROOT_FOLDER_ID passato solo tramite ambiente allo staging. Verifica remota
successiva: versione 72 attiva, sei file identici allo staging, manifest
MYSELF/USER_DEPLOYING conservato. Nessun setupDrive o salvataggio reale.

Verifica autenticata della versione 72 riuscita in sola lettura: un obiettivo
del trimestre mostrato prima delle giornate, titolo e descrizione identici
ai record in memoria, nessun overflow o bozza pendente. Coda zero pending,
zero errori, 67 completate. Nessun contenuto esportato.

Durante la pubblicazione richiesto anche il riporto dell'icona dell'obiettivo:
aggiunto il path del catalogo condiviso accanto al titolo, con supporto delle
icone storiche e rispetto della scelta «Nessuna icona», anche nel fallback.
Build, npm test, test:diary-goals e test:release rieseguiti e superati.

Seguito con icone pubblicato nella versione Apps Script 73, stesso deployment,
URL e accesso privato. Backup remoto confrontato con la versione 72; Index
confrontato con la copia verificata di quel deploy, gli altri cinque file
con la base Git: nessuna divergenza. Superati tutti i controlli della procedura;
verifica successiva dei sei file identici allo staging e del manifest privato.
ROOT_FOLDER_ID passato solo tramite ambiente; nessun setupDrive o salvataggio
reale durante la pubblicazione.

Verifica autenticata della versione 73 superata in sola lettura: icona,
titolo e descrizione del promemoria corrispondono al record dell'obiettivo;
riquadro prima delle giornate, nessun overflow o bozza pendente. Coda zero
pending/errori, 67 completate. Nessun contenuto esportato o salvataggio reale.

## Palette Prugna — sviluppo locale

Su richiesta aggiunto un quinto tema, Prugna (`plum`), selezionabile in
Impostazioni → Aspetto: sfondo lavanda #f5f1f7, carta #fffaff, accento #704076.
Copertura dei token condivisi e griglia palette adattiva; scelte precedenti e
formattazione utente conservate. Build, npm test, P65 palette, test:cycle,
test:diary-goals e test:release superati; le suite del ciclo e del promemoria
ora includono anche Prugna. Dettagli in VERIFICA-PALETTE-PRUGNA.md.
Nessun deploy o accesso ai dati reali; online resta Apps Script 73.

Deploy successivamente richiesto ed eseguito: Apps Script 74, stesso deployment,
URL e accesso privato. Build, npm test, P65 palette, test:cycle, test:diary-goals,
test:release e controlli aggiuntivi della procedura superati. Backup remoto
dei sei file fuori repository e confronto HEAD/versione 73/base Git senza
divergenze. ROOT_FOLDER_ID passato solo tramite ambiente allo staging.
Verifica remota successiva: sei sorgenti identici allo staging, versione 74
attiva e manifest privato conservato. Nessun setupDrive o salvataggio reale.

Verifica autenticata v74 riuscita: cinque palette disponibili, Prugna
selezionabile con preferenza locale coerente, nessun overflow in impostazioni
o diario desktop, nessuna bozza pendente. Coda zero pending/errori e 67
completate invariata. Ripristinata la preferenza palette precedente al termine;
nessun salvataggio dei dati del diario o esportazione di contenuti.

## Evidenza cromatica del promemoria — sviluppo locale

Su richiesta il riquadro Obiettivi del trimestre usa una tonalità distinta
dalle sezioni giornaliere e un bordo più marcato: azzurro in Carta calda,
lavanda in Salvia, pesca in Blu ardesia, ambra nello Scuro e menta in Prugna.
Token CSS locali `--memory-*`, nessuna modifica a contenuti, API o flussi.
Build, npm test, test:diary-goals e test:release superati. Il test del
promemoria verifica anche sfondo distinto, contrasto testo almeno 4,5:1 e
icone almeno 3:1 sul riquadro in tutte le cinque palette; confermate le
geometrie mobile e la conservazione delle bozze. Ispezionati screenshot
simulati in artifacts/cycle-memory-highlight-*.png, esclusi da Git.
Nessun deploy o accesso ai dati reali: online resta Apps Script 74.

Deploy successivamente richiesto ed eseguito: Apps Script 75, stesso deployment,
URL e accesso privato. Build, npm test, test:diary-goals, test:release e tutti
i controlli aggiuntivi della procedura superati. Backup dei sei sorgenti remoti
fuori repository e confronto HEAD/versione 74/base Git senza divergenze.
ROOT_FOLDER_ID passato solo tramite ambiente allo staging. Verifica remota
successiva: sei sorgenti identici allo staging, versione 75 attiva e manifest
MYSELF/USER_DEPLOYING conservato. Nessun setupDrive o salvataggio reale.

Verifica autenticata v75 superata: riquadro distinto nelle cinque palette,
contrasto minimo del testo misurato 5,36:1; icona, titolo e descrizione
corrispondenti al record. Nessun overflow desktop o bozza pendente. Coda
zero pending/errori, 67 completate. Ripristinata la palette precedente al
termine; nessuna scrittura ai dati del diario o esportazione dei contenuti.
