# Specifiche funzionali correnti

Il bootstrap sperimentale del mese limita metadati e storico comune alla
vista, conservando tutti i Task per la pianificazione e tutti i cataloghi
e le impostazioni di privacy. La copertura comune è dichiarata per mese e
giorno corrente, così Settimana e Abitudini richiedono i rispettivi dati.
La vista Task conserva il contratto comune completo. IndexedDB v11 migra
con indici additivi; corpi, checkpoint, bozze e outbox restano atomici.
[Contratto e limiti](VERIFICA-BOOTSTRAP-COMUNI-PERIODO.md).

Il percorso sperimentale apre ora il diario dalla copia completa del consumer
snapshot/feed dopo la verifica identità, senza attendere le RPC di vista.
Checkpoint concluso, privacy, bozze e outbox vengono verificati nella lettura
atomica; aggiornamenti e retry conservano le bozze. Le copie parziali restano
sul precedente fallback. [Contratto e limiti](VERIFICA-BOOTSTRAP-LOCALE.md).

Nel percorso locale sperimentale, l'apertura della prima pagina recupera anche
le continuazioni disponibili (massimo 16 pagine), senza RPC aggiuntive.
La copia resta datata e incompleta fino alla verifica remota di ogni pagina;
bozze e versioni originali restano protette. Non è un bootstrap offline né
una fotografia coerente del mese. [Verifica e limiti](VERIFICA-PAGINE-LOCALI-DIARIO.md).

Nel percorso locale sperimentale, una prima pagina del diario già conservata può essere modificata attraverso l'outbox durante la lettura remota; la vista segnala la copertura parziale e conserva la versione per il controllo dei conflitti. [Verifica](VERIFICA-PAGINE-LOCALI-DIARIO.md).

Dietro la capability locale disattivata, Settimana e Abitudini possono mostrare un'anteprima datata e non modificabile mentre si verifica la risposta remota. [Verifica e limiti](VERIFICA-PAGINE-LOCALI-DIARIO.md).

## Intento

Un diario che rende semplice scrivere, ritrovare e portare avanti attività. Tipografia e interazioni coerenti hanno priorità rispetto all'aggiunta di viste duplicate. Ispirazione visiva: sobrietà di Agenda e diario cartaceo, senza imitare la pagina cartacea in modo letterale.

## Diario e task

- Diario continuo organizzato per giorno e mese; caricamento progressivo delle voci.
- Dalla versione Apps Script 72: in cima al diario, prima delle
  giornate, titoli e descrizioni complete degli obiettivi del trimestre del
  mese visualizzato. Testo sempre aperto, conservando gli a capo; descrizione
  facoltativa e nessun riquadro se il trimestre non contiene obiettivi.
  Presente anche nel diario di progetto con tutti gli obiettivi del trimestre;
  escluso dalla vista Task, che può riguardare l'intero archivio. Nessuna
  copia dei dati o modifica automatica del diario.
  Dalla versione 73 compare accanto al titolo l'icona scelta per ciascun
  obiettivo, usando il catalogo esistente e rispettando «Nessuna icona».
  Dalla versione 75 il promemoria usa una tonalità propria, distinta dalle fasce
  giornaliere, con bordo perimetrale e accento laterale più marcato. Colori
  coordinati per testo e icone nelle cinque palette, senza cambiare i dati.
- Note con titolo facoltativo/automatico e task con titolo esplicito; descrizioni modificabili nello stesso editor.
- Corpo con formattazione, checklist, link, elenchi, titoli e codice; preservare testo e struttura durante l'editing.
- Progetti facoltativi e multipli; tag suggeriti dal catalogo già usato, con possibilità di crearne altri.
- Titolo e corpo sulla stessa asse tipografica; tag leggermente spostati a sinistra; proprietà e comandi secondari discreti.
- Descrizione task: Mostra/Nascondi/Aggiungi. Note e sezioni: Espandi/Comprimi. Freccia orientata secondo lo stato effettivo.
- Anteprima compressa con invito esplicito a continuare quando c'è altro testo.
- Stato task: open, doing, done, cancelled. Importanza: normal, urgent, emergency.
- Data di annotazione, giorno pianificato, intervallo di lavorazione e deadline sono concetti distinti.
- «Task aperti» è una scorciatoia facoltativa alla vista filtrata del diario, non un editor indipendente. Filtri: stato, periodo, progetto, tag, testo e ordinamento.
- Dalla versione Apps Script 67: i task vengono mostrati pagina per pagina. Indicatore di caricamento e conteggi visibili segnalano risultati parziali; ricerca e ordinamento si aggiornano fino alla fine. Errori successivi conservano voci e bozze, con retry dal cursore fallito.
- Seguito locale SPEC-004: la vista Task carica prima i metadati a pagine fino
  a 200, poi le descrizioni all'apertura o quando necessarie alla ricerca nei
  corpi e al salvataggio. Ricerca esplicitamente parziale fino al recupero dei
  contenuti pertinenti, con retry. Le modifiche ai metadati fatte durante la
  lettura restano conservate; un corpo non caricato non è un corpo vuoto.
  Il diario normale mantiene il caricamento completo a pagine da 25.
