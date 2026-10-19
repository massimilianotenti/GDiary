# Verifiche P62 — 14 ottobre 2026

Backend: lettura rich indicizzata confrontata con quella precedente; risultati identici. Cache riutilizzata con zero aperture Docs, invalidazione tramite nuova revisione Drive e modifica diretta visibile, testo in coda prioritario, bypass, fallback per cache non disponibile e marcatori duplicati ancora rifiutati. Il test simula il timestamp Drive; le prestazioni del servizio reale non sono misurate.

Browser: titolo aggiunto/rimosso nelle Proprietà mantiene un solo simbolo, ora per note senza titolo, data visibile, bordo inferiore della selezione e compressione/espansione. Regressioni del diario e delle nove viste superate: salvataggi, testi su più righe, stili, date, bozze, navigazione, ricerca, conservazione DOM/focus, stato delle modifiche, finestre e geometria mobile.

Build, sintassi, payload Vue UTF-8 e fallback di avvio completati. Code.gs e manifest invariati; DriveDocs.gs e JournalEditor.gs modificati. Nessun nuovo foglio o trigger richiesto. Nuovo log riporta quanti contenuti provengono dalla cache.

Limite: la prima lettura senza cache e le note grandi possono ancora aprire Docs. CacheService è temporaneo e può eliminare record; il fallback resta corretto. Confermare la velocità dopo l'installazione con i log del deployment reale. Nessuna pubblicazione o modifica a dati Google effettuata dall'agente.
