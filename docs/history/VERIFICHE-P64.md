# Verifiche P64

Nuovo test: data e ora nello stesso contenitore per note con titolo e senza titolo; Progetti e tag alla stessa coordinata orizzontale per due note e un task. Nessun overflow a 1440, 390 e 320 px.

Bozza ripristinata equivalente ai valori salvati: stato pulito, passaggio a Impostazioni senza conferma. Modifica del titolo seguita da ripristino del valore originale: nessun avviso. Bozza realmente diversa: messaggio di recupero e conferma all'uscita, testo conservato. La fixture Demo ricrea il database al reload; il test riallinea solo la sua revisione per il salvataggio del caso recuperato. Le protezioni del server non sono disabilitate nell'app.

Regressioni locali: note/task, stili, date, metadati, bozze, salvataggi, cache, avvio Vue, navigazione e altre viste. Backend e manifest invariati rispetto a P63. Nessuna pubblicazione o modifica Google reale. Palette in Impostazioni ancora pendenti.
