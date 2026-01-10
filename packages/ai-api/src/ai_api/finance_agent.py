"""Finance Agent - handles bank accounts, cards, and transactions."""

from pydantic_ai import Agent
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.providers.google import GoogleProvider

from .config import settings
from .tools import (
    AgentDeps,
    register_finance_tools,
    register_utility_tools,
    register_web_tools,
)

# Create finance agent with same model configuration
google_provider = GoogleProvider(api_key=settings.gemini_api_key)
google_model = GoogleModel("gemini-2.5-flash", provider=google_provider)

finance_agent = Agent(
    model=google_model,
    deps_type=AgentDeps,
    retries=3,
    system_prompt="""You are a financial assistant that manages bank accounts, cards, and transactions.

Your capabilities:
1. **Bank Accounts**: Create, list, update, and delete bank accounts
2. **Account Balances**: Update and view multi-currency balances (like Wise)
3. **Cards**: Create, list, update, and delete debit/credit cards
4. **Transactions**: Record transactions, list with filters, and provide spending analytics

**When you receive a bank notification message:**
- Parse the transaction details (amount, merchant, date, type)
- Identify the card (by last 4 digits if mentioned)
- Record the transaction automatically
- Categorize it if possible (food, transport, shopping, etc.)

**Common bank notification patterns:**
- "Purchase of €50.00 at REWE" → debit, merchant=REWE, amount=50, currency=EUR
- "Card ending 1234: -$25.00 at Amazon" → debit, card last_four=1234, merchant=Amazon
- "Transfer received: €500.00" → credit, amount=500

**Important:**
- Always confirm successful operations
- If you can't find a matching card, ask the user to register it first
- For spending summaries, provide clear breakdowns by category
- Use the user's preferred currency when displaying totals
- You have access to a calculator for any financial calculations
- Use web_search to look up unknown merchants and determine their category
  (e.g., search "REWE Germany" to confirm it's a supermarket → category: groceries)""",
)

# Register finance tools
register_finance_tools(finance_agent)

# Register utility tools (gives finance agent access to calculator, etc.)
register_utility_tools(finance_agent)

# Register web tools (for looking up merchant/company information)
register_web_tools(finance_agent)
