# Bootstrap del diario con dati comuni per periodo — 5 novembre 2026

Il seguito [outbox attiva](VERIFICA-BOOTSTRAP-OUTBOX-ATTIVA.md) limita anche
la coda letta all'avvio e aggiunge ricevute storiche alla fixture del benchmark.
Le misure qui sotto si riferiscono alla fase precedente, senza quello storico.

## Contratto implementato

Il bootstrap mensile da checkpoint completo evita ora la lettura dello storico
comune intero. La fotografia contiene:

- Tutte le impostazioni, inclusa la privacy personalizzata, e tutti i cataloghi
  Projects, Goals e Habits, senza dedurre la completezza da una copia parziale.
- Days dal giorno precedente il primo del mese fino all'ultimo, per conservare
  il riporto; Weeks della settimana del giorno corrente, indipendente dal mese.
- HabitLogs dal lunedì della prima settimana sovrapposta al mese fino alla
  domenica dell'ultima, inclusi i giorni a cavallo di mese e anno.
- Files e Layouts delle sole voci del mese effettivamente visualizzate.
- Metadati di tutte le voci del mese e di tutti i Task, come nella fase v10.
  I Task esterni mantengono la pianificazione globale senza caricarne i corpi.

Gli intervalli provengono dalla stessa funzione usata per normalizzare le
anteprime comuni del frontend (`commonReadRanges`), coerente con il contratto
API dei dati comuni del diario. Il nuovo indice è usato solo per il bootstrap:
il consumer e l'indice di ricerca continuano a conservare i dati globali.

`readBootstrapView` restituisce `commonScope: {kind:'journal', month, today}`.
La shell lo applica allo stato e alla copertura, senza dichiarare dati comuni
completi per qualsiasi periodo. Settimana e Abitudini non possono saltare il
proprio caricamento riusando questa sola proiezione. La pianificazione globale
viene ancora ricostruita da tutti i metadati Task della stessa fotografia.
Le righe TaskPlans comuni non vengono lette nel mese: il bootstrap già le
ricostruiva dai Task canonici e le sostituiva integralmente.

La vista Task conserva invece `commonScope: {kind:'full'}` e il precedente
insieme completo dei dati comuni, incluso il percorso di rendering fallback.
Non viene esteso questo incremento al bootstrap locale di altre viste.

La shell passa esplicitamente `today`, catturato prima della lettura e usato
anche nell'applicazione. Una lettura che attraversa il cambio del giorno viene
scartata. Per i chiamanti diretti del repository, omettere today usa il primo
giorno del mese richiesto; la shell non usa questo default.

## Transazione, migrazione e compatibilità

IndexedDB v11 aggiunge l'indice `commonRecords.byCollectionDate` con chiave
`[archiveId, principalId, epoch, collection, data.date]`. I record esistenti
vengono indicizzati automaticamente; non viene riscritto lo storico applicativo.
Days e Weeks usano intervalli sulla chiave primaria, cataloghi e impostazioni
l'indice byCollection, Files l'indice byCollectionEntry e Layouts letture
puntuali. Gli aggiornamenti e tombstone mantengono gli indici nella stessa
transazione delle righe, senza una seconda proiezione persistente da aggiornare.

Checkpoint, tutte le query comuni, metadati, corpi, bozze e outbox rimangono
in una sola transazione readonly. Privacy e riflessione restano obbligatorie
prima dell'applicazione. Non cambiano i controlli sui corpi mancanti/incoerenti,
consenso, identità, versioni e risposte tardive. Bozze e outbox restano distinte
dalla copia remota e non vengono cancellate dalla migrazione.

La versione di schema del protocollo resta 1 e non cambia il modello Google.
I client precedenti non possono aprire il database v11; resta la gestione
versionchange e il rifiuto del downgrade senza reset. Il test della versione
futura usa ora v12. Il segnaposto ROOT_FOLDER_ID e i sei file di staging
sono conservati; Index e Demo sono rigenerati dalla build.

## Prove locali

