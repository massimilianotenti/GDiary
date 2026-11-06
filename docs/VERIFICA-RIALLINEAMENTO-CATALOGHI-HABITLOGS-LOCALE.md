# Riallineamento locale del catalogo HabitLogs — 6 novembre 2026

## Risultato della tranche

Il sync esistente rimane l'unico percorso che aggiorna Goals e Habits. La UI
mostra uno stato persistente per archivio: catalogo da riallineare, catalogo
cambiato da rivedere oppure catalogo verificato ma da confermare. «Riprova
riallineamento» esegue il consumer sync; «Rivedi catalogo» legge la copia locale
nella vista corrente e richiede una conferma separata prima di riabilitare nuove
registrazioni. Gli errori e le prove incomplete non confermano il catalogo.
Nessuna mutazione Goals/Habits è stata aggiunta all'outbox e nessuna operazione
HabitLogs bloccata viene inviata automaticamente.

La conferma è memorizzata in `archiveMeta`, scoped ad archivio, principal ed
epoch e legata a fingerprint del catalogo e cursore completo. La scrittura
HabitLogs ricontrolla conferma, prova, baseline e versioni Goals/Habits nella
stessa transazione IndexedDB. Un feed completo identico conserva la conferma;
un upsert effettivamente diverso o tombstone invalida la prova e imposta un
flag durevole di revisione. Il flag non si azzera con un nuovo checkpoint,
anche se `updatedAt` e il fingerprint versionale restano uguali: si azzera
solo con la conferma esplicita. ACK HabitLogs non invalida la prova catalogo né
l'indice Entries.

## Verifiche effettuate

- `npm run build`: superato; rigenerati `Index.html` e `Demo.html`, preparati i
  sei file Apps Script.
- `tests/verify-habit-log-outbox-repository.cjs`: superato con Chromium e
  IndexedDB reale. Verifica anche feed completo identico con conferma durevole,
  invalidazione dopo delta e tombstone Goal/Habit, upsert senza cambio versione,
  guard di scrittura e preservazione dell'indice Entries. Due handle IndexedDB
  verificano ACK stale, feed più vecchio dopo delta più nuovo e cambio archivio.
- `tests/verify-habit-log-outbox-browser.cjs`: superato con Demo/backend
  sintetico e IndexedDB reale. Copre riallineamento esplicito dopo cambio
  catalogo da una seconda scheda browser senza bump di versione, blocco fino a
  revisione/conferma, focus del controllo mantenuto durante l’osservazione,
  sopravvivenza al riavvio ed errore di rete con retry visibile. Dopo la revisione esplicita,
  il conflitto mantiene la checklist storica senza rimappare microazioni
  riordinate: ID, titoli e ordine restano invariati.
- `npm run test:repository`: superato, incluse regressioni Days, Weeks e
  HabitLogs.
- `npm run test:release`: superato.
- `npm test`: superato sul risultato integrato.

## Limiti e copertura non dichiarata

Il backend è sintetico: non è un collaudo Google, non prova autorizzazioni,
trigger o writer Apps Script reali. La tranche non abilita le capability e non
scrive cataloghi su Google.

Le prove repository coprono delta e tombstone Goal/Habit, aggiornamento di
contenuto con versione invariata, due handle IndexedDB, risposta catalogo più
vecchia scartata e risposta con scope precedente rifiutata dopo cambio archivio.
La prova UI copre feed incompleto, errore di rete/retry, delta proveniente da
una seconda pagina browser e conferma. Non è coperta la concorrenza con entrambe le viste in modifica mentre
arrivano feed e ACK concorrenti.
Questi casi non sono dichiarati completati da questa tranche. Le suite
integrate coprono retry, revoca, isolamento, concorrenza e risposte tardive per
il repository/outbox e le viste, ma non sostituiscono tali prove mirate sul
riallineamento del catalogo.

Editor sporchi e dettagli in modifica non vengono smontati per la revisione:
la UI chiede di conservarli prima di procedere. Non è dimostrato il ripristino
del focus e della selezione per ogni controllo durante ogni possibile cambio
vista/catalogo. Le microazioni riordinate non vengono rimappate; se il
checklist storico non è compatibile, la scelta locale nel dialogo conflitto
resta disabilitata quando il record remoto è assente e la checklist non è
compatibile.

Il pacchetto 11 SPEC-004 rimane aperto; offline completo non disponibile.
Restano integrazione Google, copertura browser mirata dei casi elencati e gate
di compatibilità/retention già descritti nei rapporti HabitLogs.
