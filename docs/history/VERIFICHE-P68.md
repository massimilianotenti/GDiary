# Verifiche P68

Validazione, coda Sheets, scrittura e rilettura Docs con backend simulato: H3, citazioni, codice, checklist e stato, font, barrato, colori/evidenziatore e link. Valori non validi rifiutati; font Docs estranei protetti. Cache invalidata cambiando chiave.

Playwright/Chrome locale: comandi sulla selezione; checklist/invio/spunta; salvataggio, consolidamento e riapertura; barra a 320/390/1440px. Regressioni delle viste/palette e dell'editor eseguite. Nessuna verifica autenticata Google o modifica a dati reali.

Riferimenti: https://developers.google.com/apps-script/reference/document/glyph-type e https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/request#BulletPreset . Nessun tipo checklist nativo esposto nella creazione documentata; il pacchetto usa simboli testuali dichiarati all'utente.
