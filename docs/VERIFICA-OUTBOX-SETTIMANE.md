# Salvataggio locale durevole del checkup — 6 novembre 2026

## Ambito e base preservata

Tranche Weeks del pacchetto 11 SPEC-004, costruita sul lavoro Days ancora
senza commit dopo ad13f4a. Nessun ripristino, commit o pubblicazione. Le prove
Days preesistenti vengono rieseguite sul risultato integrato. Non sono estesi
all'outbox HabitLogs, Goals, Habits o altre entità.

La nuova famiglia `week` riusa store, indici, lease, claim, accorpamento,
dipendenze, retry e risoluzione dei conflitti esistenti. `period-operation.mjs`
contiene esclusivamente i contratti Days/Weeks; `week-operation.mjs` definisce
identità e snapshot Weeks. Nessuna migrazione IndexedDB: resta v11.

## Snapshot e server

Identità stabile: la data ISO del lunedì. Snapshot completo di WEEK_HEADERS
escluso updatedAt: focus, priorities, wins, obstacles, lessons, next, energy,
closed. Sei testi fino a 6.000 unità, energia vuota o 1–5, closed yes/no;
nessun trim o troncamento. Il limite locale complessivo è 29.000 unità della
serializzazione canonica, per restare nei budget del piano recuperabile.
Le patch UI contengono solo i campi effettivamente modificati rispetto alla
baseline visibile del form: i campi intatti conservano anche eventuali CRLF
originari, che una textarea normalizzerebbe. La patch viene ricomposta nel
record completo prima di entrare nell’outbox. Snapshot wire parziali o diversi
fra bozza e payload sono rifiutati prima del
commit locale. Un campo vuoto esplicito rimane una modifica intenzionale.

Gli endpoint aggiuntivi sono:

- `saveWeekOperation({operation,scope})`, con operation
  `{operationId,baseVersion,week}` e week snapshot completo.
- `getWeekOperationReceipt({request,scope})`, prova sul piano originale:
  committed/conflict/unknown, mai ACK dedotto dall'assenza della ricevuta.
- `getWeekOperationState({week,scope})`, risposta con lunedì, missing,
  weekRecord e scope verificato, per il confronto esplicito.

Il gateway verifica lo scope atteso contro quello fidato del controller;
non accetta l'identità del client come autorità e non configura fogli o
routing. La prenotazione conserva fingerprint, snapshot e baseline originali
prima del commit; il retry ripete lo stesso ACK anche dopo altri commit.
Cambiare il payload di un ID già tentato è OperationMismatch.

Una settimana senza riga legacy può essere creata insieme a descrittore e
directory canonici. Una riga legacy esistente richiede la migrazione server
separata già prevista: nessuna migrazione automatica. Per righe migrate,
la versione ISO legacy è traducibile soltanto sulla versione iniziale del
descrittore. readOnly impedisce scritture, ma mantiene letture e ricevute;
l'operazione locale rimane durevole e ritentabile. Restano i limiti della
directory (128 identità) e del preflight/registro, senza promessa di capacità
illimitata. Nessuna scrittura nella tabella Weeks legacy per il nuovo percorso.

## Repository, concorrenza e ricevute

kind week, id=lunedì, action upsert. `saveLocalOperation` registra snapshot e
outbox nella stessa transazione con CAS sulla revisione della bozza. Modifiche
mai inviate si accorpano preservando operationId; dopo un tentativo nasce una
nuova operazione dipendente. Una scheda con revisione vecchia non può usare
silenziosamente il lavoro dell'altra come nuova baseline.

`readLocalWeekState` legge record comune, bozza e coda attiva nella stessa
transazione. ACK aggiorna atomicamente ricevuta, record canonico Weeks,
baseline della bozza e dipendenze mai inviate. Una versione feed più recente
non viene sovrascritta. Se un ACK arriva fra prelettura e commit locale,
la baseline può avanzare solo su prova ACK della stessa entità/kind.
Days e Weeks sullo stesso lunedì restano indipendenti; un ACK Days non può
ribasare Weeks. Le ricevute storiche rimangono conservate.

Salvataggi, ACK e stati dell'outbox Weeks non invalidano un indice Entries
invariato: ne avanzano la revisione mantenendo la validità. Il bootstrap
completo sovrappone i record Weeks pendenti nella fotografia atomica già
esistente, senza creare false Entries. Fuori dal bootstrap si leggono le
date in coda e le revisioni delle bozze, senza una transazione per ogni riga
Weeks storica e senza enumerare le ricevute terminali.

I contatori di scrittura/generazione della shell avanzano ai commit locali e
agli ACK dei periodi: risposte comuni o bootstrap iniziati prima non possono
rimpiazzare lo stato appena salvato. Callback di un precedente scope non
popolano l'archivio/principale ora attivo. Le verifiche finali sullo scope
si ripetono dopo le letture asincrone.

## Form e recupero

Il comando Salva focus e checkup entra nell'outbox soltanto quando consenso,
identità, cache e operations sono verificati e l'adattatore supporta Weeks.
La conferma locale segue il commit IndexedDB riuscito. Su quota/abort/CAS il
form resta modificato; su timeout locale viene ricercato l'ID originario,
anche se accorpato, prima di confermare la durabilità. Non esiste un bypass
remoto automatico degli invii locali dopo revoca/disattivazione.

