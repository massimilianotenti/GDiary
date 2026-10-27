# Task: elenco e descrizioni separati — SPEC-004

Data: 27 ottobre 2026. Sviluppo e collaudo locali su Demo.html; nessun deploy,
accesso al diario reale o nuovo servizio esterno.

## Comportamento implementato

La vista Task richiede l'elenco con `getJournalPage`, `taskOnly: true` e
`metadataOnly: true`. Ogni pagina contiene al massimo 200 voci, entro il
budget di serializzazione preesistente di 600.000 caratteri JSON. Se il budget
riduce la pagina, il cursore riparte dal primo record non restituito.

La risposta conserva identità, date, titoli, stato, pianificazione, importanza,
progetti, tag privati, posizione e pending/errori Docs. Non contiene `body`,
`rich` o un finto contenuto canonico vuoto; ogni voce ha `contentLoaded: false`
e la risposta dichiara `contentsIncluded: false`.

Questo percorso non apre Docs, non verifica revisioni Drive, non legge
DocContent e non interroga la cache dei corpi. Continua a leggere Sheets per
metadati e strutture ausiliarie. Il diario normale conserva le pagine da 25
voci complete e il comportamento precedente.

La descrizione viene richiesta quando si espande il task. Titolo, stato,
scadenza e proprietà restano modificabili mentre il corpo non è caricato;
l'editor del corpo e la sua toolbar rimangono disabilitati fino alla risposta.
Il contenuto viene applicato allo stesso blocco senza sostituire titolo,
focus o selezione. Il collegamento a Docs diventa disponibile dopo la lettura,
quando esiste; le formattazioni non supportate mantengono la protezione.
Le righe incomplete usano un adattatore leggero: toolbar e DOM rich vengono
costruiti soltanto dopo l'arrivo del corpo, preservando i controlli dei metadati.

Il caricamento iniziale non scarica automaticamente tutte le descrizioni.
Per esempio 61 task con metadati ordinari richiedono una pagina di elenco,
rispetto alle almeno tre pagine complete precedenti. È un confronto sul
protocollo e sul lavoro richiesto, non un tempo reale misurato su Google.

## API delle descrizioni

`getJournalContents({items:[{id, updatedAt}], refreshDocs?})` accetta da 1 a
25 identità uniche e versionate. È inclusa nel dispatcher diagnostico.

1. Cerca i record e verifica tipo Task e versione richiesta.
2. Legge i corpi tramite `journalReadContents_`, estratto dal lettore precedente
   e condiviso con il diario normale: stessi controlli Drive, revisione cache,
   precedenza del pending e conversione rich.
3. Rilegge i metadati prima di restituire le voci, rifiutando quelle cambiate
   o eliminate durante l'operazione. Nessun lock globale aggiunto.

La risposta contiene `entries`, `errors` per voce e `remainingIds` quando il
budget del corpo limita il lotto. Un errore non viene convertito in un corpo
vuoto salvabile. I client riprendono le identità rimaste; una risposta senza
avanzamento diventa errore recuperabile invece di generare un ciclo infinito.

Il lettore condiviso mantiene i limiti di cache/prefetch preesistenti. Può
preleggere contenuti del lotto che poi non entrano nella risposta; il lotto
resta al massimo di 25 e non comprende altre voci dell'archivio.

## Ricerca e completezza

La ricerca usa subito titolo, tag, progetto e corpi già disponibili. Se il
testo è non vuoto, scarica progressivamente le descrizioni dei candidati che
rispettano i filtri correnti di stato/periodo/progetto/tag e visibilità.
Le voci dirty restano visibili, come prima.

La UI distingue elenco completo e ricerca nei corpi ancora parziale. Un
risultato vuoto durante questa fase non è presentato come assenza definitiva.
Gli errori mantengono i risultati e offrono «Riprova ricerca nei testi»;
la singola descrizione offre il proprio retry. Le descrizioni private nascoste
non entrano nel caricamento automatico della ricerca.

Un solo lotto di corpi è in volo fra le sessioni. Una pagina di metadati può
essere letta contemporaneamente a un lotto di corpi, al massimo uno per tipo.
Cambio testo/filtro, periodo, visibilità o vista interrompe i lotti successivi
non più pertinenti; una richiesta già inviata non viene cancellata sul server.
Le risposte di sessioni obsolete non sono applicate alla vista corrente.

