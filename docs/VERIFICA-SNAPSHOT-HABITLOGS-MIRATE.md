# Snapshot HabitLogs con letture mirate — 7 novembre 2026

Tranche locale dalla base `a06f8ee`, SPEC-004. Solo Demo e dati sintetici;
nessun accesso Google, provisioning, setupDrive, migrazione reale, deploy,
attivazione di capability reali o commit.

## Percorso implementato

`getSnapshotPage` usa la pagina dedicata del controller HabitLogs. Dentro il
lock il protocollo recupera gli eventuali pending e costruisce una vista di
lettura con head verificato all'inizio e alla fine. Le letture di directory,
metadati e record usano quel checkpoint senza riverificare il head per ogni
entità. La vista non può essere usata dopo l'uscita dal callback/lock; una
scrittura o compattazione nello stesso store cambia la generazione e la
invalida. Autorizzazione e binding sono ancora verificati nelle letture e al
ritorno dal controller; nessuna vista sopravvive alla richiesta.

La directory v1, la radice v2 e tutti i sedici shard sono verificati prima
della selezione, anche per pagine vuote. Il sistema enumera le identità legacy
in finestre di 256 righe, leggendo solo key/habitId/date e updatedAt. Non legge
status o checklist fuori pagina. Le posizioni fisiche raccolte nel lock
consentono di leggere le preimmagini selezionate in gruppi contigui da massimo
100 righe, senza ripetere ricerche TextFinder per ogni log. Identità duplicate o malformate bloccano
la richiesta. Dopo la fusione e la rimozione delle tombstone, le identità
sono ordinate con il medesimo confronto lessicografico usato da `afterId`.
Solo le identità selezionate vengono idratate: al massimo 100 route/record e
le corrispondenti preimmagini legacy. I record selezionati conservano controlli
su digest, scope, versione, formato e checklist storica.

La dimensione della risposta viene calcolata a punto fisso, includendo il
campo bytes: test al confine esatto di 65.536 byte e rifiuto a 65.537.
Il contratto della risposta mantiene checkpoint iniziale, observedCursor
corrente, coverage globale esatta, hasMore/nextAfter, 100 record e 64 KiB UTF-8.
Il feed dopo il checkpoint recupera le mutazioni canoniche fra richieste.
Gli stati/record non selezionati non sono una fotografia durevole fra pagine.

## Stato minimo nei riferimenti verificati

Le nuove pubblicazioni `sync-sheet-ref/v1` di entità HabitLogs includono il
campo opzionale `state` con collection, id, sequence e deleted. È pubblicato
insieme al riferimento e coperto dal suo marcatore SHA-256; il binding della
chiave lo lega all'archivio e all'identità. Forma e sequenza sono verificate
prima dell'uso e la lettura del payload confronta questi campi con l'entità.
Il writer verifica il payload pubblicato prima dell'ACK. Questo indice di
stato permette conteggi e tombstone senza leggere le checklist fuori pagina.
Non c'è una cache persistente aggiuntiva o un secondo flusso di pubblicazione;
non cambiano formato applicativo dei log, ricevute, alias, feed o IndexedDB.

I riferimenti precedenti senza `state` restano leggibili verificando lo stato
dal payload originario. Questo percorso di compatibilità può leggere i vecchi
payload fuori pagina per calcolare la copertura: il limite di idratazione
misurato sul nuovo storico riguarda riferimenti con stato pubblicato. Non è
eseguito un backfill implicito. La compatibilità di lettura col codice base
viene provata sullo stesso archivio sintetico; non certifica tutti i client
già distribuiti o una migrazione di archivi reali.

## Verifiche e misure

Superati build, `npm test`, `test:commit-capacity`, `test:repository`,
`test:release`, `test:tracing`, `test:habit-log-snapshot`,
`test:habit-log-continuous` e la variante HTTP concorrente. Conservate le
1.000 creazioni progressive, 2.000 commit, 3.648 riferimenti ritirati,
12.018 righe fisiche, 1.401 fault/replay e la contesa V8 sullo stesso shard.

### Confronto sullo stesso archivio

Backend di base letto da `git show a06f8ee:Demo.html`, fixture preparata una
sola volta con 1.000 log canonici + 12 legacy e due setting canonici; head
2.002. Ogni versione riapre una copia degli stessi dati e legge le stesse 11
pagine da 100. Le risposte coincidono integralmente, inclusi records,
checkpoint/observedCursor, coverage e bytes. SHA-256 della fixture:
`f60612f9ed2bef21df591e2bebbd8fbb70ee25622c560c6e5280f8522308bb6d`.

| Misura (ledger + tabella legacy HabitLogs) | Base a06f8ee | Nuovo percorso |
|---|---:|---:|
| Massimo getDisplayValues per pagina | 728.203 | 3.156 |
| Totale getDisplayValues su 11 pagine | 8.010.233 | 34.359 |
| Righe restituite dalle range | 8.142.618 | 166.867 |
| Celle restituite | 32.129.427 | 267.886 |
| Byte UTF-8 delle stringhe nelle celle | 4.046.471.726 | 28.330.721 |
| Massimo righe / celle per range | 4.096 / 4.096 | 4.096 / 4.096 |
| Massimo byte di stringhe in una range | 278.532 | 278.532 |
| Ricerche TextFinder | 99 | 88 |
| Righe negli intervalli TextFinder | 1.190.673 | 1.058.376 |
| Massimo identità canoniche idratate per pagina | 1.000 | 99 |
| Massimo caricamenti del head per pagina | 2.020 | 2 |
| Tempo locale instrumentato, 11 pagine (ms) | 220.495 | 16.556 |

