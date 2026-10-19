# Aggiornamento P57 — diario unificato

Da P55 o P56 sostituire soltanto Index.html e Changelog.html, pubblicare una nuova versione e ricaricare /exec: badge P57. Backend (Code, DriveDocs e JournalEditor), manifest, fogli, configurazione personale e trigger invariati. Da P54 o precedenti seguire anche AGGIORNAMENTO-P55.md, che richiede JournalEditor.gs.

## Consultazione e scrittura

Il diario ha ora una sola pagina per la normale consultazione e modifica. Clicca nel testo di una nota per scrivere. I task sono righe compatte: check e titolo, deadline accanto, descrizione chiusa inizialmente e apribile con Descrizione. Le note lunghe mantengono Comprimi/Espandi; un titolo automatico non è ripetuto sopra il testo. La barra di formattazione compare entrando nel testo.

La barra contiene + Nota, Task e Salva pagina. Il comando ··· della voce raccoglie Proprietà, inserimento subito dopo la voce, rimozione delle bozze non salvate e, per le voci salvate, Dettagli e allegati. Proprietà apre i campi: titolo facoltativo nota, progetti, tag; per i task anche importanza, giorno pianificato, periodo e stato. Gli errori di pianificazione aprono direttamente i campi coinvolti. Dopo una modifica nel dettaglio, la pagina rilegge la versione aggiornata quando necessario.

Aggiungi al giorno, sotto ogni gruppo, consente di scrivere in un giorno già presente. Il comando generale aggiunge in fondo al giorno corrente del mese; se si consulta un altro mese usa il primo giorno di quel mese, come in P55. Per inserire sotto una voce specifica usare ···. Ordine e identità delle voci non cambiano.

## Salvataggio

Premere Salva pagina, anche dopo i check dei task. La bozza rimane nella stessa scheda fino al salvataggio o all'abbandono esplicito; non è un autosalvataggio cloud. La conferma registra su Sheets e il trigger replica nei Docs. Prima di aprire il dettaglio con modifiche nella pagina viene richiesto di salvarle. Non ci sono nuove chiamate API dovute alla revisione grafica.

La modalità precedente non è più una scelta concorrente nella barra. Soltanto in caso di errore nel caricamento dell'editor appare Apri lettura di recupero. Ricerca, Task aperti, Giorno e le altre viste rimangono dedicate ai loro scopi. La pagina modificabile del progetto mantiene il filtro per progetto e mese.

## Verifiche e passi successivi

Test browser con Chrome desktop 1600 px e mobile 390 px, servizi simulati: nota multilinea e grassetto, task con scadenza/progetto/tag/importanza, refresh con ID preservati, descrizione compatta, validazione visibile, check e salvataggio, dettaglio, bozza progetto dopo reload, compressione entro la voce, titoli non tagliati e assenza di overflow/errori. Script: tests/verify-p57-browser.cjs (Playwright; CHROME_PATH facoltativo). Test backend P55 conservati. Verifica deployment pendente.

Anteprime: P57-editor-desktop.png e P57-editor-mobile.png. Demo.html non va pubblicato su Apps Script. La demo usa dati fissi e servizi simulati; nessun dato reale è stato modificato durante lo sviluppo.

L'apertura automatica su Oggi con spazio già pronto, task interni alle note, migrazione con storico e export/import restano passi successivi. Non è stata introdotta una versione per più utenti né inizializzato/pubblicato un repository Git.
