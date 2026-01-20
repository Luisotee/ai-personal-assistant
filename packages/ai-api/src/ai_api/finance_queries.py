"""Pure database functions for finance operations."""

from datetime import datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, text
from sqlalchemy.orm import Session

from .finance_models import AccountBalance, BankAccount, Card, Transaction
from .logger import logger

# =============================================================================
# Bank Account Functions
# =============================================================================


def create_bank_account(
    db: Session,
    user_id: str,
    bank_name: str,
    country: str,
    account_type: str,
    account_alias: str | None = None,
    last_four: str | None = None,
) -> BankAccount:
    """Create a new bank account for a user."""
    account = BankAccount(
        user_id=UUID(user_id),
        bank_name=bank_name,
        country=country.upper(),
        account_type=account_type,
        account_alias=account_alias,
        last_four=last_four,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    logger.info(f"Created bank account: {bank_name} ({account_type}) for user {user_id}")
    return account


def get_user_bank_accounts(db: Session, user_id: str) -> list[BankAccount]:
    """Get all bank accounts for a user."""
    return (
        db.query(BankAccount)
        .filter(BankAccount.user_id == UUID(user_id))
        .order_by(BankAccount.created_at.desc())
        .all()
    )


def get_bank_account_by_id(db: Session, account_id: str, user_id: str) -> BankAccount | None:
    """Get a specific bank account by ID, ensuring it belongs to the user."""
    return (
        db.query(BankAccount)
        .filter(BankAccount.id == UUID(account_id), BankAccount.user_id == UUID(user_id))
        .first()
    )


def update_bank_account(
    db: Session,
    account_id: str,
    user_id: str,
    account_alias: str | None = None,
    account_type: str | None = None,
) -> BankAccount | None:
    """Update a bank account's details."""
    account = get_bank_account_by_id(db, account_id, user_id)
    if not account:
        return None

    if account_alias is not None:
        account.account_alias = account_alias
    if account_type is not None:
        account.account_type = account_type

    db.commit()
    db.refresh(account)
    logger.info(f"Updated bank account: {account_id}")
    return account


def delete_bank_account(db: Session, account_id: str, user_id: str) -> bool:
    """Delete a bank account and all related data (cascades to balances, cards, transactions)."""
    account = get_bank_account_by_id(db, account_id, user_id)
    if not account:
        return False

    db.delete(account)
    db.commit()
    logger.info(f"Deleted bank account: {account_id}")
    return True


# =============================================================================
# Account Balance Functions
# =============================================================================


def update_account_balance(
    db: Session,
    account_id: str,
    user_id: str,
    currency: str,
    balance: Decimal,
) -> AccountBalance | None:
    """Update or create a balance for a specific currency in an account."""
    # Verify account belongs to user
    account = get_bank_account_by_id(db, account_id, user_id)
    if not account:
        return None

    # Find existing balance or create new
    existing = (
        db.query(AccountBalance)
        .filter(
            AccountBalance.bank_account_id == UUID(account_id),
            AccountBalance.currency == currency.upper(),
        )
        .first()
    )

    if existing:
        existing.balance = balance
        db.commit()
        db.refresh(existing)
        logger.info(f"Updated balance for account {account_id}: {currency} {balance}")
        return existing
    else:
        new_balance = AccountBalance(
            bank_account_id=UUID(account_id),
            currency=currency.upper(),
            balance=balance,
        )
        db.add(new_balance)
        db.commit()
        db.refresh(new_balance)
        logger.info(f"Created balance for account {account_id}: {currency} {balance}")
        return new_balance


def get_account_balances(db: Session, account_id: str, user_id: str) -> list[AccountBalance]:
    """Get all balances for an account."""
    # Verify account belongs to user
    account = get_bank_account_by_id(db, account_id, user_id)
    if not account:
        return []

    return (
        db.query(AccountBalance)
        .filter(AccountBalance.bank_account_id == UUID(account_id))
        .order_by(AccountBalance.currency)
        .all()
    )


# =============================================================================
# Card Functions
# =============================================================================


def create_card(
    db: Session,
    account_id: str,
    user_id: str,
    card_type: str,
    last_four: str,
    card_alias: str | None = None,
) -> Card | None:
    """Create a new card for a bank account."""
    # Verify account belongs to user
    account = get_bank_account_by_id(db, account_id, user_id)
    if not account:
        return None

    card = Card(
        bank_account_id=UUID(account_id),
        card_type=card_type,
        last_four=last_four,
        card_alias=card_alias,
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    logger.info(f"Created {card_type} card ending in {last_four} for account {account_id}")
    return card


def get_user_cards(db: Session, user_id: str, account_id: str | None = None) -> list[Card]:
    """Get all cards for a user, optionally filtered by account."""
    query = db.query(Card).join(BankAccount).filter(BankAccount.user_id == UUID(user_id))

    if account_id:
        query = query.filter(Card.bank_account_id == UUID(account_id))

    return query.order_by(Card.created_at.desc()).all()


def get_card_by_id(db: Session, card_id: str, user_id: str) -> Card | None:
    """Get a specific card by ID, ensuring it belongs to the user."""
    return (
        db.query(Card)
        .join(BankAccount)
        .filter(Card.id == UUID(card_id), BankAccount.user_id == UUID(user_id))
        .first()
    )


def update_card(
    db: Session,
    card_id: str,
    user_id: str,
    card_alias: str | None = None,
    is_active: bool | None = None,
) -> Card | None:
    """Update a card's details."""
    card = get_card_by_id(db, card_id, user_id)
    if not card:
        return None

    if card_alias is not None:
        card.card_alias = card_alias
    if is_active is not None:
        card.is_active = is_active

    db.commit()
    db.refresh(card)
    logger.info(f"Updated card: {card_id}")
    return card


def delete_card(db: Session, card_id: str, user_id: str) -> bool:
    """Delete a card and all its transactions."""
    card = get_card_by_id(db, card_id, user_id)
    if not card:
        return False

    db.delete(card)
    db.commit()
    logger.info(f"Deleted card: {card_id}")
    return True


def get_card_by_last_four(
    db: Session,
    user_id: str,
    last_four: str,
) -> Card | None:
    """Find an active card by last 4 digits for a user."""
    return (
        db.query(Card)
        .join(BankAccount)
        .filter(
            BankAccount.user_id == UUID(user_id),
            Card.last_four == last_four,
            Card.is_active,
        )
        .first()
    )


def get_user_accounts_count(
    db: Session,
    user_id: str,
) -> int:
    """Count how many bank accounts a user has."""
    return db.query(BankAccount).filter(BankAccount.user_id == UUID(user_id)).count()


def get_default_payment_method(
    db: Session,
    user_id: str,
    account_id: str | None = None,
) -> tuple[str | None, str | None, BankAccount | None]:
    """
    Get the default payment method for a user when account_id is explicitly provided.

    Returns:
        Tuple of (card_id, bank_account_id, account_object)
        - If account_id specified: returns that account's first active card or the account
        - If account_id NOT specified: returns (None, None, None) → agent must deduce from context or ask

    Logic:
    1. If account_id specified, use that account's first active card
    2. If account_id NOT specified, return None → agent must use context to determine account
       (Don't auto-use single account - AI must have context to choose!)
    """
    if account_id:
        account = get_bank_account_by_id(db, account_id, user_id)
        if not account:
            return (None, None, None)
    else:
        # NO auto-detection - agent must provide account_id based on context
        # Don't assume the single account is correct without context!
        logger.info("No account_id provided - agent must deduce from context or ask user")
        return (None, None, None)

    # Try to find an active card for this account
    card = (
        db.query(Card)
        .filter(
            Card.bank_account_id == account.id,
            Card.is_active,
        )
        .order_by(Card.created_at.desc())
        .first()
    )

    if card:
        logger.info(f"Using card {card.id} (•••{card.last_four}) from account {account.bank_name}")
        return (str(card.id), None, account)
    else:
        logger.info(f"No active cards, using account {account.bank_name} for direct transfer")
        return (None, str(account.id), account)


# =============================================================================
# Transaction Functions
# =============================================================================


def record_transaction(
    db: Session,
    user_id: str,
    amount: Decimal,
    currency: str,
    transaction_type: str,
    transaction_date: datetime,
    raw_message: str,
    card_id: str | None = None,
    bank_account_id: str | None = None,
    merchant: str | None = None,
    description: str | None = None,
    category: str | None = None,
) -> Transaction | None:
    """Record a new transaction.

    Either card_id or bank_account_id must be provided.
    - Use card_id for card transactions (purchases, ATM withdrawals)
    - Use bank_account_id for direct bank transfers (PIX, wire, SEPA)
    """
    if not card_id and not bank_account_id:
        logger.error("Either card_id or bank_account_id must be provided")
        return None

    # Verify card or account belongs to user
    if card_id:
        card = get_card_by_id(db, card_id, user_id)
        if not card:
            logger.error(f"Card not found or doesn't belong to user: {card_id}")
            return None
    else:
        account = get_bank_account_by_id(db, bank_account_id, user_id)
        if not account:
            logger.error(f"Bank account not found or doesn't belong to user: {bank_account_id}")
            return None

    transaction = Transaction(
        card_id=UUID(card_id) if card_id else None,
        bank_account_id=UUID(bank_account_id) if bank_account_id else None,
        amount=amount,
        currency=currency.upper(),
        merchant=merchant,
        description=description,
        category=category,
        transaction_type=transaction_type,
        transaction_date=transaction_date,
        raw_message=raw_message,
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    source = f"card {card_id}" if card_id else f"account {bank_account_id}"
    logger.info(
        f"Recorded transaction: {amount} {currency} via {source} at {merchant or 'unknown'}"
    )
    return transaction


def get_user_transactions(
    db: Session,
    user_id: str,
    days: int = 30,
    category: str | None = None,
    merchant: str | None = None,
    card_id: str | None = None,
    bank_account_id: str | None = None,
    limit: int = 50,
) -> list[Transaction]:
    """Get transactions for a user with optional filters.

    Includes both card transactions and direct bank account transactions.
    """
    from sqlalchemy import or_

    since = datetime.utcnow() - timedelta(days=days)

    # Query transactions via either path:
    # 1. Card transactions: card_id -> Card -> BankAccount -> user_id
    # 2. Direct bank transactions: bank_account_id -> BankAccount -> user_id
    query = (
        db.query(Transaction)
        .outerjoin(Card, Transaction.card_id == Card.id)
        .outerjoin(
            BankAccount,
            or_(
                Card.bank_account_id == BankAccount.id,
                Transaction.bank_account_id == BankAccount.id,
            ),
        )
        .filter(
            BankAccount.user_id == UUID(user_id),
            Transaction.transaction_date >= since,
        )
    )

    if category:
        query = query.filter(Transaction.category.ilike(f"%{category}%"))
    if merchant:
        query = query.filter(Transaction.merchant.ilike(f"%{merchant}%"))
    if card_id:
        query = query.filter(Transaction.card_id == UUID(card_id))
    if bank_account_id:
        # Filter by account - includes both direct and card transactions for that account
        query = query.filter(
            or_(
                Transaction.bank_account_id == UUID(bank_account_id),
                Card.bank_account_id == UUID(bank_account_id),
            )
        )

    return query.order_by(Transaction.transaction_date.desc()).limit(limit).all()


def get_spending_summary(
    db: Session,
    user_id: str,
    days: int = 30,
    group_by: str = "category",
) -> dict:
    """Get spending summary with totals grouped by category or other fields.

    Includes both card transactions and direct bank account transactions.
    """
    from sqlalchemy import or_

    since = datetime.utcnow() - timedelta(days=days)

    # Base query for transactions via either path
    def _base_query():
        return (
            db.query(Transaction)
            .outerjoin(Card, Transaction.card_id == Card.id)
            .outerjoin(
                BankAccount,
                or_(
                    Card.bank_account_id == BankAccount.id,
                    Transaction.bank_account_id == BankAccount.id,
                ),
            )
            .filter(
                BankAccount.user_id == UUID(user_id),
                Transaction.transaction_date >= since,
            )
        )

    # Total spending (debits only)
    total_spending = (
        db.query(func.sum(Transaction.amount))
        .select_from(Transaction)
        .outerjoin(Card, Transaction.card_id == Card.id)
        .outerjoin(
            BankAccount,
            or_(
                Card.bank_account_id == BankAccount.id,
                Transaction.bank_account_id == BankAccount.id,
            ),
        )
        .filter(
            BankAccount.user_id == UUID(user_id),
            Transaction.transaction_date >= since,
            Transaction.transaction_type == "debit",
        )
        .scalar()
    ) or Decimal("0")

    # Total income (credits only)
    total_income = (
        db.query(func.sum(Transaction.amount))
        .select_from(Transaction)
        .outerjoin(Card, Transaction.card_id == Card.id)
        .outerjoin(
            BankAccount,
            or_(
                Card.bank_account_id == BankAccount.id,
                Transaction.bank_account_id == BankAccount.id,
            ),
        )
        .filter(
            BankAccount.user_id == UUID(user_id),
            Transaction.transaction_date >= since,
            Transaction.transaction_type == "credit",
        )
        .scalar()
    ) or Decimal("0")

    # Transaction count
    transaction_count = (
        db.query(func.count(Transaction.id))
        .select_from(Transaction)
        .outerjoin(Card, Transaction.card_id == Card.id)
        .outerjoin(
            BankAccount,
            or_(
                Card.bank_account_id == BankAccount.id,
                Transaction.bank_account_id == BankAccount.id,
            ),
        )
        .filter(
            BankAccount.user_id == UUID(user_id),
            Transaction.transaction_date >= since,
        )
        .scalar()
    ) or 0

    # Group by category or merchant
    if group_by == "category":
        group_column = Transaction.category
    elif group_by == "merchant":
        group_column = Transaction.merchant
    else:
        group_column = Transaction.category

    breakdown = (
        db.query(
            group_column,
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("count"),
        )
        .select_from(Transaction)
        .outerjoin(Card, Transaction.card_id == Card.id)
        .outerjoin(
            BankAccount,
            or_(
                Card.bank_account_id == BankAccount.id,
                Transaction.bank_account_id == BankAccount.id,
            ),
        )
        .filter(
            BankAccount.user_id == UUID(user_id),
            Transaction.transaction_date >= since,
            Transaction.transaction_type == "debit",
        )
        .group_by(group_column)
        .order_by(text("total DESC"))
        .all()
    )

    return {
        "period_days": days,
        "total_spending": total_spending,
        "total_income": total_income,
        "transaction_count": transaction_count,
        "breakdown": [
            {
                "name": row[0] or "Uncategorized",
                "total": row[1],
                "count": row[2],
            }
            for row in breakdown
        ],
    }