Riduzione del massimo delle chiamate: **99,5666%**, oltre il requisito del 95%.
Il solo ledger HTTP passa da 728.201 a **3.151** letture massime per pagina e
da 8.010.211 a **34.305** complessive: i numeri maggiori nella tabella includono
anche la sorgente legacy. Le chiamate non vengono ridotte spostando l'archivio
in una range più grande: il batch massimo rimane invariato e calano anche
righe, celle e byte. Il massimo di 99 corpi canonici dipende dalla presenza
di log legacy nelle pagine da 100; il test verifica il limite in funzione
delle identità effettivamente selezionate, anche con limite 1 e pagina vuota.

### Browser e concorrenza

Il consumer HTTP/Chromium verifica 1.012 log, 20 pagine snapshot complessive
(11 HabitLogs), 401 pagine feed e 2.002 commit applicati, poi riapre IndexedDB.
La variante concorrente aggiorna via HTTP un log già letto dalla prima pagina:
la risposta della pagina resta quella precedente alla scrittura, il feed
riallinea lo stato a skipped e termina al commit **2.004**, conservando
checklist storica e checkpoint dopo la riapertura. Massimo ledger nella
variante concorrente: 3.160 letture per pagina, con head ancora caricato due
volte. `complete:false` è atteso per la presenza di raccolte legacy, come
nella base; non è una dichiarazione di offline completo.

La matrice copre 127/128/129/256/1.000 identità canoniche più 12 legacy, limiti
1/25/100 e paging completo 25/100. Verificati nessun corpo/preimmagine fuori
pagina, copertura esatta e head costante; directory v2 mancanti/orfane,
legame v1 obsoleto e membership errata bloccano anche la pagina finale vuota.
Le prove mirate includono una creazione prima del cursore di continuazione
recuperabile dal feed e una tombstone che non ripristina la preimmagine legacy.

- `test:habit-log-snapshot`: vista limitata al lock, head costante, escape,
  invalidazione su scrittura/compattazione, tombstone, checkpoint e catch-up,
  riferimenti precedenti, corruzione di riferimento/directory, scope/revoca,
  guardie di cambio modalità, pending e replay. Sorgente legacy con oltre 256
  righe: metadati a finestre e checklist soltanto della pagina selezionata.
- Matrice progressiva 127/128/129/256/1.000 con pagine 1/25/100: prima,
  centrale, finale, vuota e paging completo 25/100; verifica copertura,
  cursori e assenza di payload canonici/preimmagini fuori pagina.
- Confronto col backend di `a06f8ee`: stessi byte di fixture, configurazione,
  contatori e pagine; hash SHA-256 della fixture nel rapporto del test.
  Risposte complete confrontate campo per campo, inclusi bytes e coverage.
- HTTP/Chromium usa gli endpoint applicativi, `createSyncConsumer`, replay
  dall'origine e riapertura IndexedDB sullo storico creato progressivamente.
  Nessuna scrittura diretta al repository sostituisce il percorso consumer.
  Una seconda variante modifica via HTTP un log già letto dalla prima pagina:
  il feed deve ripristinarne il nuovo stato e il checkpoint deve sopravvivere
  alla riapertura IndexedDB.

L'osservatore misura le chiamate effettive a getDisplayValues del ledger e
della tabella legacy HabitLogs, righe/celle/stringhe UTF-8 restituite dalle celle (senza envelope RPC o compressione), massimi
per batch e ricerche TextFinder con intervalli esaminati. Le ricerche non
sono considerate letture nulle. L'oracolo delle identità idratate è preparato
fuori misura dalla fixture e non modifica le risposte delle sorgenti.
I tempi locali includono l'instrumentazione, sono sequenziali e non sono
una misura di latenza Google o un benchmark A/B alternato.

## Limiti e gate

La selezione richiede ancora metadati globali per coverage e tombstone: il
numero di identità e lo storico fisico dell'indice possono influire sul costo.
La mappa di lookup legge la sola colonna delle chiavi dell'indice in finestre
di 4.096 righe; le letture di payload restano limitate ai frammenti delle
entità richieste (massimo store 256 frammenti per valore). Il test riporta
righe, celle e byte per rendere visibile il costo dei batch di metadati.
Non si dichiara costo costante rispetto alla crescita dell'archivio fisico.

Le directory vengono validate globalmente; validità e corruzioni dei corpi
sono accertate quando vengono selezionati e letti, secondo la separazione
metadati/contenuti. La copertura conta stati/versioni e non certifica che ogni
corpo fuori pagina sia stato letto in quella richiesta.
Restano retention fisica, checkpoint per futura retention, compatibilità dei
client distribuiti, iframe, provisioning e collaudo quote/latenza Google.
Pacchetto 12 e offline completo rimangono aperti; capability e consenso
manutenzione reali restano spenti.


Comandi aggiuntivi di riproduzione: `npm run test:habit-log-snapshot` per le
prove rapide; `npm run test:habit-log-continuous` produce le fixture e include
matrice, confronto col commit base, contesa e le due varianti browser.
Il confronto richiede che il commit a06f8ee sia disponibile nella cronologia
Git locale. Le fixture restano in una cartella temporanea e vengono rimosse.
`git diff --check` superato; staging di sei file, UTF-8 e segnaposto
ROOT_FOLDER_ID conservati. Index rigenerato senza variazioni frontend;
Demo incorpora il backend aggiornato.
