# Writer canonico dei metadati progetto

`syncProjectSnapshot_` e `syncPlanProjectOperation_` definiscono snapshot
completi e richieste condizionali per `projects`. `syncProjectWriter_` usa il
nucleo prepare/apply/commit comune, con lettura per slug, versioni commit-N,
ACK e conflitti durevoli, isolamento per scope, recupero prima delle operazioni
e barriera contro la resurrezione di un progetto eliminato. Il planner non
legge l'archivio né genera identità.

La verifica copre retry stabile anche dopo modifiche successive, conflitto su
versione obsoleta, input/schema invalido senza scritture, tombstone, envelope
corrotto e indisponibilità dello store. Fault injection prima/dopo ognuna delle
10 unità durevoli del kernel e su ognuna delle 165 chiamate Sheet/Range del
salvataggio: una nuova istanza V8 recupera o restituisce lo stesso ACK.

## Verifiche

- `npm run test:canonical-projects`: superato; 10 fault durevoli e 165 fault
  Sheet/Range recuperati.
- `npm run build`: superato; `Demo.html`, `Index.html` e staging locale dei sei
  file Apps Script rigenerati.
- `npm test`: superato, incluso il nuovo test.
- `npm run test:release`: superato.
- `git diff --check`: superato.

## Limiti e seguito

Questo rapporto documenta il primo incremento, il writer interno. Il seguito
[gateway/controller Projects](VERIFICA-CONTROLLER-PROGETTI.md) instrada ora
`saveProject` e le letture, con nome univoco e cartella Drive dopo l'ACK.
Associazioni Entry→Projects e conversione progetto→tag restano aperte. Nessun
browser Apps Script, provisioning, deploy o dato reale è stato coinvolto qui.
