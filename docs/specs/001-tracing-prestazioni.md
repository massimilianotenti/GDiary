# SPEC-001 — Tracing delle prestazioni

**Stato:** Implementata localmente; collaudo Apps Script da eseguire

**Data:** 22 ottobre 2026

## Obiettivo

Raccogliere misure affidabili delle operazioni percepite come lente, senza
registrare contenuti personali, per stabilire una baseline e decidere con dati
quali parti ottimizzare o spostare su storage locale.

## Ambito

La prima iterazione riguarda l'app attuale: browser, ponte `google.script.run`,
Apps Script, Sheets, Drive/Docs e rendering della vista. Non introduce
IndexedDB come archivio applicativo, PWA, sincronizzazione offline o modifiche
ai dati dell'archivio.

## Requisiti funzionali

1. Il tracing è disattivato per impostazione predefinita e attivabile
   esplicitamente in modalità diagnostica.
2. Ogni azione tracciata riceve un identificatore casuale (`traceId`) valido
   per client e backend, senza identificare persona, archivio o dispositivo.
3. Per ogni azione sono disponibili durata totale lato browser, attesa del
   ponte Apps Script, durata backend e fasi interne misurabili.
4. Le operazioni di lettura riportano almeno cache hit/miss, origine del
   contenuto e conteggi trasferiti; i salvataggi riportano numero di voci,
   batch, esiti e fallimenti parziali.
5. Il report diagnostico resta locale ed esportabile in un formato testuale
   revisionabile.

## Dati ammessi e vietati

Sono ammessi nome dell'operazione, tempi, conteggi, dimensione in byte,
esito, categoria di errore e indicatori tecnici (cache, batch, retry).

Sono vietati testo del diario, titoli, tag, contenuto formattato, identificativi
Drive/Docs/Sheets, indirizzi, token, credenziali e dati che permettano di
ricostruire le voci personali.

## Operazioni iniziali da osservare

- avvio e caricamento del diario continuo;
- paginazione, filtri e ricerca;
- apertura e salvataggio di nota o task, inclusi batch multi-mese;
- caricamento/salvataggio di riflessioni, settimana e abitudini;
- sincronizzazione della coda Docs e relativi retry;
- tempo di rendering dopo la risposta remota.

## Criteri di accettazione

- Una sessione diagnostica produce misure correlate per client e backend delle
  operazioni sopra elencate, quando eseguite.
- L'export non contiene dati personali o identificativi dell'archivio.
- Con tracing disattivato non vengono aggiunte chiamate remote né ritardi
  percepibili al normale uso dell'app.
- I risultati consentono di distinguere attesa di rete/Apps Script, accesso a
  Sheets, accesso a Drive/Docs e lavoro client quando tali fasi sono coinvolte.

## Decisioni implementate

- Attivazione in Impostazioni → Diagnostica prestazioni. La preferenza è locale
  al browser; i dati restano in memoria nella scheda, con limite di 200 eventi.
  Ricaricare, disattivare o cancellare le misure elimina i dati raccolti.
- `traceApi` esegue soltanto un elenco esplicito delle operazioni applicative.
  Restituisce risposta o errore e metriche nella stessa chiamata. Non scrive
  log diagnostici su Google e non introduce chiamate aggiuntive.
- `traceId` correla la singola richiesta e la risposta. `actionId` raggruppa i
  batch della funzione Salva pagina, con conteggi dei batch riusciti e falliti;
  le bozze residue determinano un esito parziale.
- L'export JSON ammette solo nomi di operazioni noti, metriche numeriche finite,
  esiti/categorie d'errore e identificativi generati per il tracing. Gli errori
  originali continuano a raggiungere l'interfaccia, ma non entrano nell'export.
- Le misure includono durata RPC client, totale backend anche su errore,
  lock/flush, helper Sheets, apertura/chiusura con salvataggio Docs, controlli Drive, elaborazione delle
  sezioni e coda persistente. Cache e origini pending/Docs sono conteggiate
  dalla lettura delle pagine. Il rendering DOM sincrono e il ciclo Vue fino a
  nextTick sono eventi separati. Le dimensioni sono byte UTF-8 del JSON
  applicativo, escluso l'involucro diagnostico.

## Interpretazione e limiti

`transportAndSchedulingMs` è la differenza tra tempo RPC client e totale
backend: comprende trasporto, avvio/attese della piattaforma e serializzazione;
non è una misura isolata della rete. I segmenti interni sono inclusivi: per
esempio una sezione Docs può includere apertura Docs e letture Sheets. Non
sommare i segmenti per ricostruire il totale. Gli helper misurati non coprono
ogni singola chiamata ai servizi: il totale backend resta il riferimento.

Il rendering non comprende il paint finale del browser. I timer automatici
Apps Script non hanno una scheda client cui restituire misure: si osservano
gli esiti tramite lo stato della coda e si misura il lavoro avviato con
«Sincronizza ora». Il tracing non avvia sincronizzazioni automaticamente.

Le soglie di lentezza saranno decise dopo la baseline reale. Demo e test
simulano Google; servono a verificare correttezza e privacy delle misure, non
a stimare le latenze del deployment autenticato. Il collaudo su Google
richiede un aggiornamento esplicito del deployment da parte dell'utente.

## Evoluzioni previste

### Estensione diagnostica — fase 0 SPEC-002

L'export mantiene il formato v1 e aggiunge `measurementVersion: 2`. Oltre ai
tempi inclusivi include `*SelfMs` esclusivi degli helper strumentati e
`unaccountedMs`: sommare soltanto i SelfMs distinti più unaccountedMs per
confrontare con totalMs. Non sommare parenti inclusivi e figli. La differenza
client/backend conserva il significato di trasporto, avvio e serializzazione.

Nuovi segmenti: cacheGet/Parse/Serialize/Put, driveCheck/Revision, docsBody/Index,
docContent e contentSearch/Headers/Version/Payload/Assemble. pendingContent e
syncedContent distinguono i due motivi di recupero; sono parenti inclusivi,
non segmenti aggiuntivi da sommare a docContent. responseSerialize misura le
serializzazioni delle voci già presenti nel calcolo del budget, non la
serializzazione finale effettuata dalla piattaforma Google.

Contatori anonimi osservano eccezioni cache, elementi invalidi, assenze di
causa ignota, bypass, oltre-soglia e revisioni cambiate/non verificabili.
Righe trovate, celle e byte payload, figli dei corpi Docs e fasce di numero
frammenti/versioni descrivono il lavoro eseguito. Possono comprendere la voce
letta ma esclusa per budget: non coincidono sempre con entriesCount restituito.
Nessuna chiave, identificativo o hash stabile viene esportato.

Gli eventi journalNavigation aggregano le pagine mediante actionId casuale;
ogni RPC getJournalPage ha pageIndex. Il caricamento e la paginazione restano
quelli precedenti. Eliminato il doppio evento getState con cache:true che
duplicava la rilettura remota dopo la visualizzazione della copia locale.

Il comando facoltativo «Confronta cache get/getAll» confronta cinque volte
le stesse chiavi del mese, ad ordine alternato, e una chiave assente. Esporta
solo numero chiavi/ripetizioni, durate aggregate, errori e differenze. Non
scrive nella cache né modifica dati. Zero chiavi eleggibili significa che il
confronto riguarda soltanto la chiave assente. È un esperimento controllato,
non un nuovo comportamento di lettura dell'app.

Se verrà approvata un'architettura local-first, estendere questo schema a
IndexedDB, outbox, batch di sincronizzazione, retry, conflitti e ritardo di
replica. Le decisioni su quel protocollo saranno oggetto di una specifica
separata.
