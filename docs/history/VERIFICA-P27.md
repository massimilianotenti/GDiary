# Verifiche P27

Superati verify-p23.cjs, verify-integration.cjs, verify-p25.cjs, verify-p26.cjs e verify-p27.cjs con backend simulato. P27 verifica creazione descrizione, Doc ed estratto, retry idempotente e recupero interruzione, rifiuto descrizione per note/batch e limite 20.000 caratteri, modifica dal dettaglio. UI simulata verifica riepiloghi per data, giorni senza voci, ordinamento, mese, ricerca/progetti, testo semplice e sintassi degli script.

Browser desktop sulla demo: selettore progetto separato dal pulsante; tre riquadri misurati 313 × 112 px con tre sfondi distinti; creazione task con descrizione multilinea e rilettura dal dettaglio; salvataggio intenzione e riflessione nella pagina Giorno e visualizzazione nel diario. Nessun errore console osservato. Screenshots P27-progetti.png, P27-task.png, P27-diario.png. Test con dati simulati, nessun deployment cloud. Mobile P27 non verificato.
