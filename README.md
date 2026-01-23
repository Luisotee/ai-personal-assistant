# AI WhatsApp Agent

A production-ready AI agent system that brings conversational AI to WhatsApp with persistent memory, RAG-powered knowledge bases, and multi-language speech processing.

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Client** | Node.js, TypeScript, Fastify, Baileys (WhatsApp Web), Zod |
| **API** | Python 3.11+, FastAPI, Pydantic AI, SQLAlchemy 2.0 |
| **AI/ML** | Google Gemini (LLM, Embeddings, TTS), Groq Whisper (STT) |
| **Database** | PostgreSQL 16 + pgvector (vector similarity search) |
| **Infrastructure** | Docker Compose, Redis Streams, Background Workers |

## Features

### Conversational AI with Memory
- Persistent conversation history stored in PostgreSQL
- Context-aware responses using configurable message windows
- Separate tracking for private chats and group conversations
- Semantic search through past conversations using vector embeddings

### RAG Knowledge Base
- PDF document upload with background processing (Docling)
- Semantic chunking with token-aware splitting (512 tokens/chunk)
- Vector similarity search using pgvector (3072-dim embeddings)
- Auto-generated citations with document name, page number, and section

### Speech Processing
- **Speech-to-Text:** Groq Whisper v3 large with auto language detection
- **Text-to-Speech:** Gemini TTS with language-specific voices
- **5 Languages:** English, Spanish, Portuguese, French, German
- Per-user language preferences

### Real-time Streaming
- Server-Sent Events (SSE) for token-by-token streaming
- Async job queue with polling for background processing
- Redis Streams for per-user message queuing

### WhatsApp Integration
- Group chat support with sender attribution and @mention handling
- Message reactions (status indicators)
- Media handling: images, audio, video, documents
- Location sharing and contact cards (vCard)
- Voice messages with TTS responses

### Automated Message Detection & Response
- Proactive AI responses to automated messages from third-party sources
- User preference system to enable/disable automated responses per conversation
- Channel selection (WhatsApp, future: Telegram, email)
- Support for flagging messages as automated via API (`is_automated` field)
- Ideal for parsing notifications from banking apps, payment services, email forwarding
- Integrates with automation tools like Macrodroid to forward phone notifications

### Command System
| Command | Description |
|---------|-------------|
| `/settings` | Show current TTS/STT preferences |
| `/tts on\|off` | Enable/disable voice responses |
| `/tts lang [code]` | Set TTS language (en, es, pt, fr, de) |
| `/stt lang [code\|auto]` | Set transcription language |
| `/clean` | Delete all conversation history |
| `/clean [1h\|7d\|1m]` | Delete messages from time period |
| `/help` | Show available commands |

## Architecture

```
┌─────────────────┐     HTTP/SSE      ┌─────────────────┐
│   WhatsApp      │◄────────────────►│    AI API       │
│   Client        │                   │   (FastAPI)     │
│   (Fastify)     │                   │                 │
└────────┬────────┘                   └────────┬────────┘
         │                                     │
         │ WebSocket                           │ Async
         │                                     │
┌────────▼────────┐                   ┌────────▼────────┐
│   WhatsApp      │                   │   PostgreSQL    │
│   (Baileys)     │                   │   + pgvector    │
└─────────────────┘                   └────────┬────────┘
                                               │
                              ┌────────────────┼────────────────┐
                              │                │                │
                      ┌───────▼──────┐ ┌───────▼──────┐ ┌───────▼──────┐
                      │   Gemini     │ │    Groq      │ │    Redis     │
                      │ LLM/Embed/TTS│ │   Whisper    │ │   Streams    │
                      └──────────────┘ └──────────────┘ └──────────────┘
```

**Key Patterns:**
- Pydantic AI agent with tool system (6 tools: search, reactions, location, contacts, etc.)
- Dependency injection for testable, modular code
- Graceful degradation when optional APIs unavailable
- Background job processing with Redis Streams consumer groups

## Project Structure

