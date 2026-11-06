# Routing HabitLogs oltre 128 identità — 7 novembre 2026

## Esito della tranche

Da `12bfbe8` è stato aggiunto un routing v2 scoped alle identità HabitLogs.
La directory `sync-habit-log-routing/v1` resta leggibile e non viene riscritta
né convertita in blocco. Quando contiene già 128 chiavi, la nuova registrazione
pubblica nella stessa operazione recuperabile il record, la route, il primo
shard e la radice v2. Gli inserimenti successivi pubblicano route e shard; la
radice viene aggiornata atomicamente quando si attiva un bucket nuovo. Le
migrazioni legacy esplicite passano dallo stesso planner.

La radice lega v2 alla versione, al digest e al numero (128) della directory
v1 congelata. La maschera a 16 bit enumera shard deterministici assegnati dal
primo byte del digest SHA-256 dell'identità. Ogni shard è ordinato per chiave,
contiene al massimo 128 identità e ogni identità viene verificata contro il
bucket. Le route mantengono gli ID hashed v1. La lettura combina prima v1 e poi
i bucket in ordine numerico; rifiuta chiavi duplicate, bit senza shard, shard
orfani, membership errata, v1 modificata, root/shard mancanti o corrotti. Non
usa fallback alla tabella legacy quando una directory v2 è incompleta. Il
limite teorico è 128 + (16 × 128) = 2.176 identità, con tetto effettivo più
basso se un bucket si riempie prima degli altri. Non è capacità illimitata.

Piani v1 già prenotati restano leggibili. I piani di creazione v2 con tre o
quattro mutazioni sono validati e riprodotti con la stessa operationId e la
stessa ricevuta; il protocollo pubblica il commit head dopo tutte le immagini.
Richieste che superano 32.768 caratteri canonici (`String.length`, non byte UTF-8) vengono rifiutate come
`ProtocolUnavailable` prima della prenotazione. Un budget store insufficiente
blocca allo stesso modo prima di creare piano/route/record. Nessuna conversione
è stata applicata a dati reali.

## Prove locali

`tests/verify-habit-log-routing-capacity.cjs` usa il commit store sintetico:

- fixture directory da 127, 128, 129, 256 e 1.000 identità; lettura completa,
  chiavi uniche, letture puntuali e controllo delle checklist;
- v1 congelata a 128 e creazione effettiva della 129a registrazione con record,
  route, shard e root; replay del medesimo operationId;
- fault injection prima/dopo a ogni scrittura del commit store della transizione
  (26 confini osservati), riavvio e replay senza duplicati;
- adapter Sheet sintetico: 143 confini RPC, ciascuno provato prima/dopo e con
  scrittura parziale, per 429 riavvii/replay; la registrazione risulta tutta
  assente o tutta recuperata;
- directory v2 mancante/parziale, shard orfano, legame v1 obsoleto, chiave in
  bucket errato e bucket oltre 128: errore esplicito `ProtocolCorrupt`;
- preflight di 512 riferimenti head: 128 nuove identità usano tutti i
  riferimenti disponibili; la successiva è rifiutata prima di ogni scrittura;
- keyset simulato sulle righe enumerate: pagine da 37 conservano tutte le chiavi
  una sola volta; feed reale del commit store sintetico per la transizione e
  l'aggiornamento, limitato a un commit per pagina, senza salti/duplicati.

`tests/verify-habit-log-routing-capacity-browser.cjs` carica 1.000 registrazioni
in Chromium/IndexedDB reale in due batch, chiude e riapre il repository e verifica
chiavi uniche/ordinate, checklist storica e isolamento archive. Il backend è
sintetico. La suite HabitLogs mantiene le prove di ricevute, doppio invio,
conflitti, Days/Weeks e indice Entries; non è un collaudo Google.

## Limiti e gate residui

La directory non è più il tetto strutturale a 128: lo stress fixture legge
1.000 route, ma il fixture è stato preparato sinteticamente e non rappresenta
1.000 commit conservati. Il limite store attuale resta determinante: i riferimenti
attivi sono limitati a 512 per chiave, il protocollo costa due riferimenti head
per commit e la creazione outbox prenota piano e mutazione in due commit. Nel
profilo senza compattazione la prova budget raggiunge 512/512 a 128 nuove
registrazioni; una directory v1 già piena può quindi essere bloccata dal budget
prima che la transizione v2 diventi operativa. La v2 è verificata con una
fixture a budget libero, ma sbloccare il percorso su un archivio saturo richiede
il lavoro distinto di retention/compattazione del pacchetto 12. Restano anche
limite di payload 32 KiB per richiesta, 256 KiB per valore nel commit store,
limite di righe Sheets e possibili bucket saturi. Non è stato misurato il costo
Apps Script/Sheets di scansione di 1.000 route né verificato il comportamento
contro Google reale.

Snapshot/feed: i fixture enumerano le 1.000 identità; il feed del commit store
sintetico è paginato a un commit per richiesta nella transizione 128→129 e nel
suo aggiornamento. La paginazione keyset da 37 è verificata sulle righe restituite
dal gateway, non attraverso l'endpoint HTTP `getSnapshotPage`. Resta da provare
una pagina HTTP snapshot e il replay completo del feed di un archivio da 1.000,
oltre alla compatibilità di client distribuiti con record v2. Le prove di lock
composition sono verdi, ma una race fra due client simultanei su uno shard v2
resta da dimostrare. Nessuna migrazione o riscrittura di dati reali è autorizzata. Pacchetto 11 resta aperto; offline
completo non disponibile.

## Comandi

- `npm run build`
- `npm run test:habit-log-migration`
- `npm run test:repository`
- `npm run test:release`
- `npm test` — exit 0 (suite integrata completa, 7 novembre 2026).

Esiti della tranche e gate sono riepilogati in [HANDOFF](HANDOFF.md) e nello
[stato SPEC-004](STATO-PIANO-SPEC-004.md).
