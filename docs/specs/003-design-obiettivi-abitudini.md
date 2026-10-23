# SPEC-003 — Design di Obiettivi e abitudini

**Stato:** Implementata — pubblicata nella versione Apps Script 71

**Data:** 23 ottobre 2026

**Base:** GDiary v2.0.4, Apps Script 70, commit 34f41ce

## Obiettivo

Rendere «Obiettivi e abitudini» riconoscibile come parte dello stesso diario:
stessa tipografia, superfici, spaziatura, sezioni, icone e comandi delle viste
Diario continuo, Task aperti e Settimana e checkup. Il riferimento più vicino
per questa pagina è la settimana: dati strutturati dentro una pagina sobria,
con una gerarchia leggibile anche quando non si sta modificando nulla.

L'intervento riguarda la presentazione e, nella proposta principale, la
disposizione dei contenuti. Non cambia il modello di obiettivi e abitudini.

## Stato osservato

Confronto del codice e screenshot locali di Demo.html, con dati simulati,
alla larghezza di 1440 px:

- La pagina «Il mio ciclo» divide lo spazio tra contenuto e pannello del
  giorno sempre visibile; il tracker settimanale è ristretto e deve scorrere
  orizzontalmente anche su desktop.
- Gli obiettivi sono schede affiancate con fondo colorato e simboli in
  riquadri. Titoli di sezione, azioni e riepiloghi hanno trattamenti diversi
  dalle sezioni della settimana.
- «+ Obiettivo» e «+ Nuovo obiettivo» espongono due accessi allo stesso form.
  Due comandi distinti portano al checkup settimanale.
- La lista delle azioni, il tracker, il riepilogo delle azioni e il pannello
  quotidiano mescolano tre periodi: trimestre, settimana e giorno.
- Il pannello del giorno contiene registrazione delle pratiche, microazioni
  e riflessione. Queste funzioni devono restare raggiungibili.

I punti sopra descrivono lo stato corrente, non modifiche già realizzate.

## Direzione visiva

| Elemento | Trattamento proposto |
|---|---|
| Superficie | Stessa carta e larghezza utile della settimana; niente pannelli colorati sovrapposti alla pagina. |
| Titolo pagina | «Il mio ciclo», serif con peso normale e scala coerente con «La mia settimana». |
| Periodo | Trimestre e anno sotto il titolo, distinti dalla settimana del tracker. |
| Sezioni | Titolo serif, icona lineare e fascia tenue con accento laterale come nella settimana. |
| Obiettivi | Blocchi in elenco, separati da righe sottili, senza fondi colorati permanenti. |
| Azioni ricorrenti | Righe leggere con titolo, frequenza e obiettivo associato; dettagli secondari discreti. |
| Campi | Etichette e focus coerenti con il diario; contenitori di modifica visibili quando servono. |
| Comandi | Stessi pulsanti primari, secondari, indicatori e stati disabilitati delle viste di riferimento. |
| Colori | Token condivisi `--diary-*` e palette esistenti, senza nuovi colori fissi per la pagina. |

I valori di tipografia, larghezze e spaziatura vanno ripresi dagli stili
correnti, evitando una nuova scala autonoma. I colori delle icone personalizzate
non devono prevalere sul titolo o cambiare il significato degli stati.

## Disposizione proposta

Un'unica superficie principale. Il pannello quotidiano diventa una sezione
nel flusso, invece di sottrarre larghezza al contenuto per tutta la pagina.

```text
IL MIO DIARIO · OBIETTIVI E ABITUDINI
Il mio ciclo                                  + Obiettivo
Ottobre – dicembre 2026
[Anno] [Gen–Mar] [Apr–Giu] [Lug–Set] [Ott–Dic]

Dove voglio arrivare
  Icona · Titolo obiettivo          risultato / traguardo
  Progresso · progetto o Personale
  Descrizione · Aggiorna risultato · Modifica
  ─────────────────────────────────────────────────────

Le azioni che mi avvicinano                    + Abitudine
  Titolo · frequenza
  Obiettivo collegato · progetto o Personale · Modifica

Abitudini e pratiche · settimana
  Precedente · intervallo della settimana · Successiva
  Tracker completo: azione + 7 giorni + fatte/previste
  Riepilogo compatto · Apri checkup settimanale

La giornata · data selezionata
  Pratiche previste · stati · microazioni
  Riflessione del giorno · Salva riflessione
```

