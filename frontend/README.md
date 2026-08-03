# Live Desktop frontend

The frontend is a React 19/Vite 6 true-black Windows dashboard. It includes system controls and information, conversations, memories, approvals, iCloud Calendar, a persistent custom Apple Music player, Phone Link status, settings, and frontend/backend lifecycle controls.

Use the complete first-time setup, integration, security, build, and troubleshooting instructions in the [project README](../README.md).

After the backend is running, start the frontend from the repository root:

```powershell
.\scripts\run-frontend.ps1
```

Open [http://localhost:4173](http://localhost:4173). Vite proxies `/health` and `/api` to `http://127.0.0.1:4317`.

For a fresh dependency install and production verification:

```powershell
pnpm --dir frontend install --frozen-lockfile
pnpm --dir frontend run build
pnpm --dir frontend run test:sites
```

Apple Music uses the embedded Apple web player and Windows' built-in media-session controls. It requires no Apple Developer Program membership, developer token, `.p8` key, or extra paid API.
