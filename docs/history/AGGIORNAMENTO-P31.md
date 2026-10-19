# Aggiornamento P31

Pubblicare Code.gs, DriveDocs.gs, Index.html e Changelog.html (file HTML Changelog nell’editor Apps Script). Conservare ROOT_FOLDER_ID e impostazioni personali; creare una nuova versione deployment.

Importanza salvata in TaskPlans, colonna F importance: normal, urgent, emergency. I valori mancanti corrispondono a Normale. Intestazione aggiunta automaticamente al primo salvataggio; colonne già occupate bloccano la scrittura. Nessuna migrazione manuale o trigger aggiuntivo.

Verifiche locali: creazione e rilettura, modifica, default, rifiuto valori non validi, conservazione durante pianificazione settimanale, ordinamento e sintassi. Regressioni P29 superate con servizi simulati. Nessun dato reale modificato.

Cloud da verificare: creare un task per livello, salvare e riaprire il dettaglio, passare da Emergenza a Normale, programmare dalla settimana, verificare ordinamento e collocazione nel diario. Controllare etichette e selettori anche su mobile. L’importanza non cambia automaticamente in base alle date.
