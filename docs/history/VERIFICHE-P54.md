# Verifiche P54

verify-p54.cjs: creazione/modifica/apertura pendente senza chiamate Docs, ultima versione, stili, conflitto senza sovrascrittura, sblocco con conferma e copia Docs.
verify-p54-edges.cjs: contenuti lunghi segmentati, cancellazione prima del trigger, due aggiornamenti stesso documento con una apertura, errore Docs e ritentativo, idempotenza requestId.
verify-p54-panel.cjs: attese/completamenti, endpoint sola lettura senza lock/Docs, scrittura della sola riga variata in coda, sintassi Index/Demo.
Regressioni: descrizioni P53, microazioni P35, letture senza lock P39, scaduti P48.

Tutte prove locali con simulatore. Browser/deployment, quote, latenza effettiva e concorrenza reale ancora da verificare.

Script P54 inclusi in tests; richiedono Node.js, ad esempio node tests/verify-p54.cjs. Simulazione locale senza accesso a Drive/Sheets reali.
