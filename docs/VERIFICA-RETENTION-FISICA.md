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
contratto, blocco quando manca anche una sola prova e assenza di cancellazioni
durante la pianificazione. È una prova di protocollo locale, non una prova
HTTP, Chromium, Apps Script o Google. Nessun recupero di spazio fisico è
dimostrato; pacchetto 12 resta aperto.
