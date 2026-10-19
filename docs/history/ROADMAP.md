# Funzioni previste e questioni aperte

Il piano operativo per i prossimi sviluppi è [PIANO-SVILUPPO.md](PIANO-SVILUPPO.md): decisioni condivise, fasi A–I, checklist e criteri di conclusione. Usarlo per scegliere e registrare i passi; questo documento conserva le altre questioni aperte.

Questo documento registra intenzioni, non funzionalità già presenti. Per ciò che è implementato leggere CHANGELOG.md.

## Evoluzione concordata ottobre 2026

P55 consegna il primo editor continuo. Priorità successive: apertura immediata su Oggi, task collegati alle righe delle note, migrazione con storico, export/import Markdown e JSON, beta con archivi separati. La versione unica per più utenti e il Marketplace richiedono un progetto dedicato; non sono implementati. Leggere DIREZIONE-PRODOTTO.md.

## In attesa di verifica nell'account
- P10: changelog dal menu e dal badge dopo il deployment del frontend.
- P9: formattazione nel Doc reale e rilettura nell’app dopo il deployment.
- P6: tempi di creazione nota completa dopo eliminazione della rilettura finale.
- P7: Aggiorna sempre visibile, chiusura/riapertura dettaglio, icone e badge.
- Situazione dell'indice dopo cancellazioni manuali dell'utente: schede e celle modificate non ancora chiarite. Non ricostruire Registry senza verifica.

## Discusse, non implementate
- Formattazione completa di Google Docs (tabelle, immagini, elenchi annidati, colori e impaginazione). P9 copre gli stili principali.
- Gemini: domande sulle note con scelta del periodo/progetto e riferimenti alle fonti. Nessuna API AI collegata.
- Ricerca semantica e contenuto degli allegati. La ricerca attuale è letterale sui Docs gestiti e metadati.
- Risposte parziali per salvataggio dettaglio e altre operazioni: solo addCompleteNote è convertita.
- Cestino note e ripristino delle eliminazioni.
- Aggiornamento estratti Docs per tutto l'archivio in batch riprendibili; ora comando sulle prime12 voci.
- Indice di ricerca efficiente per archivi grandi e paginazione delle tabelle accessorie.
- Trasposizione delle riflessioni giorno/settimana nei Docs; ora sono in Sheets.
- Snapshot immutabile del checkup settimanale.
- Backlink automatici tra note.
- Upload allegati dall'app e contenuto allegati nelle analisi.
- Automazione di NotebookLM: ora si genera un documento da aggiungere manualmente.
- Gestione completa modifiche ai titoli/data/collocazione delle note già create.

## Regola di manutenzione

Prima del prossimo intervento leggere CHANGELOG.md, questo documento e STATO-LAVORO.md. Ogni rilascio registra: identificativo, comportamento cambiato, file da aggiornare, eventuale migrazione, test e verifica cloud. Spostare una funzione da prevista a implementata soltanto dopo codice e test; non confondere implementazione locale con deployment dell'utente. Aggiornare badge e diagnostica insieme per ogni rilascio.


## Aggiornamento P26
Implementati tag separati dai progetti, editor/filtro tag e riclassificazione esplicita delle vecchie associazioni. @progetto, unione duplicati, ricerca picker progetti e undo della riclassificazione restano da sviluppare.
