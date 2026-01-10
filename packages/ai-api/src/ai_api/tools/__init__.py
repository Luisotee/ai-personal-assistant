"""Tools package - shared tool registration functions for agents."""

from .deps import AgentDeps
from .finance import register_finance_tools
from .search import register_search_tools
from .utility import register_utility_tools
from .web import register_web_tools
from .whatsapp import register_whatsapp_tools

__all__ = [
    "AgentDeps",
    "register_finance_tools",
    "register_search_tools",
    "register_utility_tools",
    "register_web_tools",
    "register_whatsapp_tools",
]
