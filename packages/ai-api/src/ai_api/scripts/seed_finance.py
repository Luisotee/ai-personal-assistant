"""Seed finance database with realistic demo data."""

import random
from datetime import datetime, timedelta
from decimal import Decimal

from ..database import SessionLocal, User, get_or_create_user
from ..finance_models import AccountBalance, BankAccount, Card, Transaction
from ..logger import logger

# Demo user
DEMO_USER_JID = "demo@finance.local"
DEMO_USER_NAME = "Demo User"

# Merchants by category
MERCHANTS = {
    "groceries": ["REWE", "Lidl", "Edeka", "Aldi", "Whole Foods", "Trader Joe's", "Pão de Açúcar"],
    "transport": ["Uber", "Lyft", "BVG", "Deutsche Bahn", "Gas Station", "99Taxi"],
    "food": [
        "Starbucks",
        "McDonald's",
        "Subway",
        "Pizza Hut",
        "Chipotle",
        "Restaurante",
        "Café",
    ],
    "shopping": [
        "Amazon",
        "Apple Store",
        "IKEA",
        "H&M",
        "Zara",
        "Nike",
        "Best Buy",
        "Mercado Livre",
    ],
    "entertainment": [
        "Netflix",
        "Spotify",
        "Steam",
        "Cinema",
        "PlayStation Store",
        "YouTube Premium",
    ],
    "utilities": [
        "Electric Company",
        "Water Bill",
        "Internet Provider",
        "Phone Bill",
        "Rent Payment",
    ],
    "health": ["Pharmacy", "Gym Membership", "Doctor Visit", "Health Insurance"],
    "travel": ["Booking.com", "Airbnb", "Ryanair", "Lufthansa", "Expedia", "Hotel"],
}

# Income sources
INCOME_SOURCES = [
    "Salary Deposit",
    "Freelance Payment",
    "Client Invoice",
    "Investment Return",
    "Refund",
]


def clear_finance_data(db):
    """Clear all finance data for demo user."""
    user = db.query(User).filter(User.whatsapp_jid == DEMO_USER_JID).first()
    if user:
        logger.info("Clearing existing finance data for demo user...")
        # Delete all transactions (cascade will handle related data)
        db.query(Transaction).filter(
            (
                Transaction.card_id.in_(
                    db.query(Card.id).join(BankAccount).filter(BankAccount.user_id == user.id)
                )
            )
            | (
                Transaction.bank_account_id.in_(
                    db.query(BankAccount.id).filter(BankAccount.user_id == user.id)
                )
            )
        ).delete(synchronize_session=False)

        # Delete all cards
        db.query(Card).filter(
            Card.bank_account_id.in_(
                db.query(BankAccount.id).filter(BankAccount.user_id == user.id)
            )
        ).delete(synchronize_session=False)

        # Delete all balances
        db.query(AccountBalance).filter(
            AccountBalance.bank_account_id.in_(
                db.query(BankAccount.id).filter(BankAccount.user_id == user.id)
            )
        ).delete(synchronize_session=False)

        # Delete all accounts
        db.query(BankAccount).filter(BankAccount.user_id == user.id).delete()

        db.commit()
        logger.info("Cleared finance data successfully")


