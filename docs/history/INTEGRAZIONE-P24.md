# Confronto e integrazione P24

## Provenienza e recupero
Il ramo corrente P23 è stato copiato prima delle modifiche in work/integration-backup-current e archiviato in BulletJournal-v3-P23-before-integration.zip.
Lo ZIP dell'altro PC è stato estratto separatamente in work/incoming-other-pc. Non è stato usato per sostituire il progetto corrente.
Letti STATO-LAVORO.md, PIANO-SVILUPPO.md e CHANGELOG.md di entrambi e confrontati i sorgenti effettivi.

## Differenze e sovrapposizioni
| Area | Ramo corrente | Altro PC | Esito |
|---|---|---|---|
| P18–P21 | Presente | Presente | Conservato il codice comune |
| P22 | Spunti di riflessione | Gestione progetti | Conservati entrambi e distinta la provenienza |
| P23 | Riflessione configurabile e campi Days separati | Assente | Conservata |
| DriveDocs.gs e manifest | Versione attiva | Identici | Nessuna modifica |
| Piano A–I | Piano comune più estensione riflessioni | Piano comune | Conservato e aggiornato senza dichiarare concluse le fasi |
| Tag liberi, @, merge progetti, ricerca picker | Assenti | Assenti | Restano da sviluppare |

Nessun comportamento incompatibile richiedeva una decisione. I conflitti tecnici nel frontend e nel backend sono stati risolti mantenendo entrambe le funzionalità. Le etichette P22 sono distinte nel changelog.
I nomi visualizzati cambiano dopo rinomina; lo slug rimane l'identificativo dei collegamenti. I Docs già creati restano nel percorso originale.

## Controlli eseguiti
- Sintassi di tutti gli script Index e Demo; Demo contiene il Code.gs integrato.
- Vecchi dati Days a quattro colonne; sette colonne aggiunte senza spostare updatedAt; intestazioni estranee rifiutate.
- Salvataggio e rilettura separata, modalità essenziale/dettagliata, conservazione risposte nascoste, salvataggi parziali dal tracker, svuotamento esplicito e conflitti.
- Rinomina progetto conserva slug, cartella e associazioni; nomi duplicati e versioni obsolete rifiutati.
- Associazioni multiple deduplicate; associazione sconosciuta rifiutata; rimozione associazioni conserva Doc e corpo.
- Note complete con due progetti e anteprime grassetto/corsivo persistenti.
- Date italiane/ISO e rifiuto date impossibili; modifica obiettivo conserva ID/progresso/azioni; weekly:3 mantiene una registrazione al giorno.
- Eliminazione in fondo al Doc conserva un paragrafo; impostazioni DB/Drive e modalità riflessione restano conservate.
- DOM simulato del selettore multiplo: nomi aggiornati e selezione mantenuta durante il refresh.

Comandi passati: node work/verify-p23.cjs; node work/verify-integration.cjs.
I test usano servizi e DOM simulati. Nessuna prova visiva browser P24 o verifica sul cloud eseguita; gli screenshot inclusi sono storici, non prove della versione integrata.

## Impostazioni personali
DriveDocs.gs e appsscript.json sono identici al ramo attivo. ROOT_FOLDER_ID nella copia locale è ancora il segnaposto originale: l'ID del deployment Google non era disponibile e non è stato cercato né modificato. Se si aggiorna DriveDocs.gs sul deployment, conservare il proprio ID reale.
Le proprietà DB_ID, ROOT_ID, DAILY_REFLECTION_MODE e REFLECTION_SETTINGS_VERSION non vengono inizializzate nuovamente dal pacchetto.
