# Sviluppo e verifiche

Modificare frontend/shell.html, frontend/components e CSS; poi `npm run build`. Non usare Index.html come sorgente principale di modifiche dell'interfaccia. Modificare i .gs direttamente per il backend.

La demo usa servizi Google simulati: tutti i test locali devono restare indipendenti dall'archivio reale. Gli accessi HTTPS sono bloccati in molte prove browser. Le suite locali non dimostrano il funzionamento del deployment autenticato.

Comandi:

- `npm ci`: ricrea node_modules dal lockfile.
- `npm run build`: crea Index.html, aggiorna Demo.html e prepara .build/apps-script.
- `npm test`: backend simulato, validazioni, conflitti, cache, ricerca e pipeline.
- `npx playwright install chromium`: installa il browser locale per i test.
- `npm run test:release`: regressioni recenti delle release precedenti alla 2.0.4.
- `npm run test:incremental`: risposte di salvataggio limitate e merge browser senza riletture complete.
- `npm run test:cycle`: design del ciclo, form, bozze/conflitti, riflessione rich, tracker e geometrie nelle quattro palette.
- `npm run test:diary-goals`: promemoria degli obiettivi, trimestre/anno visualizzato, arrivo dei dati con bozze aperte, fallback e geometrie.
- `npm run test:tracing`: diagnostica backend simulata e privacy/export browser.
- `npm run test:e2e`: suite browser storica completa. Non ogni script di tests è incluso in questo comando.
- `node tests/verify-p85-week.cjs`: checkup, salvataggio/riprova, tracker e layout.
- `node tests/verify-p82-tasks.cjs`: task in archivio, privacy e salvataggi parziali.

I test storici mantengono prefissi Pxx anche se la release corrente è 2.0.4. Alcuni producono PNG nella radice o in artifacts; questi output sono esclusi da Git. Non cancellare test perché il numero di fase è precedente alla release attuale.

Per le verifiche visuali controllare warm/sage/slate/dark, desktop e 320/390 px, testi lunghi, focus e allineamento. Scegliere test pertinenti al cambiamento, senza introdurre modifiche ai dati reali.

Il file VERIFICA-REPOSITORY.md registra le verifiche effettivamente eseguite su questa copia. La documentazione in history descrive controlli precedenti, non risultati appena ottenuti.

## Raccogliere una baseline delle prestazioni

In Impostazioni attivare Diagnostica prestazioni, poi ricaricare per misurare
anche l'avvio. Eseguire le operazioni che risultano lente: cambio mese,
ricerca, apertura nota, salvataggio pagina, settimana e abitudini. Tornare in
Impostazioni ed esportare le misure prima di chiudere o ricaricare la scheda.
L'export JSON non contiene contenuti del diario; confrontare una lettura a
freddo con una ripetuta e includere eventuali errori o salvataggi parziali.
Disattivare il tracing al termine. Limiti e significato delle metriche sono
descritti nella [SPEC-001](specs/001-tracing-prestazioni.md).

Con measurementVersion 2 raccogliere R1 e poi R2 subito dopo sulla stessa
pagina; R3 dopo una normale modifica e sincronizzazione scelta dall'utente.
Esportare prima di ricaricare, annotando separatamente quali operazioni sono
state eseguite. Ripetere in sessioni comparabili. I miss ripetuti non provano
da soli una scadenza: il TTL configurato è già sei ore e gli elementi possono
essere invalidati o non essere stati memorizzati.

Facoltativamente eseguire una volta «Confronta cache get/getAll» dalle
impostazioni, al termine delle normali letture. L'esperimento usa al massimo
25 chiavi sincronizzate del mese corrente e non popola la cache. Inviare il
nuovo export per l'analisi; mantenere distinte le metriche del benchmark dai
tempi delle normali operazioni. L'export conserva solo le ultime 200 misure.
