# Collaudo browser HabitLogs con routing attivo

Incremento locale del 28 ottobre 2026, SPEC-004 pacchetto 8 parziale.
Controller persistente verificato prima di iniziare il browser.

`test:habit-log-browser` usa Demo.html con UI reale e RPC HTTP verso server
V8 locale, servizi Demo e adattatore Sheet/Range simulato. Days, Weeks e
HabitLogs sono registrati esplicitamente sullo stesso registro nelle fixture.
Il trasporto HTTP, i dati e gli operatori sono esclusivamente di test.

## Comportamento verificato

La prima registrazione da una base legacy aperta prima della migrazione è
accettata una volta sulla revisione canonica. Le microazioni storiche mantengono
ID e titoli dopo una modifica del catalogo. Due browser con la stessa richiesta
e base ricevono lo stesso ACK senza un secondo commit; richieste diverse sulla
stessa base producono un conflitto e lasciano il client respinto sul suo stato
confermato precedente, fino alla rilettura esplicita.

Dopo risposta persa o malformata il controllo torna allo stato locale confermato,
con errore esplicito. Ripetere la stessa azione riusa il piano e l'ACK senza
nuove scritture del registro. Non viene introdotta un'outbox, né una coda offline
di intenzioni; questa rimane il pacchetto 11 del piano. Una bozza di riflessione
aperta nel diario conserva testo, nodo e stato dirty attraverso le registrazioni,
gli errori e il reload della scheda.

Il frontend ora verifica l'ACK prima del merge comune, sia nel percorso Diario
sia nel run generico del Ciclo: esattamente un record della pratica/data inviata,
versione non vuota, forma completa, ID e titoli della checklist corrispondenti
alla base catturata prima della RPC, spunte corrispondenti alla richiesta e
stato derivato coerente. Sono rifiutati array vuoto, identità errata, spunte
alterate, titoli alterati, stato diverso e patch aggiuntiva. Nessuna di queste
risposte può modificare lo stato comune o dichiarare una conferma valida.

Focus ripristinato per ID dell'abitudine, data e ID della microazione, nel
Diario e nel Ciclo. Le righe giornaliere usano data-habit-log-id e data-habit-log-date, distinti
dagli attributi già riservati a cataloghi e sezioni giornaliere. Le regressioni
Ciclo e P80 hanno rilevato queste collisioni durante lo sviluppo; corrette
senza modificare i selettori dei test storici.

ReadOnly resta persistente dopo riavvio V8 e reload: si leggono le checklist
canoniche, i nuovi tentativi sono bloccati senza scritture o fallback legacy.
Pratiche semplici senza microazioni e percorso Ciclo verificati oltre al Diario.
Tracing verificato anche su una mutazione: export senza titoli, ID di record,
chiave composta, testi delle microazioni o identità dell'archivio.

## Fixture, geometria e limiti

La fixture condivisa ricostruisce anche Habits/Goals/HabitLogs dai dati persistiti
e rimuove la cache dei dati dimostrativi creati dal bootstrap prima del restore.
Questo evita che un riavvio sintetico mostri cataloghi della fixture base al
posto delle righe ripristinate; non è una modifica alla cache di produzione.
Una latenza di 40 ms sul trasporto sintetico permette di completare il click
nativo prima di sostituirne il nodo DOM; non misura la latenza Google.

Layout 320/390 px senza overflow della pagina; screenshot sintetici desktop e
mobile in artifacts/habit-log-routing-conflict.png, habit-log-routing-readonly.png
e habit-log-routing-mobile.png, esclusi da Git. Ispezionato lo screenshot
mobile: bozza del diario e checklist storica visibili, scelte e microazioni
complete e controlli allineati.

Il collaudo non certifica iframe Google, quote, cache remota o latenza Sheets.
Nessuna registrazione reale, deploy, provisioning o dato dell'utente modificato.
Capability manifest false, online Apps Script 75. Percorso HabitLogs locale
coperto da writer/planner/ponte/controller/browser; pacchetto 8 e feed completo
ancora aperti. Prossimo dominio: cataloghi Goals/Habits e relative mutazioni,
coordinando i lettori dei cataloghi usati dalle registrazioni già canoniche.

Superati build, npm test, test:habit-log-browser, test:habit-log-controller,
test:release, test:cycle, test:incremental, test:common-periods, test:tracing,
test:day-browser, test:week-browser, P80 e P59 build. Dopo l'ultima correzione
dei soli attributi DOM ripetuti build, ciclo, browser HabitLogs, P80 e P59.
Browser aggiunto a test:e2e; suite browser storica completa non rieseguita.
Sorgente frontend modificato in frontend/shell.html; Index, Demo e staging
sei file rigenerati, bootstrap UTF-8 e segnaposto ROOT_FOLDER_ID conservati.
Git diff --check pulito.
