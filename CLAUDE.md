# CLAUDE.md

AI Whatsapp agent system: Node.js/TypeScript client (Baileys) + Python/FastAPI API (Pydantic AI + Gemini) + Finance Dashboard.

## Structure

```
packages/
├── whatsapp-client/              # TypeScript - WhatsApp interface + REST API
│   └── src/
│       ├── main.ts               # Fastify server entry point (port 3001)
│       ├── whatsapp.ts           # Baileys WebSocket connection, QR auth, message events
│       ├── api-client.ts         # HTTP client for AI API with job polling
│       ├── config.ts             # Environment configuration loader
│       ├── logger.ts             # Pino logger setup
│       ├── types.ts              # TypeScript type definitions
│       ├── handlers/             # Incoming message processors
│       │   ├── text.ts           # Text handler with AI integration + TTS
│       │   └── audio.ts          # Audio transcription handler
│       ├── routes/               # API endpoints (health, messaging, media, operations)
│       ├── services/             # Baileys service layer
│       ├── schemas/              # Zod request/response validation
│       └── utils/                # Helpers (JID, message extraction, reactions, file validation, vCard)
│
├── ai-api/                       # Python - AI service with RAG + transcription + TTS + Finance API
│   └── src/ai_api/
│       ├── main.py               # FastAPI app entry point (port 8000)
│       ├── agent.py              # Pydantic AI agent + Gemini integration
│       ├── commands.py           # Command parser (/settings, /tts, /stt, /help)
│       ├── config.py             # Settings with pydantic-settings
│       ├── database.py           # SQLAlchemy models (User, ConversationMessage, ConversationPreferences)
│       ├── finance_models.py     # Finance models (BankAccount, Card, Transaction, AccountBalance)
│       ├── kb_models.py          # Knowledge base models (KnowledgeBaseDocument, KnowledgeBaseChunk)
│       ├── schemas.py            # Pydantic request/response models
│       ├── embeddings.py         # Vector embedding generation (pgvector)
│       ├── transcription.py      # Groq Whisper speech-to-text
│       ├── tts.py                # Gemini text-to-speech synthesis
│       ├── processing.py         # PDF processing with Docling
│       ├── logger.py             # Structured logging
│       ├── whatsapp/             # WhatsApp REST API client
│       │   ├── client.py         # Async HTTP client for messaging
│       │   └── exceptions.py     # Custom exceptions
│       ├── rag/                  # RAG implementations (history + knowledge base search)
│       ├── routes/               # API route modules
│       │   └── finance.py        # Finance REST API (accounts, cards, transactions, analytics)
│       ├── queue/                # Background jobs (arq + Redis)
│       ├── streams/              # Redis Streams job processing
│       └── scripts/              # Worker runner scripts
│
└── finance-dashboard/            # Next.js - Personal finance dashboard (port 3002)
    └── src/
        ├── app/                  # App Router pages (dashboard, accounts, cards, transactions)
        ├── components/           # React components
        │   ├── ui/               # shadcn/ui components
        │   ├── layout/           # Layout components (app-sidebar)
        │   ├── dashboard/        # Dashboard-specific (stats-card, skeletons)
        │   └── auth/             # Auth components (login-page, auth-guard)
        ├── contexts/             # React contexts (auth-context)
        └── lib/                  # API client, types, utilities
```

## Commands

```bash
# Infrastructure
docker-compose up -d                    # PostgreSQL + Redis + Adminer + full stack

# Development (from root)
pnpm dev:server                         # Start AI API (port 8000)
pnpm dev:whatsapp                       # Start WhatsApp client (port 3001)
pnpm dev:dashboard                      # Start Finance Dashboard (port 3002)
pnpm dev:queue                          # Start background stream worker
pnpm install:all                        # Install Node + Python dependencies

# Manual startup
cd packages/ai-api && uv run uvicorn ai_api.main:app --reload --port 8000
cd packages/whatsapp-client && pnpm dev # Scan QR code when prompted
cd packages/finance-dashboard && pnpm dev

# Linting & Formatting
pnpm lint                               # Check TypeScript (ESLint) + Python (Ruff)
pnpm format                             # Format TypeScript (Prettier) + Python (Ruff)
```

## Guidelines

- Use `pnpm add` / `uv add` for dependencies (never edit package.json/pyproject.toml directly)
- Prefer pure functions over classes
- Use structured logging (Pino for TS, Python logging) - no console.log/print
- Keep this file updated with important changes
- There is no need for you to write tests for this project, the human developer will handle that.

## References

- `README.md` - Setup guide and environment variables
- `PLAN.md` - Architecture and design decisions
- `packages/*/.env.example` - Environment templates
- API docs: http://localhost:8000/docs (Swagger UI)
- Finance Dashboard: http://localhost:3002
- DB GUI: http://localhost:8080 (Adminer)
