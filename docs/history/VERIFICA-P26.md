# Verifica locale P26

Passati: node work/verify-p23.cjs; node work/verify-integration.cjs; node work/verify-p25.cjs; node work/verify-p26.cjs.
Regressioni aggiornate alla nuova semantica degli hashtag, mantenendo prove esplicite delle bozze legacy.
P26: schema 13→14 colonne, letture senza body, normalizzazione tag, URL/email, nuovi task/note con progetti e tag distinti, editor e conflitti, modifiche rich/stato/programmazione che conservano i tag, filtro globale, conversione con firma dell'anteprima, obiettivi bloccanti, testi/Docs/percorso invariati, colonna occupata rifiutata e archivio oltre 500 righe.
Browser desktop sulla demo locale: task con Casa + lavoro/finanza, selezione pagina Tag, nota completa, salvataggio tag e mantenimento testo/link. Screenshot P26-tag-progetti.png mostra Casa/Video nel menu Progetti e #lavoro/#salute come tag sulla nota.
La conversione è stata provata con servizi simulati, senza eseguirla sui dati reali. Mobile e deployment Google non verificati per P26.
