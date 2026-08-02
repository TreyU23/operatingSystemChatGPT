# Local Assistant OS — Backend

This folder contains the first backend slice of a local-first assistant that runs beside Windows and will later be used by a localhost web interface.

It is an application, not a replacement operating-system kernel. The long-term “OS” experience will be a browser-based assistant shell backed by this service and narrowly scoped Windows/browser adapters.

## What works now

- Fastify API bound to `127.0.0.1` by default.
- OpenAI Responses API integration with multi-turn local conversation history.
- Read-only tools for listing and reading files inside this project workspace.
- Durable, user-owned local memory stored in `data/assistant-state.json`.
- Approval-gated proposals for workspace file writes, opening web URLs, and saving memories.
- No arbitrary shell execution and no file access outside `WORKSPACE_ROOT`.
- Automated API and workspace-boundary tests.

## Run locally

Requirements: Node.js 20+ and pnpm.

```powershell
pnpm install
Copy-Item .env.example .env
```

Add an OpenAI project API key to `.env`, then:

```powershell
pnpm dev
```

The API starts at `http://127.0.0.1:4317`.

Check it:

```powershell
Invoke-RestMethod http://127.0.0.1:4317/health
```

Never commit `.env`. A ChatGPT subscription does not supply an API key; API access is configured separately in the OpenAI platform.

## API surface

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Service and OpenAI configuration status |
| `POST` | `/api/chat` | Send `{ message, conversationId? }` |
| `GET` | `/api/conversations` | List conversations |
| `GET` | `/api/conversations/:id` | Read one conversation |
| `GET` | `/api/actions?status=pending` | Review assistant-proposed actions |
| `POST` | `/api/actions/:id/approve` | Approve and execute one action |
| `POST` | `/api/actions/:id/reject` | Reject one action |
| `GET` | `/api/memories` | List local memories |
| `POST` | `/api/memories` | Create an explicit memory |
| `DELETE` | `/api/memories/:id` | Forget a memory |

## Safety model

The model can request actions, but the backend owns the actual capabilities. Read-only project inspection runs automatically. Writes, browser launches, and model-suggested memories become pending records and require a separate approval request. Paths are restricted to the configured workspace, symbolic-link traversal is rejected, and only HTTP(S) URLs can be opened.

The API currently assumes a single trusted user on the local machine. Before exposing it beyond localhost, add authentication, origin/CSRF protection, rate limiting, encrypted secret storage, and a stronger audit log.

## “Learning” approach

The first version learns through explicit, editable memory rather than changing model weights or silently collecting activity. This is more predictable: the user can inspect and delete every durable memory. Later phases can add embeddings, memory consolidation, and feedback-based ranking while retaining that control.

## Suggested next milestones

1. Build the localhost chat and approval UI.
2. Add streaming responses over Server-Sent Events.
3. Add a Playwright browser adapter with per-domain permissions and screenshots before clicks/submits.
4. Add narrow Windows adapters (notifications, app launching, clipboard, and files) one capability at a time.
5. Add authentication and an append-only audit trail before any remote access.
