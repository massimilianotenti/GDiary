# P60 — un diario più piacevole da usare

La pagina continua ha una nuova identità visiva: fondo caldo, superficie chiara con bordo e ombra discreta, intestazione tipografica, date scandite da numero e giorno, sidebar coordinata e icone lineari SVG. Note e task restano nello stesso flusso; la voce attiva è evidenziata con discrezione.

Lo stato in alto distingue **Modifiche da salvare** da **Modifiche salvate** e cambia mentre si scrive. Il riepilogo delle note e dei task aperti si aggiorna anche usando i check. Si riferisce alle voci caricate nel mese/progetto, non all'intero archivio; il consolidamento Docs rimane indicato sulle voci e nel pannello dedicato.

Ricerca con Ctrl/Cmd+K. Escape e clic esterno chiudono ricerca e menu rapidi. I comandi mantengono nomi accessibili; la visualizzazione rispetta la preferenza di riduzione delle animazioni ed è verificata anche a 320 px.

## Aggiornare da P59

Sostituire soltanto **Index.html** e **Changelog.html**, poi aggiornare la versione del deployment esistente. Index contiene già Vue e gli stili compilati. Backend, manifest, fogli, salvataggi e trigger sono invariati. Non ricreare l'archivio.

Per lo sviluppo: componenti in frontend/components, tema in frontend/pleasant.css, quindi npm run build. Per clasp resta valido DEPLOY-AUTOMATICO.md; la descrizione di release predefinita è P60. Nessun deployment reale è stato eseguito.

## Verifiche

Build, test backend, flusso di release simulato e prove browser completati. Verificati salvataggio completo, formattazione, date, bozze, navigazione, ricerca, conservazione DOM/focus, stato delle modifiche, conteggio dei task, chiusura menu e geometria desktop/mobile. Le prove usano la Demo locale, non i dati Google reali.
