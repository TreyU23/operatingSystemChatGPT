# Live Desktop

Live Desktop is a local-first Windows dashboard and assistant. A React/Vite frontend provides system controls, system information, conversations, memories, approvals, iCloud Calendar, a custom Apple Music player, Phone Link status, and one-click project lifecycle controls. A Java 21/Spring Boot backend owns local state, OpenAI requests, Windows inspection, integrations, and approved actions.

This is a desktop-style assistant application, not an operating-system kernel. The backend binds to `127.0.0.1:4317`; the development frontend runs at `http://localhost:4173` and proxies `/api` and `/health` to the backend.

## Current capabilities

- True-black dashboard with a persistent dark/light appearance preference.
- Live CPU, memory, storage, network, battery, Windows, backend, and OpenAI status.
- Approval-backed shortcuts to Windows Wi-Fi, Bluetooth, Focus, Night light, microphone privacy, and battery-saver settings.
- OpenAI-powered conversations using the official Java SDK.
- Token-conscious assistant context: each prompt receives only relevant live dashboard sections, with an on-demand tool for additional bounded context.
- Inspectable local memories and conversation history.
- Restart and shutdown controls for both frontend and backend.
- iCloud Calendar day view using CalDAV, including recurring events.
- Custom Apple Music player with artwork, metadata, progress, play/pause, previous/next, shuffle, and system mute. It uses the free Apple web player plus Windows' built-in media session controls, with no paid developer integration.
- Microsoft Phone Link installation, process, linked-device, battery, notification-signal, and sync metadata detection.

## Project layout

```text
backend/    Java 21 + Spring Boot API and local integrations
frontend/   React 19 + Vite 6 dashboard
data/       Local state, encrypted integration records, and lifecycle log
scripts/    Java bootstrap, launch, restart, and shutdown scripts
artifacts/  Local design and QA artifacts
```

## Requirements

Required:

- Windows 10 or Windows 11 with PowerShell.
- Java 21. The included bootstrap script can install a project-local Temurin JDK.
- Node.js 20 or later and pnpm for a fresh frontend install. The Codex desktop environment is detected automatically when its bundled runtime is available.
- Network access while installing dependencies and while using OpenAI, iCloud Calendar, or Apple Music.

Optional accounts depend on the features you use:

- An OpenAI API project key with API billing/credits for the assistant.
- An Apple Account with two-factor authentication for iCloud Calendar.
- An Apple Music account if you want to play subscriber content; no Apple Developer Program membership or developer key is required.
- Microsoft Phone Link installed and paired with a phone for live phone metadata.

## First-time setup

Run all commands from the repository root in PowerShell.

### 1. Allow the project scripts for this terminal

If PowerShell blocks local scripts, use a process-only execution-policy override:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

This setting ends when that PowerShell window closes.

### 2. Install Java 21

```powershell
.\scripts\bootstrap-java.ps1
```

The script downloads a verified Eclipse Temurin 21 archive, checks its SHA-256 checksum, and installs it under `.tools\jdk-21`. It does not require a global Java installation. The Maven wrapper is included, so Maven does not need to be installed separately.

### 3. Install frontend dependencies

If `frontend\node_modules` is not already present, install pnpm and the locked dependencies:

```powershell
npm install --global pnpm
pnpm --dir frontend install --frozen-lockfile
```

Codex desktop users can normally skip the global pnpm installation because `scripts\run-frontend.ps1` locates the bundled Node/pnpm runtime.

### 4. Configure the OpenAI API key

Copy the configuration template and edit the local `.env` file:

```powershell
Copy-Item .env.example .env
notepad .env
```

Set at least:

```properties
OPENAI_API_KEY=your_openai_project_api_key
```

The complete supported configuration is:

```properties
HOST=127.0.0.1
PORT=4317
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6-sol
OPENAI_REASONING_EFFORT=medium
DATA_DIR=../data
WORKSPACE_ROOT=..
```

