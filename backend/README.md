# Live Desktop backend

The backend is a Java 21/Spring Boot 4.1 service that runs on `127.0.0.1:4317`. It owns OpenAI requests, relevance-filtered dashboard context, local conversations and memories, approval-backed Windows actions, system and Phone Link inspection, project lifecycle controls, iCloud CalDAV, and free local Windows media-session controls.

Use the complete setup, integration, security, API, test, and troubleshooting instructions in the [project README](../README.md).

From the repository root:

```powershell
.\scripts\bootstrap-java.ps1
.\scripts\run-backend.ps1
```

Health check:

```powershell
Invoke-RestMethod http://127.0.0.1:4317/health
```

Backend state is stored under `data\`. iCloud and Apple Music secret values are encrypted with Windows DPAPI for the current user before they are written. Never commit `.env` or the contents of `data\`.
