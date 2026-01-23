# Finance Dashboard

A modern, real-time personal finance dashboard built with Next.js 16, featuring comprehensive transaction tracking, analytics, and multi-currency support.

## Features

### Account Management
- View all bank accounts with real-time balances
- Multi-currency support with automatic conversion
- Account balance history and trends
- Account distribution visualization

### Card Management
- Track all credit/debit cards across accounts
- Card status monitoring (active/inactive)
- Card balance tracking
- Card limit management

### Transaction Tracking
- Real-time transaction feed with filtering and search
- Merchant categorization (Food & Dining, Shopping, Transport, etc.)
- Multi-currency transaction support
- Transaction type indicators (credit/debit)
- Date range filtering

### Analytics & Insights
- **Monthly spending trends** - Bar chart showing spending over time
- **Category breakdown** - Pie chart of spending by category
- **Cash flow analysis** - Income vs expenses over time
- **Day of week patterns** - Discover when you spend most
- **Account distribution** - See how your wealth is distributed across accounts

### User Experience
- Responsive design (mobile, tablet, desktop)
- Dark/light mode support
- Real-time data updates
- Empty states with helpful guidance
- Loading skeletons for smooth UX
- Currency conversion with live exchange rates

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5
- **UI Library:** React 19
- **Styling:** Tailwind CSS v4
- **UI Components:** shadcn/ui (Radix UI primitives)
- **Charts:** Recharts 2.15
- **State Management:** React Context API
- **API Client:** Fetch API with custom hooks
- **Authentication:** JWT-based auth (future)

## Getting Started

### Prerequisites

- Node.js 18+ (or use Docker)
- pnpm (recommended) or npm
- AI API running on port 8000 (see main README)

### Development

From the finance dashboard directory:

```bash
cd packages/finance-dashboard

# Install dependencies
pnpm install

# Create .env.local file
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF

# Start development server
pnpm dev
```

Open [http://localhost:3002](http://localhost:3002) in your browser.

### Production Build

```bash
# Build the application
pnpm build

# Start production server
pnpm start
```

### Docker Deployment

From the project root:

```bash
# Build and start all services (including dashboard)
docker compose up -d --build

# Or build just the dashboard
docker compose up -d --build dashboard
```

The dashboard will be available at [http://localhost:3002](http://localhost:3002).

## Environment Variables

Create a `.env.local` file in the dashboard directory:

```bash
# API endpoint (required)
NEXT_PUBLIC_API_URL=http://localhost:8000

# For production behind reverse proxy:
# NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

**Docker Note:** When using Docker Compose, the API URL is configured as a build argument in `docker-compose.yml`:

```yaml
build:
  args:
    NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:8000}
```

## Key Components

### Dashboard Overview (`app/page.tsx`)
- Stats cards: Total balance, monthly spending, transactions, active cards
- Cash flow chart: Income vs expenses over time
- Spending by category: Pie chart
- Monthly trend: Bar chart
- Account distribution: Horizontal bar chart
- Day of week analysis: Bar chart
- Recent transactions feed

### API Integration (`lib/api.ts`)
All data is fetched from the AI API's finance endpoints:
- `GET /finance/accounts` - Bank accounts
- `GET /finance/cards` - Cards
- `GET /finance/transactions` - Transactions with filtering
- `GET /finance/analytics/spending-by-category` - Category breakdown
- `GET /finance/analytics/monthly-spending` - Monthly trends

### Currency Handling (`lib/currency.ts`)
- Multi-currency formatting (EUR, USD, GBP, etc.)
- Automatic currency symbol and decimal places
- Real-time conversion to primary currency
- Exchange rate caching

## Data Flow

```
1. User opens dashboard
   ↓
2. React components fetch data from API client (lib/api.ts)
   ↓
3. API client makes HTTP requests to AI API (port 8000)
   ↓
4. AI API queries PostgreSQL database
   ↓
5. Data flows back to components
   ↓
6. Components render with Recharts visualizations
```

## Seeding Demo Data

To populate the dashboard with sample data for testing:

```bash
# From project root
pnpm seed:finance

# Or manually
cd packages/ai-api
uv run python -m ai_api.scripts.seed_finance
```

This creates:
- 3 sample bank accounts (checking, savings, investment)
- 4 sample cards
- 50+ sample transactions across various categories
- Multi-currency balances (EUR, USD)
