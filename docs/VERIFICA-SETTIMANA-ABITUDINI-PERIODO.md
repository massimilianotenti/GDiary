# Settimana e Abitudini per periodo — SPEC-004, solo locale

Implementato il 27 ottobre 2026, seguito delle
[finestre del diario](VERIFICA-DATI-COMUNI-PERIODO.md). Nessun deploy, setup,
accesso a Google o modifica ai dati reali. Ultimo online documentato: Apps
Script 75, app v2.0.4.

## Comportamento e contratto

Il frontend usa ora `context.commonWindow` anche con `week` e `habits`.
`getState` e `getCommonState` restituiscono `commonSlices` e `commonScope`;
le chiamate senza opt-in conservano gli array completi. La settimana deve
essere una data ISO valida di lunedì; per Abitudini viene validata anche la
giornata. I campi omessi all'avvio usano oggi e il suo lunedì.

| Vista | Days | Weeks | HabitLogs |
|---|---|---|---|
| Settimana | Domenica precedente e sette giorni visibili | Checkup del lunedì selezionato | Solo i sette giorni visibili |
| Abitudini | Giornata selezionata e giorno precedente | Lunedì del tracker | Settimana del tracker e settimana della giornata selezionata |

Le due settimane di Abitudini possono essere distanti anni: i mesi tra loro
non vengono letti. Se coincidono, i log vengono cercati una sola volta.
Obiettivi, abitudini e altri cataloghi mantengono la freschezza distinta di
60 secondi; cambiare trimestre o anno del ciclo resta una selezione locale.

Gli scope sono `{kind:'week',week}` e `{kind:'habits',week,date}`. Una slice
può ora esporre `ranges:[{from,to}, ...]` anziché il singolo `from/to` del
diario. Le righe sono autorevoli solo nell'unione degli intervalli inclusivi:
il merge elimina record assenti dentro quegli intervalli e conserva quelli
nei periodi intermedi e fuori periodo. Identità e versioni restano quelle
canoniche (`date`, `week`, `key`, `updatedAt`). Non cambia nessun foglio.

Il lettore condiviso usa TextFinder sulla colonna della data e legge soltanto
payload selezionati, in gruppi contigui di massimo 256 righe. Non dipende
dall'ordine dei dati o dalla soglia di 500 righe. Conserva tutti i campi rich,
le microazioni e le versioni. Non usa Drive, Docs o lock di scrittura per
queste letture comuni.

## Navigazione e recupero

I pulsanti del tracker, il selettore del giorno, Oggi e le celle del tracker
passano da `changeHabitPeriod`. Il vecchio modulo resta montato con il suo
contenuto durante la lettura; controlli ed editor sono disabilitati e il
contenitore segnala `aria-busy`. Il nuovo modulo viene costruito solo quando
lo scope richiesto è disponibile. Il cambio settimana non sposta il giorno
e il cambio giorno non sposta il tracker.

Resta la conferma di scarto già prevista per modifiche non salvate. Se la
lettura fallisce dopo la conferma, vengono ripristinati selezione, bozze,
versioni iniziali e stato di modifica; il nodo dell'editor e la formattazione
restano disponibili. L'errore è visibile e la stessa navigazione permette
un nuovo tentativo. Rifiutare lo scarto non avvia la lettura.

Una navigazione di periodo invalida le letture della vista precedente ancora
in corso. Restano inoltre le protezioni contro risposte comuni successive a
salvataggi già confermati. La cache della vista è utilizzabile solo con scope
e freschezza corretti. La scadenza dei cataloghi durante una lettura lenta
non scarta un periodo appena caricato: il successivo accesso potrà aggiornare
i cataloghi. Il flag diagnostico numerico `commonWindowRequested` copre ora
tutte e tre le viste; nessuna data viene aggiunta all'export.

## Verifiche e risultati

`npm run test:common-periods` esegue backend e browser. La fixture contiene
record fuori ordine, giornate formattate e log con microazioni. Confronta poi
lo stesso periodo dopo l'aggiunta di **50.000 righe storiche in ciascuna delle
tre tabelle** Days, Weeks e HabitLogs:

| Lettura della fixture | Celle contate da readSheetValues_ |
|---|---:|
| Settimana | 126, invariate dopo la crescita |
| Abitudini con giornata lontana dal tracker | 124, invariate dopo la crescita |
| Lettura completa di confronto | 1.450.283 |

Sono volumi simulati, includono piccoli cataloghi e non tutte le letture
dirette dei metadati. Non sono secondi misurati su Google né una garanzia
che TextFinder abbia costo indipendente dalla dimensione del foglio.

Coperti settimane separate e sovrapposte, cambio anno e giorno bisestile,
periodi vuoti e invalidi, completezza dei record, assenza di scritture,
compatibilità legacy, selezione indipendente, versione del checkup e della
riflessione, attesa, errore, retry, scarto rifiutato, recupero delle bozze rich,
riuso dei cataloghi, scadenza durante la richiesta e risposta tardiva di una
vista precedente. Il test storico del ciclo attende ora il completamento
della navigazione asincrona prima di controllare selezione e focus.

Build, npm test, test:common-periods, test:common-window, test:release,
test:cycle, test:incremental, test:diary-goals, test:tracing, P85 e P88 superati.
Index e Demo rigenerati, bootstrap UTF-8 e sei file di staging preservati;
ROOT_FOLDER_ID resta il segnaposto.

## Limiti e seguito

TextFinder continua a cercare nella colonna intera. Molti log nello stesso
periodo e righe molto frammentate aumentano rispettivamente payload e chiamate;
non c'è paginazione dei log. La copertura memorizzata indica l'ultimo scope,
non un indice riutilizzabile di tutti gli intervalli già letti: tornarci può
richiedere una nuova lettura limitata. I dati degli altri periodi restano in
memoria nella scheda, senza persistenza applicativa in IndexedDB.

Le viste senza finestra esplicita mantengono il vecchio caricamento completo;
separare i loro soli cataloghi è un'ottimizzazione ancora possibile. Restano
futuri feed, ricerca locale, outbox e coordinamento del worker Docs previsti
dalla SPEC-004. Nessun server aggiuntivo richiesto.
