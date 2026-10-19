# Verifiche P85

Prove locali in Chrome con backend Apps Script simulato e richieste HTTPS bloccate. Nessun account Google usato, nessun deployment eseguito.

- Build, sintassi, bundle UTF-8 e sei file di deployment; suite backend npm test superata.
- P85: tutti e sei i campi settimanali iniziali preservati, salvataggio multilinea di focus/priorità/wins/obstacles/lessons/next, energia e stato del checkup.
- Errore di salvataggio simulato: testo e flag modifiche da salvare mantenuti; retry riuscito.
- Testo lungo su sedici righe: altezza adattiva, nessun taglio e righe inferiori delle coppie allineate.
- Tracker a tutta larghezza: sette giorni e totale visibili su desktop, scorrimento confinato al riquadro su mobile; celle aprono la giornata corretta anche con nomi di abitudini contenenti separatori.
- Gruppi task apribili e completati inizialmente compressi; completamento di un task riuscito e focus conservato. I conteggi continuano a usare le date effettive di completamento.
- Quattro palette a 320, 390, 768, 1000 e 1440 px senza overflow della pagina; P61 tema/salvataggi, P65 contrasto e palette, P70 privacy e P80 tipografia superati.
- Screenshot prodotti dall’app dimostrativa reale con testi di esempio; non sono mockup generati.
- Backend confrontato byte per byte con P84 e invariato; ZIP senza credenziali o dipendenze, hash di tutti i file verificati.

Su schermi stretti il tracker mantiene lo scorrimento orizzontale locale per preservare la leggibilità dei sette giorni. I dati e il formato di salvataggio rimangono identici a P84.
