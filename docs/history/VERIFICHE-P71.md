# Verifiche P71

Backend simulato: tag privati normalizzati, persistenza nelle Script Properties/versioni e conflitti; migrazione Days da 11 a 13 colonne senza alterare campi esistenti; rich text e conservazione dell'altro campo; prevalidazione, conflitti e fallback su modifiche plaintext.

Playwright/Chrome: filtro diario/giorno/settimana/task/file e dettaglio privato modificato, coda Docs; bozza privata, mostra/nascondi senza perdita, timeout e stato iniziale al reload. Riflessioni rich editabili nei due ingressi con stessi valori, indicatore delle modifiche, salvataggio comune e larghezze 320/390/1440px. Regressioni delle versioni precedenti eseguite.

Nessuna prova autenticata Google. La demo ricrea il database al reload; la persistenza delle preferenze viene verificata mediante lettura server delle stesse Script Properties nella sessione simulata.

Ricerca automatica dopo 800 ms dall’ultimo carattere, con focus e posizione del cursore conservati anche nei risultati. Invio cerca subito; Maiusc+Invio o il comando nei risultati cercano in tutto l’archivio. Con una bozza modificata la ricerca automatica attende il salvataggio; Invio mantiene la conferma di abbandono.