def seed_database():
    """Seed database with demo finance data."""
    db = SessionLocal()

    try:
        logger.info("Starting finance database seeding...")

        # Clear existing data
        clear_finance_data(db)

        # Create or get demo user
        user = get_or_create_user(db, DEMO_USER_JID, "private", DEMO_USER_NAME)
        logger.info(f"Demo user: {user.name} ({user.id})")

        # Create bank accounts
        logger.info("Creating bank accounts...")

        n26_account = BankAccount(
            user_id=user.id,
            bank_name="N26",
            country="DE",
            account_type="checking",
            account_alias="My German Account",
            last_four="1234",
        )
        db.add(n26_account)

        wise_account = BankAccount(
            user_id=user.id,
            bank_name="Wise",
            country="GB",
            account_type="checking",
            account_alias="Multi-Currency Account",
            last_four="5678",
        )
        db.add(wise_account)

        nubank_account = BankAccount(
            user_id=user.id,
            bank_name="Nubank",
            country="BR",
            account_type="credit",
            account_alias="Brazilian Credit",
            last_four="9012",
        )
        db.add(nubank_account)

        db.commit()
        db.refresh(n26_account)
        db.refresh(wise_account)
        db.refresh(nubank_account)

        logger.info("Created 3 bank accounts")

        # Create account balances
        logger.info("Creating account balances...")

        balances = [
            # N26 - EUR only
            AccountBalance(
                bank_account_id=n26_account.id,
                currency="EUR",
                balance=Decimal("3250.75"),
            ),
            # Wise - Multi-currency
            AccountBalance(
                bank_account_id=wise_account.id,
                currency="EUR",
                balance=Decimal("1500.00"),
            ),
            AccountBalance(
                bank_account_id=wise_account.id,
                currency="USD",
                balance=Decimal("2800.50"),
            ),
            AccountBalance(
                bank_account_id=wise_account.id,
                currency="GBP",
                balance=Decimal("950.25"),
            ),
            # Nubank - BRL only
            AccountBalance(
                bank_account_id=nubank_account.id,
                currency="BRL",
                balance=Decimal("5420.80"),
            ),
        ]

        db.add_all(balances)
        db.commit()
        logger.info(f"Created {len(balances)} account balances")

        # Create cards
        logger.info("Creating cards...")

        n26_debit = Card(
            bank_account_id=n26_account.id,
            card_type="debit",
            last_four="1234",
            card_alias="N26 Debit Card",
            is_active=True,
        )

        wise_debit = Card(
            bank_account_id=wise_account.id,
            card_type="debit",
            last_four="5678",
            card_alias="Wise Travel Card",
            is_active=True,
        )

        nubank_credit = Card(
            bank_account_id=nubank_account.id,
            card_type="credit",
            last_four="9012",
            card_alias="Nubank Credit",
            is_active=True,
        )

        db.add_all([n26_debit, wise_debit, nubank_credit])
        db.commit()
        db.refresh(n26_debit)
        db.refresh(wise_debit)
        db.refresh(nubank_credit)

        logger.info("Created 3 cards")

        # Generate transactions over the past 6 months
        logger.info("Generating transactions...")

        transactions = []
        start_date = datetime.utcnow() - timedelta(days=180)
        current_date = start_date

        # Card-account mapping with last_four
        card_accounts = [
            (n26_debit.id, n26_account.id, "EUR", n26_debit.last_four),
            (wise_debit.id, wise_account.id, "USD", wise_debit.last_four),
            (nubank_credit.id, nubank_account.id, "BRL", nubank_credit.last_four),
        ]

        transaction_count = 0

        # Generate transactions day by day
        while current_date <= datetime.utcnow():
            # Randomly decide if there are transactions on this day (70% chance)
            if random.random() < 0.7:
                # 1-4 transactions per day
                num_transactions = random.randint(1, 4)

                for _ in range(num_transactions):
                    # Randomly select a card/account
                    card_id, account_id, currency, last_four = random.choice(card_accounts)

                    # Randomly select a category and merchant
                    category = random.choice(list(MERCHANTS.keys()))
                    merchant = random.choice(MERCHANTS[category])

                    # Generate amount based on category
                    if category == "utilities":
                        amount = Decimal(str(round(random.uniform(50, 200), 2)))
                    elif category == "groceries":
                        amount = Decimal(str(round(random.uniform(15, 120), 2)))
                    elif category == "transport":
                        amount = Decimal(str(round(random.uniform(5, 50), 2)))
                    elif category == "food":
                        amount = Decimal(str(round(random.uniform(8, 45), 2)))
                    elif category == "shopping":
                        amount = Decimal(str(round(random.uniform(20, 300), 2)))
                    elif category == "entertainment":
                        amount = Decimal(str(round(random.uniform(10, 60), 2)))
                    elif category == "health":
                        amount = Decimal(str(round(random.uniform(30, 150), 2)))
                    else:  # travel
                        amount = Decimal(str(round(random.uniform(100, 500), 2)))

                    # Add some time variation to the transaction
                    tx_time = current_date + timedelta(
                        hours=random.randint(8, 22), minutes=random.randint(0, 59)
                    )

                    transaction = Transaction(
                        card_id=card_id,
                        bank_account_id=None,
                        amount=amount,
                        currency=currency,
                        merchant=merchant,
                        description=f"Purchase at {merchant}",
                        category=category,
                        transaction_type="debit",
                        transaction_date=tx_time,
                        raw_message=f"Card ending {last_four}: -{currency} {amount} at {merchant}",
                    )
                    transactions.append(transaction)
                    transaction_count += 1

            # Move to next day
            current_date += timedelta(days=1)

        # Add some income transactions (2 per month = 12 total)
        for month_offset in range(6):
            # Salary on 1st of month
            salary_date = (
                datetime.utcnow() - timedelta(days=150) + timedelta(days=30 * month_offset)
            )
            salary = Transaction(
                card_id=None,
                bank_account_id=wise_account.id,
                amount=Decimal("4500.00"),
                currency="USD",
                merchant="Employer Inc",
                description="Monthly salary deposit",
                category="income",
                transaction_type="credit",
                transaction_date=salary_date,
                raw_message="Transfer received: USD 4500.00 - Salary",
            )
            transactions.append(salary)

            # Freelance income mid-month (sometimes)
            if random.random() < 0.6:
                freelance_date = salary_date + timedelta(days=15)
                freelance_amount = Decimal(str(round(random.uniform(500, 1500), 2)))
                freelance = Transaction(
                    card_id=None,
                    bank_account_id=wise_account.id,
                    amount=freelance_amount,
                    currency="USD",
                    merchant=random.choice(INCOME_SOURCES[1:]),
                    description="Freelance project payment",
                    category="income",
                    transaction_type="credit",
                    transaction_date=freelance_date,
                    raw_message=f"Transfer received: USD {freelance_amount} - Freelance",
                )
                transactions.append(freelance)

        # Add some direct bank transfers (PIX, SEPA, etc.)
        for _ in range(10):
            random_date = start_date + timedelta(days=random.randint(0, 180))
            transfer_amount = Decimal(str(round(random.uniform(20, 200), 2)))

            # Choose account for transfer
            if random.random() < 0.5:
                account_id = n26_account.id
                currency = "EUR"
            else:
                account_id = nubank_account.id
                currency = "BRL"

            transfer = Transaction(
                card_id=None,
                bank_account_id=account_id,
                amount=transfer_amount,
                currency=currency,
                merchant="Bank Transfer",
                description="Direct transfer to friend",
                category="transfer",
                transaction_type="debit",
                transaction_date=random_date,
                raw_message=f"Transfer sent: {currency} {transfer_amount}",
            )
            transactions.append(transfer)

        # Bulk insert transactions
        db.add_all(transactions)
        db.commit()

        total_transactions = len(transactions)
        logger.info(f"Created {total_transactions} transactions")

        # Summary
        logger.info("=" * 80)
        logger.info("Seeding completed successfully!")
        logger.info("=" * 80)
        logger.info(f"Demo User: {user.name} ({user.whatsapp_jid})")
        logger.info("Bank Accounts: 3 (N26, Wise, Nubank)")
        logger.info("Cards: 3 (all active)")
        logger.info("Balances: 5 currencies (EUR, USD, GBP, BRL)")
        logger.info(f"Transactions: {total_transactions} over 6 months")
        logger.info("=" * 80)
        logger.info("You can now view the dashboard at http://localhost:3002")
        logger.info("Use the following user ID for API calls:")
        logger.info(f"User ID: {user.id}")
        logger.info("=" * 80)

    except Exception as e:
        logger.error(f"Seeding failed: {e}", exc_info=True)
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
