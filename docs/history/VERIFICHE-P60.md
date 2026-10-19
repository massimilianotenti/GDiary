# Verifiche P60 — 14 ottobre 2026

Build Vite completata: Vue e tema incorporati in Index.html; nessun nuovo servizio o caricamento esterno del framework. Backend e manifest invariati rispetto a P59. Staging sempre limitato ai sei file Apps Script.

Test backend e build superati: validazione prima delle scritture, note su più righe, task con titolo/descrizione e date, idempotenza, conflitti, salvataggio in coda senza Docs e integrità dei file preparati. Release clasp provata con CLI simulata: nessuna pubblicazione reale.

Test browser superati: creazione/modifica di note e task, formattazione, pianificazione/scadenza, check, progetti/tag, bozze, compressione, salvataggio, cambio vista senza falso avviso, cancellazione e cache. Editor DOM/focus conservati aggiungendo voci; ricerca e ripristino dei comandi nelle viste precedenti verificati.

P60 aggiunge prove su stato reattivo delle modifiche, conteggio dei task aperti, Ctrl+K/Escape, chiusura menu al clic esterno e riduzione delle animazioni. Controllata la geometria a 1440, 768, 390 e 320 px. Screenshot della demo prodotti a 1600 e 390 px e ispezionati.

Le prove sono locali con Chrome headless e backend simulato. Non verificano autorizzazioni, latenza o lock del servizio Google reale. P60 non è stata pubblicata; nessun dato, trigger o foglio dell'archivio reale è stato modificato.