```
packages/
├── whatsapp-client/           # TypeScript - WhatsApp interface
│   └── src/
│       ├── main.ts            # Fastify server (port 3001)
│       ├── whatsapp.ts        # Baileys connection + message events
│       ├── handlers/          # Text and audio message processors
│       ├── routes/            # REST API (messaging, media, operations)
│       ├── services/          # Baileys abstraction layer
│       └── utils/             # JID, reactions, vCard utilities
│
├── ai-api/                    # Python - AI service
│   └── src/ai_api/
│       ├── main.py            # FastAPI app (port 8000)
│       ├── agent.py           # Pydantic AI agent + tools
│       ├── commands.py        # Command parser
│       ├── database.py        # SQLAlchemy models
│       ├── embeddings.py      # Vector embedding generation
│       ├── transcription.py   # Groq Whisper STT
│       ├── tts.py             # Gemini TTS synthesis
│       ├── processing.py      # PDF parsing (Docling)
│       ├── rag/               # RAG implementations
│       ├── queue/             # Redis job utilities
│       └── streams/           # Background processor
│
└── finance-dashboard/         # Next.js - Personal finance dashboard
    └── src/
        ├── app/               # App Router pages (port 3002)
        ├── components/        # React components (shadcn/ui)
        ├── contexts/          # React contexts (auth, settings)
        └── lib/               # API client, types, utilities
```

## Quick Start