- Seguito locale: le pagine successive dell'elenco Task riusano una fotografia
  temporanea dei metadati. Se i dati cambiano o la cache non è più disponibile,
  il caricamento si dichiara parziale e offre «Aggiorna elenco Task», mantenendo
  bozze e identità. Il fallback senza fotografia completa comunque il caricamento.
- Limiti correnti del salvataggio diario: titolo massimo 2.000 caratteri; corpo massimo 100.000; batch massimo 25 blocchi. Non sono obiettivi editoriali per la lunghezza del testo.

## Riflessioni quotidiane

Modalità essenziale e dettagliata. Inizio giornata: intenzione, gratitudine, area della vita, piccolo gesto. Fine giornata: riflessione ampia prima degli altri campi, momento significativo, emozioni, difficoltà/bisogni, apprendimento. Aree ed emozioni hanno scelte rapide e testo personale. Campi affiancati con righe finali allineate; riquadro di focus quando si scrive. Possibilità di riportare checklist precedenti senza duplicare gli elementi già riportati.

Preferenza locale di apertura giornaliera: automatica compatibile con il comportamento precedente, compressa o estesa. Una scelta manuale prevale durante la sessione.

## Settimana e checkup

Navigazione lunedì–domenica, focus e tre priorità; quattro campi di revisione, energia 1–5 e stato In corso/Completato. Il salvataggio delle riflessioni è esplicito. Tracker abitudini su sette giorni; accesso alla giornata per la registrazione.

Task in cinque gruppi compressi: scadenze della settimana, arretrati precedenti, annotati nella settimana ancora aperti, programmati e completati nella settimana. Ogni gruppo mostra conteggio e massimo cinque titoli; lo stesso task può appartenere a più gruppi. Completati calcolati dalla data effettiva in Europe/Rome; programmati dal giorno pianificato o sovrapposizione con intervallo di lavorazione. I task aperti escludono done/cancelled.

«Rivedi nel diario» carica tutti i task dell'archivio e applica il gruppo e la settimana; non limita la ricerca al mese di annotazione. «Torna al checkup» conserva la settimana di partenza. La sezione Note della settimana esclude i task.

## Abitudini, privacy e affidabilità

Obiettivi e abitudini collegate, registrazioni giornaliere e microazioni. Completamento coerente con le microazioni previste. Preferenza locale indipendente per apertura compressa/estesa delle abitudini.

SPEC-003 pubblicata nella versione Apps Script 71: «Il mio ciclo» usa una superficie unica,
con sezioni per obiettivi, azioni, tracker settimanale e giornata selezionata.
Stili coerenti con diario e settimana; form di creazione/modifica espandibili,
un solo accesso per tipo e un solo collegamento al checkup. Le bozze dei form
restano nella scheda con la versione iniziale anche salvando un altro form;
la riflessione conserva la formattazione e non riscrive l'intenzione.
La versione 71 conserva URL e accesso privato del deployment esistente.

Tag privati e modalità di visibilità devono essere rispettati in voci, conteggi, anteprime, filtri e recupero bozze. I salvataggi su più mesi possono riuscire parzialmente: conservare i blocchi falliti per ritentare. Non sovrascrivere silenziosamente modifiche concorrenti o formattazione Docs non supportata.

Cinque palette pubblicate (Carta calda, Salvia, Blu ardesia, Scuro e Prugna).
Prugna, aggiunta nella versione Apps Script 74: lavanda chiaro, carta quasi bianca e
accento viola scuro. Scelta in Impostazioni → Aspetto, anteprima immediata e
preferenza conservata solo nel browser. Il cambio palette non modifica testo,
formattazione o bozze. Layout adattivo; verificare anche 320 e 390 px. Il catalogo utente corrente è in Changelog.html (32 funzionalità consolidate).

## Diagnostica prestazioni

