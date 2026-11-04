# Writer canonico dei checkup settimanali

Incremento locale del 28 ottobre 2026, SPEC-004 pacchetto 8 parziale.

`syncWeekWriter_(store, trustedScope)` offre save/read interni tramite il
nucleo recuperabile. Il planner puro accetta esattamente operationId,
baseVersion e week; lo snapshot comprende tutti i WEEK_HEADERS salvo
updatedAt. Identità lunedì valida, sei testi fino a 6.000 unità UTF-16,
energia vuota o 1–5 e closed yes/no sono verificati senza trim o troncamento.
Il piano ha il limite complessivo di 32.768 unità del nucleo.

L'entità weeks usa formato sync-week/v1 e versione commit-N. Il lettore
recupera i prepare prima di esporre lo snapshot, controlla schema e identità,
e distingue assenza e tombstone. ACK e conflitti sono stabili anche dopo
scritture successive; scope e record restituiti sono copie indipendenti.
Il costruttore non inizializza lo store e non introduce una RPC pubblica.

`test:canonical-weeks`, incluso in npm test, verifica snapshot incompleti,
campi estranei/tipi/limiti, Unicode, spazi e testo simile a formule,
retry/OperationMismatch, conflitti, isolamento tra collezioni, tombstone,
corruzione, revoca e disattivazione. Copre 20 interruzioni prima/dopo le unità
del nucleo e 165 interruzioni prima/dopo/parziali di Sheet/Range con riavvio
V8 dai soli dati persistiti. La Demo generata contiene lo stesso writer e
la prova verifica che la tabella legacy Weeks rimanga invariata.

Non è ancora un percorso applicativo Weeks: saveWeek e lettori completi/per
periodo restano legacy. Servono ponte di migrazione con preimmagine congelata,
controller persistente coerente con il registro condiviso, guardie per tutti
i writer e collaudo browser. Nessuna doppia scrittura o attivazione reale;
capability manifest false. Nessun deploy, provisioning o accesso Google.
Online resta Apps Script 75.

Superati npm run build, npm test, test:canonical-weeks, test:release e
test:tracing; git diff --check pulito. Demo e staging dei sei file rigenerati;
Index senza differenze frontend. Bootstrap UTF-8 e segnaposto conservati.

Seguito: [ponte Weeks e lettori coerenti](VERIFICA-MIGRAZIONE-SETTIMANE.md),
verificati sulle API della Demo con iniezione sintetica.
