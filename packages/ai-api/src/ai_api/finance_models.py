import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .database import Base


class BankAccount(Base):
    """Bank account linked to a user."""

    __tablename__ = "bank_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    bank_name = Column(String, nullable=False)  # 'Wise', 'N26', 'Nubank', etc.
    country = Column(String, nullable=False)  # ISO 3166-1 alpha-2: 'BR', 'DE', etc.
    account_alias = Column(String, nullable=True)  # User-friendly name
    account_type = Column(String, nullable=False)  # 'checking', 'savings', 'credit'
    last_four = Column(String, nullable=True)  # Last 4 digits of account number
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="bank_accounts")
    balances = relationship(
        "AccountBalance",
        back_populates="bank_account",
        cascade="all, delete-orphan",
    )
    cards = relationship(
        "Card",
        back_populates="bank_account",
        cascade="all, delete-orphan",
    )
    transactions = relationship(
        "Transaction",
        back_populates="bank_account",
        foreign_keys="Transaction.bank_account_id",
    )


class AccountBalance(Base):
    """Currency balance for a bank account (supports multi-currency accounts like Wise)."""

    __tablename__ = "account_balances"
    __table_args__ = (
        UniqueConstraint("bank_account_id", "currency", name="uq_account_balance_currency"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    bank_account_id = Column(
        UUID(as_uuid=True), ForeignKey("bank_accounts.id"), nullable=False, index=True
    )
    currency = Column(String, nullable=False)  # 'EUR', 'BRL', 'USD', etc.
    balance = Column(Numeric(precision=15, scale=2), nullable=False, default=Decimal("0"))
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationship
    bank_account = relationship("BankAccount", back_populates="balances")


class Card(Base):
    """Debit or credit card linked to a bank account."""

    __tablename__ = "cards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    bank_account_id = Column(
        UUID(as_uuid=True), ForeignKey("bank_accounts.id"), nullable=False, index=True
    )
    card_type = Column(String, nullable=False)  # 'debit', 'credit'
    last_four = Column(String, nullable=False)  # Last 4 digits of card
    card_alias = Column(String, nullable=True)  # 'Blue card', 'Platinum', etc.
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    bank_account = relationship("BankAccount", back_populates="cards")
    transactions = relationship(
        "Transaction",
        back_populates="card",
        cascade="all, delete-orphan",
    )


class Transaction(Base):
    """Financial transaction from bank notifications."""

    __tablename__ = "transactions"
    __table_args__ = (
        Index("idx_transactions_category", "category"),
        Index("idx_transactions_type", "transaction_type"),
        Index("idx_transactions_date", "transaction_date"),
        Index("idx_transactions_bank_account", "bank_account_id"),
        CheckConstraint(
            "card_id IS NOT NULL OR bank_account_id IS NOT NULL",
            name="ck_transaction_has_source",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    # Card transactions (optional - NULL for direct bank transfers)
    card_id = Column(UUID(as_uuid=True), ForeignKey("cards.id"), nullable=True, index=True)
    # Direct bank account transactions (optional - NULL for card transactions)
    bank_account_id = Column(
        UUID(as_uuid=True), ForeignKey("bank_accounts.id"), nullable=True, index=True
    )
    amount = Column(Numeric(precision=15, scale=2), nullable=False)
    currency = Column(String, nullable=False)  # Transaction currency
    merchant = Column(String, nullable=True)  # Store/vendor name
    description = Column(String, nullable=True)  # Full transaction description
    category = Column(String, nullable=True)  # 'food', 'transport', 'shopping', etc.
    transaction_type = Column(String, nullable=False)  # 'debit', 'credit', 'transfer'
    transaction_date = Column(DateTime, nullable=False)
    raw_message = Column(Text, nullable=False)  # Original notification text
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    card = relationship("Card", back_populates="transactions")
    bank_account = relationship(
        "BankAccount", back_populates="transactions", foreign_keys=[bank_account_id]
    )
