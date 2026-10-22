# Sviluppo e verifiche

Modificare frontend/shell.html, frontend/components e CSS; poi `npm run build`. Non usare Index.html come sorgente principale di modifiche dell'interfaccia. Modificare i .gs direttamente per il backend.

La demo usa servizi Google simulati: tutti i test locali devono restare indipendenti dall'archivio reale. Gli accessi HTTPS sono bloccati in molte prove browser. Le suite locali non dimostrano il funzionamento del deployment autenticato.

Comandi:

- `npm ci`: ricrea node_modules dal lockfile.
- `npm run build`: crea Index.html, aggiorna Demo.html e prepara .build/apps-script.
- `npm test`: backend simulato, validazioni, conflitti, cache, ricerca e pipeline.
- `npx playwright install chromium`: installa il browser locale per i test.
- `npm run test:release`: regressioni recenti 2.0.1–2.0.3.
- `npm run test:tracing`: diagnostica backend simulata e privacy/export browser.
- `npm run test:e2e`: suite browser storica completa. Non ogni script di tests è incluso in questo comando.
- `node tests/verify-p85-week.cjs`: checkup, salvataggio/riprova, tracker e layout.
- `node tests/verify-p82-tasks.cjs`: task in archivio, privacy e salvataggi parziali.

I test storici mantengono prefissi Pxx anche se la release corrente è 2.0.3. Alcuni producono PNG nella radice o in artifacts; questi output sono esclusi da Git. Non cancellare test perché il numero di fase è precedente alla release attuale.

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
