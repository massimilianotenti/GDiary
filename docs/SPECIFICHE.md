# Specifiche funzionali correnti

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