### Prerequisites
- Docker and Docker Compose
- API Keys: [Google Gemini](https://aistudio.google.com/apikey), [Groq](https://console.groq.com/keys) (optional)

### Option 1: Docker Compose (Recommended)

The easiest way to run the full stack is with Docker Compose:

```bash
# Clone and configure
git clone https://github.com/Luisotee/ai-personal-assistant
cd ai-personal-assistant

# Create .env file with your API keys
cat > .env << EOF
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here  # Optional
EOF

# Build and start all services
docker compose up -d --build

# View logs
docker compose logs -f

# Check status
docker compose ps
```

**Updating the Deployment:**

```bash
# Pull latest changes
git pull

# Rebuild and restart services
docker compose up -d --build

# Or rebuild specific services
docker compose up -d --build api whatsapp dashboard
```

**Services:**
| Service | Port | Description |
|---------|------|-------------|
| postgres | 5432 | PostgreSQL with pgvector |
| redis | 6379 | Redis for job queues |
| api | 8000 | AI API (FastAPI) |
| worker | - | Background job processor |
| whatsapp | 3001 | WhatsApp client |
| dashboard | 3002 | Finance dashboard |
| adminer | 8080 | Database GUI |

**WhatsApp Authentication:**
```bash
# View QR code for first-time setup
docker compose logs -f whatsapp

# Session is persisted in Docker volume
```

### Option 2: Dockge

[Dockge](https://github.com/louislam/dockge) is a self-hosted Docker Compose manager with a web UI.

1. **Install Dockge** (if not already installed):
   ```bash
   mkdir -p /opt/stacks /opt/dockge
   cd /opt/dockge
   curl -fsSL https://raw.githubusercontent.com/louislam/dockge/master/compose.yaml -o compose.yaml
   docker compose up -d
   ```
   Access Dockge at http://localhost:5001

2. **Clone the repository** into Dockge's stacks directory:
   ```bash
   cd /opt/stacks
   git clone https://github.com/Luisotee/ai-personal-assistant
   ```

3. **Add environment variables** - Copy `.env.example` to `.env` and configure your values (API keys, production URLs, etc.)

4. **Start the stack** - Dockge will auto-detect the [`docker-compose.yml`](docker-compose.yml) file. Click "Start" in the UI.

> **Note:** If you have Redis or PostgreSQL already running on the host, remove or change the port mappings in the compose file to avoid conflicts.

### Option 3: Local Development

For development with hot-reload:

```bash
# Clone and configure
git clone https://github.com/Luisotee/ai-personal-assistant
cd ai-personal-assistant
cp .env.example .env  # Add your GEMINI_API_KEY

# Start infrastructure only
docker compose up -d postgres redis

# Terminal 1: AI API
cd packages/ai-api
cp .env.example .env
uv sync
uv run uvicorn ai_api.main:app --reload --port 8000

# Terminal 2: WhatsApp Client
cd packages/whatsapp-client
cp .env.example .env
pnpm install
pnpm dev  # Scan QR code when prompted

# Terminal 3: Finance Dashboard
cd packages/finance-dashboard
pnpm install
pnpm dev

# Terminal 4: Background Worker (optional)
pnpm dev:queue
```

### Verify
1. Send a message to your WhatsApp number
2. The AI agent responds with context-aware replies
3. API docs: http://localhost:8000/docs
4. Finance dashboard: http://localhost:3002
5. Database GUI: http://localhost:8080

## Automated Notifications with Macrodroid

One of the powerful features of this system is the ability to automatically process notifications from your phone and have the AI respond proactively. This is particularly useful for financial notifications, delivery updates, and other app notifications that you want to track or act upon.

### Use Cases

**Financial Tracking:**
- Bank transaction notifications (e.g., "You spent €3.50 at Lidl with Mastercard")
- Payment app notifications (Google Wallet, PayPal, Venmo)
- Credit card alerts and statements
- Investment updates and stock alerts

**Email Forwarding:**
- Forward bank statement emails to the AI for parsing
- Process invoice emails automatically
- Track subscription renewals and payments
- Receipt processing from online purchases

**Manual Entry:**
- Send transaction details directly via API
- Log expenses through custom integrations
- Connect with other automation tools (IFTTT, Zapier, n8n)

### Setup with Macrodroid (Android)

[Macrodroid](https://www.macrodroid.com/) is an Android automation app that can intercept notifications and forward them to your AI API.

#### Step 1: Install Macrodroid

1. Install [Macrodroid](https://play.google.com/store/apps/details?id=com.arlosoft.macrodroid) from Google Play
2. Grant notification access permissions
3. Grant any other required permissions (storage, network)

#### Step 2: Create Automation Macro

1. Open Macrodroid and tap **"Add Macro"**
2. Give it a name like "Forward Bank Notifications to AI"

**Trigger:**
- Select **"Notification"** trigger
- Choose the apps you want to monitor (e.g., your banking app, Google Wallet, PayPal)
- Select "Notification Received"

**Actions:**
- Add **"HTTP Request"** action
- Configure as follows:
  - **URL**: `http://your-server:8000/chat/enqueue`
  - **Method**: POST
  - **Content-Type**: application/json
  - **Request Body**:
    ```json
    {
      "whatsapp_jid": "YOUR_PHONE@s.whatsapp.net",
      "message": "[notification_title]\n\n[notification_text]",
      "conversation_type": "private",
      "is_automated": true,
      "automated_source": "macrodroid"
    }
    ```

Replace:
- `YOUR_PHONE@s.whatsapp.net` with your WhatsApp JID
- `your-server:8000` with your API endpoint
- Use Macrodroid's magic text variables like `[notification_title]` and `[notification_text]`

**Important:** The message field must have newlines properly formatted. Macrodroid will handle this automatically when using the JSON builder or `\n` escape sequences.

**Note:** Automated responses are **enabled by default** for all users with WhatsApp as the default channel. You can disable them at any time using the preference endpoints (see "Managing Automated Responses" below).

#### Step 3: Test the Setup

1. Trigger a test notification from one of your monitored apps (or use Macrodroid's test feature)
2. Check your WhatsApp - you should receive a proactive message from the AI with a 🤖 prefix
3. Check the AI API logs to verify processing:
   ```bash
   docker compose logs -f api worker
   ```

### Example: Bank Notification Flow

```
1. Bank sends notification: "Lidl sagt Danke 09/01/2026 - €3.50 with Mastercard .3978"
   ↓
2. Macrodroid intercepts notification
   ↓
3. Macrodroid sends HTTP POST to /chat/enqueue with is_automated=true
   ↓
4. AI API processes message in background (Redis Streams)
   ↓
5. AI parses transaction details, extracts merchant, amount, payment method
   ↓
6. AI saves transaction to finance database (via finance agent tools)
   ↓
7. AI sends proactive WhatsApp response:
   "🤖 Recorded transaction: €3.50 at Lidl paid with Mastercard ending in 3978"
```

### Email Forwarding

If your bank sends email notifications instead of (or in addition to) app notifications:

1. Set up email forwarding to a webhook service (e.g., [Mailgun](https://www.mailgun.com/), [SendGrid Inbound Parse](https://sendgrid.com/docs/for-developers/parsing-email/setting-up-the-inbound-parse-webhook/))
2. Create a webhook handler that extracts the email subject/body
3. Forward to your AI API's `/chat/enqueue` endpoint with `is_automated=true`
4. The AI will parse the email content and respond via WhatsApp

Alternatively, use email automation tools like [n8n](https://n8n.io/) or [Zapier](https://zapier.com/) to create workflows that monitor your inbox and forward matching emails to the AI API.

### Managing Automated Responses

Automated responses are **enabled by default** for all users with WhatsApp as the default channel.

**Check Current Settings:**
```bash
curl "http://your-server:8000/preferences/YOUR_PHONE@s.whatsapp.net/automated"
```

**Disable Automated Responses:**
```bash
curl -X PATCH "http://your-server:8000/preferences/YOUR_PHONE@s.whatsapp.net/automated?enabled=false"
```

**Re-enable Automated Responses:**
```bash
curl -X PATCH "http://your-server:8000/preferences/YOUR_PHONE@s.whatsapp.net/automated?enabled=true&channels=whatsapp"
```

When disabled, automated messages are still saved to conversation context but no proactive response is sent.

**Update Telegram Chat ID (for future multi-channel support):**
```bash
curl -X PATCH "http://your-server:8000/preferences/YOUR_PHONE@s.whatsapp.net/automated?telegram_chat_id=YOUR_TELEGRAM_CHAT_ID"
```

### Technical Details

- Automated messages are processed asynchronously via Redis Streams
- The `is_automated` flag triggers special handling in the AI agent
- User preferences are checked before sending proactive responses
- Messages are prefixed with 🤖 to indicate they're automated
- All automated messages are saved to conversation history for context
- The finance agent can automatically extract transaction details and save to database

## API Endpoints

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/chat` | Synchronous chat response |
| POST | `/chat/stream` | SSE streaming response |
| POST | `/chat/enqueue` | Async job (returns job_id, supports `is_automated` flag) |
| GET | `/chat/job/{job_id}` | Poll job status + chunks |

**Automated Messages:** Add `"is_automated": true` and optional `"automated_source": "macrodroid"` to the request body of `/chat/enqueue` to enable proactive AI responses via WhatsApp.

### Knowledge Base
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/knowledge-base/upload` | Upload single PDF |
| POST | `/knowledge-base/upload/batch` | Upload multiple PDFs |
| GET | `/knowledge-base/documents` | List documents (paginated) |
| GET | `/knowledge-base/status/{id}` | Processing status |
| DELETE | `/knowledge-base/documents/{id}` | Delete document |

### Speech
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/transcribe` | Speech-to-text (audio file) |
| POST | `/tts` | Text-to-speech (returns audio) |

### Preferences
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/preferences/{jid}` | Get user settings |
| PATCH | `/preferences/{jid}` | Update TTS/STT settings |
| GET | `/preferences/{jid}/automated` | Get automated response settings |
| PATCH | `/preferences/{jid}/automated` | Update automated response settings (enabled, channels, telegram_chat_id) |

## Development

```bash
# From project root
pnpm dev:server      # Start AI API
pnpm dev:whatsapp    # Start WhatsApp client
pnpm dev:dashboard   # Start Finance Dashboard
pnpm dev:queue       # Start background worker
pnpm seed:finance    # Seed finance database with demo data
pnpm install:all     # Install all dependencies
pnpm lint            # Check TypeScript + Python
pnpm format          # Format all code
```

### Database Access
- **Adminer GUI:** http://localhost:8080 (postgres / aiagent / changeme)
- **Direct:** `docker exec -it aiagent-postgres psql -U aiagent -d aiagent`

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key (required) |
| `GROQ_API_KEY` | Groq API key (optional, for STT) |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `AI_API_URL` | AI API endpoint for WhatsApp client |

See `packages/*/.env.example` for full configuration options.

## Production Deployment

When deploying behind a reverse proxy (e.g., Cloudflare Tunnel, nginx):

1. Update `CORS_ORIGINS` and `NEXT_PUBLIC_API_URL` in your `.env` file (see [`.env.example`](.env.example) for details)

2. Build and start services:
   ```bash
   docker compose up -d --build
   ```

3. Expose services via your reverse proxy:
   - `api.yourdomain.com` -> `localhost:8000`
   - `finance.yourdomain.com` -> `localhost:3002`

### Updating Production

```bash
# Pull latest changes
git pull

# Rebuild and restart all services
docker compose up -d --build

# Or update specific services only
docker compose up -d --build api
docker compose up -d --build whatsapp
docker compose up -d --build dashboard

# View logs to verify update
docker compose logs -f
```

## License

MIT
