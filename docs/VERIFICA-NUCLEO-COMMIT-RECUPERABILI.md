# Nucleo dei commit recuperabili — pacchetto 8 parziale

Sviluppo locale del 28 ottobre 2026, successivo al commit 7a76c85.
Nessun deploy, tabella creata, accesso Google o dato reale.

## Incremento implementato e confine

Code.gs contiene ora syncCommitProtocol_, un nucleo sincrono con adapter
iniettato. È eseguibile nei test e incluso nei sorgenti di staging, ma non è
collegato ad alcuna API applicativa, RPC o trigger. Non costruisce un adapter
Google, non chiama setupDrive e non modifica i salvataggi esistenti.
Le capacità changes/operations/localReadCache del manifest restano false.
Non esistono ancora applyOperations o getChanges utilizzabili dall'interfaccia.

Il piano ricevuto dal nucleo è un piano interno già validato dal dominio, non
un payload utente autorizzato a scrivere collezioni arbitrarie. Il futuro
adapter dovrà ricavare l'identità sul server, verificare accesso/configurazione
e produrre i valori canonici prima del prepare. La validazione strutturale del
nucleo non sostituisce quella di note, task, rich text, privacy o Drive.

## Protocollo

Il checkpoint è una sequenza intera condivisa da tutti i principali dello
stesso archivio/epoca. Ricevute indicizzate per principalId+operationId;
cursori legati ad archivio, epoca e principale. Un altro principale autorizzato
può recuperare il piano pendente senza ricevere la ricevuta dell'autore.
Il feed non espone il principalId dell'autore nei singoli commit.

1. Sotto il lock condiviso, recuperare prima l'eventuale piano pendente.
2. Validare operationId, piano, unicità delle entità e versioni di partenza.
3. Scrivere un head preparato con richiesta, fingerprint SHA-256, preimmagini,
   sequenza assegnata e checksum. Verificarne la rilettura prima di applicare.
4. Per ogni entità confrontare lo stato con preimmagine o dopoimmagine attesa.
   Applicare soltanto i membri non ancora applicati; verificare la rilettura.
5. Scrivere il commit immutabile con tutte le dopoimmagini e la ricevuta stabile.
6. Solo alla fine pubblicare committedThrough e togliere pending dall'head.

Con tre entità sono sette unità persistenti: prepare, tre entità, commit,
ricevuta, pubblicazione. Nessun timestamp funge da cursore totale. Dopo una
conferma persa, il retry recupera il piano o legge la ricevuta originale;
non assegna una nuova sequenza. operationId con payload diverso dà
OperationMismatch. Anche l'ordine delle modifiche fa parte della richiesta;
l'ordine delle chiavi JSON degli oggetti non cambia il fingerprint.

Le preimmagini di tutti i membri vengono controllate prima di riprendere:
una variante inattesa blocca il recupero con CommitBlocked, senza scegliere
un vincitore o sovrascrivere altre entità. Un piano già preparato può essere
completato anche quando il chiamante riprova erroneamente lo stesso ID con
un payload diverso: quel payload nuovo resta rifiutato, il piano originale
rimane recuperabile. Non c'è annullamento implicito del lavoro già preparato.

Un conflitto di versione riguarda l'intera operazione: nessun membro viene
applicato e la ricevuta di conflitto rimane stabile. Non avanza il checkpoint.
Un nuovo tentativo dopo risoluzione richiede un nuovo operationId. Le
cancellazioni conservano tombstone versionati; baseVersion:null non può
ricreare silenziosamente una voce eliminata. Una ricreazione esplicita deve
riferirsi alla versione del tombstone.

Head, piano, commit e ricevuta hanno checksum verificati. Errori di schema,
checksum, lettura o configurazione bloccano la pubblicazione; errori adapter
restituiti come codici fissi senza messaggi/contenuti del diario. I checksum
rilevano alterazioni accidentali, non sono un meccanismo di autenticazione.
Una ricevuta committed viene confrontata anche con il commit conservato.
Se manca ma il commit è ancora disponibile per principale/operationId, viene
ricostruita senza ripetere l'edit/delete. Nessuna retention è ancora attiva.

## Letture e feed di riferimento

Le operazioni read e changes del nucleo usano lo stesso lock e recuperano il
pending prima di rispondere. I lettori del protocollo non attraversano uno
stato parziale; i lettori legacy non sono ancora collegati a questa barriera.
Il feed legge dopoimmagini immutabili, non i valori correnti delle righe.
Pubblica solo sequenze fino al checkpoint completo, senza saltare righe
mancanti o dividere un commit fra due pagine. Restituisce highWater, cursore
nuovo e hasMore; un cursore estraneo o futuro è rifiutato.

Limiti del prototipo: 25 entità per operazione, richiesta di 32.768 unità
UTF-16, piano preparato di 131.072 unità; massimo cinque commit e 131.072 unità
per pagina feed. Un commit oltre il budget non viene saltato. Sono budget del
prototipo, non quote dichiarate delle celle Sheets o del servizio Google.
Gli envelope usano versioni interne commit-N: non sostituiscono gli updatedAt
ISO del diario o i contratti del repository locale. L'adapter dovrà mantenere
separati versione di commit e versione canonica del dominio.

## Contratto dell'adapter, ancora da sviluppare

L'adapter fornisce withLock, digest SHA-256, letture/scritture head, entità,
commit per sequenza e ricevute per principale/operationId, oltre alla ricerca
del commit già applicato per principale/operationId. Le funzioni sono sincrone;
le letture di assenza restituiscono null. Nessuna cancellazione automatica o
inizializzazione silenziosa: un head assente dà ProtocolUnavailable.

