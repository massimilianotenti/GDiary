# Riallineamento locale del catalogo HabitLogs — 6 novembre 2026

## Seguito: concorrenza fra schede

Le schede attive ora si scambiano tramite `BroadcastChannel` una sola
invalidazione senza scope, ID o contenuti. La ricevente rilegge la propria
IndexedDB nello scope attivo; non applica il payload dell'altra scheda e non
rimonta la vista. La riconciliazione scarta letture asincrone se nel frattempo
cambiano repository, scope, consenso o token di lettura. La conferma utente
viene riletta dopo l'ACK IndexedDB prima di mostrare `ready`; delta/tombstone
successivi mantengono il blocco.

L'aggiornamento feed non invalida più l'indice Entries per sole mutazioni
Goals/Habits/HabitLogs o di altre collezioni senza impatto sulla ricerca; le
modifiche a Entries, corpi, progetti e file lo invalidano ancora. La prova
Chromium usa due pagine reali dello stesso contesto persistente e IndexedDB
condivisa, con backend sintetico: controllo focalizzato mentre l'altra scheda
applica un delta senza bump di versione; conferma in una scheda seguita da
tombstone Goal; delta durante ACK HabitLogs trattenuto, con seconda modifica
locale ancora pendente; selezione/focus conservati; lettura tardiva dopo cambio
scope e revoca; indicatore di errore/retry su feed incompleto. Questo non è un
collaudo Google.

Non è dimostrato ogni ordine possibile di tre o più feed/ACK, la selezione di
testo in ogni editor o una gara reale fra due form sporchi in viste diverse.
Restano prove mirate utili per ulteriori incrementi; la copertura riportata è
limitata agli scenari nominati.

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
  sintetico, due pagine Chromium nello stesso contesto persistente e IndexedDB
  reale condivisa. Prova il segnale cross-tab senza payload privati, delta senza
  bump `updatedAt`, controllo/focus e selezione checkbox conservati, conferma
  peer seguita da tombstone Goal, e un delta mentre l'ACK HabitLogs è trattenuto:
  la modifica locale successiva resta pendente e il controllo rimane montato.
  Include letture tardive scartate dopo cambio scope e revoca, feed incompleto,
  errore/retry, riavvio e checklist storica non rimappata.
- `npm run test:repository`: superato, incluse regressioni Days, Weeks e
  HabitLogs.
- `npm run test:release`: superato.
- `npm test`: superato sul risultato integrato.

## Limiti e copertura non dichiarata

Il backend è sintetico: non è un collaudo Google, non prova autorizzazioni,
trigger o writer Apps Script reali. La tranche non abilita le capability e non
scrive cataloghi su Google.

Le prove repository coprono delta/tombstone Goal/Habit, contenuto con versione
invariata, due handle, ACK stale, feed più vecchio e cambio scope. La prova UI
mirata copre una interleaving: ACK HabitLogs trattenuto, modifica successiva
locale, delta catalogo da altra pagina e successiva conferma. Non copre tutti
gli ordini possibili di più ACK/feed, né due form sporchi in viste diverse
mentre arrivano insieme. Il canale propaga invalidazioni solo fra pagine attive;
una pagina riaperta recupera lo stato dalla IndexedDB durante bootstrap.

Editor sporchi e dettagli in modifica non vengono smontati per la revisione:
la UI chiede di conservarli prima di procedere. È provata la conservazione di
focus e selezione del checkbox nei casi descritti, non per ogni editor o cambio
vista/catalogo. Le microazioni riordinate non vengono rimappate; se il
checklist storico non è compatibile, la scelta locale nel dialogo conflitto
resta disabilitata quando il record remoto è assente e la checklist non è
compatibile.

Il pacchetto 11 SPEC-004 rimane aperto; offline completo non disponibile.
Restano integrazione Google, copertura browser mirata dei casi elencati e gate
di compatibilità/retention già descritti nei rapporti HabitLogs.