Questo schema esprime gerarchia e contenuti, non dimensioni finali.
L'avvio dello sviluppo richiesto dall'utente conferma la proposta principale:
stile e disposizione aggiornati, giornata nel flusso e titolo conservato.

### Obiettivi e azioni

1. Ogni obiettivo mostra subito titolo, icona scelta, risultato numerico,
   traguardo, progresso e progetto facoltativo. Il testo numerico resta
   comprensibile anche senza colore o barra.
2. Descrizione e form di modifica sono comprimibili. «Aggiorna risultato»
   è distinto da «Modifica obiettivo» e mantiene il salvataggio esplicito.
3. Un solo accesso visibile «+ Obiettivo» apre il form nella sezione;
   «+ Abitudine» apre il form di collegamento a un obiettivo esistente.
   I form possono stare nel flusso; non sono necessarie nuove finestre modali.
4. Ogni abitudine conserva descrizione, icona, frequenza, inizio, progetto
   dell'obiettivo e modifica delle microazioni. «Elimina abitudine» resta
   nel dettaglio di modifica con la conferma corrente.
5. I form aperti non trasformano automaticamente un click fuori dal campo
   o la chiusura della sezione in un salvataggio o in uno scarto dei valori.

### Trimestre, settimana e giorno

1. Trimestre e anno continuano a governare la lista degli obiettivi e delle
   azioni del ciclo. La scelta attiva è segnalata anche semanticamente.
2. La settimana del tracker rimane quella selezionata: il restyling non
   introduce filtri trimestrali nuovi né cambi impliciti di data.
   L'intervallo è sempre esplicito, anche quando attraversa due trimestri.
3. Tracker e riepilogo continuano a usare gli stessi record e le stesse
   regole `planned`, giorni fissi e frequenza settimanale libera.
4. Il click su una cella seleziona il giorno e rende visibile la sezione
   quotidiana con la sua data. Se il focus viene spostato, la destinazione
   deve essere identificabile da tastiera; nessun salvataggio automatico.
5. Il riepilogo «azioni e risultati» viene compattato vicino al tracker,
   conservando i conteggi. Un solo comando «Apri checkup settimanale» porta
   alla settimana visualizzata.
6. Registrazione quotidiana, stati e microazioni riprendono lo stile delle
   pratiche del diario. La riflessione resta disponibile e riferita allo
   stesso record giornaliero, senza creare una riflessione separata.

## Stati, accessibilità e affidabilità

- Ciclo senza obiettivi: messaggio breve e invito a creare il primo obiettivo.
  Nessun form di abitudine privo di un obiettivo valido.
- Obiettivi senza azioni, settimana senza pratiche e giorno senza pratiche:
  messaggi distinti, riferiti al rispettivo periodo, senza sembrare errori.
- Descrizioni e titoli lunghi vanno a capo senza nascondere i comandi;
  i dettagli compressi indicano chiaramente che esiste altro contenuto.
- Apertura e chiusura usano frecce coerenti, etichette e stato accessibile;
  focus visibile, ordine di tabulazione coerente e controlli con nomi univoci.
- Stati delle abitudini distinguibili con testo e simboli oltre al colore.
- Durante il salvataggio feedback e blocchi dei controlli restano coerenti
  con il resto dell'app. Un errore conserva i valori per il retry.
- Cambio di ciclo, settimana, giorno o vista rispetta i controlli correnti
  sulle modifiche non salvate. Un riordino del DOM non deve perdere form,
  focus o dati pendenti.
- Preservare campi del giorno non modificati e formattazione delle riflessioni.
  Il vecchio pannello invia anche l'intenzione come testo semplice: durante
  il suo eventuale spostamento verificare questo percorso per non degradare
  `intentionRich` o `reflectionRich`; riusare il flusso condiviso dove serve.
- Mantenere identità, `updatedAt`, controlli di conflitto e risposte
  incrementali. Nessuna rilettura completa aggiunta per il nuovo layout.

## Adattamento agli schermi