La prova di riferimento in tests/helpers usa unità persistenti che o non sono
scritte o sono scritte interamente, con possibile perdita dell'ACK. NON prova
che una riga/cella Sheets abbia questa proprietà. Un adapter reale deve
fornire payload recuperabili a frammenti, pubblicazione verificabile del
puntatore/head, gestione di esiti incerti, budget e letture coerenti. Un head
fisicamente corrotto viene bloccato, non ricostruito inventando un checkpoint.
I test coprono anche rilevamento di un'unità corrotta e rilettura indisponibile,
ma non dimostrano recuperabilità di ogni scrittura fisicamente lacerata.
La ricerca per operationId deve evitare download dell'intero registro. Il flush
finale di locked_ non soddisfa da solo il contratto delle unità intermedie:
l'adapter deve assicurare la persistenza prima di dipendere da ciascuna unità.
Non è ancora stato misurato il suo costo I/O su Google.

## Matrice iniziale delle mutazioni: nessuna collegata al registro

| Percorso esistente | Dati da includere nel futuro piano canonico | Stato |
|---|---|---|
| addJournal, saveJournalPage | Voci, contenuti, layout, piani, pending Docs e anteprime | Legacy, non registrato |
| saveNoteText, updateEntry | Metadati/contenuti e relativi derivati | Legacy, non registrato |
| setTaskStatus, planTask | Stato/date/versione voce e pianificazione | Legacy, non registrato |
| setEntryTags, setEntryProjects, convertProjectToTag | Voci e cataloghi/collegamenti interessati | Legacy, non registrato |
| deleteNote | Tombstone e rimozioni di contenuti/collegamenti/piani | Legacy, non registrato |
| saveDay, saveDays, saveWeek | Riflessioni, campi rich e versioni | Legacy, non registrato |
| saveGoal, saveHabit, deleteHabit, setHabitLog | Cataloghi, archivio abitudini e registrazioni/checklist | Legacy, non registrato |
| saveProject, addFileLink | Progetti, allegati e collegamenti canonici | Legacy, non registrato |
| saveReflectionSettings, savePrivacySettings | Impostazioni pertinenti e versioni | Legacy, non registrato |
| migrateDocsBatch | Preparazione Docs per Entries | Legacy soltanto; salta le Entries instradate, [verifica](VERIFICA-MIGRAZIONE-DOCS-ROUTING-ENTRIES.md) |
| getEntryDetail, prepareQueuedTask_ | Lettura/accodamento Docs e riferimenti | Lettura sola per route; writer legacy bloccato per Entry instradate |
| refreshNotePreviews | Import esplicito corpo/rich Docs e cache anteprima | Route Entries ora importano via commit; legacy resta fuori dal registro, [verifica](VERIFICA-RICONCILIAZIONE-DOCS-ENTRIES.md) |
| processTaskDocQueue | Scrittura Docs e stato coda/anteprime | Per Entries instradate, `pending` prima e `done` dopo il salvataggio sono commit nel descriptor/feed; side effect Docs e riga UI della coda restano esterni/legacy |
| rebaseDocQueue | Baseline/backup del conflitto e nuova coda Docs | Route Entries: commit canonico e retry stabile, [verifica](VERIFICA-REBASE-DOCS-ENTRIES.md); legacy: percorso precedente |
| Riconciliazione Docs in background e copertura completa | Voci/contenuti canonici riconciliati | Import esplicito limitato alle prime 12 voci selezionate; background, titolo e client ancora aperti |

Le scritture infrastrutturali (setup, Registry, esportazioni) richiedono una
classificazione distinta prima dell'attivazione. I side effect di Drive/Docs
non entrano in una transazione ACID con Sheets: writer condizionale e
riconciliazione restano necessari. Nessuna promessa di feed completo finché
una qualsiasi mutazione applicativa può aggirare il registro.

## Verifiche locali

Nuovo npm run test:commits, incluso anche in npm test. Il codice di Code.gs
viene caricato in un contesto V8 nuovo a ogni riavvio simulato; solo lo stato
persistente inventato viene trasferito all'istanza successiva.

Superati 16 casi di crash prima/dopo ciascuna unità dei tre membri del commit
e della ricevuta di conflitto. Verificati: stessa ricevuta e una sola sequenza,
recupero anche sul lettore/feed, payload ID immutabile, conflitto di lotto,
due client sulla stessa versione, recupero del piano di un altro principale,
ricostruzione della ricevuta mancante, snapshot del feed indipendenti dai dati
correnti, tombstone/ricreazione esplicita e paginazione per commit/byte logici.

Provati inoltre limiti e input invalidi senza scritture, scope/epoca/cursori
estranei, checksum alterati, variante esterna che blocca il recupero, head
mancante/corrotto, errore nella rilettura dopo prepare, contesa lock ed
esaurimento sicuro della sequenza. Nessun contenuto reale nei fixture.

Superati build, npm test (incluso test:commits), test:release, test:identity e
test:tracing. Demo.html rigenerata con il backend; Index.html rigenerato senza
differenze frontend. Bootstrap UTF-8, ROOT_FOLDER_ID segnaposto e sei file di
staging Apps Script preservati.

## Seguito

Pacchetto 8 ancora parziale. Prossimo incremento: adapter di persistenza con
prove sui frammenti/checkpoint, poi piano canonico e migrazione controllata di
un primo writer e dei relativi lettori. Seguono copertura dell'intera matrice,
ricevute/retention, binding delle risposte allo scope e consumo dei delta nel
repository. Bootstrap e riconciliazione Docs restano nel pacchetto 9.


Seguito implementato: [adattatore Sheets con frammenti e pubblicazione verificata](VERIFICA-PERSISTENZA-COMMIT-SHEETS.md).
È ancora scollegato dal percorso applicativo e verificato soltanto su mock;
la descrizione del primo incremento sopra precede questo adattatore.
