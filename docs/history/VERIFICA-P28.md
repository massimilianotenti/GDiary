# Verifiche P28

Backend simulato: creazione/rilettura/modifica pianificazione e periodo, deadline indipendente, retry che conserva modifiche successive, task creato in settembre presente in ottobre, Giorno corrispondente, intestazioni legacy TaskPlans, date impossibili e combinazioni incompatibili. UI simulata: precedenze deadline/pianificazione/periodo, limiti mese, periodo senza fine, completamento. Regressioni P23, integrazione, P25, P26, P27 eseguite; suite P25/P27 aggiornata per caricare i nuovi helper calendario.

Browser desktop demo: creazione con pianificazione 10 ottobre e deadline 18; riapertura con Dettaglio task e campi presenti; modifica in periodo 5–7 ottobre e visualizzazione nei tre giorni conservando deadline; Nuova nota in modalità completa, testo GIT con sette righe salvato e riaperto come una sola nota. Nessun errore console osservato. Screenshot P28-dettaglio-task.png, P28-periodo.png e P28-nota-GIT.png. Nessun deployment/cloud o prova mobile P28.
