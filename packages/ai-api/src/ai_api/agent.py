"""Main AI agent with tool registration."""

import base64

from pydantic_ai import Agent, BinaryContent, RunContext
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.providers.google import GoogleProvider

from .config import settings
from .logger import logger
from .tools import (
    AgentDeps,
    register_search_tools,
    register_time_prompt,
    register_utility_tools,
    register_web_tools,
    register_whatsapp_tools,
)

# Create Google provider and model with API key from settings
google_provider = GoogleProvider(api_key=settings.gemini_api_key)
google_model = GoogleModel("gemini-2.5-flash", provider=google_provider)

# Create the AI agent with dependencies
agent = Agent(
    model=google_model,
    deps_type=AgentDeps,
    retries=3,  # Increase from default 1 to handle occasional malformed Gemini responses
    system_prompt="""You are a helpful AI assistant communicating via WhatsApp.
    Be concise, friendly, and helpful. Keep responses brief and to the point.
    If you don't know something, say so clearly.

    You have access to search tools, web tools, and WhatsApp action tools:

    **Search Tools:**
    1. **search_conversation_history** - Searches past messages with this user
       Use when user asks about previous conversations or references past topics

    2. **search_knowledge_base** - Searches uploaded PDF documents
       Use when user asks factual questions that might be in documentation
       Always cite sources: "According to [Document Name] (page X)..."

    **Web Tools:**
    3. **web_search** - Search the internet for current information
       Use for: recent news, current events, up-to-date facts, latest documentation
       Do NOT use for: historical facts, general knowledge in your training

    4. **fetch_website** - Read content from a specific URL
       Use for: when user shares a link, asks to summarize/analyze a webpage
       Do NOT use for: searching (use web_search instead)

    **WhatsApp Action Tools:**
    5. **send_whatsapp_reaction** - React to the user's message with an emoji
       Use when the message warrants an emotional response or acknowledgment
       Common: 👍 (approval), ❤️ (love/thanks), 😂 (funny), 😮 (surprised)

    6. **send_whatsapp_location** - Send a location with coordinates
       Use when sharing a place would be helpful (directions, recommendations)

    7. **send_whatsapp_contact** - Send a contact card
       Use when sharing contact information (support numbers, business contacts)

    8. **send_whatsapp_message** - Send an additional text message
       Use sparingly - only for follow-up messages separate from your main response

    **Utility Tools:**
    9. **calculate** - Evaluate math expressions
       Use for: calculations, percentages, tip calculations, formulas
       Example: "What's 15% of $47.80?" → calculate("47.80 * 0.15")

    10. **get_weather** - Get current weather for a city
        Use for: weather queries, temperature, conditions
        Example: "Weather in Berlin?" → get_weather("Berlin")

    11. **wikipedia_lookup** - Look up factual information on Wikipedia
        Use for: definitions, facts, biographies, historical info
        Do NOT use for: current events (use web_search instead)

    12. **convert_units** - Convert between units
        Use for: unit conversions (length, weight, temperature, volume, etc.)
        Example: "100 km to miles" → convert_units(100, "km", "miles")

    **Financial Management:**
    13. **manage_finances** - Delegate financial operations to the finance agent
        Use for: bank accounts, cards, transactions, spending analysis
        - Creating/managing bank accounts and cards
        - Recording transactions from bank notifications
        - Querying spending summaries and analytics
        - Updating account balances

        **IMPORTANT:** When you receive a message that looks like a bank notification
        (e.g., "Purchase of €50.00 at REWE", "Card ending 1234: -$25.00 at Amazon"),
        automatically delegate to the finance agent to parse and store it.

    **When NOT to use tools:**
    - Simple greetings or chitchat (no tools needed)
    - Questions fully answerable with recent context (no search needed)
    - General knowledge queries (use your training)

    **Important:** WhatsApp tools only send to the current conversation. You cannot message other users.

    When citing knowledge base sources, ALWAYS include document name, page number, and section heading.""",
)

# Register prompts and tools from shared modules
register_time_prompt(agent)
register_search_tools(agent)
register_web_tools(agent)
register_utility_tools(agent)
register_whatsapp_tools(agent)


# =============================================================================
# Finance Delegation Tool
# =============================================================================