- Desktop: una pagina con la stessa larghezza utile della settimana;
  tracker completo senza scorrimento alla larghezza desktop di riferimento.
- Tablet e mobile: ordine unico dei contenuti, toolbar che va a capo,
  form e controlli contenuti nella pagina.
- A 320 e 390 px è ammesso scorrere orizzontalmente il solo tracker,
  in una regione accessibile e riconoscibile; la pagina non deve scorrere
  lateralmente. Non ridurre i sette giorni a colonne illeggibili.
- Evitare che simboli, pulsanti o pannelli comprimano il testo; nessun
  comando essenziale disponibile soltanto al passaggio del mouse.

## Confini tecnici e funzionali

Intervento sui sorgenti frontend e sugli stili, con Demo.html per il confronto.
Il codice corrente distribuisce la vista fra `renderHabits`, `decorateView`
e `polishHabits`: introdurre una struttura esplicita per la pagina ed evitare
di aggiungere ulteriori trasformazioni dipendenti dall'ordine del DOM.
Riutilizzare stili e controlli condivisi dove il comportamento coincide;
non è richiesta la migrazione completa della pagina a Vue.

Non rientrano nella specifica nuovi tipi di obiettivo, grafici, streak,
notifiche, statistiche aggiuntive, riordino manuale, nuove API o migrazioni
dell'archivio. Le registrazioni non aggiornano automaticamente il risultato
numerico dell'obiettivo. Nessun cambiamento alle altre viste per uniformarle
a questa: sono loro il riferimento.

Index.html e Demo.html rigenerati, bootstrap UTF-8 e sei file Apps Script
conservati. Deploy successivamente richiesto ed eseguito il 23 ottobre 2026,
versione Apps Script 71 sul deployment esistente, stesso URL e accesso privato.

## Criteri di accettazione e verifica prevista

| Area | Esito richiesto |
|---|---|
| Coerenza visiva | Confronto diretto Demo tra diario, settimana e nuova pagina: stessa famiglia di titoli, superfici, sezioni, icone e comandi. |
| Obiettivi | Creazione, modifica, risultato numerico, descrizione e icona ancora disponibili e persistenti. |
| Abitudini | Giorni fissi, frequenza libera, inizio, microazioni, icona, descrizione e archiviazione conservati. |
| Registrazioni | Stati e vincoli sulle microazioni invariati; cella tracker e pratica del giorno concordano. |
| Periodi | Cambio anno/trimestre, settimane ai confini del ciclo e selezione del giorno non mostrano dati sotto un'etichetta temporale errata. |
| Dati | Stesse identità e conteggi; aggiornamento del solo record previsto; nessuna perdita di campi o formattazione. |
| Errori e conflitti | Salvataggio fallito ritentabile; versione obsoleta rifiutata; cambio vista protetto quando ci sono modifiche. |
| Layout | Verifica 320, 390, 768, 1000 e 1440 px nelle palette warm, sage, slate e dark; nessun overflow della pagina. |
| Accessibilità | Percorsi da tastiera per creazione, modifica, tracker e registrazione; focus e stato dei dettagli visibili. |
| Regressioni | Diario, task, settimana, preferenze di apertura e privacy continuano a funzionare. |

Dopo l'implementazione: `npm run build`, `npm test`, `npm run test:release`,
`npm run test:incremental`, test browser pertinenti per obiettivi/abitudini,
riflessioni e settimana, e confronto screenshot su dati simulati. Aggiungere
solo la copertura mancante per i flussi e le regressioni interessati.

Implementazione e verifica locale documentate in
[VERIFICA-DESIGN-OBIETTIVI.md](../VERIFICA-DESIGN-OBIETTIVI.md).

## Decisioni adottate con l'avvio dello sviluppo

1. **Estensione:** stile, disposizione e gerarchia aggiornati insieme.
2. **Disposizione quotidiana:** sezione nel flusso, senza pannello laterale.
3. **Titolo:** mantenuti «Il mio ciclo» e «Obiettivi e abitudini» nella navigazione.
4. **Creazione:** un solo accesso per tipo, tramite dettagli espandibili
   all'interno delle rispettive sezioni, senza duplicati nell'intestazione.
