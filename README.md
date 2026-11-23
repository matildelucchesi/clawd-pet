# Pet Claude della spa

Una creaturina in pixel art (corpo a blocchi color terracotta `#D97757`, occhi neri) che vive in una piccola finestra sempre in primo piano sul desktop di Windows.

- **Onsen** — quando Claude non sta lavorando, si rilassa nella vasca calda con l'asciugamano in testa e gli occhi socchiusi. Ogni tanto sale una bollicina.
- **Palestra** — quando Claude Code sta lavorando, va ad allenarsi con i manubri (con goccia di sudore).
- **Coccole** — passa col mouse sopra la creatura o cliccala: fa gli occhi felici, arrossisce e spunta un cuoricino. Le coccole non cambiano mai scena.

Torna all'onsen circa 2,5 secondi dopo che l'ultima sessione di Claude ha finito. Se Claude si interrompe senza avvisare, dopo 10 minuti senza notizie la creatura torna comunque all'onsen.

## Avviare il pet

Serve Node.js 20 o più recente.

```powershell
cd C:\personal-workspace\pet\pet-spa
npm install
npm start
```

Oppure senza Node: usa l'eseguibile creato con `npm run dist`:

- `dist\PetClaudeSpa.exe` — un solo file portatile. Si scompatta da solo a ogni avvio, quindi ci mette **circa 20–30 secondi** a comparire.
- `dist\win-unpacked\PetClaudeSpa.exe` — stessa app già scompattata, parte subito (tieni tutta la cartella `win-unpacked`).

### Avvio automatico e collegamento sul desktop

Incolla questo in PowerShell: crea "Pet Claude Spa" sia nell'avvio automatico di Windows sia sul desktop.

```powershell
$exe = 'C:\personal-workspace\pet\pet-spa\dist\win-unpacked\PetClaudeSpa.exe'; $ws = New-Object -ComObject WScript.Shell; foreach ($d in 'Startup','Desktop') { $s = $ws.CreateShortcut((Join-Path ([Environment]::GetFolderPath($d)) 'Pet Claude Spa.lnk')); $s.TargetPath = $exe; $s.WorkingDirectory = (Split-Path $exe); $s.Save() }
```

Da quel momento il pet parte da solo quando entri in Windows, e puoi aprirlo col doppio clic sull'icona "Pet Claude Spa" del desktop.

Per togliere l'avvio automatico: premi `Win+R`, scrivi `shell:startup`, premi Invio e cancella "Pet Claude Spa". Il collegamento sul desktop lo puoi cancellare normalmente.

Se sposti la cartella `pet-spa` o rigeneri il programma in un'altra posizione, i collegamenti vanno rifatti.

La creatura compare in basso a destra. Puoi trascinarla dove vuoi tenendo premuto il tasto sinistro sopra di lei. Le parti trasparenti della finestra lasciano passare i clic.

## Collegarlo a Claude Code (una volta sola)

```powershell
npm run install-hooks
```

Aggiunge degli hook a `%USERPROFILE%\.claude\settings.json`:

- prima di modificarlo salva una copia `settings.json.bak-<data>` nella stessa cartella;
- mantiene tutte le impostazioni e gli hook che c'erano già;
- puoi rilanciarlo quante volte vuoi: se è già tutto a posto non cambia nulla.

Gli hook partono in background (`"async": true`): Claude non aspetta il pet, né quando è aperto né quando è chiuso. Se il pet è chiuso falliscono in silenzio.

Privacy: Claude Code passa all'hook tutti i dati dell'evento (anche il testo del prompt e l'output dei comandi) e l'hook li inoltra così come sono a `127.0.0.1:47321`, cioè solo dentro il tuo PC. Il pet ne legge soltanto il nome dell'evento e l'id della sessione e scarta il resto. Se però un altro programma occupasse quella porta (l'icona del pet direbbe "Porta occupata"), riceverebbe lui quei dati: in quel caso chiudi quel programma o togli gli hook.

Le sessioni di Claude Code già aperte leggono gli hook solo all'avvio: dopo l'installazione apri una **nuova** sessione.

## Dove reagisce

| Dove usi Claude | Cosa fa il pet |
|---|---|
| App desktop, scheda **Code** | Va in palestra mentre Claude lavora |
| Claude Code nel **terminale** | Va in palestra mentre Claude lavora |
| **Cowork** | Da verificare (vedi sotto) |
| **Chat** normale di Claude | Resta all'onsen: la chat non usa gli hook e il pet non prova a indovinare |

Con più sessioni aperte insieme resta in palestra finché **tutte** hanno finito.

Quando Claude ti chiede un permesso (per esempio per lanciare un comando) il pet torna all'onsen, perché Claude sta aspettando te. Dopo che approvi, se il comando è lungo (un'installazione, una build) il pet resta all'onsen finché il comando non finisce: Claude Code non manda nessun segnale nel frattempo.

### Cowork

Ancora da verificare: Cowork gira in una macchina virtuale, che potrebbe non raggiungere `127.0.0.1` del PC. Se non la raggiunge, durante Cowork il pet resta semplicemente all'onsen.

## Chiudere il pet

Icona del pet nell'area di notifica (vicino all'orologio) → tasto destro → **Esci**.

Se l'icona mostra "Porta occupata", un altro programma sta usando la porta 47321: il pet si apre lo stesso ma resta all'onsen.

## Togliere gli hook

```powershell
npm run uninstall-hooks
```

Toglie solo gli hook del pet (con un nuovo backup prima di salvare). In alternativa puoi ripristinare a mano il backup: rinomina `settings.json.bak-<data>` in `settings.json`.

## Per sviluppatori

```powershell
npm test         # test con node:test
npm start        # avvia con Electron
npm run dist     # crea dist\PetClaudeSpa.exe
```

- `src/main/state.js` — da eventi degli hook a scena `onsen`/`gym`
- `src/main/server.js` — server HTTP locale (`POST /hook`, solo `127.0.0.1`)
- `src/hooks/install.js` — installa/rimuove gli hook
- `src/renderer/sprites.js` — la pixel art (griglie 48×48 disegnate nel codice)
- `src/renderer/animator.js` — quale fotogramma mostrare e quando
