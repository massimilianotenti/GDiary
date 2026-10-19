# Aggiornamento P45

Da P44 aggiornare Index.html e Changelog.html e pubblicare una nuova versione. Backend, dati e trigger invariati; conservarne impostazioni e ROOT_FOLDER_ID.

Questa versione sostituisce i limiti diversi per vista con una cornice unica di 1200 px. Diario, Giorno, Settimana, Abitudini e Task condividono larghezza e bordo sinistro. Con dettaglio aperto la stessa cornice si divide in due colonne; senza dettaglio il contenuto la riempie. Su mobile il dettaglio si dispone sotto. Le singole schede e i controlli data mantengono dimensioni adatte alla funzione.

Verifiche browser nella demo locale: cinque viste a viewport 1920x1080, barra e layout x=480.5 e larghezza=1200 in ogni vista; contenuto 1200 senza dettaglio, 796 con pannello 380 e gap24. Controllo mobile a390x844: document clientWidth375=scrollWidth375, barra/contenuto/dettaglio347, senza overflow. Sintassi frontend verificata. Screenshot P45-desktop.png.

Cloud da confermare sulla stessa finestra passando fra le cinque viste, con dettaglio aperto/chiuso, poi mobile. Nessun dato reale modificato durante lo sviluppo.
