# Passaggio di consegne — 17 ottobre 2026

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
