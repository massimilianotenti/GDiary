# Verifiche P29

verify-p29.cjs: confronta le invocazioni P28/P29 negli stessi servizi simulati. Verifica zero aperture Docs nel task senza descrizione e nella modifica solo date; batch 10 note con un Doc e una scrittura per DocRefs/Previews; worker batch, rinvio su lock occupato, errori persistenti/retry, idempotenza, prima apertura, eliminazione e export di task in coda. Verifica corpo legacy conservato, descrizione sincrona, delta stato/Giorno e conflitti. Interruzione tra salvataggio Docs e indice recupera sezione/preview reali senza duplicati. Modifica Docs esterna non sovrascritta.

Regressioni P23, integrazione P24, P25, P26, P27, P28 superate. Test di interruzione P25/P27 aggiornati per la nuova funzione ensureSections_, conservando la prova di ripresa dopo un primo elemento scritto. Sintassi degli script verificata.

Browser desktop: task senza descrizione appare con badge documento da preparare; prima apertura disponibile; descrizione aggiunta e riletta, deadline modificata senza perdere il testo; intenzione del giorno salvata con risposta incrementale e visibile nel diario. Nessun errore console osservato. Screenshot P29-task-rapido.png. Nessun test di latenze reali, deployment, installazione trigger o prova browser mobile P29.
