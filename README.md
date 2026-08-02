# Local Assistant OS

A local-first assistant service that runs beside Windows and will be used by a browser interface on localhost. The backend is Java; the future frontend will be TypeScript.

This is an assistant application rather than an operating-system kernel. Its “OS” experience will come from a browser-based shell, durable memory, and narrowly scoped Windows/browser capabilities.

## Project layout

```text
backend/    Java 21 + Spring Boot API
frontend/   Reserved for the TypeScript interface
data/       Local conversations, memories, and pending actions
scripts/    Project-local setup and run commands
```

## Backend capabilities

- OpenAI Responses API integration through the official Java SDK.
- Local conversation history and user-controlled durable memory.
- Read-only workspace file listing and text-file access.
- Explicit approval queue for file writes, opening browser URLs, and model-proposed memories.
- Workspace path confinement with symbolic-link traversal rejection.
- No arbitrary shell tool.
- API bound to `127.0.0.1` by default.

## Requirements

Java 21 is required. If Java is not installed globally, the included bootstrap script downloads a verified Eclipse Temurin 21 JDK into the ignored `.tools` directory:

```powershell
.\scripts\bootstrap-java.ps1
```

The Maven wrapper is included, so Maven does not need to be installed globally.

## Configure OpenAI

Copy the example configuration:

```powershell
Copy-Item .env.example .env
```

Put a newly created OpenAI project API key in `.env`:

```properties
OPENAI_API_KEY=your_replacement_key
```

API keys are secrets and must never be embedded in Java source or committed. `.env` is ignored by Git. The official OpenAI SDK also supports reading `OPENAI_API_KEY` directly from the process environment.

## Run

```powershell
.\scripts\run-backend.ps1
```

The service starts at `http://127.0.0.1:4317`.

```powershell
Invoke-RestMethod http://127.0.0.1:4317/health
```

## Build and test

```powershell
$env:JAVA_HOME = (Resolve-Path '.tools\jdk-21').Path
.\mvnw.cmd -pl backend test
.\mvnw.cmd -pl backend package
```

The packaged application is written to `backend/target/assistant-backend-0.1.0-SNAPSHOT.jar`.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Service and OpenAI configuration status |
| `POST` | `/api/chat` | Send `{ "message": "...", "conversationId": "optional" }` |
| `GET` | `/api/conversations` | List conversations |
| `GET` | `/api/conversations/:id` | Read a conversation |
| `GET` | `/api/actions?status=pending` | Review assistant-proposed actions |
| `POST` | `/api/actions/:id/approve` | Approve and execute an action |
| `POST` | `/api/actions/:id/reject` | Reject an action |
| `GET` | `/api/memories` | List local memories |
| `POST` | `/api/memories` | Create an explicit memory |
| `DELETE` | `/api/memories/:id` | Forget a memory |

## Safety model

The model can propose actions, but Java owns every real capability. Read-only project inspection can execute immediately. Writes, browser launches, and model-suggested memories are stored as pending actions and require a separate approval request.

The API currently assumes one trusted user on the local machine. Before exposing it beyond localhost, add authentication, origin and CSRF protection, rate limiting, encrypted secret storage, and an append-only audit log.

## Learning model

The assistant currently “learns” through explicit, inspectable memory rather than silently training or modifying model weights. Every durable memory can be listed and deleted. Later versions can add embeddings and memory consolidation while retaining user control.

## Next milestones

1. Build the TypeScript localhost chat and approval interface.
2. Add streaming responses using Server-Sent Events.
3. Add a Playwright for Java browser adapter with per-domain permissions.
4. Add narrow Windows capabilities one at a time.
5. Add authentication and an append-only audit trail before remote access.

OpenAI references: [Java quickstart](https://developers.openai.com/api/docs/quickstart), [function calling](https://developers.openai.com/api/docs/guides/function-calling), and [GPT-5.6 guidance](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-5.6).
