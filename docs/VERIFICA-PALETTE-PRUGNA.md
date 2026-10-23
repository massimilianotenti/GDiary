# Verifica palette Prugna — 23 ottobre 2026

Quinto tema pubblicato su richiesta: GDiary v2.0.4, Apps Script 74.
Le prove locali usano Demo.html e dati simulati; la verifica autenticata
successiva alla pubblicazione è descritta sotto.

## Palette

| Funzione | Colore |
|---|---|
| Sfondo | #f5f1f7 |
| Carta | #fffaff |
| Accento e pulsanti primari | #704076 |
| Hover primario | #59325f |
| Testo | #302735 |
| Testo secondario | #6e6074 |
| Linee | #ddd1e2 |
| Fasce di sezione | #eee3f0 |

Nuova voce Prugna nelle Impostazioni, selezione immediata e persistenza locale
nel percorso esistente. Tutti i token paint coperti, con palette light e token
del diario espliciti. Stati semantici di errore/successo restano distinti.
Griglia di scelta adattiva su desktop, due colonne su mobile.

## Verifiche

- npm run build: positivo; Index/Demo rigenerati, bootstrap UTF-8 e sei file
  di staging conservati.
- npm test: positivo; backend, conflitti, cache e pipeline invariati.
- P65 palette: cinque temi su impostazioni e otto viste, persistenza al
  ricaricamento, fallback, storage non disponibile, nessuna modifica dirty
  causata dalla selezione. Per Prugna verificati testo a contrasto almeno
  4,5:1 nei selettori campionati e icone della navigazione almeno 3:1;
  nessun overflow a 320/390 px. Non è un audit esaustivo di accessibilità.
- test:cycle: cinque palette a 320/390/768/1000/1440 px, incluse geometrie con
  form espansi; creazione, modifica, registrazioni, bozze e conflitti.
- test:diary-goals: cinque palette a 320/390/768/1440 px, promemoria e bozze;
  controllo specifico che colore rosso e grassetto impostati nel testo non
  cambino durante il cambio palette, con nodo editor e bozza conservati.
- test:release: positivo; regressioni di preferenze, sezioni e task settimanali.
- git diff --check: positivo.

Ispezionati screenshot locali desktop e mobile. Immagini in
tests/screenshots/P65-plum-diary.png e P65-plum-mobile.png, escluse da Git.
Chromium eseguito fuori sandbox. Nessun accesso Google, dato reale, setupDrive
durante le verifiche locali.

## Pubblicazione autorizzata — Apps Script 74

Rieseguiti build, npm test, P65 palette, test:cycle, test:diary-goals e
test:release prima del deploy, tutti con esito positivo. Superati anche i
controlli della procedura. Backup dei sei sorgenti remoti fuori repository:
HEAD e versione 73 coincidenti con la base Git, nessuna divergenza.
ROOT_FOLDER_ID passato solo tramite ambiente allo staging. Deployment esistente
aggiornato alla versione 74 con descrizione «GDiary v2.0.4 - nuovo tema Prugna».
Verificati i sei sorgenti pubblicati identici allo staging e il manifest
MYSELF/USER_DEPLOYING; URL e accesso privato conservati.

Verifica autenticata nel Chrome Windows dedicato: cinque palette disponibili,
selezione di Prugna e salvataggio della preferenza locale riusciti, accento
atteso confermato; navigazione dalle impostazioni al diario senza overflow
desktop o modifiche pendenti. Coda prima/dopo zero pending, zero errori e 67
completate. Ripristinata la preferenza precedente. Nessuna scrittura ai dati
del diario o esportazione dei contenuti durante il collaudo.
