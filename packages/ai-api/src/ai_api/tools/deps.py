"""Shared dependencies for agent tools."""

from dataclasses import dataclass

import httpx
from sqlalchemy.orm import Session

from ..embeddings import EmbeddingService
from ..whatsapp import WhatsAppClient


@dataclass
class AgentDeps:
    """
    Dependencies for agent tools.

    Follows Pydantic AI best practices by injecting all dependencies
    via this dataclass instead of using global singletons.
    """

    db: Session
    user_id: str
    whatsapp_jid: str
    recent_message_ids: list[str]
    embedding_service: EmbeddingService | None = None
    http_client: httpx.AsyncClient | None = None
    whatsapp_client: WhatsAppClient | None = None
    current_message_id: str | None = None
