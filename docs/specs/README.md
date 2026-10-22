# Specifiche evolutive

Questa cartella raccoglie le specifiche delle evoluzioni proposte dopo la base
v2.0.3. Ogni documento fissa obiettivo, confini, decisioni, criteri di
accettazione e questioni aperte prima dell'implementazione.

Le specifiche non sostituiscono la documentazione corrente in `docs/`: quando
una modifica è implementata e consolidata, aggiornare anche le specifiche
funzionali, l'architettura, il modello dati e il handoff pertinenti.

## Convenzioni

- Nome: `NNN-titolo-breve.md`, con numero progressivo a tre cifre.
- Stato: `Proposta`, `In revisione`, `Approvata`, `Implementata` o `Superata`.
- Un numero non viene riutilizzato: una proposta superata resta consultabile.
- Una specifica non autorizza deploy, setup Drive o modifiche ai dati reali.

## Indice

| Spec | Stato | Sintesi |
|---|---|---|
| [001 — Tracing delle prestazioni](001-tracing-prestazioni.md) | Implementata localmente | Diagnostica, export privato e baseline; collaudo Apps Script da eseguire. |
| [002 — Primo intervento sulle prestazioni](002-primo-intervento-prestazioni.md) | Fase 0 pubblicata (Apps Script 64); ottimizzazioni proposte | Tracing dettagliato e nuova baseline prima di scegliere bulk cache, DocContent o snapshot. |
