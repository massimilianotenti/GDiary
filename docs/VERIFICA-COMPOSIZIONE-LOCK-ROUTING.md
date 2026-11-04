# Composizione delle letture tra controller

Incremento locale del 28 ottobre 2026, SPEC-004 pacchetto 8 parziale.
Prerequisito del ponte Goals/Habits: HabitLogs dovrà leggere il catalogo canonico
mentre possiede già il lock del proprio controller. Prima di questo incremento,
un nuovo controller server tentava di acquisire di nuovo lo ScriptLock.

Il server ora distingue un lock di routing già acquisito nella stessa esecuzione,
tramite un contatore in memoria ripristinato in finally. Le letture annidate tra
facciate ereditano quel lock, mantenendo le verifiche live di scope, archivio,
binding e stato. Sono supportati anche ingressi da un lock applicativo legacy:
il contesto di routing viene delimitato senza acquisire un secondo lock.
Non è una lease, un dato persistito o un token fornito dal client.

Le facciate annidate non possono iniziare salvataggi, migrazioni, registrazioni
o cambi modalità. Una nuova mutazione durante una lettura del commit esterno
potrebbe avanzare il checkpoint su cui esso sta lavorando: viene rifiutata prima
di qualunque scrittura con ProtocolUnavailable. Il recupero di commit già
preparati resta parte della barriera di lettura del nucleo. Le mutazioni root
e gli ingressi già protetti dal lock applicativo restano supportati.

La guardia riguarda le facciate dei controller server, non l'uso arbitrario di
adapter/store interni da parte di codice fidato. Il futuro lettore dei cataloghi
deve usare la composizione in sola lettura e lasciare le scritture al proprio
piano root. Questo incremento non collega ancora Goals/Habits al routing.

`test:routing-locks`, incluso in npm test, verifica:

- Lettura canonica Week e HabitLogs da una lettura Days, con una sola acquisizione
  e un solo rilascio dello ScriptLock. Snapshot persistito interamente invariato.
- Salvataggio, migrazione, register e setMode annidati rifiutati senza scritture.
- Stesse regole sotto un lock applicativo legacy già acquisito.
- Un cambio di scope nel lettore annidato continua a essere rifiutato; ereditare
  il lock non sostituisce l'autorizzazione.
- Errori di lettura e root busy non lasciano ownership o contatori aperti; la
  richiesta root successiva torna a leggere normalmente.

I test dei tre controller esistenti sono rieseguiti sul server modificato.
Nessuna nuova RPC, proprietà, tabella o autorizzazione utente; identità e formati
persistiti restano invariati. Nessun deploy o dato reale, manifest false e
online Apps Script 75. Ponte cataloghi, binding semantico condiviso dei fogli
Goals/Habits con HabitLogs, controller e browser restano passi successivi.

Superati build, npm test, test:routing-locks, i tre test dei controller,
test:release, test:cycle, test:incremental, test:tracing, test:day-browser,
test:week-browser e test:habit-log-browser. Demo e staging dei sei file
rigenerati; nessuna nuova differenza frontend a Index in questo incremento.
Git diff --check pulito. Nessuna promessa di latenza Google.
