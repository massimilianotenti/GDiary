# Retention fisica: pianificazione fail-closed

## Esito di questa tranche

È stato aggiunto un primo contratto interno `sync-retention-plan/v1`, legato
allo scope archive/principal/epoch e al digest, generazione e sequenza del
checkpoint. La policy reale è disattivata per default. La pianificazione non
scrive sul registro e non cancella righe o payload.

Lo stato della proposta è persistito separatamente dal feed come
`sync-retention-state/v1`, con revisione CAS e fasi `planned`, `approved`,
`retiring`, `complete`. Il gate di approvazione è un callback server separato.
Il passo di ritiro richiede adattatori server per lotto, verifica del residuo e
pubblicazione del minimo: se mancano, restituisce `ProtocolUnavailable` senza
modificare lo stato approvato. Il test simula pianificazione, lettura e
approvazione e verifica che l'assenza degli adattatori blocchi l'avanzamento.
I verificatori devono restituire una prova strutturata con scope, digest,
sequenza e conteggio; un booleano o un digest/scope diverso viene rifiutato.
Il controller Demo verifica davvero il manifest pubblicato e i conteggi di
Entries/Files/Layouts attraverso il checkpoint scoped. Per prefissi fino a 25
commit verifica anche alias e commit tramite l'ispezione del protocollo. Oltre
25 commit l'inventario alias non è completato entro il budget della chiamata e
resta blocker. Le altre prove positive di contratto usano adapter sintetici.

Il minimo cursore resta zero finché non risultano verificati tutti questi
insiemi: checkpoint, finestra delle ricevute, alias operationId, baseline Docs, tombstone
e route, lettori in corso e copertura legacy. Un piano non è approvazione,
pubblicazione del minimo cursore o autorizzazione a eliminare dati.

## Limiti e gate

Questa implementazione non completa la retention fisica. Il repository non
fornisce ancora una scadenza verificabile delle ricevute e degli alias; i
commit sono una prova alternativa usata dai retry quando la ricevuta manca.
Non esiste inoltre un inventario completo delle baseline Docs né lease dei
lettori per generazione. Perciò non si può approvare un piano sicuro con le
verifiche disponibili e non esiste un adattatore di ritiro concreto. Payload,
ricevute, alias, commit e baseline restano
intatti; nessun minimo cursore viene pubblicato.

Il test `verify-physical-retention.cjs` controlla default off, scope,
contratto, prove strutturate, digest errato, blocco quando manca una prova,
CAS, il controller Demo con checkpoint realmente pubblicato e assenza degli
adapter di ritiro. È una prova di protocollo/integratione locale, non una
prova HTTP, Chromium, Apps Script o Google. Nessun recupero di spazio fisico è
dimostrato; pacchetto 12 resta aperto.