Modalità locale facoltativa in Impostazioni, disattivata inizialmente. Raccoglie
fino a 200 eventi nella memoria della scheda, esportabili come JSON senza
contenuti del diario o identificativi dell'archivio. Include chiamate remote,
errori, batch di salvataggio e rendering. La preferenza resta nel browser;
le misure si cancellano ricaricando, disattivando o con il comando dedicato.
Vedere [SPEC-001](specs/001-tracing-prestazioni.md) per copertura e limiti.

Sviluppo locale SPEC-004: il report usa measurementVersion 4, con tempi di
attesa/occupazione lock e conteggi del lettore Sheets. A tracing attivo è
disponibile una prova manuale della memoria locale con dati fittizi, rapporto
esportabile, pulizia e richiesta di conservazione separata. La prova non
memorizza contenuti del diario e non cambia il salvataggio applicativo.
Il flag numerico `metadataOnly` distingue letture/navigazione dell'elenco
Task da quelle complete; `getJournalContents` misura le letture differite.

## Ricerca archivio concorrente — sviluppo locale SPEC-004

La ricerca verifica la revisione dei lotti e delle fonti Docs senza mantenere il lock globale durante le letture remote. Se l’archivio cambia o non è verificabile, i risultati accumulati vengono scartati e compare «Riprova ricerca». Documenti non verificati producono risultati esplicitamente parziali. Il browser continua ad attendere il ciclo di ricerca; non è ricerca locale. [Verifica e limiti](VERIFICA-RICERCA-SENZA-LOCK-LUNGO.md).

## Sincronizzazione a piccoli lotti — sviluppo locale

Sincronizza ora può completare un sottoinsieme delle operazioni e lasciare il resto al passaggio successivo. L’interfaccia distingue archivio occupato, progresso confermato e lavoro rimasto; i testi sono già durevoli su Sheets. [Verifica e limiti](VERIFICA-WORKER-LOTTI-PICCOLI.md).

## Verifica identità — sviluppo locale

La diagnostica offre una verifica manuale dell’identità dell’archivio prima della futura copia locale. Espone soltanto l’esito; non salva il diario nel browser e non mostra email o identificativi. [Dettagli](VERIFICA-IDENTITA-ARCHIVIO.md).


## Fondamenta repository locale (disabilitate sui dati reali)

Schema, transazioni e prova sintetica sono implementati; nessuna vista usa
ancora la copia locale. Contratto e limiti in
[VERIFICA-REPOSITORY-LOCALE](VERIFICA-REPOSITORY-LOCALE.md).


Seguito del pacchetto 7: [adattatore e anteprima locale del diario](VERIFICA-ANTEPRIMA-LOCALE-DIARIO.md)
implementati dietro interruttore spento. Ultima pagina ordinaria, lettura atomica,
preview distinta dalla risposta canonica; copia reale e riapertura completa
ancora disabilitate.


Seguito del pacchetto 7: [dati comuni nella copia locale](VERIFICA-DATI-COMUNI-LOCALI.md)
implementati dietro interruttore spento. Cataloghi e slice del diario con
copertura esatta e lettura atomica per ID; anteprime pagina/periodo indipendenti.
Riapertura completa, bootstrap coerente e copia reale restano futuri.


Seguito del pacchetto 7: [indice limitato a 16 pagine del diario](VERIFICA-PAGINE-LOCALI-DIARIO.md)
implementato dietro interruttore spento, con lettura atomica mirata e anteprima
anche delle continuazioni. Sostituisce il solo descrittore dell'ultima pagina;
non costituisce una fotografia remota completa o un editor offline.


Pacchetto 8 avviato: [nucleo dei commit recuperabili](VERIFICA-NUCLEO-COMMIT-RECUPERABILI.md)
implementato e verificato con adapter sintetico e fault injection. Non è ancora
collegato a Sheets, API legacy o repository; feed/operazioni reali disabilitati.
Versioni commit-N interne al prototipo, nessuna modifica agli updatedAt esistenti.


Seguito del pacchetto 8: [persistenza a frammenti su due fogli dedicati](VERIFICA-PERSISTENZA-COMMIT-SHEETS.md)
implementata e verificata sui mock, con pubblicazione separata e lookup per chiave.
Nessuna attivazione o provisioning reale; writer/lettori legacy ancora scollegati.
Il budget di storico richiede compattazione prima di un uso continuativo.

Seguito del pacchetto 8: [primo writer interno delle riflessioni giornaliere](VERIFICA-WRITER-GIORNALIERO-CANONICO.md)
implementato con snapshot completi, versioni canoniche, retry/conflitti e
lettore con recupero. È una componente server verificata sui mock; non
introduce nuove funzioni nell'interfaccia o salvataggi offline.

