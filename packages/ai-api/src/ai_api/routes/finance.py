"""Finance REST API routes for bank accounts, cards, and transactions."""

from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db, get_or_create_user
from ..finance_models import AccountBalance, BankAccount, Card, Transaction
from ..logger import logger

router = APIRouter(prefix="/finance", tags=["Finance"])


# =============================================================================
# Pydantic Schemas
# =============================================================================


class BankAccountCreate(BaseModel):
    """Schema for creating a bank account."""

    bank_name: str = Field(..., min_length=1, max_length=100)
    country: str = Field(..., min_length=2, max_length=2, description="ISO 3166-1 alpha-2")
    account_alias: str | None = Field(None, max_length=100)
    account_type: str = Field(..., pattern="^(checking|savings|credit)$")
    last_four: str | None = Field(None, min_length=4, max_length=4)


class BankAccountUpdate(BaseModel):
    """Schema for updating a bank account."""

    bank_name: str | None = Field(None, min_length=1, max_length=100)
    country: str | None = Field(None, min_length=2, max_length=2)
    account_alias: str | None = None
    account_type: str | None = Field(None, pattern="^(checking|savings|credit)$")
    last_four: str | None = Field(None, min_length=4, max_length=4)


class BankAccountResponse(BaseModel):
    """Schema for bank account response."""

    id: str
    bank_name: str
    country: str
    account_alias: str | None
    account_type: str
    last_four: str | None
    created_at: datetime
    balances: list[dict] = []

    class Config:
        from_attributes = True


class BalanceUpdate(BaseModel):
    """Schema for updating account balance."""

    currency: str = Field(..., min_length=3, max_length=3)
    balance: Decimal


class CardCreate(BaseModel):
    """Schema for creating a card."""

    bank_account_id: str
    card_type: str = Field(..., pattern="^(debit|credit)$")
    last_four: str = Field(..., min_length=4, max_length=4)
    card_alias: str | None = Field(None, max_length=100)
    is_active: bool = True


class CardUpdate(BaseModel):
    """Schema for updating a card."""

    card_type: str | None = Field(None, pattern="^(debit|credit)$")
    card_alias: str | None = None
    is_active: bool | None = None


class CardResponse(BaseModel):
    """Schema for card response."""

    id: str
    bank_account_id: str
    card_type: str
    last_four: str
    card_alias: str | None
    is_active: bool
    created_at: datetime
    bank_name: str | None = None

    class Config:
        from_attributes = True


class TransactionCreate(BaseModel):
    """Schema for creating a transaction.

    Either card_id or bank_account_id must be provided.
    """

    card_id: str | None = None
    bank_account_id: str | None = None
    amount: Decimal
    currency: str = Field(..., min_length=3, max_length=3)
    merchant: str | None = Field(None, max_length=200)
    description: str | None = None
    category: str | None = Field(None, max_length=50)
    transaction_type: str = Field(..., pattern="^(debit|credit|transfer)$")
    transaction_date: datetime
    raw_message: str = ""


class TransactionUpdate(BaseModel):
    """Schema for updating a transaction."""

    amount: Decimal | None = None
    currency: str | None = Field(None, min_length=3, max_length=3)
    merchant: str | None = None
    description: str | None = None
    category: str | None = None
    transaction_type: str | None = Field(None, pattern="^(debit|credit|transfer)$")
    transaction_date: datetime | None = None


class TransactionResponse(BaseModel):
    """Schema for transaction response."""

    id: str
    card_id: str | None
    bank_account_id: str | None
    amount: Decimal
    currency: str
    merchant: str | None
    description: str | None
    category: str | None
    transaction_type: str
    transaction_date: datetime
    created_at: datetime
    card_last_four: str | None = None
    bank_name: str | None = None

    class Config:
        from_attributes = True


class SpendingSummary(BaseModel):
    """Schema for spending summary by category."""

    category: str
    total: Decimal
    count: int
    currency: str


class MonthlySummary(BaseModel):
    """Schema for monthly spending summary."""

    month: str
    total: Decimal
    count: int
    currency: str


