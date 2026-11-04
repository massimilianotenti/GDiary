# Writer canonico Goals/Habits

Incremento locale del 28 ottobre 2026, SPEC-004 pacchetto 8 parziale.
`syncCatalogWriter_(store, trustedScope)` espone save/read interni sul nucleo
recuperabile. Nessuna RPC, migrazione, apertura tabelle o doppia scrittura.
SaveGoal/saveHabit/deleteHabit e lettori applicativi restano sul modello legacy.

## Snapshot e lotti atomici

Il planner puro accetta operationId e changes (1–25), ciascuna con collection,
id, baseVersion e record completo. Collezioni goals/habits, formati sync-goal/v1
e sync-habit/v1. Snapshot dei rispettivi HEADERS salvo updatedAt; versione
commit-N dal nucleo. Identità record/chiave confrontata, duplicati rifiutati.
Lo stesso ID può esistere in collezioni diverse. Non esistono patch implicite:
i futuri adapter delle API devono risolvere e conservare lo snapshot completo.

Goals conserva titolo/descrizione/spazi, ciclo, target/progress normalizzati
come stringhe numeriche finite, progetto e icona supportati. Habits conserva
obiettivo, titolo/descrizione, data, programmazione fissa ordinata o weekly:1–7,
archived vuoto/yes e JSON delle microazioni. Checklist e catalogo condividono
il validatore puro delle definizioni: massimo 30 ID univoci, titoli non vuoti
fino a 500 unità UTF-16 e nessun attributo sconosciuto. Gli oggetti JSON sono
serializzati canonicamente, senza modificare ordine delle microazioni o testi.
Steps vuoto e [] rappresentano lo stesso catalogo privo di microazioni.

ID goal fino a 200 caratteri; ID habit fino a 189 e senza separatore |, così
habitId|data resta entro i 200 caratteri delle registrazioni. Nessun troncamento
per far rientrare i dati. Resta il limite 32.768 unità del piano complessivo:
un lotto oltre budget è rifiutato prima delle scritture, senza dividerlo.

## Dipendenze e compatibilità funzionale

Una sola acquisizione del lock comprende recupero, letture delle versioni,
validazione del goal e transazione del nucleo. Un'abitudine attiva deve puntare
al goal canonico corrente e iniziare nel suo trimestre; se il goal è nello
stesso lotto, si usa la sua postimmagine. L'ordine goal/habit nel payload non
cambia il risultato. Goal e habit possono quindi essere creati o spostati
insieme, con un solo commit e senza pubblicazioni parziali.

Come nelle API attuali, cambiare il trimestre di un goal non riscrive a cascata
le abitudini già esistenti: la pianificazione corrente ne riflette il nuovo
contesto. Il successivo salvataggio di un'abitudine verifica nuovamente il goal.
L'archiviazione preserva tutti i campi e ID della definizione precedente,
cambiando soltanto archived a yes; non richiede un goal ancora presente o nello
stesso trimestre. Non sono ammessi creazione già archiviata, riscrittura della
definizione archiviata, unarchive o resurrezione implicita di tombstone.

Le versioni obsolete passano al nucleo per una ricevuta di conflitto stabile,
senza pubblicare altri membri del lotto. Ricevute e commit già conservati sono
verificati prima di rivalutare le dipendenze: un retry dopo cambi di trimestre,
archiviazioni o tombstone restituisce l'ACK originale, senza ricreare dati.
Una ricevuta mancante è riparata dal commit conservato. Scope e record restituiti
sono copie indipendenti; corruzione di formato, identità o microazioni blocca
le letture con ProtocolCorrupt. Assenza e tombstone restano distinguibili.

## Prove e confini

`test:canonical-catalogs`, incluso in npm test, copre snapshot/limiti/ID,
JSON equivalente, batch e dipendenze, spazi/Unicode, programmazione, trimestre
bisestile, archivio e tombstone, scope principale e ricevute stabili.
34 interruzioni prima/dopo ogni unità su creazione in coppia, edit singolo e
spostamento in coppia; 198 interruzioni prima/dopo/parziali sulle chiamate
Sheet/Range, riavviando V8 dai soli dati persistiti. Campi massimi individuali
(30 titoli Unicode di 500 unità, ID di 200 e descrizione di 6.000) verificati
sullo storage frammentato; lotto troppo grande rifiutato senza scritture.
Revoca/disattivazione/capacità e corruzione verificate. La Demo contiene lo
stesso servizio e la prova conferma Goals, Habits e HabitLogs legacy invariati.

Non è un catalogo applicativo migrato o un'autorizzazione a fidarsi di record
client: lo store e lo scope sono forniti dal server. Il futuro ponte deve
instradare anche i cataloghi usati da HabitLogs, conservare preimmagini,
risolvere campi omessi/nuovi ID in piani durevoli e bloccare i writer che
aggirano il registro. Controller/cataloghi e browser restano successivi.
Nessun accesso Google, deploy o dato reale; manifest false, online Apps Script 75.

Superati build, npm test, test:canonical-catalogs, test:canonical-habit-logs,
test:release, test:cycle, test:incremental, test:tracing e test:habit-log-browser
prima di iniziare il planner delle API. Demo e staging sei file rigenerati;
Index senza nuove differenze frontend in questo incremento, bootstrap e
segnaposto ROOT_FOLDER_ID preservati. Seguito: [planner puro](VERIFICA-PLANNER-CATALOGHI.md).
