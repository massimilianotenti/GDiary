# Aggiornamento P71

Da P69 aggiornare **Code.gs, DriveDocs.gs, Index.html e Changelog.html**. Conservare il proprio ROOT_FOLDER_ID in DriveDocs.gs. JournalEditor.gs e appsscript.json sono gli stessi di P69. Salvare e pubblicare una nuova versione del deployment esistente.

## Note private

Nella pagina Tag, in Visibilità dei tag, contrassegnare Privato/Pubblico. #privato è privato per default. Configurazione condivisa dai browser che usano lo stesso script, con protezione da modifiche concorrenti. Il comando Nuova nota privata usa il primo tag privato configurato (#privato per default).

Note e task con almeno un tag privato sono nascosti. Mostra private li rivela temporaneamente; Nascondi private li nasconde subito. Appena si cambia scheda o dopo 5 minuti di inattività, tornano nascosti. La scelta di mostrare non è memorizzata dopo il reload. Una nuova bozza privata è visibile durante la scrittura; dopo il salvataggio scompare se Mostra private non è attivo. Nascondere non elimina le bozze.

Si tratta di un filtro della schermata, senza PIN o cifratura: i dati sono ancora accessibili direttamente su Sheets/Docs. Il filtro riguarda note/task contrassegnati, non progetti, obiettivi o riflessioni giornaliere prive di tag. L'esportazione NotebookLM richiede Mostra private: i documenti esterni non vengono filtrati.

## Inizio e fine giornata

Nel diario continuo, Espandi mostra il testo; Aa offre gli stessi stili, font, colori e checklist delle note. Comprimi riduce il blocco. Nessun tag/progetto; il titolo indica il tipo della nota speciale. Dal menu del giorno si possono aggiungere i due blocchi anche a una data precedente.

Salva pagina registra sia le note sia le riflessioni. Giorno usa lo stesso testo e la stessa formattazione. Le riflessioni continuano a essere conservate su Sheets in Days, senza coda Docs; al primo salvataggio vengono aggiunte le colonne intentionRich e reflectionRich, lasciando i vecchi campi intatti. Non rinominare queste colonne.

I salvataggi delle note e delle riflessioni sono operazioni distinte: se una fallisce, la relativa bozza resta conservata e il messaggio ne segnala il problema. Conflitti di versione impediscono di sovrascrivere modifiche effettuate altrove.

Nessun deployment Google o modifica a dati reali effettuati dall'agente.

Ricerca automatica dopo 800 ms dall’ultimo carattere, con focus e posizione del cursore conservati anche nei risultati. Invio cerca subito; Maiusc+Invio o il comando nei risultati cercano in tutto l’archivio. Con una bozza modificata la ricerca automatica attende il salvataggio; Invio mantiene la conferma di abbandono.
