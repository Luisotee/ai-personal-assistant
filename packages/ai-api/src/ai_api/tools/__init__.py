"""Tools package - shared tool registration functions for agents."""

from datetime import datetime

from .deps import AgentDeps
from .finance import register_finance_tools
from .search import register_search_tools
from .utility import register_utility_tools
from .web import register_web_tools
from .whatsapp import register_whatsapp_tools


def register_time_prompt(agent) -> None:
    """Register a dynamic system prompt that includes current date/time."""

    @agent.system_prompt
    def add_current_time() -> str:
        return f"Current date and time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"


__all__ = [
    "AgentDeps",
    "register_finance_tools",
    "register_search_tools",
    "register_time_prompt",
    "register_utility_tools",
    "register_web_tools",
    "register_whatsapp_tools",
]
