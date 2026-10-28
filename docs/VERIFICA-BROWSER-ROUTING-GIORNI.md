# Collaudo browser del routing Days attivo

Incremento locale del 28 ottobre 2026, successivo al commit **03260aa**.
Collaudati migrazione, controller e salvataggi giornalieri con Chromium e soli
dati inventati. Nessun accesso Google, registrazione reale, provisioning o deploy.

## Ambiente e percorso effettivamente eseguito

`npm run test:day-browser` avvia un server HTTP temporaneo su 127.0.0.1 e apre
la Demo generata. L'interfaccia conserva api(), rendering Vue, editor, bozze,
controllo degli ACK e messaggi reali. Soltanto il mock google.script.run della
pagina servita viene sostituito in memoria con un trasporto HTTP locale.
Demo.html sul disco non contiene quel trasporto.

Le RPC eseguono il backend della Demo in un contesto V8 Node, con il vero
syncDayRoutingServer_, il controller persistente e syncSheetsCommitStore_.
Le API Sheet/Range sono quelle del mock con interruzioni già verificato; digest
e Base64 usano Node, non un hash browser semplificato. La fixture registra
esplicitamente il controller, lo attiva e migra solo le giornate sintetiche.
Le richieste HTTPS del browser sono bloccate.

Il server sintetico è condiviso fra le due pagine/browser context del test.
Il riavvio ricrea V8 dai soli snapshot JSON di proprietà, UserProperties,
tabelle e registro. Le bozze restano nella sessionStorage reale della scheda.
Non è una prova della persistenza fisica Google o di un riavvio del processo
Apps Script. La fixture comune è ora riusata anche dalla verifica V8 del server.

## Scenari superati

- **Bozza precedente alla migrazione:** testo modificato tramite l'editor
  reale prima del cutover. La rivalidazione remota aggiorna il canonico senza
  sostituire bozza, nodo DOM, focus o selezione. Il vecchio updatedAt resta
  nella bozza e il salvataggio viene accettato sulla versione iniziale migrata.
  Intenzione formattata, checklist e gratitudine non modificate restano intatte.
- **Evento tardivo durante l'ACK:** la risposta viene trattenuta dopo il commit;
  un aggiornamento programmatico dell'editor simula un evento locale tardivo.
  La nuova variante rimane sporca con baseline aggiornata e si salva al tentativo
  successivo. Non significa che l'interfaccia consenta digitazione mentre busy:
  i controlli durante l'invio mantengono il comportamento attuale.
- **Risposta persa dopo commit:** il trasporto invoca il failure handler dopo
  una scrittura confermata dal backend. Testo e bozza restano; il retry dello
  stesso payload pulisce la bozza con l'ACK originale. Celle e riferimenti del
  registro sono identici prima e dopo il retry, senza commit aggiuntivi.
- **Reload di una bozza rich non inviata:** riavvio del server V8 e reload della
  pagina conservano testo, corsivo, versione di partenza e stato sporco. La
  scheda può completare il salvataggio usando il controller ricostruito.
- **Due client sulla stessa versione:** il secondo conferma una variante;
  il primo riceve conflitto e conserva il proprio testo/versione. Nello stesso
  lotto una giornata indipendente viene salvata e ripulita. Il canonico non
  viene sovrascritto dalla bozza obsoleta.
- **readOnly persistente:** un tentativo di scrittura mostra l'errore, mantiene
  la bozza e non modifica il registro. Dopo riavvio V8 e reload continua a
  leggere il canonico, senza esporre la riga legacy congelata o aggiornare
  implicitamente la base della bozza in conflitto.
- **Riattivazione e risoluzione esplicita:** il test adotta esplicitamente la
  versione remota della bozza, preservandone il testo, e verifica il salvataggio
  dopo riattivazione. È un'azione della fixture: non aggiunge un nuovo dialogo
  di risoluzione dei conflitti nell'interfaccia.
- **ACK malformato dopo commit:** un successo privo degli esiti attesi non
  pulisce la bozza. Il retry recupera l'ACK canonico senza nuove celle/commit.
- **Privacy e geometrie:** l'export del tracing sul percorso attivo non contiene
  testi delle riflessioni o identità archivio/principale; private restano nascoste.
  Nessun overflow a 320/390 px sia con errore readOnly sia dopo salvataggio.
  Nessun errore JavaScript non gestito. Tutte le righe legacy migrate restano
  identiche alla preimmagine iniziale.

Screenshot sintetici ispezionati, esclusi da Git: artifacts/day-routing-conflict.png,
day-routing-readonly.png, day-routing-readonly-mobile.png e day-routing-mobile.png.

## Correzione emersa dal collaudo

Il controller prima esponeva soltanto ProtocolUnavailable al salvataggio in
readOnly. Ora conserva quel nome d'errore per i chiamanti e usa il motivo
interno readOnly per produrre un testo fisso comprensibile: il diario è in
sola lettura e si può riprovare quando le scritture saranno abilitate.
Il normale messaggio dell'interfaccia ricorda che la bozza è conservata.
La sanitizzazione non propaga messaggi arbitrari o dati della sorgente.

La regressione è verificata sia nel browser sia nel test del controller.
Nessuna modifica ai componenti/CSS o al contratto degli ACK applicativi.

## Comandi e risultati

Superati build, npm test, test:day-browser, test:day-controller, test:day-batch,
test:release e test:tracing. Il nuovo test browser è incluso anche in test:e2e;
la suite storica completa test:e2e non è stata eseguita in questa tranche.
Demo e staging dei sei file rigenerati; Index senza differenze frontend.
Bootstrap UTF-8, ROOT_FOLDER_ID segnaposto e manifest preservati.

## Limiti e seguito

Questo collaudo chiude la verifica locale del percorso Days attivo, non l'intero
pacchetto 8. Le altre mutazioni restano legacy e il feed dell'archivio non è
completo. Non sono abilitati cache applicativa, outbox, nuove capability del
manifest o controller sui dati reali. Online rimane Apps Script 75.

HTTP locale e mock non provano latenza, quote, autorizzazioni e barriere dei
servizi Google, iframe autenticato o RPC tardive dopo rilascio del lock. Restano
separati provisioning controllato, policy di manutenzione/retention e verifica
reale. Nessuna di queste operazioni è autorizzata dal collaudo locale.

Prossimo incremento locale: estendere il registro ai checkup settimanali Weeks,
con writer e lettori coerenti e conservazione del percorso Days verificato.
Seguono le altre mutazioni della matrice prima di dichiarare completo il feed.
