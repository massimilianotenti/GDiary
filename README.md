# GDiary

Diario personale su Google Drive, con note e task nello stesso flusso, riflessioni giornaliere, checkup settimanale e abitudini. Release **v2.0.4** pubblicata nel deployment Apps Script 70. Repository inizialmente preparato il **17 ottobre 2026**.

## Avvio su un nuovo PC

Servono Git e Node.js (Node 24 usato nel progetto; requisito locale dichiarato >=22.12). Le dipendenze sono fissate in package-lock.json.

```sh
npm ci
npm run build
npm test
npx playwright install chromium
npm run test:release
```

Aprire `Demo.html` nel browser: usa dati simulati, non l'archivio Google. Su PowerShell, se la policy impedisce npm.ps1, usare `npm.cmd` e `npx.cmd`. Il caricamento del changelog della demo via file:// può essere bloccato dal browser: non è una prova di errore del deployment Apps Script.

Per usare Chrome già installato nei test: impostare `CHROME_PATH` al suo eseguibile; altrimenti viene usato Chromium installato da Playwright. `npm run test:e2e` esegue la suite browser storica, più ampia; `test:release` copre preferenze, frecce e task settimanali delle release precedenti alla 2.0.4.

## Mappa del progetto

| Percorso | Funzione |
|---|---|
| frontend/shell.html | Interfaccia base, logica applicativa e ponte Apps Script |
| frontend/components/ | Componenti Vue del diario continuo |
| frontend/*.css | Tipografia, palette e layout delle viste |
| Code.gs | Modello, operazioni e API Apps Script |
| DriveDocs.gs | Archivio Drive/Docs, coda di sincronizzazione e contenuti |
| JournalEditor.gs | Lettura e salvataggio del diario continuo |
| Demo.html | Demo con backend simulato; necessario anche come ingresso per la build |
| Index.html | Interfaccia compilata per Apps Script, rigenerata dalla build |
| Changelog.html / CHANGELOG.md | Catalogo corrente delle funzionalità |
| tools/ | Build, preparazione staging e deploy esplicito |
| tests/ | Verifiche locali e backend simulato |
| docs/ | Specifiche attuali e passaggio di consegne |
| docs/specs/ | Specifiche evolutive numerate, da approvare prima dello sviluppo |
| docs/history/ | Documentazione storica, non specifica corrente |

## Documentazione da leggere

1. [Stato e passaggio di consegne](docs/HANDOFF.md)
2. [Specifiche funzionali](docs/SPECIFICHE.md)
3. [Architettura](docs/ARCHITETTURA.md)
4. [Modello dati](docs/MODELLO-DATI.md)
5. [Sviluppo e verifiche](docs/SVILUPPO.md)
6. [Configurazione e pubblicazione](docs/DEPLOY.md)
7. [Ipotesi future: locale e sincronizzazione](docs/ROADMAP.md)
8. [Specifiche evolutive](docs/specs/README.md)

## Creare il repository GitHub

La cartella non contiene una cronologia Git né un collegamento remoto. Creare su GitHub un repository **privato e vuoto**, senza README iniziale. Nella cartella:

```sh
git init -b main
git add .
git diff --cached --stat
git commit -m "Initial import GDiary v2.0.3"
git remote add origin https://github.com/PROPRIO-UTENTE/NOME-REPOSITORY.git
git push -u origin main
```

Gli ultimi due comandi richiedono l'URL reale e l'autenticazione personale. Nessun repository remoto è stato creato o pubblicato durante la preparazione. Su un altro PC usare `git clone`, poi la procedura di avvio sopra. Prima di cambiare PC: commit e push; sull'altro: pull prima di iniziare.

## Dati e configurazioni personali

Il sorgente mantiene `INCOLLA_ID_CARTELLA` in DriveDocs.gs. Per la build destinata a Google passare ROOT_FOLDER_ID come variabile d'ambiente: non modificare il sorgente condiviso. `.clasp.json`, `.deploy.json`, credenziali e file .env sono esclusi da Git; i corrispondenti `.example` sono inclusi. Non inserire backup del diario o dati personali nel repository.

La build prepara solo sei file in `.build/apps-script` e non contatta Google. Il comando `npm run deploy` invece pubblica realmente: leggere prima [DEPLOY.md](docs/DEPLOY.md).

Non è stata attribuita una licenza al codice dell'autore: decidere la licenza prima di renderlo pubblico. Gli avvisi delle dipendenze restano in THIRD-PARTY-NOTICES.md.
