# Cataloghi e risposte incrementali — SPEC-004, solo locale

Implementato il 27 ottobre 2026, seguito delle finestre per
[Settimana e Abitudini](VERIFICA-SETTIMANA-ABITUDINI-PERIODO.md).
Nessun deployment, setup o accesso ai dati reali. Ultimo online documentato:
Apps Script 75, app v2.0.4.

## Modifiche

Il frontend richiede `context.incrementalCommon: true`. Con questo contratto:

| Operazione | Risposta applicativa |
|---|---|
| saveGoal | commonUpserts.goals con il solo record canonico |
| saveHabit | commonUpserts.habits con il solo record canonico |
| deleteHabit | commonUpserts.habits con il record archiviato |
| saveProject | commonUpserts.projects con il solo record canonico |
| saveReflectionSettings | settingsPatch con impostazioni e versione canoniche |

Queste risposte hanno `delta:true`, `entries:[]`, `commonIncluded:false`.
Non richiamano `state_()` dopo la scrittura. Identità, versioni, validazione,
lock, controlli dei conflitti e invalidazione delle cache restano attivi.
L'archiviazione di un'abitudine conserva record e registrazioni; nessuna nuova
eliminazione fisica. I campi facoltativi omessi e le identità delle microazioni
mantengono le regole precedenti. Una modifica progetto conserva lo slug.

Le chiamate senza opt-in conservano la risposta completa per compatibilità;
i salvataggi Days, Weeks e HabitLogs mantengono i propri delta già esistenti.
Non sono stati convertiti tutti i percorsi legacy che usano state_().

Il merge frontend aggiunge `goals:id`, `habits:id`, `projects:slug` alle identità
comuni. Aggiorna solo i record restituiti e applica settingsPatch conservando
gli altri campi delle impostazioni. Un upsert non dichiara fresco l'intero
catalogo e non estende la sua scadenza. Non serve una RPC compensativa.
Le letture comuni tardive vengono scartate dopo un delta confermato; anche le
impostazioni sono escluse dal refresh obsoleto della vista.

## Viste senza periodo

`context.commonWindow:'catalogs'` restituisce `commonScope:{kind:'catalogs'}`
con i cataloghi previsti, senza Days, Weeks, HabitLogs o commonSlices. Le viste
senza intervallo esplicito lo richiedono ora dal frontend: Impostazioni,
Sincronizzazione, Archivio, Progetti, Tag, File e il percorso Task legacy.
Le voci e gli allegati pertinenti alla vista mantengono la selezione esistente.
Impostazioni e Sincronizzazione non richiedono più le voci del mese.

Il frontend conserva i periodi già in memoria; lo scope catalogs può soddisfare
solo viste senza periodo, mai Diario, Settimana, Abitudini o Giorno legacy.
Tornare a una vista temporale richiede copertura esplicita. I client senza
commonWindow conservano il contratto completo. Il percorso Giorno legacy
mantiene il fallback precedente; la normale navigazione Giorno apre il diario.

Tracing measurementVersion 4 conserva il formato e aggiunge soltanto il flag
numerico `commonCatalogOnlyRequested`; nessun titolo, data o identificativo
viene aggiunto ai rapporti.

## Verifiche

Nuovo comando `npm run test:catalog-deltas`, backend incluso anche in npm test.

- Backend: record canonici singoli, versioni/conflitti, campi facoltativi,
  identità delle microazioni, archiviazione senza perdere log e privacy.
  Il test impedisce esplicitamente ogni ricostruzione state_() e ogni lettura
  delle tabelle storiche durante i salvataggi incrementali.
- Crescita: aggiunge 50.000 record a ciascuna tabella Days/Weeks/HabitLogs.
  La lettura dei soli cataloghi resta a **28 celle** nella fixture, senza
  crescita delle richieste payload. È un conteggio sintetico del lettore,
  non una durata Google né un limite universale al costo dei cataloghi.
- Browser: una RPC per ogni salvataggio, merge canonico, record estranei,
  voci e privacy conservati, ripetizione idempotente, cambio scope e risposta
  comune tardiva dopo un salvataggio. La regressione del ciclo verifica già
  bozze indipendenti e conflitti dei form.
- P87 browser ora applica il delta progetto nella preparazione del caso di
  progetto rimosso, anziché aspettarsi result.projects completo.

Superati build, npm test, test:catalog-deltas, test:cycle, test:release,
test:common-periods, test:common-window, test:incremental, test:tracing e P87
browser. Index e Demo rigenerati; bootstrap UTF-8 e sei file di staging con
ROOT_FOLDER_ID segnaposto verificati dai controlli di build.

## Limiti e seguito

I cataloghi completi, compreso TaskPlans, restano tali quando scadono; il
catalogo tag può ancora cercare nell'archivio. I writer leggono i cataloghi
necessari per validazione e conflitti: il lavoro non diventa costante rispetto
al numero di obiettivi, abitudini o progetti. Non è un feed incrementale.

Il seguito [delta legacy](VERIFICA-DELTA-LEGACY.md) converte ora allegati,
aggiornamento legacy delle voci e conversione progetto/tag; altri percorsi,
compresa la cancellazione, mantengono risposte complete. Il seguito [riflessioni in lotto](VERIFICA-RIFLESSIONI-LOTTO.md) raggruppa ora
le giornate con esiti per record e recupero delle bozze, senza promettere
atomicità del lotto. Contesa del worker, IndexedDB applicativo,
ricerca locale e outbox restano interventi distinti della SPEC-004.
