# Verifica design Obiettivi e abitudini — 23 ottobre 2026

SPEC-003 implementata e verificata localmente su Demo.html con dati simulati.
Deploy successivamente richiesto ed eseguito: v2.0.4 / Apps Script 71,
stesso URL e accesso privato. Nessun setupDrive o modifica ai dati reali.

## Risultato

Superficie unica con quattro sezioni: obiettivi, azioni ricorrenti, tracker
della settimana e giornata. Titoli, sezioni, icone e colori riprendono il
diario e la settimana. Eliminati pannello laterale, accessi duplicati alla
creazione e doppio collegamento al checkup. Tracker completo su desktop,
scorrimento della sola tabella su schermi piccoli. Il click sulla cella porta
il focus all'intestazione della giornata selezionata.

Riflessione con editor condiviso, comandi di formato tramite Aa e payload
limitato ai campi modificati: intenzione e altri campi non vengono riscritti.
Bozze separate per form in memoria della scheda, con versione di partenza:
salvare un altro form non perde il testo e non aggira i conflitti. Nessuna
persistenza offline nuova. Registrazioni bloccate da bozze o fallite tornano
allo stato locale confermato; il focus viene ripristinato sui controlli.

## Verifiche

- Build: Index e Demo rigenerati, bootstrap UTF-8 e staging di sei file.
- npm test: suite backend, dati, conflitti, cache e pipeline.
- test:cycle: creazione/modifica obiettivi, risultato numerico, creazione e
  modifica abitudini con frequenza libera, icona, microazioni, stati,
  archiviazione e registrazioni storiche conservate.
- test:cycle: due bozze indipendenti sullo stesso obiettivo, salvataggio di
  una con ripristino dell'altra e rifiuto della versione obsoleta; conferma
  e annullamento dello scarto al cambio trimestre; ciclo senza obiettivi.
- test:cycle: errore e retry della riflessione, conservazione dell'intenzione
  formattata e di un campo estraneo; cambio pratica bloccato senza perdere la
  bozza o lasciare una checkbox diversa dallo stato confermato.
- test:cycle: selezione giorno dal tracker e focus, collegamento alla settimana,
  geometrie 320/390/768/1000/1440 px in warm/sage/slate/dark; form espansi
  controllati anche a 320/390/768/1440 px. Nessun overflow della pagina;
  tracker completo da 1000 px nella configurazione desktop verificata.
- test:release e test:incremental: regressioni di preferenze, sezioni, task
  settimanali e salvataggi incrementali.
- P80 stati abitudini, P75 riflessioni, P85 settimana e P87 progetti browser:
  verifiche dei percorsi condivisi.

Screenshot locali in artifacts/cycle-design-desktop.png e
artifacts/cycle-design-mobile.png, esclusi dal repository; confronto anche
con le immagini della Demo precedente. Browser avviato fuori sandbox perché
Chromium al suo interno è bloccato.

## Limiti

Verifiche automatiche locali e ispezione visiva; nessun collaudo dei salvataggi
reali del nuovo design, nessuna misura delle latenze reali. Percorsi da tastiera
coperti per focus del tracker e protezione bozze, senza collaudo manuale con
screen reader. Non introdotta persistenza delle bozze del ciclo dopo chiusura
o ricaricamento: resta la protezione beforeunload della scheda.

## Pubblicazione autorizzata — Apps Script 71

Prima del deploy rieseguiti build, npm test, test:cycle, test:release e
test:incremental: tutti positivi. Superati anche i controlli aggiuntivi della
procedura di pubblicazione. Backup dei sei sorgenti remoti fuori repository:
HEAD remoto e versione 70 coincidenti con la base Git, nessuna divergenza.
ROOT_FOLDER_ID ricavato dal backup e passato solo tramite ambiente allo
staging, senza modificare o stampare il segnaposto nei sorgenti condivisi.
Push di sei file e aggiornamento del deployment esistente alla versione 71,
descrizione «GDiary v2.0.4 - design Obiettivi e abitudini SPEC-003».
Verifica remota successiva: sei sorgenti identici allo staging, versione 71
attiva e manifest MYSELF/USER_DEPLOYING conservato.

Verifica autenticata successiva in Chrome Windows dedicato, in sola lettura:
apertura del diario, nuova pagina con quattro sezioni e superficie unica,
tracker con nove colonne completo senza overflow desktop, navigazione alla
settimana e ritorno al ciclo riusciti. Nessuna bozza pendente. Coda prima e
dopo: zero pending, zero errori, 67 completate. Nessun salvataggio reale o
contenuto esportato durante questa verifica. Il collaudo reale dei form di
salvataggio del nuovo design resta distinto da questa prova di navigazione.
