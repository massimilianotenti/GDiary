# Aggiornamento P53

Pacchetto unico integrato dalla P48 locale e dal ramo P52 dell’altro PC. Conserva le funzionalità di entrambi. Backup locale in outputs/BulletJournal-v3-P48-before-P53.zip.

1. Aggiornare Code.gs, DriveDocs.gs, Index.html e Changelog.html. In DriveDocs.gs conservare il proprio ROOT_FOLDER_ID attivo: nel pacchetto resta il segnaposto locale. Non pubblicare Demo.html.
2. Eseguire setup sul foglio già configurato, senza ricrearlo. Aggiunge description in Goals (I) e Habits (J), rifiutando colonne occupate da altre intestazioni. Se già P51/P52, operazione idempotente.
3. Gestisci deployment > Modifica > Nuova versione > Esegui deployment. Ricaricare /exec: il badge deve indicare P53.
4. In Modifica obiettivo devono comparire Titolo dell’obiettivo e Descrizione dell’obiettivo. Trasferire manualmente il vecchio testo lungo nella descrizione e scegliere un titolo breve.
5. In Modifica abitudine e Aggiungi un’azione compaiono titolo e descrizione propri: il pannello mostra la descrizione dell’azione, non quella dell’obiettivo; dell’obiettivo resta il titolo di riferimento.

ROOT e proprietà personali non sono modificati dall’integrazione locale. Non serve reinstallare il trigger.

Controlli cloud pendenti: persistenza descrizioni dopo Aggiorna, stato microazioni, task una sola volta nel diario e disponibili nel periodo in Giorno, riquadro scaduti, tempi e concorrenza della cache P49. La cache non è una garanzia di consistenza atomica durante letture e scritture concorrenti. Nessun dato cloud modificato durante la preparazione.