La ricerca nei testi può ancora richiedere molte letture: questa tranche non
implementa un indice full text persistente. Cancellare la query ferma le
richieste successive; i corpi già ricevuti restano nella sessione.

## Salvataggi e bozze

Prima di costruire i lotti di scrittura, `saveNotesContinuous` recupera i
corpi originali dei task dirty con contenuto incompleto. Solo dopo il successo
invia il salvataggio normale. Durante la lettura conserva le modifiche più
recenti ai metadati e usa una baseline completa per corpo e formattazione.

Un errore/conflitto ferma l'invio di questa azione e conserva la bozza; non
viene mai usato il placeholder del corpo come contenuto canonico. Il backend
`saveJournalPage` rifiuta esplicitamente blocchi con `contentLoaded: false`
durante la validazione, prima delle scritture. Restano compatibili i client
precedenti che inviano già i corpi e non conoscono il flag.

Le bozze di sessione conservano lo stato di incompletezza, ma non promise,
callback DOM, flag di caricamento o errori temporanei. Quelle recuperate
vengono riconciliate con una lettura versionata senza sostituirne il testo
modificato. Il successo di un salvataggio Google mantiene il significato
precedente; nessuna outbox, nuova persistenza applicativa o modalità offline.

## Diagnostica

Export `gdiary-performance-trace/v1`, ora **measurementVersion 4**. Il flag
numerico `metadataOnly` distingue le letture elenco da quelle complete e gli
eventi `journalNavigation` dell'elenco Task dai precedenti eventi che includevano
anche tutti i corpi. `getJournalContents` è un'operazione distinta, con conteggi
dei record, byte, errori e fasi esistenti, senza esportazione di ID o contenuti.

Non confrontare direttamente il completamento della nuova navigazione Task
con il completamento v3 di tutte le descrizioni. `firstResultMs` continua a
misurare applicazione DOM/nextTick, non paint o tempo di apertura della pagina
HTML Apps Script. Le misure di questa tranche sono locali, non una baseline
autenticata delle prestazioni Google.

## Verifiche

Nuova suite `test:task-deferred`:

- backend: oltre 200 task, pagina metadati senza servizi dei contenuti,
  continuazione, campi assenti, ordine e scope mese/progetto;
- descrizioni pending, rich text, budget con corpi da 100.000 caratteri,
  identità rimaste, errori localizzati e versione cambiata durante la lettura;
- richieste duplicate/non versionate/oltre limite e protezione contro il
  salvataggio di placeholder;
- cache cold/warm e rifiuto di documenti spostati fuori archivio;
- browser: zero richieste corpi all'apertura dell'elenco, apertura di una
  descrizione, titolo/focus/selezione conservati durante l'attesa;
- modifica del corpo dopo costruzione differita dell'editor, salvataggio dopo
  recupero e metadati modificati nuovamente in volo;
- ricerca solo nel corpo, risultati parziali, errore/retry e privacy;
- cancellazione query, cambio vista, bozze ripristinate e conflitti senza invio;
- cinque palette a 320/390 px sulla descrizione aperta.

Il test backend è incluso anche in `npm test`. I test storici di caricamento
progressivo mantengono le risposte complete simulate: verificano la compatibilità
con quel contratto. P82 ora attende anche la fine della ricerca nei corpi prima
di controllare i risultati, coerentemente con l'asincronia dichiarata.
`test:scale` misura anche la variante metadati fino a 50.000 voci.

Superati build, npm test, test:task-deferred, test:release, test:progressive,
test:incremental, test:tracing, test:scale, test:locks e browser P82.
`git diff --check` superato; Index.html e Demo.html rigenerati, staging con
i sei file previsti verificato. Nessuna dipendenza o autorizzazione Google nuova.

## Limiti e prossimo intervento

L'elenco ricostruisce ancora i candidati e legge strutture ausiliarie per
richiesta. Le pagine più grandi riducono le RPC di elenco ma non introducono
un indice dei task o un cursore di sincronizzazione. Anche il `getState` che
può precedere la vista conserva il costo precedente.

Il salvataggio di un task mai aperto può ancora attendere la lettura della
descrizione. L'obiettivo successivo è riuso locale/incrementale con identità
verificata; i controlli del worker Docs e l'indice dei candidati rimangono
pacchetti separati della SPEC-004. Nessuna riduzione in secondi promessa prima
di una misura reale autorizzata.
