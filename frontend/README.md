# Live Desktop frontend

The frontend is a Vite + React interface for the local Java assistant service. It includes live system information, approval-backed Windows controls, assistant conversations, memories, running-application widgets, and Microsoft Phone Link detection.

## Run locally

Start the backend from the repository root, then start this frontend:

```powershell
.\scripts\run-backend.ps1
.\scripts\run-frontend.ps1
```

The interface opens at `http://localhost:4173`. Vite proxies `/health` and `/api` requests to the backend on `127.0.0.1:4317`.

Windows toggles do not execute hidden registry or shell mutations. Selecting one creates an approval that opens the matching Windows Settings surface. Phone Link follows the same approval path.
