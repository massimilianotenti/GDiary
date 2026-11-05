# Bootstrap con metadati indicizzati — 5 novembre 2026

Questa verifica descrive la fase v10 dei metadati. Il seguito v11 limita
anche i record comuni del mese e introduce una copertura per periodo:
[VERIFICA-BOOTSTRAP-COMUNI-PERIODO](VERIFICA-BOOTSTRAP-COMUNI-PERIODO.md).

## Modifica implementata

Il bootstrap usa IndexedDB v10 con due nuovi indici composti su `entries`:

- `byScopeDate`: archivio, principale, epoca, `data.date`.
- `byScopeType`: archivio, principale, epoca, `data.type`.

Nel mese legge l'intervallo con prefisso `YYYY-MM-` e tutti i Task dello
scope, deduplicando per ID e conservando l'ordine per ID della lettura
precedente. I Task fuori mese servono alla pianificazione globale: vengono
letti come metadati, senza corpi. Nella vista Task legge solo i Task e i loro
corpi. Non legge i metadati delle note fuori vista.

`readBootstrapView` restituisce quindi una proiezione dei metadati, mentre
la prova di copertura resta il checkpoint completo del consumer. Il contratto
non dichiara un mese incompleto solo perché non enumera le altre note.
I record comuni restano completi, così non cambiano copertura, riflessioni,
privacy, cataloghi o uso delle altre viste. Non cambia il codice della shell:
la ricostruzione taskPlans continua a ricevere tutti i Task.

Checkpoint, indici, corpi selezionati, record comuni, bozze e outbox vengono
letti nella stessa transazione readonly. Restano i controlli di identità,
consenso, revisione e corrispondenza delle versioni dei corpi. Un corpo
mancante o incoerente impedisce l'applicazione dell'intera fotografia.
Le risposte locali tardive conservano le guardie della shell esistenti.

## Migrazione e compatibilità

La migrazione IndexedDB v9→v10 crea soltanto gli indici e ne popola le chiavi
per i record esistenti. Non cambia store, chiavi primarie, formato dei record,
checkpoint, protocollo di sync o schema Google. Non invalida né ridata il
checkpoint. Bozze e operazioni pendenti restano intatte.

Gli indici sono mantenuti dalla stessa transazione che aggiorna o elimina
il record. Non esistono copie applicative delle chiavi da sincronizzare.
Le connessioni precedenti ricevono versionchange e vengono chiuse secondo
la guardia già esistente; i client precedenti non possono aprire v10 e non
cancellano i dati per effettuare un downgrade. Il test della versione futura
usa ora v11, continuando a verificare il rifiuto senza reset.

## Verifiche funzionali

`verify-local-bootstrap-indexes.cjs`, incluso in `test:local-bootstrap` e
`test:repository`, crea un database v9 popolato con dati inventati, poi lo
apre con il repository corrente. Verifica:

- Backfill dei due indici, checkpoint/data originali e impostazioni conservati.
- Snapshot delle bozze e dell'outbox identici prima/dopo la migrazione.
- Confini del mese (31 ottobre, 1/30 novembre, 1 dicembre), deduplicazione
  del Task presente in entrambe le query e assenza delle note esterne.
- Corpi del solo mese, tutti i corpi Task nella loro vista e nessun corpo
  per un mese vuoto, conservando i metadati della pianificazione globale.
- Isolamento tra principali; cambio data/tipo e tombstone aggiornano gli indici.
- Puntatore null come corpo vuoto e rifiuto di una fotografia con corpo mancante.

Il test bootstrap precedente continua a verificare riavvio Chromium,
checkpoint completo dal consumer reale, privacy personalizzata, nessuna RPC
di vista, errore remoto, retry dei corpi, editor/focus/selezione, tombstone,
salvataggio con baseline originale e pianificazione dei Task fuori mese.

## Benchmark dopo gli indici

Stessa fixture del [benchmark precedente](VERIFICA-BOOTSTRAP-SCALA.md),
30 letture misurate per scenario oltre la prima esclusa dai percentili.
Linux x64, Node 24.20.0, Chromium headless 156.0.8078.4, Core i7-1370P,
20 CPU logiche, circa 15,3 GiB RAM. Suite funzionali in esecuzione parallela:
il carico hardware non è isolato e non è un confronto A/B alternato.

| Voci archivio | Vista | Metadati restituiti | Record comuni | Corpi | p50 ms | p95 ms |
|---:|---|---:|---:|---:|---:|---:|
| 10.000 | Mese | 223 | 1.002 | 24 | 55 | 68 |
| 10.000 | Mese vuoto | 199 | 1.002 | 0 | 48 | 65 |
| 10.000 | Task | 199 | 1.002 | 199 | 69 | 84 |
| 50.000 | Mese | 1.023 | 5.002 | 24 | 218 | 248 |
| 50.000 | Mese vuoto | 999 | 5.002 | 0 | 166 | 201 |
| 50.000 | Task | 999 | 5.002 | 999 | 259 | 289 |

La baseline precedente leggeva 10.000/50.000 metadati in ciascuna vista;
il p95 del repository era rispettivamente 187–227 / 1.105–1.330 ms.
La riduzione delle righe trasferite è verificata dal test, senza dipendere
dalla variabilità dei tempi. Il benchmark controlla i nomi degli indici usati,
la singola transazione e il numero esatto di corpi letti. Non consente una
regressione silenziosa alla scansione per scope delle Entries.

La preparazione del database nuovo ha richiesto circa 10,6/52,1 secondi
in questa esecuzione sotto carico, misurata separatamente. I nuovi indici
comportano spazio e lavoro aggiuntivo in scrittura. Non sono misurati qui
il costo di backfill di una copia v9 da 50.000 voci o la sua quota fisica.
Il report di campioni e ambiente resta in artifacts, escluso da Git.

## Verifiche concluse e limiti

Superati build, test:repository, test:release, test:local-bootstrap (le due
prove incluse nel repository), test:local-bootstrap-scale, test:local-common,
test:local-pages, test:sync-consumer, P70 privacy, P59 build e P60.1
bootstrap UTF-8. Sintassi e git diff --check verificati. Anche la suite npm test generale è conclusa senza errori.

Le misure riguardano la sola lettura repository. Non includono identità,
consumer, rete, merge shell, DOM o paint: non chiudono il criterio di apertura
end-to-end della SPEC-004. La fixture ha 199/999 Task; con una distribuzione
molto diversa il costo resta proporzionale ai Task e ai corpi richiesti.
Record comuni, bozze e outbox sono ancora enumerati per scope. Ottimizzare
lo storico comune richiede un contratto di copertura per vista separato.
Non è una promessa di capacità in produzione o del funzionamento iframe Google.

Index e Demo rigenerati; bootstrap UTF-8, segnaposto ROOT_FOLDER_ID e staging
di sei file preservati. Capability reali disattivate, nessun deploy,
setupDrive o accesso ai dati reali.