Seguito del pacchetto 8: [ponte Days e API compatibili](VERIFICA-MIGRAZIONE-GIORNI.md)
verificato sulla Demo con iniezione sintetica. Mantiene le bozze pre-migrazione,
salvataggi parziali, formattazione ed esiti per data; le letture complete e per
periodo usano lo stesso routing. L'interruttore server resta null, senza
migrazioni automatiche o nuove opzioni dell'interfaccia.

Seguito: [controllo della capacità e compattazione dei riferimenti](VERIFICA-CAPACITA-COMMIT.md)
implementati come servizi interni, verificati sui mock. Rifiuto prima del
prepare se manca il budget; manutenzione esplicita senza perdita di dati
canonici, ricevute o feed. Nessuna nuova opzione utente o pulizia automatica.

Seguito: [controller Days persistente](VERIFICA-CONTROLLER-ROUTING-GIORNI.md)
verificato sulle fixture: riapertura senza iniezione in memoria, binding
autorizzato e modalità readOnly che mantiene i dati canonici. Nessuna nuova
opzione utente o attivazione reale; rollback verso vecchi deployment privo
di controller non supportato.

Seguito: [percorso Days attivo collaudato nel browser locale](VERIFICA-BROWSER-ROUTING-GIORNI.md).
Bozze, conflitti, reload, ACK persi/malformati e readOnly verificati con dati
inventati. Migliorato il messaggio di sola lettura, mantenendo le bozze.
Nessuna registrazione reale, nuova modalità offline o attivazione del manifest.


Seguito del pacchetto 8: [writer canonico interno Weeks](VERIFICA-WRITER-SETTIMANALE-CANONICO.md)
con snapshot completi e recupero verificato sulle fixture. SaveWeek e letture
applicative restano legacy; ponte, controller e collaudo browser ancora aperti.


Seguito Weeks: [ponte e lettori coerenti](VERIFICA-MIGRAZIONE-SETTIMANE.md) e
[controller persistente](VERIFICA-CONTROLLER-ROUTING-SETTIMANE.md) verificati
sulle fixture. Days e Weeks condividono il registro con binding verificato;
modalità readOnly per dominio e nessuna registrazione reale. Collaudo browser
Weeks e restante matrice delle mutazioni ancora aperti.


Seguito: [collaudo browser Weeks attivo](VERIFICA-BROWSER-ROUTING-SETTIMANE.md)
verificato con UI reale su server sintetico. Bozze per settimana nella scheda,
versione iniziale conservata, ACK validato prima del merge ed eventi tardivi
conservati; nessuna attivazione Google o capacità manifest.


Seguito HabitLogs: [writer canonico](VERIFICA-WRITER-REGISTRAZIONI-CANONICO.md),
[planner puro](VERIFICA-PLANNER-REGISTRAZIONI.md) e
[ponte con lettori coerenti](VERIFICA-MIGRAZIONE-REGISTRAZIONI.md) implementati
sulle fixture. Checklist storica e dipendenze dei cataloghi catturate nei piani;
setHabitLog instradato solo con iniezione sintetica, controller persistente
e browser attivo ancora successivi. Nessuna attivazione reale o nuova RPC.


Seguito HabitLogs: [controller persistente](VERIFICA-CONTROLLER-REGISTRAZIONI.md)
e [browser attivo locale](VERIFICA-BROWSER-REGISTRAZIONI.md) verificati. Binding
esplicito dei tre fogli applicativi allo stesso registro Days/Weeks, modalità
persistenti per dominio, ACK confrontato con identità/checklist richieste prima
del merge. Focus e bozze del diario conservati. Nessuna nuova RPC o outbox,
registrazione reale ancora assente; feed completo e altre mutazioni aperti.


Seguito Goals/Habits: [writer canonico](VERIFICA-WRITER-CATALOGHI-CANONICO.md) e
[planner delle API](VERIFICA-PLANNER-CATALOGHI.md) verificati solo sulle fixture,
con lotti atomici, dipendenze del goal e identità delle microazioni conservate.
[Composizione delle letture tra controller](VERIFICA-COMPOSIZIONE-LOCK-ROUTING.md)
supportata senza consentire mutazioni annidate. API/cataloghi applicativi ancora
legacy: ponte, lettori coerenti, controller e browser restano da completare.
Nessuna nuova RPC o attivazione reale.
