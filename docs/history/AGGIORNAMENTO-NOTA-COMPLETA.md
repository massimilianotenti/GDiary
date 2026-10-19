# Aggiornamento: Bullet rapidi e Nota completa

Per l'app già pubblicata:
1. Apri il progetto Apps Script associato al tuo Sheet.
2. Sostituisci il contenuto di Index.html con Index.html del pacchetto aggiornato.
3. Sostituisci il contenuto di DriveDocs.gs con DriveDocs.gs del pacchetto aggiornato.
4. Ripristina in DriveDocs.gs il tuo ID nella costante ROOT_FOLDER_ID: nel pacchetto è presente il segnaposto.
5. Salva. Non occorre rieseguire setup né cambiare Code.gs o appsscript.json per questo aggiornamento.
6. Esegui deployment > Gestisci deployment > modifica (matita) > Versione: Nuova versione > Esegui deployment.
7. Riapri o ricarica lo stesso indirizzo /exec.

Nuova nota > Modalità:
- Bullet rapidi: una voce per riga, con riconoscimento task e tag.
- Nota completa: titolo e testo, anche con righe vuote e più paragrafi; una sola nota salvata nel Google Doc originale. I simboli bullet nel corpo restano testo.

Data, ambito e progetti funzionano in entrambe le modalità. Le bozze recuperano modalità, titolo e testo nella stessa scheda del browser. La creazione non trasforma o riunisce le note già esistenti. Le quattro voci della nota di apertura pubblicata restano intatte.

Test locali passati: nota unica multilinea, recupero bozza dopo reload, ripetizione della richiesta senza duplicati e conservazione del comportamento bullet. Verificare una nota di prova nell'account Google.
