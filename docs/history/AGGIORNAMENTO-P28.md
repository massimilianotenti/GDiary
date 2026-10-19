# Aggiornamento P28

Pubblicare insieme Code.gs, DriveDocs.gs e Index.html e creare una nuova versione del deployment. Conservare il ROOT_FOLDER_ID già presente nella propria versione attiva: nel pacchetto locale rimane il segnaposto. Manifest e autorizzazioni invariati; non ripetere setupDrive.

Deadline/scadenza conserva la colonna Entries.due già usata. Giorno pianificato usa TaskPlans.date; periodo usa TaskPlans.workStart e workEnd, aggiunti automaticamente alle colonne 4 e 5 al salvataggio. La lettura dei fogli precedenti a tre colonne è compatibile. Nessuna riclassificazione delle vecchie date: le scadenze esistenti diventano deadline; i giorni già programmati conservano il loro significato. Descrizione sempre nel Doc, progetti/tag separati.

Nel diario: periodo, altrimenti giorno pianificato, altrimenti deadline, altrimenti inserimento. Le note normali rimangono alla data originale. Con periodo senza fine si visualizzano i giorni dall’inizio fino a oggi o alla data di completamento; con fine esplicita i giorni compresi, estremi inclusi. I task incompleti restano in Task aperti. Giorno e periodo sono alternative; deadline può accompagnare entrambi.

Nuova nota apre un testo unico con titolo. Per generare più voci scegliere espressamente Più voci · una per riga. Le note già spezzate non vengono unite automaticamente: serve verificare le voci reali prima di qualsiasi correzione.

Verifiche cloud: creare task con sola deadline, giorno + deadline, periodo + deadline, periodo senza fine; riaprire/modificare/cancellare i campi e controllare diario e Giorno anche tra mesi diversi; completare e riaprire un task; verificare nota GIT unica e aggiornamento estratti; controllare layout su telefono e misurare tempi di lettura. I salvataggi Docs/Sheets conservano i controlli di concorrenza ma non costituiscono una transazione atomica tra servizi.

Backup prima delle modifiche: BulletJournal-v3-P27-before-P28.zip. Nessun dato reale Drive o Sheets modificato durante lo sviluppo.
