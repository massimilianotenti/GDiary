# Writer canonico delle registrazioni delle abitudini

Incremento locale del 28 ottobre 2026, SPEC-004 pacchetto 8 ancora parziale.

`syncHabitLogWriter_(store, trustedScope)` offre save/read interni sul nucleo
recuperabile. Il planner puro accetta esattamente operationId, baseVersion e
log. Lo snapshot comprende LOG_HEADERS salvo updatedAt: key, habitId, date,
status e checklist. Entità nella collezione habitLogs, formato sync-habit-log/v1.
La chiave è habitId|data e deve rientrare nei 200 caratteri del nucleo; habitId
non vuoto, senza separatori aggiuntivi o caratteri di controllo. Identità di
record e chiave sono confrontate in lettura e scrittura.

La checklist è una stringa JSON con esattamente steps e checked. Massimo 30
microazioni: ID non vuoto/univoco fino a 200 caratteri, titolo non vuoto fino
a 500 unità UTF-16, nessun attributo sconosciuto. Checked contiene soltanto ID
esistenti e univoci. Titoli, spazi, Unicode, ordine delle microazioni e dei
checked sono conservati; l'ordine delle chiavi JSON non modifica il fingerprint.
Non vengono eliminati ID o titoli per far rientrare un record nel budget.

Con microazioni e stato diverso da skipped, done richiede tutte le spunte e
pending richiede almeno una microazione incompleta. Skipped conserva anche
spunte parziali. Senza microazioni sono validi pending/done/skipped con
checked vuoto. Checklist vuota o malformata non è uno snapshot canonico: il
futuro ponte deve risolvere esplicitamente l'eventuale fotografia legacy
mancante, senza leggere il catalogo durante un retry.

Il writer non consulta Habits o Goals e non decide la pianificazione del
giorno. Conserva la fotografia storica già risolta dal server. La migrazione
e il writer applicativo devono verificare dipendenze, archivio, pianificazione
e versioni dei cataloghi sotto lo stesso lock prima di preparare il piano.
Rileggerli e ricalcolare lo snapshot dopo un ACK perso cambierebbe il significato
dell'operazione; questa parte del ponte rimane successiva.

Save usa ricevute stabili legate allo scope; conflitti e OperationMismatch non
sovrascrivono i record. Read attraversa il recupero e valida schema, identità
e checklist, distinguendo assenza e tombstone. Corruzione persistita produce
ProtocolCorrupt. Costruire il servizio non crea tabelle, identità o RPC.

Il limite del piano serializzato è 32.768 unità, come nel nucleo. La prova
copre anche 30 titoli Unicode di 500 unità attraverso l'adattatore a frammenti;
non costituisce una promessa di capacità/latency Google. Payload con escaping
particolarmente esteso possono superare il budget e vengono rifiutati.

`test:canonical-habit-logs`, incluso in npm test, verifica snapshot completi,
ID/checklist/stati invalidi senza scritture, normalizzazione JSON, isolamenti,
retry dopo edit successivi, ricevute dei conflitti, tombstone e corruzione.
Copre 20 interruzioni prima/dopo le unità del nucleo e 165 interruzioni
prima/dopo/parziali di Sheet/Range con riavvio V8 dai dati persistiti. Verifica
massimo numero/lunghezza dei titoli su storage frammentato, revoca, disattivazione
e presenza nella Demo senza modificare la tabella HabitLogs legacy.

SetHabitLog e lettori applicativi restano legacy: nessuna migrazione, doppia
scrittura o registrazione reale. Prossimo incremento: ponte HabitLogs con
preimmagine congelata, fotografia dei cataloghi per i piani e lettori per
periodo coerenti, poi controller persistente e collaudo browser attivo.
Manifest false, nessun deploy o dato reale; online Apps Script 75.

Superati build, npm test, test:canonical-habit-logs, test:release e
test:tracing prima del planner. Demo e staging sei file rigenerati; Index
senza nuove differenze frontend. Seguito: [planner puro](VERIFICA-PLANNER-REGISTRAZIONI.md).
