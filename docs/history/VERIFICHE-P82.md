# Verifiche P82

Prove locali con backend Apps Script simulato in Demo.html e Chrome headless; richieste HTTPS bloccate. Nessuna prova su account Google o deployment reale.

- Build incorporata, UTF-8, sintassi e sei file Apps Script; suite backend npm test.
- Suite browser: editor note/task e formattazione, salvataggi e conflitti, tag/progetti, ricerca, privacy, riporto checklist, riflessioni, abitudini, sidebar, tipografia, quattro palette e larghezze 320–1440 px.
- P82: Task aperti usa view journal e lo stesso componente; tutte le pagine dei task caricate automaticamente, inclusi 27 task di luglio e voci di ottobre; ricerca di una parola presente solo nel corpo con debounce/focus; ordine emergenza/scadenza; filtro completati; dati privati assenti da risultati e suggerimenti tag.
- P82: modifica su mesi diversi, errore simulato nel secondo mese, conferma del primo e conservazione della seconda bozza, retry riuscito.
- P82: dettaglio e allegati di un task di luglio apribili dalla vista archivio; bozza di nuovo task recuperata dopo reload e riapertura dei filtri.
- P82: preferenza menu persistente nel browser, accesso tramite Filtri task a menu nascosto, ritorno al diario completo, geometria mobile nelle quattro palette.
- Pacchetto: confronto dei file backend non modificati rispetto a P81; esclusione credenziali/dependency e verifica hash di ogni file ZIP.

Il caricamento completo dei task legge anche corpi dei task chiusi per poter filtrare stato e testo senza risultati parziali. Tempi e carico Docs su grandi archivi reali da misurare dopo il deployment. Preferenza menu locale al browser.