L'invio non blocca editor o navigazione. ACK normale o riconciliato aggiorna
la versione nel form montato, senza sostituire campi, nodo, focus o selezione.
Una modifica successiva non ancora accodata rimane sporca e nella bozza;
il messaggio distingue l'ACK precedente dal lavoro nuovo. Un form vecchio
non adotta la revisione locale di un'altra scheda quando arriva l'ACK.
Le bozze settimanali non ancora accodate conservano il meccanismo di sessione
e la migrazione esistenti, con la revisione aggiuntiva per il controllo CAS.

La barra del form e lo stato locale distinguono modifiche non salvate,
salvato sul dispositivo/in attesa, errore/conflitto e conferma Google.
Il passaggio di composizione `polishWeek` conserva anche il pannello locale.
Riprova mantiene operationId, payload e tentativi; Confronta checkup mostra
le versioni come testo e offre scelta locale o Google. La transazione di
risoluzione controlla la revisione e conserva lo storico. Prima della scelta,
le eventuali nuove modifiche del checkup devono essere accodate. La scelta
riguarda soltanto questa settimana; le altre bozze restano conservate.

Tracciamento: endpoint aggiunti alle allowlist server e frontend per Days e
Weeks; gli export conservano nomi, durate e conteggi, non corpi o identità.

## Prove locali

Nuovo `npm run test:week-outbox`, incluso in npm test. Repository/UI inclusi
anche in test:repository. Backend Demo/V8 sintetico, Chromium headless e
IndexedDB reali; nessun servizio Google.

- Server: snapshot completi, spazi/Unicode, campi estranei, lunedì ed enum,
  creazione canonica, replay/mismatch, scope, ricevute unknown/conflict,
  stato e readOnly. **726 interruzioni Sheet/Range prima/dopo/parziali**:
  330 aggiornamento e 396 creazione con descrittore/directory, riavviando V8
  dai soli dati persistiti e ottenendo lo stesso ACK.
- Repository: abort fra bozza/outbox, CAS, payload incompleti/incoerenti,
  dipendenze, ACK/prelettura, storico/scelte, bootstrap completo/privacy,
  indice Entries mantenuto, ACK non provati con versioni non sicure/campi
  sconosciuti, riapertura, isolamento
  principale e revoca. Days/Weeks con la stessa chiave e callback di scope
  precedente sono verificati separatamente.
- UI: due schede, accorpamento, quota e commit locale incerto, **riavvio reale
  di Chromium** sullo stesso profilo, valori di tutti i campi e degli enum, CRLF dei campi intatti,
  trasporto sospeso, nuova operazione dipendente, modifica non accodata durante
  ACK con nodo/focus/selezione, risposta comune tardiva, ACK perso/ricevuta,
  entrambe le scelte dei conflitti, readOnly dopo riavvio server e successivo
  retry, errore permanente/retry manuale, revoca/bypass, settimane vuote e
  confini mese/anno, geometria 320/390 px anche nello stato di conflitto.
  Un ACK mentre un'altra scheda salva non concede al vecchio form la sua
  nuova revisione; il testo non ancora accodato rimane conservato.

## Limiti e gate

Nessun deploy, setupDrive, accesso ai dati reali, attivazione di capability
o commit. Restano separati provisioning/migrazioni reali, persistenza e
identità nel vero iframe, collaudo Google, retention/capacità e policy di
compatibilità dei client che riconoscono kind week. Una build precedente
non è un trasporto Weeks supportato; un downgrade non è una procedura per
inviare o cancellare i nuovi record. La barriera in sola lettura delle
ricevute può attendere il normale recupero server di un prepare pendente.

Un conflitto CAS locale conserva il testo e richiede riallineamento della
vista; non autorizza a sovrascrivere l'altra scheda. Le transazioni non
comprendono il DOM. La scelta Google usa l'invalidazione/ricostruzione della
cache già prevista per i conflitti, distinta dai salvataggi/ACK ordinari.
Non si dichiara offline completo né concluso l'intero pacchetto 11.

## Esito finale delle verifiche

Superati build e npm test sul risultato integrato, inclusi test:day-outbox
e test:week-outbox (726 interruzioni specifiche per ciascuna famiglia).
Superati test:repository, test:release, test:week-browser, test:local-bootstrap,
test:common-periods e test:tracing. Verificati P59 build/sei file, P60.1
bootstrap UTF-8/fallback senza Vue, P70 privacy, sintassi dei moduli/prove
e git diff --check.

Durante la verifica è stata corretta una regressione del refactor nel
fallback senza Vue: il controllo dell'adattatore avviene ora dopo la guardia
di abilitazione, senza consultare il bundle assente. Il passaggio polishWeek
conserva il pannello locale che inizialmente veniva rimosso dalla composizione
del form. I test finali del fallback, delle due outbox e del form sono positivi.

Index.html e Demo.html rigenerati dai sorgenti; staging di sei file, manifest
e ROOT_FOLDER_ID segnaposto preservati. Modifiche Days preesistenti conservate;
nessun commit, deploy, setupDrive, capability reale o accesso Google.
