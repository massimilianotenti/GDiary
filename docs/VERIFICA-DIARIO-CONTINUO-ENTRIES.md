# Diario continuo Entries multi-blocco

**Data:** 29 ottobre 2026. **Esito:** implementato localmente; Entries resta
readOnly per default e non è stato eseguito provisioning, deploy o accesso a
dati Google reali.

## Comportamento

- `saveJournalPage` usa il gateway Entries quando il routing è attivo; il
  percorso legacy resta disponibile quando il gateway non è configurato.
- Ogni commit salva fino a 12 blocchi. Ogni Entry, il puntatore versionato al
  DocContent, la data e posizione nell'ordine giornaliero e i campi di
  pianificazione vengono pubblicati nel medesimo commit recuperabile.
- Il contenuto e le righe nuove vengono preparati prima del commit. Le righe
  Entry nuove usano preimmagini di staging con requestId `page-pending-*`,
  escluse dalle letture finché il route canonico non le pubblica.
- Il replay con lo stesso payload/clientId recupera gli ID assegnati e non
  duplica righe o contenuti dopo un ACK perso.
- Letture del diario, layout e dettagli consultano il gateway canonico.

La UI divide oltre 12 modifiche in più commit. Se un batch fallisce, conserva
le bozze e i commit già confermati; i batch non confermati restano da salvare.
Questa è una semantica a gruppi di commit, non una transazione indivisibile
sull'intera pagina.

## Evidenze

- Build Vite, assemblaggio `Index.html` e preparazione dei sei file Apps Script:
  superati, senza contatti Google.
- `npm test`: superato, inclusi i 429 casi di recupero del commit pagina
  simulati Sheet/Range e i test controller Entries.
- `npm run test:release`: superato.
- `npm run test:e2e`: superato; il browser Entry attivo ha verificato nota con
  formattazione e task nello stesso batch, ACK perso e retry, assenza di
  duplicati, contenuto canonico, immutabilità della riga legacy e ricaricamento
  con posizioni coerenti.

## Limiti aperti

La matrice browser non copre ancora eliminazione Entry/allegati né conversione
progetto→tag. Il limite di 12 voci evita di superare il budget del protocollo
per il commit di pagina, ma una pagina più grande può produrre più commit.
Lookup/feed Entries e contratto di provisioning/abilitazione rimangono aperti;
nessun routing reale è stato attivato.
