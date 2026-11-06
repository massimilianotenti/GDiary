# Riapertura completa di Settimana e Abitudini — 6 novembre 2026

## Contratto e integrazione

`readBootstrapView` accetta kind journal/week/habits; week richiede un lunedì,
habits anche la data del giorno. Mantiene IndexedDB v11, schema e checkpoint.
Metadati, corpi selezionati, dati comuni, privacy, bozze e outbox attiva si
leggono nella stessa transazione readonly su sei store. Il checkpoint deve
provare snapshot/feed/idratazione completi, come per il diario. Anteprime e
pagine indipendenti non acquisiscono copertura completa.

Settimana legge le voci datate nei sette giorni, anche a cavallo di mese/anno,
e tutti i metadati Task per conteggi, scadenze, completamenti e pianificazione
globale. Legge solo i corpi delle voci datate nella settimana, con relativi
Files/Layouts. Abitudini non legge corpi delle voci; conserva i metadati Task.
Cataloghi e impostazioni sono completi. Days comprende il periodo con riporto
come nel contratto remoto; Weeks il lunedì selezionato; HabitLogs la settimana
del tracker e, per Abitudini, quella del giorno scelto se diversa. I risultati
degli intervalli vengono deduplicati per raccolta/ID.

`run(getState)` apre le due viste dalla fotografia completa prima di attendere
RPC di stato; i cambi di giorno/settimana di Abitudini seguono lo stesso
percorso. Se la fotografia manca o non è valida resta il percorso precedente.
Il messaggio riporta la data del checkpoint e distingue la verifica in corso.
Aggiorna e il consumer in background possono riapplicare una fotografia nuova.
Il salvataggio delle riflessioni/pratiche conserva il contratto remoto:
questa tranche non estende l'outbox a tali entità.

Il controllo prima dell'applicazione considera generazione, navigationEpoch,
vista, settimana, giorno, data corrente, repository, consenso e scope completo.
Risposte locali tardive dopo navigazione o revoca sono scartate. Una vista con
form modificati conserva DOM, focus, selezione, testo e baseline originali:
l'aggiornamento dell'intera fotografia è rinviato, con messaggio esplicito.
Bozze settimanali persistenti e bozze Abitudini per form usano i meccanismi
esistenti; nessuna nuova promessa di persistenza delle bozze Abitudini dopo
chiusura della scheda.

## Prove

Estese le prove Chromium/IndexedDB in `test:local-bootstrap`, incluse in
`test:repository`:

- Letture week/habits su archivio migrato v10→v11: confini mese, giorno di
  riporto, date invalide, lunedì obbligatorio, settimane indipendenti e
  sovrapposte, assenza di duplicati e isolamento principale.
- Corpi e allegati solo della settimana; Task fuori periodo conservati senza
  corpo; cataloghi e privacy mantenuti.
- Navigazione locale con consumer reale e trasporto background sospeso;
  nessuna RPC getState/getJournalPage/getCommonState per aprire le viste.
- Delta su settimana con form modificato: nodo, focus, selezione e versione
  originaria invariati; errore di aggiornamento conserva il form.
- Cambio giorno Abitudini e settimana vuota con copertura esplicita.
- Letture sospese scartate dopo cambio periodo e revoca del consenso.
- Reload con conferma identità: record settimanale canonico aggiornato e
  bozza conservata con versione originaria.
- Checkpoint invalidato rifiutato; nessuna promozione di una copia parziale.

## Limiti e gate

La prova usa Demo e un backend inventato, senza Google. L'interfaccia Apps
Script e la verifica identità devono essere disponibili prima del ripristino.
Altre viste, provisioning, iframe reale, retention e copertura completa delle
mutazioni restano gate separati. Il rinvio durante editing riguarda tutta la
fotografia: non aggiorna singolarmente i conteggi mentre il form è modificato.
Nessun deploy, setupDrive, accesso ai dati reali o attivazione delle capability.

## Esito delle verifiche — 6 novembre

Superati build, npm test generale, test:repository, test:local-bootstrap,
test:local-bootstrap-scale (30 campioni per ciascuno dei sei scenari),
test:release, test:progressive, test:common-periods, test:cycle,
test:local-common, P70 privacy, P64 bozze/layout e P60.1 UTF-8.
Controllati sintassi delle prove e git diff --check. Index/Demo rigenerati,
staging di esattamente sei file e ROOT_FOLDER_ID segnaposto conservati.
Nessun Google, deploy, setupDrive o commit. Le misure e i test sono locali
e sintetici; i pacchetti SPEC-004 non sono dichiarati conclusi.
