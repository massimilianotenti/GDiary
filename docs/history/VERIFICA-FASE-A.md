# Verifica fase A — 4 ottobre 2026

Fase ancora aperta. Nessuna nota originale modificata. Nota cloud di prova: [TEST FASE A] Verifica formattazione 4 ottobre.

Prima del nuovo deployment: le viste principali si aprivano, ma la formattazione della nota di test non rimaneva dopo il salvataggio. Il comportamento suggeriva un backend precedente.

Dopo il nuovo deployment: salvataggio bloccato da falso conflitto della formattazione. Individuato un confronto JSON sensibile all’ordine delle proprietà; riprodotto localmente e corretto in P15. La verifica cloud P15 è ancora da eseguire.

Tempi cloud precedenti: creazione nota 5993 ms, di cui backend 4752 ms (Docs e riferimenti 3924 ms); modifica nota 6871 ms, di cui letture finali 1699 ms. Questi tempi non rappresentano una misura della versione P15.

Test locali: roundtrip degli stili, campi JSON riordinati, conflitti reali, marcatori e link; gestione degli errori intercettati dall’interfaccia. Passati. Restano da completare verifica cloud degli stili, prova mobile e percorsi di salvataggio giornaliero/settimanale.

## Verifica successiva P15
Il deployment P15 è visibile in una nuova sessione. Salvataggio riuscito senza falso conflitto, ma il dettaglio riletto mostra stili normali. Il documento originale, aperto in sola osservazione, mostra correttamente grassetto e corsivo: il problema è circoscritto alla lettura. Correzione P16 usa getter specifici per gli stili. Test locali passati; verifica cloud P16 ancora pendente.

## Verifica cloud P16
Deployment P16 confermato il 4 ottobre 2026. La nota di test rilegge correttamente grassetto e corsivo già presenti in Docs. Un nuovo salvataggio seguito da chiusura e riapertura conserva entrambi gli stili. La sottolineatura applicata nell’editor (tag u verificato prima del salvataggio) non compare nella risposta riletta: caso ancora aperto, causa non isolata. Nessuna nota originale modificata.

Tempi: getState 2380 ms / letture server 583 ms; dati comuni 2050 ms / server 974 ms; saveNoteText 8098 ms / letture finali server 1357 ms. Il campo server del salvataggio misura state_ e non tutta la scrittura del Doc: non attribuire il resto solo alla rete.

Prova visiva: verifica-p16-stili.png. Fase A ancora aperta; non dichiarare verificata l’intera formattazione.

## Correzioni P17 preparate
Ordine di scrittura link/stili corretto; colori standard dei link accettati; stili avanzati protetti. Salvataggio senza rilettura completa della vista, con risposta delta della sola nota e misure per ciascuna fase. Due aperture Docs durante il salvataggio (lettura iniziale e ricontrollo del testo), nessuna riapertura per la risposta. Le durate locali simulate non sono prestazioni cloud.

Passati test-note-save-p17, test-rich, test-rich-getters, test-save-delta, test-phase-a-errors, test-week-reads, test-delete-note e test-v3-backend. Nella demo, via browser: creazione con sottolineatura e 18 pt; modifica con grassetto/corsivo e riapertura che conserva gli stili; giornata e checkup salvati, navigazione e riapertura con testi conservati. A 390 px il corpo della vista Giorno non deborda; il checkup conserva i testi. Dialogo link P17 verificato su mobile: selezione conservata, creazione e riapertura del link sottolineato; modifica e riapertura su desktop conservano anche grassetto, corsivo e 18 pt. Elenco numerato a due voci riaperto in una sola lista (1, 2). Tutte le altre viste e il changelog P17 si aprono senza errori nella demo. Test cloud P17, tempi reali e salvataggi giornata/checkup sul cloud ancora da eseguire. Nessuna modifica cloud durante questo intervento.

Riferimenti tecnici consultati: [attributi Docs e stile automatico dei link](https://developers.google.com/apps-script/reference/document/attribute), [raggruppamento ListItem](https://developers.google.com/apps-script/reference/document/list-item#setListId(ListItem)). La correzione di ordine link/stili è verificata in simulazione, non ancora sul servizio reale.

## Verifica cloud P17 — 4 ottobre 2026
Interfaccia P17 e nuova risposta del backend confermate. Modificata solo la nota [TEST FASE A] già presente: sottolineatura e 18 pt applicati insieme a grassetto e corsivo. Salvataggio riuscito, chiusura e riapertura dal Google Doc: tutti e quattro gli stili confermati (font-weight 700, italic, underline, 24 px = 18 pt). Nessuna nota originale modificata.

Tempi cloud: getState 2073 ms (server 691 ms); dati comuni 2901 ms (server 1873 ms); saveNoteText 4983 ms, backend totale 3516 ms. Fasi salvataggio: lock 88, lettura Sheets 916, lettura Docs 937, controllo conflitti 620, scrittura Docs 139, scrittura Sheets 7, estratto 325, risposta 1, finalizzazione 483 ms. Il singolo salvataggio è più breve degli 8098 ms misurati su P16, ma non costituisce un benchmark ripetuto.

Prova visiva: verifica-p17-cloud.png. Problema della sottolineatura risolto sul cloud per questa nota. Link/elenchi verificati localmente in P17; test specifici cloud e salvataggi giornata/checkup cloud restano da completare. Nessun altro rilascio necessario per queste verifiche.
