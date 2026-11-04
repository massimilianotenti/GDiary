# Preparazione pura dei salvataggi HabitLogs

Incremento locale del 28 ottobre 2026, pacchetto 8 parziale. Il writer canonico
è stato verificato prima di iniziare questo incremento.

`syncPrepareHabitLogEdit_(payload, previous, catalog)` riceve record completi
Habits e Goals dal server, più la registrazione precedente o null. Non legge
servizi o fogli e non acquisisce lock. Restituisce copie indipendenti del
record canonico, dei cataloghi catturati e della richiesta normalizzata.
Non salva un piano durevole e non cambia setHabitLog.

Verifica identità abitudine/obiettivo, archivio logico dell'abitudine, data
iniziale, trimestre dell'obiettivo, giorni fissi o frequenza settimanale.
Confronta habitUpdatedAt quando presente, come nell'API attuale. Per le
registrazioni già iniziate mantiene ID, titoli e ordine della checklist
storica, anche dopo una modifica delle microazioni nel catalogo. Per la prima
registrazione prende le definizioni del catalogo catturato.

Checked omesso conserva le spunte precedenti; checked:[] le svuota. Duplicati
nella richiesta sono deduplicati, ID estranei rifiutati. Done incompleto è
rifiutato; pending diventa done se tutte le microazioni sono spuntate; skipped
conserva le spunte parziali. Le regole coincidono con setHabitLog attuale.
Una checklist legacy assente usa esplicitamente la definizione attuale per
un nuovo edit; non inventa spunte storiche. Migrare una vecchia registrazione
done priva di checklist richiede ancora una scelta esplicita della fotografia:
non si può dedurla da una richiesta che omette le spunte.

Il catalogo completo restituito è un contesto catturato, non un'autorizzazione
persistente: il futuro ponte deve leggerlo sotto lock, conservarne digest e
piano, verificarlo prima del prepare e distinguere un piano soltanto prenotato
da una ricevuta già confermata. Un retry confermato deve riusare l'ACK originale
anche se l'abitudine è stata successivamente modificata o archiviata. Questa
barriera non è fornita dal solo planner puro.

`test:habit-log-planner`, incluso in npm test, verifica dipendenze, pianificazione,
confini trimestre/anno/bisestile, vecchi ID/titoli, omissione/cancellazione delle
spunte, conflitti versione e isolamento delle copie. Confronta una sequenza di
cinque operazioni con le API reali della Demo; conferma equivalenza dei record
canonici con checked duplicati, omessi, skipped, completamento e svuotamento.
Una prova sostituisce db_/locked_ con funzioni che falliscono per escludere
I/O nascosto. Non è un test di latenza Google né di routing attivo.

Nessuna nuova RPC, tabella, attivazione manifest, deploy o modifica ai dati
reali. Il ponte durevole e i lettori coerenti sono il prossimo incremento;
controller e browser restano successivi. Online Apps Script 75.

Superati build, npm test, test:habit-log-planner, test:canonical-habit-logs,
test:release, test:cycle e test:tracing prima di iniziare il ponte durevole.
Seguito: [ponte e lettori HabitLogs](VERIFICA-MIGRAZIONE-REGISTRAZIONI.md).