# =============================================================================
# Helper: Get user ID from environment (single-user mode)
# =============================================================================


def get_default_user_id(db: Session = Depends(get_db)) -> str:
    """Get or create the default user for single-user mode."""
    default_jid = settings.default_whatsapp_jid or "default@dashboard.local"
    user = get_or_create_user(db, default_jid, "private")
    return str(user.id)


# =============================================================================
# Bank Account Endpoints
# =============================================================================


@router.get("/accounts", response_model=list[BankAccountResponse])
async def list_accounts(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_default_user_id),
):
    """List all bank accounts for the user."""
    accounts = db.query(BankAccount).filter(BankAccount.user_id == user_id).all()

    result = []
    for account in accounts:
        balances = [
            {"currency": b.currency, "balance": float(b.balance), "updated_at": b.updated_at}
            for b in account.balances
        ]
        result.append(
            BankAccountResponse(
                id=str(account.id),
                bank_name=account.bank_name,
                country=account.country,
                account_alias=account.account_alias,
                account_type=account.account_type,
                last_four=account.last_four,
                created_at=account.created_at,
                balances=balances,
            )
        )

    return result


@router.post("/accounts", response_model=BankAccountResponse, status_code=201)
async def create_account(
    data: BankAccountCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_default_user_id),
):
    """Create a new bank account."""
    account = BankAccount(
        user_id=user_id,
        bank_name=data.bank_name,
        country=data.country.upper(),
        account_alias=data.account_alias,
        account_type=data.account_type,
        last_four=data.last_four,
    )
    db.add(account)
    db.commit()
    db.refresh(account)

    logger.info(f"Created bank account {account.id} for user {user_id}")

    return BankAccountResponse(
        id=str(account.id),
        bank_name=account.bank_name,
        country=account.country,
        account_alias=account.account_alias,
        account_type=account.account_type,
        last_four=account.last_four,
        created_at=account.created_at,
        balances=[],
    )


@router.get("/accounts/{account_id}", response_model=BankAccountResponse)
async def get_account(
    account_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_default_user_id),
):
    """Get a specific bank account."""
    account = (
        db.query(BankAccount)
        .filter(BankAccount.id == account_id, BankAccount.user_id == user_id)
        .first()
    )

    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    balances = [
        {"currency": b.currency, "balance": float(b.balance), "updated_at": b.updated_at}
        for b in account.balances
    ]

    return BankAccountResponse(
        id=str(account.id),
        bank_name=account.bank_name,
        country=account.country,
        account_alias=account.account_alias,
        account_type=account.account_type,
        last_four=account.last_four,
        created_at=account.created_at,
        balances=balances,
    )


@router.patch("/accounts/{account_id}", response_model=BankAccountResponse)
async def update_account(
    account_id: str,
    data: BankAccountUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_default_user_id),
):
    """Update a bank account."""
    account = (
        db.query(BankAccount)
        .filter(BankAccount.id == account_id, BankAccount.user_id == user_id)
        .first()
    )

    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "country" and value:
            value = value.upper()
        setattr(account, field, value)

    db.commit()
    db.refresh(account)

    logger.info(f"Updated bank account {account_id}")

    balances = [
        {"currency": b.currency, "balance": float(b.balance), "updated_at": b.updated_at}
        for b in account.balances
    ]

    return BankAccountResponse(
        id=str(account.id),
        bank_name=account.bank_name,
        country=account.country,
        account_alias=account.account_alias,
        account_type=account.account_type,
        last_four=account.last_four,
        created_at=account.created_at,
        balances=balances,
    )


@router.delete("/accounts/{account_id}", status_code=204)
async def delete_account(
    account_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_default_user_id),
):
    """Delete a bank account."""
    account = (
        db.query(BankAccount)
        .filter(BankAccount.id == account_id, BankAccount.user_id == user_id)
        .first()
    )

    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    db.delete(account)
    db.commit()

    logger.info(f"Deleted bank account {account_id}")