# Import here to avoid circular import (finance_agent imports AgentDeps from tools)
from .finance_agent import finance_agent  # noqa: E402


@agent.tool
async def manage_finances(ctx: RunContext[AgentDeps], request: str) -> str:
    """
    Delegate financial operations to the specialized finance agent.

    Use this tool for ANY financial request including:
    - Creating, listing, updating, or deleting bank accounts
    - Managing cards (debit/credit)
    - Recording transactions from bank notifications
    - Updating account balances
    - Querying spending summaries and analytics

    **IMPORTANT:** When you receive a message that looks like a bank notification
    (e.g., "Purchase of €50.00 at REWE", "Compra de R$100 no Mercado"),
    use this tool to parse and record the transaction automatically.

    Args:
        ctx: Run context with database and user info
        request: The financial request or bank notification to process

    Returns:
        Result from the finance agent
    """
    logger.info("=" * 80)
    logger.info("💰 TOOL CALLED: manage_finances (delegating to finance agent)")
    logger.info(f"   Request: {request[:100]}...")
    logger.info("=" * 80)

    try:
        # Delegate to finance agent, passing dependencies and usage tracking
        result = await finance_agent.run(
            request,
            deps=ctx.deps,
            usage=ctx.usage,
        )

        logger.info("=" * 80)
        logger.info("✅ Finance agent completed")
        logger.info(f"   Output: {result.output[:200] if result.output else 'None'}...")
        logger.info("=" * 80)

        return result.output

    except Exception as e:
        logger.error(f"Finance agent failed: {e}", exc_info=True)
        return f"Financial operation failed: {str(e)}"


async def get_ai_response(
    user_message: str,
    message_history=None,
    agent_deps: AgentDeps = None,
    image_data: str | None = None,
    image_mimetype: str | None = None,
):
    """
    Stream AI response token by token for a user message with optional history

    Args:
        user_message: The user's message
        message_history: Optional list of previous messages
        agent_deps: Optional dependencies for agent tools (enables semantic search)
        image_data: Optional base64-encoded image data for vision
        image_mimetype: Optional image MIME type (e.g., 'image/jpeg')

    Yields:
        str: Text chunks as they arrive from Gemini
    """
    has_image = image_data is not None and image_mimetype is not None

    logger.info("=" * 80)
    logger.info("🤖 AGENT STARTING")
    logger.info(f"   User message: {user_message}")
    logger.info(f"   History messages: {len(message_history) if message_history else 0}")
    logger.info(f"   Has image: {has_image}")
    logger.info(f"   Has dependencies: {agent_deps is not None}")
    if agent_deps:
        logger.info(f"   - Embedding service: {agent_deps.embedding_service is not None}")
    logger.info("=" * 80)

    # Construct the prompt - either text only or text + image
    if has_image:
        # Decode base64 image and create BinaryContent
        image_bytes = base64.b64decode(image_data)
        prompt = [
            user_message,
            BinaryContent(data=image_bytes, media_type=image_mimetype),
        ]
        logger.info(f"   Image size: {len(image_bytes)} bytes, type: {image_mimetype}")
    else:
        prompt = user_message

    # Track full response for logging
    full_response = ""

    # Use async context manager to enter streaming context
    async with agent.run_stream(prompt, message_history=message_history, deps=agent_deps) as result:
        # Call .stream_text(delta=True) to get incremental deltas (NOT cumulative text)
        async for text_chunk in result.stream_text(delta=True):
            full_response += text_chunk
            yield text_chunk

    logger.info("=" * 80)
    logger.info("✅ AGENT COMPLETED")
    logger.info(f"   Final response length: {len(full_response)} characters")
    logger.info(f"   Full response:\n{full_response}")
    logger.info("=" * 80)


def format_message_history(db_messages):
    """
    Convert database messages to Pydantic AI message format

    Args:
        db_messages: List of ConversationMessage objects

    Returns:
        List of messages in Pydantic AI format
    """
    from pydantic_ai import (
        ModelRequest,
        ModelResponse,
        TextPart,
        UserPromptPart,
    )

    formatted = []
    for msg in db_messages:
        if msg.role == "user":
            formatted.append(ModelRequest(parts=[UserPromptPart(content=msg.content)]))
        else:
            formatted.append(ModelResponse(parts=[TextPart(content=msg.content)]))

    return formatted
