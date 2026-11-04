# Feed globale dei file collegati alle Entries

**Data:** 29 ottobre 2026. **Esito locale:** implementato e verificato.
Entries resta readOnly per default; non sono stati eseguiti provisioning,
deploy o accessi a dati Google reali.

## Comportamento

- La vista «File collegati» carica le Entries dell'intero archivio, quindi
  include collegamenti appartenenti a voci fuori dal mese corrente.
- Con il routing Entries attivo, `readFilesBatch` sovrappone i link canonici
  alle righe legacy e ignora le Entries cancellate. Il percorso locale legacy
  legge la tabella Files una sola volta e limita il risultato agli ID Entry
  effettivamente presenti.
- La richiesta batch mantiene un unico lock del gateway invece di aprire una
  chiamata indipendente per ogni Entry. La vista non carica anteprime, corpi
  Docs o pianificazioni, che non servono per mostrare il nome/data della voce.
- Ricerca e privacy continuano a usare metadati Entry completi; un file viene
  mostrato solo quando la sua voce proprietaria è presente e visibile.

## Verifiche

- `npm run build`: superato; Demo e Index rigenerati e preparati sei file
  Apps Script, senza upload.
- `npm run test:entry-controller`: superato; include overlay batch, file
  canonici, Entries rimosse e nuova lettura globale dopo reboot.
- `npm run test:entry-migration`: superato; incluse le matrici di fault
  injection già previste per il gateway.
- `npm run test:entry-files-browser`: superato in Chromium; la vista globale
  mostra dopo una sessione nuova sia un file canonico sia uno legacy collegati
  a una voce fuori dal mese corrente, senza errori pagina.
- Suite completa `npm test`, `test:release`, `test:e2e` e `git diff --check`:
  superati.

## Limiti

La lettura globale attraversa tutte le Entries. Dal seguito
[lookup Entries a batch](VERIFICA-LOOKUP-ENTRIES-BATCH.md), i lookup del
commit store riusano una mappa temporanea per lock dopo otto chiavi distinte:
la scansione della colonna resta O(numero righe indice), ma non viene ripetuta
per ogni Entry. Il feed incrementale completo e il bootstrap coerente restano
aperti. Il limite di 128 allegati canonici per Entry rimane invariato.