# =============================================================================
# Account Balance Endpoints
# =============================================================================


@router.get("/accounts/{account_id}/balances")
async def get_balances(
    account_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_default_user_id),
):
    """Get all balances for an account."""
    account = (
        db.query(BankAccount)
        .filter(BankAccount.id == account_id, BankAccount.user_id == user_id)
        .first()
    )

    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    return [
        {
            "id": str(b.id),
            "currency": b.currency,
            "balance": float(b.balance),
            "updated_at": b.updated_at,
        }
        for b in account.balances
    ]


@router.put("/accounts/{account_id}/balances")
async def update_balance(
    account_id: str,
    data: BalanceUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_default_user_id),
):
    """Update or create a balance for an account."""
    account = (
        db.query(BankAccount)
        .filter(BankAccount.id == account_id, BankAccount.user_id == user_id)
        .first()
    )

    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # Find or create balance
    balance = (
        db.query(AccountBalance)
        .filter(
            AccountBalance.bank_account_id == account_id,
            AccountBalance.currency == data.currency.upper(),
        )
        .first()
    )

    if balance:
        balance.balance = data.balance
    else:
        balance = AccountBalance(
            bank_account_id=account_id,
            currency=data.currency.upper(),
            balance=data.balance,
        )
        db.add(balance)

    db.commit()
    db.refresh(balance)

    logger.info(f"Updated balance for account {account_id}: {data.currency} {data.balance}")

    return {
        "id": str(balance.id),
        "currency": balance.currency,
        "balance": float(balance.balance),
        "updated_at": balance.updated_at,
    }


# =============================================================================
# Card Endpoints
# =============================================================================


@router.get("/cards", response_model=list[CardResponse])
async def list_cards(
    account_id: str | None = Query(None, description="Filter by bank account ID"),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_default_user_id),
):
    """List all cards for the user."""
    query = db.query(Card).join(BankAccount).filter(BankAccount.user_id == user_id)

    if account_id:
        query = query.filter(Card.bank_account_id == account_id)

    cards = query.all()

    return [
        CardResponse(
            id=str(card.id),
            bank_account_id=str(card.bank_account_id),
            card_type=card.card_type,
            last_four=card.last_four,
            card_alias=card.card_alias,
            is_active=card.is_active,
            created_at=card.created_at,
            bank_name=card.bank_account.bank_name,
        )
        for card in cards
    ]


@router.post("/cards", response_model=CardResponse, status_code=201)
async def create_card(
    data: CardCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_default_user_id),
):
    """Create a new card."""
    # Verify account belongs to user
    account = (
        db.query(BankAccount)
        .filter(BankAccount.id == data.bank_account_id, BankAccount.user_id == user_id)
        .first()
    )

    if not account:
        raise HTTPException(status_code=404, detail="Bank account not found")

    card = Card(
        bank_account_id=data.bank_account_id,
        card_type=data.card_type,
        last_four=data.last_four,
        card_alias=data.card_alias,
        is_active=data.is_active,
    )
    db.add(card)
    db.commit()
    db.refresh(card)

    logger.info(f"Created card {card.id} for account {data.bank_account_id}")

    return CardResponse(
        id=str(card.id),
        bank_account_id=str(card.bank_account_id),
        card_type=card.card_type,
        last_four=card.last_four,
        card_alias=card.card_alias,
        is_active=card.is_active,
        created_at=card.created_at,
        bank_name=account.bank_name,
    )


@router.get("/cards/{card_id}", response_model=CardResponse)
async def get_card(
    card_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_default_user_id),
):
    """Get a specific card."""
    card = (
        db.query(Card)
        .join(BankAccount)
        .filter(Card.id == card_id, BankAccount.user_id == user_id)
        .first()
    )

    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    return CardResponse(
        id=str(card.id),
        bank_account_id=str(card.bank_account_id),
        card_type=card.card_type,
        last_four=card.last_four,
        card_alias=card.card_alias,
        is_active=card.is_active,
        created_at=card.created_at,
        bank_name=card.bank_account.bank_name,
    )


