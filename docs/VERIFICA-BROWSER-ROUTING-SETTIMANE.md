# Collaudo browser del percorso Weeks attivo

Incremento locale del 28 ottobre 2026, SPEC-004 pacchetto 8 parziale.
`test:week-browser` usa la UI di Demo.html e RPC HTTP verso un server V8 locale
con servizi Demo, SHA-256 Node e adattatore Sheet/Range simulato. Il server
registra esplicitamente Days e Weeks sullo stesso registro nelle fixture;
l'app non introduce un nuovo trasporto. Nessun contatto con Google.

## Comportamento verificato e corretto

Una bozza aperta prima della migrazione conserva la versione legacy originale,
il nodo, il focus e la selezione durante la rilettura comune. Il primo
salvataggio è accettato sulla base migrata; successivamente si usano commit-N.
Una modifica arrivata mentre l'ACK è in attesa resta dirty con testo nuovo e
baseline del commit confermato. Gli altri campi, energia e stato sono conservati.

Le bozze Weeks ora sono indipendenti per lunedì nella memoria e nella
sessionStorage della scheda, tramite gli stessi helper delle bozze esistenti.
Contengono snapshot dei soli otto campi del form e versione iniziale; dopo
reload il record remoto non sostituisce la base della bozza. Non vengono
aperte IndexedDB o copie applicative. Storage negato resta un limite: l'helper
avvisa che occorre mantenere aperta la pagina; non è garantito il recupero
alla chiusura della scheda. Annullare la navigazione conserva la bozza;
confermare esplicitamente l'abbandono rimuove solo quella settimana.

Il form ora valida l'ACK prima di mutare lo stato comune o pulire la bozza:
un solo record della settimana richiesta, tutti i campi, versione non vuota,
testi corrispondenti alla normalizzazione inviata, energia e stato coerenti.
Forma incompleta, settimana errata, testo diverso o patch aggiuntiva sono
rifiutati. Dopo risposta persa o malformata, il retry riusa il piano originale
senza nuove scritture del registro. Il cambiamento è compatibile con il delta
Weeks dell'API legacy corrente e con il percorso canonico delle fixture.

Il callback di run riceve ora il risultato validato; gli altri chiamanti
restano compatibili. Una bozza successiva all'invio mantiene dirtyMain e il
form montato; il messaggio distingue il checkup inviato dalle modifiche rimaste.
Le modifiche frontend provengono da frontend/shell.html; Index/Demo rigenerati.

## Scenari della prova

- Bozza pre-migrazione e rilettura senza perdere focus/selezione/versione.
- Evento tardivo durante ACK, seguito dal salvataggio della nuova bozza.
- Risposta persa dopo commit, retry con registro esattamente invariato.
- Riavvio V8 e reload della scheda con bozza, energia e stato conservati.
- Due browser sulla stessa versione: il secondo salva, il primo mantiene
  testo e versione della bozza in conflitto.
- readOnly persistente dopo riavvio, nessun ripiego alle righe legacy e
  nessuna nuova scrittura mentre il salvataggio è bloccato.
- Quattro ACK malformati, stato comune invariato fino alla conferma valida.
- Export tracing con lettura canonica, senza testo o identità dell'archivio.
- Annullamento e abbandono esplicito della bozza durante la navigazione.
- Righe legacy Weeks congelate durante tutti gli edit; nessun errore JS,
  privacy inizialmente nascosta e layout 320/390 px senza overflow di pagina.

Screenshot sintetici in artifacts/week-routing-conflict.png,
week-routing-readonly.png e week-routing-readonly-mobile.png, esclusi da Git.
Ispezionato anche lo screenshot mobile: messaggio readOnly e bozza visibili,
form e scelte completi; tracker con scorrimento interno previsto.

## Limiti e seguito

La prova locale non certifica iframe Google, semantica remota delle proprietà,
quote o latenza Sheets. Nessuna registrazione reale, provisioning, deploy o
modifica di dati reali. Manifest ancora false, online Apps Script 75.
Il percorso Weeks locale copre writer, migrazione, controller e browser;
il pacchetto 8 completo richiede ancora la restante matrice delle mutazioni
e il feed coerente dell'intero archivio. Prossimo dominio locale: HabitLogs,
con identità/checklist e dipendenze dai cataloghi Habits conservate.

Superati build, npm test, test:week-browser, test:week-controller,
test:incremental, test:release, test:tracing, test:day-browser,
test:common-periods, P85 e P88. Dopo l'ultima correzione del solo messaggio
conflitto settimanale rieseguiti build, test:week-controller e test:week-browser.
Test browser aggiunto a test:e2e; suite storica completa non rieseguita.
Demo, Index e staging dei sei file rigenerati, bootstrap UTF-8 e segnaposto
ROOT_FOLDER_ID preservati; git diff --check pulito.
