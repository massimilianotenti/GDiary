# Apertura applicativa dalla copia completa — 6 novembre 2026

## Misura ripetibile

`npm run test:local-bootstrap-scale` ora misura separatamente il repository
preesistente e l'apertura applicativa con `openLocalBootstrap`: lettura atomica,
merge nella shell, montaggio Vue/DOM e due requestAnimationFrame. I frame
forniscono un'opportunità di rendering, non una prova del paint sullo schermo.
Ogni apertura riparte con continuousSession null; la prima è esclusa e le altre
30 contribuiscono a p50/p95. Connessioni e cache browser sono calde; non sono
30 riavvii del browser né un benchmark del primo download dell'archivio.

Chromium headless 156.0.8078.4, Linux x64, Node 24.20.0, Core i7-1370P,
20 CPU logiche, circa 15,3 GiB RAM. Dati tutti sintetici: 10.000/50.000 voci,
199/999 Task, 24 voci nel mese, 1.000/5.000 HabitLogs, 10.000/50.000 ricevute
terminali e quattro operazioni attive. Corpi Unicode/rich.
L'identità sintetica è già verificata prima del cronometro applicativo:
nessun tempo di identità Google viene simulato come misura reale. Il report
separa i tempi Navigation Timing dell'HTML/DOMContentLoaded e l'osservazione
della disponibilità iniziale della Demo dai campioni applicativi.

Campione finale dopo il limite iniziale agli editor Task (altre verifiche
locali concorrenti; carico hardware non isolato):

| Voci | Vista | p50 totale ms | p95 totale ms | p95 lettura ms | p95 applicazione ms | p95 frame ms |
|---:|---|---:|---:|---:|---:|---:|
| 10.000 | Mese | 35,9 | 53,0 | 22,3 | 17,8 | 17,8 |
| 10.000 | Mese vuoto | 33,3 | 33,5 | 5,3 | 2,2 | 27,5 |
| 10.000 | Task | 71,2 | 82,6 | 33,3 | 29,1 | 32,5 |
| 50.000 | Mese | 41,6 | 51,6 | 26,5 | 14,4 | 13,9 |
| 50.000 | Mese vuoto | 33,3 | 33,6 | 15,8 | 2,0 | 17,7 |
| 50.000 | Task | 172,9 | 183,8 | 122,2 | 45,4 | 22,4 |

I percentili delle componenti non si sommano. Applicazione comprende merge e
lavoro DOM/Vue precedente alla risoluzione del bootstrap; i frame includono
lavoro di rendering residuo e attesa del refresh. Report completo con campioni
in `artifacts/local-bootstrap-scale.json`, escluso da Git. Le misure cambiano
con carico, hardware, browser, dimensioni dei testi e distribuzione dei Task.
Non certificano il criterio su Google né una capacità generale di 50.000 voci.

## Collo di bottiglia e modifica

Una prima esecuzione, prima della modifica Vue, misurava il totale applicativo
Task p50/p95 185/228 ms a 10.000 voci e 2.691/3.218 ms a 50.000. La lettura
repository separata a 50.000 era 106/124 ms: montare simultaneamente circa mille
editor era il collo di bottiglia osservato. Non è un A/B alternato e non si
attribuisce una percentuale causale al confronto. Nella prima esecuzione il
wrapper dei tempi interni tentava di modificare un repository congelato:
sono utilizzabili solo i totali applicativi e le letture repository separate;
la suddivisione interna è stata corretta prima dei campioni in tabella.

DiaryPage monta inizialmente i primi 50 risultati Task e aggiunge 50 con
«Mostra altri task». Tutti i risultati restano nella sessione per filtri,
ricerca, conteggi e salvataggio; i corpi locali non vengono troncati. Le bozze,
nuove voci e operazioni pendenti/conflitti restano montati anche oltre il limite.
La UI distingue numero mostrato e numero dei risultati caricati. Il cambio
filtri ripristina il limite senza smontare una bozza che resta nei risultati.
Il fallback senza Vue conserva il comportamento precedente senza questo limite.

## Verifiche funzionali e confini

`test:local-bootstrap` verifica oltre 125 Task: espansione 50→100, modifica
oltre la prima finestra, cambio filtro con stesso nodo/focus/selezione e
salvataggio nell'outbox con baseline originale. I controlli precedenti su
rich, privacy, checkpoint, taskPlans e transazione restano attivi.
Una RPC di background tenuta indefinitamente sospesa non blocca l'editor né
la navigazione locale fra diario e Settimana. Errore e retry sono sintetici.

Per Settimana e Abitudini vedere [il rapporto periodi](VERIFICA-BOOTSTRAP-VISTE-PERIODO.md).
Non sono aggiunti PWA, apertura HTML senza rete, capability reali o deploy.

## Esito delle verifiche — 6 novembre

Superati build, npm test generale, test:repository, test:local-bootstrap,
test:local-bootstrap-scale (30 campioni per ciascuno dei sei scenari),
test:release, test:progressive, test:common-periods, test:cycle,
test:local-common, P70 privacy, P64 bozze/layout e P60.1 UTF-8.
Controllati sintassi delle prove e git diff --check. Index/Demo rigenerati,
staging di esattamente sei file e ROOT_FOLDER_ID segnaposto conservati.
Nessun Google, deploy, setupDrive o commit. Le misure e i test sono locali
e sintetici; i pacchetti SPEC-004 non sono dichiarati conclusi.