@router.patch("/cards/{card_id}", response_model=CardResponse)
async def update_card(
    card_id: str,
    data: CardUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_default_user_id),
):
    """Update a card."""
    card = (
        db.query(Card)
        .join(BankAccount)
        .filter(Card.id == card_id, BankAccount.user_id == user_id)
        .first()
    )

    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(card, field, value)

    db.commit()
    db.refresh(card)

    logger.info(f"Updated card {card_id}")

    return CardResponse(
        id=str(card.id),
        bank_account_id=str(card.bank_account_id),
        card_type=card.card_type,
        last_four=card.last_four,
        card_alias=card.card_alias,
        is_active=card.is_active,
        created_at=card.created_at,
        bank_name=card.bank_account.bank_name,
    )


@router.delete("/cards/{card_id}", status_code=204)
async def delete_card(
    card_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_default_user_id),
):
    """Delete a card."""
    card = (
        db.query(Card)
        .join(BankAccount)
        .filter(Card.id == card_id, BankAccount.user_id == user_id)
        .first()
    )

    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    db.delete(card)
    db.commit()

    logger.info(f"Deleted card {card_id}")


# =============================================================================
# Transaction Endpoints
# =============================================================================


@router.get("/transactions", response_model=list[TransactionResponse])
async def list_transactions(
    card_id: str | None = Query(None, description="Filter by card ID"),
    account_id: str | None = Query(None, description="Filter by bank account ID"),
    category: str | None = Query(None, description="Filter by category"),
    transaction_type: str | None = Query(None, description="Filter by type"),
    start_date: datetime | None = Query(None, description="Filter from date"),
    end_date: datetime | None = Query(None, description="Filter to date"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_default_user_id),
):
    """List transactions with optional filters.

    Includes both card transactions and direct bank account transactions.
    """
    from sqlalchemy import or_

    # Query transactions via either path
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
        .filter(BankAccount.user_id == user_id)
    )

    if card_id:
        query = query.filter(Transaction.card_id == card_id)
    if account_id:
        # Filter by account - includes both direct and card transactions for that account
        query = query.filter(
            or_(
                Transaction.bank_account_id == account_id,
                Card.bank_account_id == account_id,
            )
        )
    if category:
        query = query.filter(Transaction.category == category)
    if transaction_type:
        query = query.filter(Transaction.transaction_type == transaction_type)
    if start_date:
        query = query.filter(Transaction.transaction_date >= start_date)
    if end_date:
        query = query.filter(Transaction.transaction_date <= end_date)

    transactions = (
        query.order_by(Transaction.transaction_date.desc()).limit(limit).offset(offset).all()
    )

    result = []
    for t in transactions:
        # Determine bank name from either card's account or direct account
        bank_name = None
        if t.card and t.card.bank_account:
            bank_name = t.card.bank_account.bank_name
        elif t.bank_account:
            bank_name = t.bank_account.bank_name

        result.append(
            TransactionResponse(
                id=str(t.id),
                card_id=str(t.card_id) if t.card_id else None,
                bank_account_id=str(t.bank_account_id) if t.bank_account_id else None,
                amount=t.amount,
                currency=t.currency,
                merchant=t.merchant,
                description=t.description,
                category=t.category,
                transaction_type=t.transaction_type,
                transaction_date=t.transaction_date,
                created_at=t.created_at,
                card_last_four=t.card.last_four if t.card else None,
                bank_name=bank_name,
            )
        )

    return result


