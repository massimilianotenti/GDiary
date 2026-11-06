# Salvataggio locale durevole delle giornate — 6 novembre 2026

## Ambito e stato

Tranche locale del pacchetto 11 SPEC-004, successiva ad ad13f4a. Estende
l'outbox a **Days**, non a Weeks, HabitLogs, Goals o Habits. Nessun deploy,
setup, provisioning, attivazione di capability o accesso Google. Le capability
reali restano false; il percorso nuovo è esercitato con backend sintetico.
Non dichiara disponibile l'offline completo e non chiude il pacchetto 11.

## Contratto server

Il writer canonico `syncDayWriter_` e il registro recuperabile preesistente
restano la fonte delle versioni. Il gateway Days aggiunge:

- `saveDayOperation`: snapshot completo di tutti i campi Days, escluso
  updatedAt, operationId stabile, baseVersion e scope atteso completo.
- `getDayOperationReceipt`: prova legata allo scope e al fingerprint dello
  snapshot originale; restituisce committed/conflict/unknown. Una ricevuta
  unknown non dimostra che il tentativo non sia stato applicato.
- `getDayOperationState`: lettura della giornata per il confronto, con scope
  verificato e assenza esplicita distinta dall'errore di trasporto.

Gli endpoint risolvono il controller persistente già autorizzato, senza
provisioning o configurazione impliciti. Lo scope client viene confrontato
con quello fidato nel gateway sotto le guardie del controller, prima delle
scritture. readOnly blocca il salvataggio ma conserva letture e ricevute.
La trace allowlist include gli endpoint, senza esportare testo nei metadati.

Lo snapshot viene conservato in un piano durevole prima del commit. Il
fingerprint include lo snapshot e la baseline originali: dopo una risposta
persa il retry non rilegge lo stato corrente per ricostruire un payload diverso.
La ricevuta ripete versione e snapshot originari anche dopo altri commit.
Il payload non passa per la normalizzazione testuale legacy: spazi, Unicode
e rich text vengono conservati. Un campo vuoto esplicito cancella il proprio
contenuto; i campi non modificati dalla UI vengono ripresi dalla baseline
completa. I limiti del writer e del piano non vengono aggirati o troncati.

Una nuova data senza preimmagine legacy può essere creata nel registro insieme
al suo descrittore/directory. Una data legacy esistente richiede la migrazione
server già prevista: l'endpoint non la esegue automaticamente. Per una data
migrata, la baseline ISO legacy è traducibile soltanto sulla versione iniziale
del descrittore; successivamente produce conflitto. Piani, descrittori e
ricevute restano soggetti ai limiti di capacità del registro (directory di
128 date, preflight dello store), non a una promessa di crescita illimitata.

La ricerca della ricevuta attraversa la barriera in sola lettura del protocollo:
un prepare pendente può richiedere il normale recupero server prima della prova.
Le ricevute unknown/non disponibili non vengono trasformate in ACK. Il retry
conserva l'ID e lo snapshot; nessun nuovo ID per eludere un esito incerto.

## IndexedDB e dispatcher

Nessuna migrazione: IndexedDB resta v11. Gli store e gli indici esistenti
accettano kind `day`, ID pari alla data, action `upsert`. Delete Days non è
introdotto. `day-operation.mjs` definisce i campi e la validazione comune;
il repository rifiuta snapshot parziali, incongruenze bozza/payload e date
malformate prima di confermare il commit locale.

`saveLocalOperation` scrive insieme bozza e outbox, con revisione CAS. Una
scheda che ha una revisione vecchia non sovrascrive la bozza condivisa.
Le modifiche mai tentate si accorpano conservando l'operationId; quelle
successive a un tentativo dipendono dalle operazioni precedenti, inclusi
conflitti ed errori. Non modificano il payload di un ID già tentato.

Un ACK aggiorna nella stessa transazione ricevuta, baseline della bozza,
payload delle dipendenze mai inviate e record canonico Days, senza sovrascrivere
un record del feed più recente. La bozza successiva resta distinta dal record
confermato. Se l'ACK arriva fra prelettura UI e commit locale, il repository
può avanzare la baseline soltanto sulla prova di una dipendenza ACK della
stessa data/kind nella stessa transazione.

I salvataggi e gli ACK Days mantengono valido un indice Entries già fresco,
aggiornandone solo la revisione: le giornate non sono documenti della ricerca
locale e non richiedono una ricostruzione dell’indice.

Le revisioni delle bozze confermate rimangono disponibili per i successivi
CAS, anche quando non ci sono operazioni attive. Il ripristino dei record
Days non scandisce le ricevute terminali né apre una transazione per ogni
giornata storica: sovrappone le sole date in coda e legge le revisioni delle
bozze locali. Il bootstrap completo usa già la fotografia atomica dei sei store.

Il dispatcher usa lease/claim/retry esistenti, aggiungendo il trasporto Days.
Verifica data, versione commit e snapshot restituito prima dell'ACK; verifica
scope, operationId, identità e versione anche nella riconciliazione. Token
scaduto o scope cambiato impediscono ACK nel nuovo contesto.

## Interfaccia e bozze

I seguenti ingressi condividono il percorso Days:

- Salva pagina nel diario: una transazione locale per data, con risultati
  indipendenti. Un errore su una giornata conserva la sua bozza senza annullare
  le altre già accodate. Non si presenta il lotto come atomico.
- Salva riflessione in Obiettivi e abitudini.
- Il renderer conservato del dettaglio giorno e il suo comando Salva.