`verify-local-bootstrap-common.cjs`, incluso in test:local-bootstrap e
in test:repository, migra un database v10 popolato con fixture inventate e
verifica mese bisestile, riporto, settimana corrente distinta dal mese,
settimane a cavallo d'anno, isolamento dei principali, cataloghi e impostazioni,
rich, allegati e posizioni visibili, Task esterni, checkpoint e copie esatte
di bozza/outbox. Controlla inoltre data invalida, delta/tombstone dell'indice
HabitLogs, contratto Task completo e il rifiuto di riusare la copertura mensile
per Settimana o Abitudini.

La prova bootstrap con riavvio del browser ora include Days e HabitLogs sia
correnti sia fuori periodo. Verifica la proiezione e commonScope applicati
dalla vera shell, senza RPC di vista, conservando privacy, bozza, rich, nodo
editor, focus/selezione, retry e baseline di salvataggio.

## Benchmark definitivo

30 letture misurate per scenario oltre la prima esclusa dai percentili.
Linux x64, Node 24.20.0, Chromium headless 156.0.8078.4, Core i7-1370P,
20 CPU logiche, circa 15,3 GiB RAM. Carico non isolato: altre suite erano in
esecuzione. Non è un confronto A/B alternato.

| Voci | Vista | Metadati | Record comuni | Corpi | p50 ms | p95 ms |
|---:|---|---:|---:|---:|---:|---:|
| 10.000 | Mese | 223 | 12 | 24 | 17 | 22 |
| 10.000 | Mese vuoto | 199 | 2 | 0 | 9 | 11 |
| 10.000 | Task | 199 | 1.002 | 199 | 47 | 56 |
| 50.000 | Mese | 1.023 | 12 | 24 | 31 | 38 |
| 50.000 | Mese vuoto | 999 | 2 | 0 | 22 | 31 |
| 50.000 | Task | 999 | 5.002 | 999 | 161 | 183 |

La fixture mantiene 1.000/5.000 HabitLogs e ora ne colloca dieci nel periodo
richiesto, lasciando il resto nello storico. I dodici record comuni del mese
sono questi dieci log più le due impostazioni; i cataloghi sono vuoti in
questa fixture prestazionale e coperti separatamente dalle prove funzionali.
Il mese vuoto conserva le sole impostazioni. Il benchmark verifica i conteggi,
gli indici usati, gli intervalli Days/Weeks e la singola transazione: una
regressione all'enumerazione dello storico comune mensile fa fallire il test.

Nella [fase v10](VERIFICA-BOOTSTRAP-INDICI.md), il p95 a 50.000 voci era
201–248 ms per mese vuoto/mese, leggendo sempre 5.002 record comuni.
La riduzione dei record è deterministica; i tempi e le differenze dei Task
non dimostrano un miglioramento causale misurato in condizioni controllate.
Il volume serializzato del seed è circa 8,4/42,8 MB, distinto dall'occupazione
fisica IndexedDB. Preparazione circa 7,6/33,8 secondi in questa esecuzione,
separata dalle letture; non misura una migrazione v10→v11 da 50.000 voci.
Campioni e ambiente sono nel report artifacts/local-bootstrap-scale.json,
escluso da Git e privo di dati reali.

## Verifiche concluse e limiti

Superati build, test:repository, test:release, test:local-bootstrap,
test:local-bootstrap-scale, test:local-common, test:local-pages,
test:common-window, test:common-periods, P70 privacy, P59 build e P60.1
bootstrap UTF-8.
Sintassi degli script e git diff --check verificati. Anche la suite npm test
generale è conclusa senza errori.

Le misure sono della sola lettura repository: escludono identità, rete,
consumer, merge shell, DOM e paint. Non chiudono il criterio end-to-end della
SPEC-004. Il costo mensile resta proporzionale al periodo, ai cataloghi,
ai Task globali, a bozze/outbox e agli allegati delle voci selezionate.
La vista Task continua a enumerare lo storico comune completo. Il nuovo
indice aggiunge spazio e lavoro alle scritture; quota fisica, backfill su
archivi grandi e iframe Google restano da collaudare separatamente.

Capability reali disattivate. Nessun deploy, setupDrive, migrazione Google,
accesso o modifica ai dati del diario reale.