@router.post("/transactions", response_model=TransactionResponse, status_code=201)
async def create_transaction(
    data: TransactionCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_default_user_id),
):
    """Create a new transaction.

    Either card_id or bank_account_id must be provided.
    """
    # Validate that at least one source is provided
    if not data.card_id and not data.bank_account_id:
        raise HTTPException(
            status_code=400,
            detail="Either card_id or bank_account_id must be provided",
        )

    card = None
    account = None
    bank_name = None

    # Verify card or account belongs to user
    if data.card_id:
        card = (
            db.query(Card)
            .join(BankAccount)
            .filter(Card.id == data.card_id, BankAccount.user_id == user_id)
            .first()
        )
        if not card:
            raise HTTPException(status_code=404, detail="Card not found")
        bank_name = card.bank_account.bank_name
    else:
        account = (
            db.query(BankAccount)
            .filter(BankAccount.id == data.bank_account_id, BankAccount.user_id == user_id)
            .first()
        )
        if not account:
            raise HTTPException(status_code=404, detail="Bank account not found")
        bank_name = account.bank_name

    transaction = Transaction(
        card_id=data.card_id,
        bank_account_id=data.bank_account_id,
        amount=data.amount,
        currency=data.currency.upper(),
        merchant=data.merchant,
        description=data.description,
        category=data.category,
        transaction_type=data.transaction_type,
        transaction_date=data.transaction_date,
        raw_message=data.raw_message,
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    source = f"card {data.card_id}" if data.card_id else f"account {data.bank_account_id}"
    logger.info(f"Created transaction {transaction.id} for {source}")

    return TransactionResponse(
        id=str(transaction.id),
        card_id=str(transaction.card_id) if transaction.card_id else None,
        bank_account_id=str(transaction.bank_account_id) if transaction.bank_account_id else None,
        amount=transaction.amount,
        currency=transaction.currency,
        merchant=transaction.merchant,
        description=transaction.description,
        category=transaction.category,
        transaction_type=transaction.transaction_type,
        transaction_date=transaction.transaction_date,
        created_at=transaction.created_at,
        card_last_four=card.last_four if card else None,
        bank_name=bank_name,
    )


@router.get("/transactions/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_default_user_id),
):
    """Get a specific transaction."""
    from sqlalchemy import or_

    transaction = (
        db.query(Transaction)
        .outerjoin(Card, Transaction.card_id == Card.id)
        .outerjoin(
            BankAccount,
            or_(
                Card.bank_account_id == BankAccount.id,
                Transaction.bank_account_id == BankAccount.id,
            ),
        )
        .filter(Transaction.id == transaction_id, BankAccount.user_id == user_id)
        .first()
    )

    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Determine bank name from either card's account or direct account
    bank_name = None
    if transaction.card and transaction.card.bank_account:
        bank_name = transaction.card.bank_account.bank_name
    elif transaction.bank_account:
        bank_name = transaction.bank_account.bank_name

    return TransactionResponse(
        id=str(transaction.id),
        card_id=str(transaction.card_id) if transaction.card_id else None,
        bank_account_id=str(transaction.bank_account_id) if transaction.bank_account_id else None,
        amount=transaction.amount,
        currency=transaction.currency,
        merchant=transaction.merchant,
        description=transaction.description,
        category=transaction.category,
        transaction_type=transaction.transaction_type,
        transaction_date=transaction.transaction_date,
        created_at=transaction.created_at,
        card_last_four=transaction.card.last_four if transaction.card else None,
        bank_name=bank_name,
    )


@router.patch("/transactions/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: str,
    data: TransactionUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_default_user_id),
):
    """Update a transaction."""
    from sqlalchemy import or_

    transaction = (
        db.query(Transaction)
        .outerjoin(Card, Transaction.card_id == Card.id)
        .outerjoin(
            BankAccount,
            or_(
                Card.bank_account_id == BankAccount.id,
                Transaction.bank_account_id == BankAccount.id,
            ),
        )
        .filter(Transaction.id == transaction_id, BankAccount.user_id == user_id)
        .first()
    )

    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "currency" and value:
            value = value.upper()
        setattr(transaction, field, value)

    db.commit()
    db.refresh(transaction)

    logger.info(f"Updated transaction {transaction_id}")

    # Determine bank name from either card's account or direct account
    bank_name = None
    if transaction.card and transaction.card.bank_account:
        bank_name = transaction.card.bank_account.bank_name
    elif transaction.bank_account:
        bank_name = transaction.bank_account.bank_name

    return TransactionResponse(
        id=str(transaction.id),
        card_id=str(transaction.card_id) if transaction.card_id else None,
        bank_account_id=str(transaction.bank_account_id) if transaction.bank_account_id else None,
        amount=transaction.amount,
        currency=transaction.currency,
        merchant=transaction.merchant,
        description=transaction.description,
        category=transaction.category,
        transaction_type=transaction.transaction_type,
        transaction_date=transaction.transaction_date,
        created_at=transaction.created_at,
        card_last_four=transaction.card.last_four if transaction.card else None,
        bank_name=bank_name,
    )