La conferma «salvato su questo dispositivo» arriva soltanto dopo il commit
IndexedDB confermato. Su quota/abort/CAS il testo resta modificato e non si
invia automaticamente una richiesta remota alternativa. Su timeout locale
si cerca l'operationId originale, compreso il caso di accorpamento, prima di
considerare acquisita la transazione. Se la prova fallisce, la bozza resta.

L'invio remoto non blocca editor e comandi di navigazione. L'ACK aggiorna la
baseline senza smontare l'editor giornaliero o modificare il testo successivo,
focus e selezione. Una modifica non ancora salvata resta sporca; il messaggio
distingue la conferma precedente dal lavoro nuovo. I dati puliti provenienti
da successive letture remote possono invece ricostruire il blocco.

Le giornate pending/failed/conflict restano visibili alla riapertura, con
snapshot completo e stato. Non vengono trasformate in Entries o indicizzate
come note/task. Il salvataggio remoto ordinario non aggira una giornata già
marcata con invii locali quando consenso/capability non sono disponibili.

Gli errori permanenti offrono Riprova mantenendo ID, tentativi e payload.
Il confronto mostra testo locale e remoto come testo, con scelta esplicita:
versione locale accodata sulla baseline confrontata oppure versione Google.
La scelta è protetta dalla revisione della bozza e conserva lo storico. Se
ci sono nuove modifiche non accodate nella giornata, viene richiesto prima
il salvataggio locale. L'assenza remota esplicita può essere rappresentata
senza confonderla con una richiesta fallita.

Le scelte e il salvataggio non abbandonano bozze di altre date/form. Le bozze
non ancora accodate conservano il meccanismo precedente (sessione e relativa
migrazione); la nuova garanzia atomica riguarda il comando di salvataggio.

## Prove locali

Nuovo `npm run test:day-outbox`, incluso in npm test; le prove repository/UI
sono incluse anche in test:repository.

`verify-day-outbox-server.cjs` usa il backend Demo/V8 e l'adattatore Sheets
simulato: snapshot/rich/spazi, campi estranei, create canonico, replay dopo
riavvio, scope errato, mismatch payload, conflitto durevole, ricevuta assente,
lettura stato e readOnly. **726 interruzioni prima/dopo/parziali Sheet/Range** verificano il recupero
con lo stesso ACK: 330 sull’aggiornamento e 396 sulla creazione canonica
comprensiva di descrittore e directory. Le righe
Days legacy rimangono identiche.

`verify-day-outbox-repository.cjs` usa Chromium/IndexedDB reali: abort dopo
la scrittura bozza prima dell'outbox, rollback atomico, snapshot invalidi,
CAS fra istanze, dipendenze e ACK, corsa ACK/prelettura, bootstrap completo
con privacy e overlay Days separato da Entries, scelte/storico,
riapertura, isolamento principale e revoca durante una lettura. Verifica
anche il rifiuto di un ACK con versione numerica non sicura e la conservazione
dell’indice Entries invariato.

`verify-day-outbox-browser.cjs` collega l'applicazione a un backend HTTP/V8
sintetico: due schede, accorpamento, batch locale parzialmente riuscito,
quota, timeout locale con commit accorpato, **chiusura e riavvio effettivi di
Chromium** sullo stesso profilo, rich text, trasporto sospeso, nuova operazione
dipendente, modifica non accodata durante ACK con nodo/focus/selezione
conservati, ACK remoto perso e ricevuta, conflitti e entrambe le scelte,
riflessione Abitudini, revoca/bypass, retry manuale con lo stesso ID,
dettaglio giorno e geometria a 320 px.

Il backend e i dati sono inventati: nessuna prova misura o certifica servizi
Google, iframe, retention reale o coordinamento di dispositivi reali.

## Gate ancora aperti

Provisioning e migrazioni reali, attivazione operations, autorizzazioni e
storage nel vero iframe, retention/capacità del sistema completo e collaudo
Google restano separati. Le altre entità restano sui loro contratti remoti.
Un conflitto CAS locale conserva il testo e richiede riallineamento della
vista: non autorizza a sovrascrivere il lavoro dell'altra scheda. Le letture
UI dopo una scrittura di un'altra scheda non costituiscono una transazione
con il DOM; CAS e versioni server rimangono la protezione finale.

L'abilitazione reale richiederà inoltre una policy di compatibilità dei client
che conoscono kind day. Una build precedente può conservare i nuovi record
ma non è un trasporto Days supportato; il downgrade non deve essere usato
come procedura per inviarli o cancellarli. Il protocollo minimo di produzione
resta un gate dell'attivazione, che questa tranche non esegue.

## Esito finale delle verifiche

Superati build, npm test generale sul risultato integrato (incluso il nuovo
test:day-outbox con 726 interruzioni simulate), test:repository, test:release,
test:local-bootstrap, test:day-batch, test:day-browser, test:cycle,
test:common-periods e test:tracing. Superati anche P59 build/sei file,
P60.1 bootstrap UTF-8, P70 privacy, controlli di sintassi dei nuovi moduli
e prove e git diff --check.

La verifica generale iniziale aveva evidenziato un'attesa prematura nel nuovo
test del retry: sostituita con polling che attende effettivamente la lettura
IndexedDB. La suite repository ha inoltre richiesto il controllo esplicito
dei metodi Days per mantenere compatibili gli adattatori solo note/task.
Le esecuzioni finali complete sono concluse senza errori.

Index.html e Demo.html rigenerati dai sorgenti; staging di esattamente sei
file e ROOT_FOLDER_ID segnaposto preservati. Nessun commit, deploy, setupDrive,
attivazione reale o accesso ai dati del diario su Google.
