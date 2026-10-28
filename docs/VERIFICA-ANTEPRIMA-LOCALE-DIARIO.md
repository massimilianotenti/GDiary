# Anteprima locale del diario — pacchetto 7, seguito parziale

Sviluppo locale del 28 ottobre 2026, successivo al commit 49bfa54.
Nessun deploy, accesso Google o copia di dati reali. Applicazione online invariata.

## Modifica implementata

`frontend/journal-read-cache.js` adatta una pagina ordinaria di getJournalPage
al repository: separa metadati e contenuti, conserva ordine/identità/versioni,
formattazione e flag del corpo, e registra la copertura nella stessa transazione.
Una lettura `readRemoteView` ricostruisce appartenenza alla pagina, metadati e
corpi in una singola transazione readonly. Non usa una scansione dell'archivio:
legge al massimo 25 coppie per ID. Corpo mancante o versione diversa causano
un miss, mai un corpo vuoto presentato come completo.

La chiave include mese, progetto e cursore; la copertura è di una sola pagina,
non dell'intero mese o archivio. Si conserva l'ultima pagina acquisita. Qualsiasi
successivo lotto remoto invalida conservativamente la copertura attraverso la
revisione locale. I record delle pagine precedenti non vengono cancellati:
compattazione e retention restano futuri. Nessuna nuova versione dello schema
IndexedDB: il descrittore versionato è in archiveMeta.coverage.journalPage.

La revisione CAS viene acquisita PRIMA della richiesta remota con un ticket
monouso legato allo scope. Una risposta tardiva non può ottenere una revisione
nuova dopo un salvataggio e sovrascriverlo. L'adattatore rifiuta errori dei corpi,
risposte parziali/malformate, cursori incoerenti, task metadata-only e token delle
fotografie Task. Non conserva tracing o ricevute temporanee. Nessun feed server
è stato aggiunto; la revisione è soltanto locale.

Il loader avvia la richiesta Google e la lettura della pagina locale in
concorrenza, dopo la breve lettura del checkpoint locale. Un risultato remoto
non aspetta una lettura della pagina bloccata. La preparazione del checkpoint
ha un budget di 250 ms; se scade, la RPC
parte senza usare o aggiornare la cache per quella richiesta. La preparazione
tardiva è ignorata. Il budget va collaudato nel contenitore Google.
Distingue onCached (anteprima obsoleta con data) da onRemote (risposta canonica),
ignora richieste superate e cambi identità, e ripiega sulla RPC ordinaria quando
la cache non è disponibile. La persistenza non blocca il rendering remoto;
un fallimento dello storage non trasforma né annulla una conferma Google.
La risposta viene copiata prima di consegnarla alla UI, affinché eventuali
sovrapposizioni delle bozze non contaminino la copia canonica.

## Collegamento al diario, ancora disabilitato

La shell usa il loader per getJournalPage. journalPageCache resta null e non
ha un inizializzatore di produzione: nessun accesso IndexedDB o RPC aggiuntiva
all'avvio. Il client identità continua a restituire cacheReady:false.
Solo i test iniettano un repository con archivio e dati interamente inventati.

Quando iniettata, la copia viene mostrata come anteprima di sola lettura,
marcata con data e verifica in corso. Non aggiunge voci alla sessione canonica,
editor o pulsanti di salvataggio. Mostra titoli ed estratti testuali con la
formattazione già supportata da renderExcerpt, massimo 200 caratteri; le note
private sono sempre escluse dall'anteprima. Il diario verificato mantiene il
normale comportamento di privacy. La risposta Google sostituisce l'anteprima
e segue il merge preesistente, che conserva le bozze della scheda e le loro
versioni di partenza. Un errore remoto conserva l'anteprima già visualizzata,
segnalandola come non verificata; non abilita salvataggi offline.

La prova manuale sintetica del repository in diagnostica verifica adesso
anche la ricostruzione della pagina dopo chiusura/riapertura, esponendo solo
il booleano viewReopened. Non legge la pagina del diario aperto.

## Verifiche e limiti

Nuovo `npm run test:local-views`: Demo.html, server HTTP locale, Chromium e
profilo temporaneo. Prove su chiave mese/progetto/cursore, pagina vuota,
versioni/CAS, ticket non falsificabili o riutilizzabili, abort dopo successo di
una richiesta, identità diversa, risposte malformate, riavvio browser,
formattazione Unicode e conservazione delle bozze dopo aggiornamenti/removal.
Loader: preparazione checkpoint bloccata con fallback entro budget, eccezioni
storage sanitizzate che non annullano la risposta remota, RPC sospesa, anteprima prima del risultato remoto, navigazione annullata,
revoca scope, errore remoto, fallback storage, lettura cache lenta e risposta
remota rapida, sovrapposizione UI che non contamina la copia canonica.
Shell reale con cache sintetica: anteprima senza editor/azioni/HTML eseguibile,
note private escluse, sostituzione dopo risposta e bozza di sessione preservata.
La copia applicativa gdiary-local-v1 non viene creata.

Superati build, npm test, test:local-views, test:repository, test:identity,
test:release, test:progressive e test:tracing. Index.html e Demo.html rigenerati,
bootstrap UTF-8, ROOT_FOLDER_ID segnaposto e sei file Apps Script preservati.

Il pacchetto 7 resta parziale: mancano cataloghi/riflessioni comuni, più pagine,
riapertura completa delle viste e caricamento iniziale senza RPC bloccanti.
Le risposte legacy non portano ancora una prova dello scope archivio/principale:
prima della copia reale serve vincolare richiesta e risposta all’identità
verificata, oltre ai controlli di revisione locale qui implementati.
Mancano consenso e gestione della copia reale, collaudo iframe/browser (pacchetto
2) e collegamento della revoca all'intero ciclo di vita della UI. Non è una
funzionalità offline né una riduzione della latenza Google già dimostrata.
Task e altre viste continuano con il percorso remoto consueto.