@router.delete("/transactions/{transaction_id}", status_code=204)
async def delete_transaction(
    transaction_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_default_user_id),
):
    """Delete a transaction."""
    from sqlalchemy import or_

    transaction = (
        db.query(Transaction)
        .outerjoin(Card, Transaction.card_id == Card.id)
        .outerjoin(
            BankAccount,
            or_(
                Card.bank_account_id == BankAccount.id,
                Transaction.bank_account_id == BankAccount.id,
            ),
        )
        .filter(Transaction.id == transaction_id, BankAccount.user_id == user_id)
        .first()
    )

    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    db.delete(transaction)
    db.commit()

    logger.info(f"Deleted transaction {transaction_id}")


# =============================================================================
# Analytics Endpoints
# =============================================================================


@router.get("/analytics/spending", response_model=list[SpendingSummary])
async def get_spending_by_category(
    start_date: datetime | None = Query(None, description="Filter from date"),
    end_date: datetime | None = Query(None, description="Filter to date"),
    currency: str = Query("EUR", description="Currency for totals"),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_default_user_id),
):
    """Get spending summary by category.

    Includes both card transactions and direct bank account transactions.
    """
    from sqlalchemy import or_

    query = (
        db.query(
            Transaction.category,
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("count"),
        )
        .outerjoin(Card, Transaction.card_id == Card.id)
        .outerjoin(
            BankAccount,
            or_(
                Card.bank_account_id == BankAccount.id,
                Transaction.bank_account_id == BankAccount.id,
            ),
        )
        .filter(
            BankAccount.user_id == user_id,
            Transaction.transaction_type == "debit",
            Transaction.currency == currency.upper(),
        )
    )

    if start_date:
        query = query.filter(Transaction.transaction_date >= start_date)
    if end_date:
        query = query.filter(Transaction.transaction_date <= end_date)

    results = query.group_by(Transaction.category).all()

    return [
        SpendingSummary(
            category=r.category or "Uncategorized",
            total=r.total,
            count=r.count,
            currency=currency.upper(),
        )
        for r in results
    ]


@router.get("/analytics/monthly", response_model=list[MonthlySummary])
async def get_monthly_spending(
    months: int = Query(6, ge=1, le=24, description="Number of months to include"),
    currency: str = Query("EUR", description="Currency for totals"),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_default_user_id),
):
    """Get monthly spending trend.

    Includes both card transactions and direct bank account transactions.
    """
    from sqlalchemy import or_

    query = (
        db.query(
            func.to_char(Transaction.transaction_date, "YYYY-MM").label("month"),
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("count"),
        )
        .outerjoin(Card, Transaction.card_id == Card.id)
        .outerjoin(
            BankAccount,
            or_(
                Card.bank_account_id == BankAccount.id,
                Transaction.bank_account_id == BankAccount.id,
            ),
        )
        .filter(
            BankAccount.user_id == user_id,
            Transaction.transaction_type == "debit",
            Transaction.currency == currency.upper(),
        )
        .group_by(func.to_char(Transaction.transaction_date, "YYYY-MM"))
        .order_by(func.to_char(Transaction.transaction_date, "YYYY-MM").desc())
        .limit(months)
    )

    results = query.all()

    return [
        MonthlySummary(
            month=r.month,
            total=r.total,
            count=r.count,
            currency=currency.upper(),
        )
        for r in results
    ]
