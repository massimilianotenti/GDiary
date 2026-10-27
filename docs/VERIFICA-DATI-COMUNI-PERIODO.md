# Dati comuni del diario per periodo — SPEC-004, solo locale

Implementato il 27 ottobre 2026. Seguito completato per
[Settimana e Abitudini](VERIFICA-SETTIMANA-ABITUDINI-PERIODO.md);
quanto segue descrive la prima tranche sul diario. Nessun deploy, setup, accesso a Google o
modifica ai dati reali. Ultimo online documentato: Apps Script 75, v2.0.4.

## Comportamento

Il frontend richiede `context.commonWindow: 'journal'` nelle letture del
diario, compreso il percorso Task ospitato nella stessa vista. Il backend
restituisce cataloghi completi e `commonSlices`, senza gli array temporali
che i vecchi client interpretavano come completi:

- Days: giorno precedente il mese, poi tutto il mese visibile; include rich
  e versioni. Il giorno precedente serve al riporto delle checklist.
- HabitLogs: dal lunedì della prima settimana alla domenica dell'ultima.
- Weeks: lunedì della settimana corrente, per il focus del diario.

`commonScope: {kind:'journal',month,today}` descrive la copertura. Ogni slice
contiene `{from,to,rows}` con estremi inclusivi. Una risposta vuota vale come
assenza di record solo nel suo intervallo. Il client sostituisce quel periodo,
conservando gli altri periodi già caricati e le bozze negli archivi dedicati.
Non tratta una slice come un aggiornamento incrementale dei soli record
presenti: così vengono recepite anche le eliminazioni esterne.

La selezione usa TextFinder sulla sola colonna data; i payload sono letti
solo per righe selezionate, contigue e in gruppi di massimo 256. Funziona con
fogli piccoli, grandi e non ordinati; nessun caricamento integrale seguito
da filtro in JavaScript. Non cambia schemi o protocollo di scrittura.

Il client distingue la freschezza dei cataloghi (60 secondi) dalla copertura
temporale. `catalogFresh` omette cataloghi e catalogo tag nelle sole letture
quando già recenti; le risposte dei salvataggi continuano a includere quanto
previsto prima. Aggiorna forza anche i cataloghi. Gli export diagnostici
measurementVersion 4 includono i soli flag numerici `commonWindowRequested`
e `catalogReuseRequested`, senza date o contenuti.

Un cambio mese non può saltare la lettura usando il timestamp di un altro
mese. Le altre viste e le chiamate senza opt-in conservano gli array completi
con `commonScope: {kind:'full'}`. Passando dal diario ad Abitudini o Settimana
il frontend rilegge i dati necessari prima di costruire i moduli. Le successive
navigazioni locali di quelle viste restano compatibili col contratto completo.

Le letture comuni ritardate non sostituiscono dati dopo un salvataggio già
confermato; una generazione monotona protegge anche da letture più recenti.
La risposta scartata non dichiara il periodo caricato: una successiva lettura
potrà completarlo. Il refresh della vista conserva le voci restituite ma
scarta le collezioni comuni obsolete dopo un salvataggio concorrente.

## Evidenze locali

`npm run test:common-window` verifica backend e browser. Il backend confronta
lo stesso periodo con quattro giornate/log e con ulteriori 50.000 giornate e
50.000 log fuori periodo: i contatori `readSheetValues_` restano a **85 celle**;
la lettura completa di confronto arriva a **950.124 celle**. Sono conteggi
sintetici, includono piccoli cataloghi e non tutte le chiamate dirette a Sheets.
Mille log aggiuntivi nel periodo vengono restituiti tutti con quattro letture
payload aggiuntive, senza perdere microazioni o versioni.

Coperti ordine irregolare, anno bisestile e cambio anno, campi rich,
compatibilità completa, richiesta non valida, assenza di scritture/Drive/Docs,
merge con eliminazioni, cambio mese, cache vista, fallback completo e corse tra
letture e salvataggi confermati. Il test v201 usa ora `acceptCommon` anziché
interpretare direttamente `.days` come una collezione sempre completa.

Build e test: npm test, test:common-window, test:release, test:incremental,
test:cycle, test:diary-goals, test:progressive, test:tracing, test:scale e P74.
Index.html e Demo.html rigenerati, staging di sei file con segnaposto.

## Limiti e seguito

Non è una misura dei secondi risparmiati su Google: TextFinder deve ancora
cercare nell'intera colonna data. Più record nel periodo aumentano il lavoro;
righe selezionate molto frammentate possono richiedere molte letture. Non è
un indice temporale persistente né una paginazione dei log. I cataloghi,
compreso TaskPlans, restano completi alla loro scadenza. Le altre viste
caricano ancora lo storico temporale completo.

Il seguito, ora implementato nella verifica collegata sopra, estende le finestre a Settimana e Abitudini, con copertura
separata della settimana del tracker e della giornata selezionata, indicazione
di caricamento e conservazione delle bozze. Restano separati gli sviluppi
IndexedDB applicativi, feed incrementale, ricerca e outbox della SPEC-004.