`.env` is ignored by Git. Never commit, paste into source code, or share an API key.

Alternatively, store the key as a Windows user environment variable without putting it directly in PowerShell history:

```powershell
$liveDesktopKey = Read-Host "Paste your OpenAI API key"
[Environment]::SetEnvironmentVariable("OPENAI_API_KEY", $liveDesktopKey, "User")
$env:OPENAI_API_KEY = $liveDesktopKey
Remove-Variable liveDesktopKey
```

The final two lines make the key available to the current terminal immediately. New terminals inherit the saved user variable automatically. A process/user environment variable takes precedence over the same property in `.env`.

## Start Live Desktop

### Recommended: one command

From the repository root, run:

```powershell
.\start.cmd
```

This starts both the Java backend and React frontend in the background. If an older Live Desktop instance is already using ports `4317` or `4173`, the launcher safely replaces those project processes first. When startup finishes, open [http://localhost:4173](http://localhost:4173).

### Visible development terminals

Open two PowerShell terminals at the repository root.

Terminal 1:

```powershell
.\scripts\run-backend.ps1
```

Terminal 2:

```powershell
.\scripts\run-frontend.ps1
```

Open [http://localhost:4173](http://localhost:4173). The backend health endpoint is [http://127.0.0.1:4317/health](http://127.0.0.1:4317/health).

### Direct lifecycle command

`start.cmd` wraps the following lifecycle command. You can still invoke it directly when troubleshooting:

```powershell
.\scripts\project-lifecycle.ps1 -Action restart -WorkspaceRoot (Get-Location).Path
```

Use this command for either an initial background start or a restart. Once the dashboard is online, the circular-arrow button in its top bar runs the same restart workflow.

### Shut down both services

Use the power button in the dashboard and confirm, or run:

```powershell
.\scripts\project-lifecycle.ps1 -Action shutdown -WorkspaceRoot (Get-Location).Path
```

Lifecycle logs are written to `data\runtime-control.log`. Background process output is written to `.backend-preview.out.log`, `.backend-preview.err.log`, `.frontend-preview.out.log`, and `.frontend-preview.err.log` in the repository root.

## Integration setup

### iCloud Calendar

Do not enter your normal Apple Account password. Live Desktop uses an Apple app-specific password for CalDAV.

1. Make sure two-factor authentication is enabled for the Apple Account.
2. Sign in at [account.apple.com](https://account.apple.com/).
3. Open **Sign-In and Security → App-Specific Passwords**.
4. Generate a password named something recognizable, such as `Live Desktop`.
5. In Live Desktop, open **Settings → iCloud Calendar**.
6. Enter the Apple Account email and generated app-specific password, then select **Connect iCloud Calendar**.

The backend verifies the account before keeping it. The password is protected with Windows DPAPI for the current Windows user and stored only in `data\icloud-calendar-credentials.json`; it is never returned to the frontend. Calendar results are cached briefly, refresh automatically, and can be refreshed manually from the widget.

Changing or resetting the main Apple Account password revokes existing app-specific passwords. Generate a replacement and reconnect if calendar sync stops afterward. See Apple’s [app-specific password instructions](https://support.apple.com/en-us/102654).

### Apple Music custom player

The Apple Music integration intentionally uses no Apple Developer Program, developer token, private key, or additional paid API. It combines Apple's standard embedded web player with the media-session interface built into Windows 10/11.

1. Open **Settings → Apple Music**.
2. Paste a shared Apple Music playlist, album, or song URL, or keep the included starter playlist.
3. Open the full player and sign in within Apple's player if the selected content requires it.
4. Start a track once in either the embedded player or the Apple Music Windows app.
5. Live Desktop detects the active Windows media session and begins showing its real title, artist, album, artwork when available, playback state, and timeline.

The original dashboard controls then send play, pause, previous, next, and shuffle requests to the active Windows session. The volume button toggles Windows' system mute. The embedded player stays mounted offscreen when you switch Live Desktop tabs so playback can continue.

No Apple password is stored by this integration. A shared Apple Music link is stored only in the browser's local storage. Windows 10 version 1809 or later is required for the system media-session API.

### Microsoft Phone Link

1. Install or update **Phone Link** from the Microsoft Store.
2. Open Phone Link and pair the phone completely.
3. Keep Phone Link running in the background if you want current connection and sync information.
4. Use the refresh button on the Live Desktop phone widget if its status is stale.

The backend reads local Phone Link package metadata and running-process information. It reports the paired device name/model, battery when available, last-seen/sync timestamps, and whether the local companion metadata indicates notifications. Live Desktop does not display private notification contents. **Open app** creates an approval to launch Phone Link externally with the `ms-phone:` URI.

## Local data and security

| Data | Location | Protection |
| --- | --- | --- |
| Conversations, memories, approvals | `data\assistant-state.json` | Local JSON, user-readable |
| iCloud account record | `data\icloud-calendar-credentials.json` | Password encrypted with Windows DPAPI |
| Theme and connected Apple Music link | Browser local storage | Local browser profile |
| Lifecycle history | `data\runtime-control.log` | Local text log |

DPAPI-protected values can only be decrypted by the same Windows user profile. Disconnect an integration in Settings to delete its saved credential record.

The model cannot execute arbitrary shell commands. System toggles create approval-backed actions that open the matching Windows Settings page. Phone Link launch uses the same approval path. Restart and confirmed shutdown are explicit local lifecycle operations.

### Assistant access to dashboard information

The assistant can access live dashboard information, but the application does not attach the entire dashboard to every request. A local relevance router examines the latest prompt and includes only matching sections:

- PC/resource/control questions: compact system and control state.
- Running-application questions: the bounded detected-app list.
- Phone questions: Phone Link connection and device metadata, without notification contents.
- Calendar questions: at most eight events for the relevant day; `tomorrow` and `yesterday` are resolved locally.
- Music questions: metadata and timeline only; artwork image data is deliberately excluded.
- Runtime or approval questions: compact service state or at most five pending actions.
- Explicit dashboard-overview questions: a bounded summary of all sections.

If the automatic context is insufficient, the model has a `get_dashboard_context` tool limited to four explicitly requested topics per call. Credentials, API keys, Apple app-specific passwords, local credential files, artwork blobs, unrelated memories, and unrelated dashboard sections are never included. Prompts unrelated to the dashboard receive no dashboard payload at all.

The backend listens only on `127.0.0.1` by default. The Vite development frontend starts with `--host 0.0.0.0`, so Windows Firewall may make port `4173` reachable from the local network. Do not expose either service to the internet; there is no multi-user authentication, CSRF protection, or remote-deployment hardening.

## Build and test

Run the backend suite and package from the repository root:

```powershell
$env:JAVA_HOME = (Resolve-Path '.tools\jdk-21').Path
.\mvnw.cmd test
.\mvnw.cmd -pl backend package
```

The packaged backend is written to `backend\target\assistant-backend-0.1.0-SNAPSHOT.jar`.

Run the frontend production build and Sites packaging checks:

```powershell
pnpm --dir frontend run build
pnpm --dir frontend run test:sites
```

The frontend build writes the browser assets to `frontend\dist\client`, the Sites worker to `frontend\dist\server\index.js`, and the hosting manifest to `frontend\dist\.openai\hosting.json`. The current hosted artifact is frontend-only; live Windows and account integrations still require the local backend.

## API reference

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Backend and OpenAI configuration status |
| `GET` | `/api/system` | Live system/resource/control snapshot |
| `GET` | `/api/system/apps` | Detected running applications |
| `POST` | `/api/system/controls/{id}` | Propose opening a Windows setting |
| `GET` | `/api/runtime` | Frontend/backend lifecycle status |
| `POST` | `/api/runtime/{action}` | Restart or stop both services; `action` is `restart` or `shutdown` |
| `POST` | `/api/chat` | Send `{ "message": "...", "conversationId": "optional" }` |
| `GET` | `/api/conversations` | List conversations |
| `GET` | `/api/conversations/{id}` | Read one conversation |
| `GET` | `/api/actions?status=pending` | List approval actions |
| `POST` | `/api/actions/{id}/approve` | Approve and execute an action |
| `POST` | `/api/actions/{id}/reject` | Reject an action |
| `GET` | `/api/memories` | List memories |
| `POST` | `/api/memories` | Create a memory |
| `DELETE` | `/api/memories/{id}` | Delete a memory |
| `GET` | `/api/integrations/phone-link` | Read current Phone Link metadata |
| `POST` | `/api/integrations/phone-link/open` | Propose launching Phone Link |
| `GET` | `/api/integrations/icloud-calendar?date=YYYY-MM-DD` | Read the selected day |
| `POST` | `/api/integrations/icloud-calendar/connect` | Verify and save iCloud credentials |
| `DELETE` | `/api/integrations/icloud-calendar` | Disconnect iCloud and remove credentials |
| `GET` | `/api/integrations/media-session` | Read the active Windows media session |
| `POST` | `/api/integrations/media-session/{action}` | Send play, pause, previous, next, shuffle, or mute locally |

## Troubleshooting

### “OPENAI_API_KEY is not configured”

Check the health response:

```powershell
Invoke-RestMethod http://127.0.0.1:4317/health
```

`openAiConfigured` must be `true`. Check `.env`, or open a new terminal after setting the Windows user variable, then restart both services. If both exist, remember that the environment variable wins.

### OpenAI reports a usage limit even though the usage page shows zero

ChatGPT subscriptions and OpenAI API billing are separate. Confirm that the API key belongs to the intended API project/organization, that billing or prepaid credits are active for that project, and that the project’s budget/usage limits allow requests. Restart the backend after replacing the key. See the [OpenAI API billing overview](https://platform.openai.com/settings/organization/billing/overview) and [usage dashboard](https://platform.openai.com/usage).

### Port 4173 or 4317 is already in use

Use the project lifecycle command, which resolves only this project’s two listeners and their related Node/Java process trees:

```powershell
.\scripts\project-lifecycle.ps1 -Action restart -WorkspaceRoot (Get-Location).Path
```

To inspect the listeners without changing them:

```powershell
Get-NetTCPConnection -State Listen | Where-Object LocalPort -In 4173,4317
```

### iCloud Calendar will not connect

- Use the Apple Account email and an app-specific password, not the normal password.
- Confirm two-factor authentication is enabled.
- Generate a new app-specific password if the main Apple password was changed or reset.
- Check internet access to `caldav.icloud.com`.

### Apple Music controls say to start a track

- Start one track manually in the embedded Apple player or Apple Music Windows app so Windows creates a media session.
- Select **Refresh status** in Settings after playback starts.
- Confirm Windows is version 10 build 17763 or later.
- Some browsers may not publish embedded audio as a Windows media session. If that occurs, use the Apple Music Windows app; the same Live Desktop controls will detect it automatically.
- Keep the dashboard page open. Switching Live Desktop tabs preserves the embedded player, but closing the browser page ends that web-player session.

### Phone Link information is stale

Open Phone Link, confirm the phone is paired and reachable, then use the widget’s refresh button. Some fields are unavailable until Phone Link writes fresh local metadata; Live Desktop intentionally does not fabricate missing device information.

## Implementation notes

- Backend: Java 21, Spring Boot 4.1, OpenAI Java SDK, ical4j.
- Frontend: React 19, Vite 6, React Icons.
- Apple Music: persistent Apple web embed plus Windows Global System Media Transport Controls.
- Calendar: iCloud CalDAV with local recurrence expansion.
- Credential protection: Windows DPAPI, current-user scope.
