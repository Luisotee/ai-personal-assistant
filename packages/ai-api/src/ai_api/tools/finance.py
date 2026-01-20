"""Finance tools - bank accounts, cards, transactions, analytics."""

from datetime import datetime
from decimal import Decimal

from pydantic_ai import Agent, RunContext

from ..finance_queries import (
    create_bank_account as create_bank_account_fn,
)
from ..finance_queries import (
    create_card as create_card_fn,
)
from ..finance_queries import (
    delete_bank_account as delete_bank_account_fn,
)
from ..finance_queries import (
    delete_card as delete_card_fn,
)
from ..finance_queries import (
    get_account_balances as get_account_balances_fn,
)
from ..finance_queries import (
    get_bank_account_by_id,
    get_card_by_id,
    get_user_bank_accounts,
    get_user_cards,
    get_user_transactions,
)
from ..finance_queries import (
    get_card_by_last_four as get_card_by_last_four_fn,
)
from ..finance_queries import (
    get_default_payment_method as get_default_payment_method_fn,
)
from ..finance_queries import (
    get_spending_summary as get_spending_summary_fn,
)
from ..finance_queries import (
    record_transaction as record_transaction_fn,
)
from ..finance_queries import (
    update_account_balance as update_account_balance_fn,
)
from ..finance_queries import (
    update_bank_account as update_bank_account_fn,
)
from ..finance_queries import (
    update_card as update_card_fn,
)
from ..logger import logger
from .deps import AgentDeps


def register_finance_tools(agent: Agent) -> None:
    """Register finance tools on the given agent."""

    # =========================================================================
    # Bank Account Tools
    # =========================================================================

    @agent.tool
    async def create_bank_account(
        ctx: RunContext[AgentDeps],
        bank_name: str,
        country: str,
        account_type: str,
        account_alias: str | None = None,
        last_four: str | None = None,
    ) -> str:
        """
        Create a new bank account for the user.

        Args:
            ctx: Run context with database and user info
            bank_name: Name of the bank (e.g., 'N26', 'Wise', 'Nubank', 'Deutsche Bank')
            country: ISO 3166-1 alpha-2 country code (e.g., 'DE', 'BR', 'US')
            account_type: Type of account ('checking', 'savings', 'credit')
            account_alias: Optional friendly name (e.g., 'Main checking', 'Travel account')
            last_four: Optional last 4 digits of account number

        Returns:
            Success message with account details or error
        """
        logger.info("=" * 80)
        logger.info("🏦 FINANCE TOOL: create_bank_account")
        logger.info(f"   Bank: {bank_name}, Country: {country}, Type: {account_type}")
        logger.info("=" * 80)

        try:
            account = create_bank_account_fn(
                db=ctx.deps.db,
                user_id=ctx.deps.user_id,
                bank_name=bank_name,
                country=country,
                account_type=account_type,
                account_alias=account_alias,
                last_four=last_four,
            )
            alias_info = f" ({account_alias})" if account_alias else ""
            return f"Created {bank_name} {account_type} account{alias_info} in {country}. Account ID: {account.id}"
        except Exception as e:
            logger.error(f"Failed to create bank account: {e}", exc_info=True)
            return f"Failed to create bank account: {str(e)}"

    @agent.tool
    async def list_bank_accounts(ctx: RunContext[AgentDeps]) -> str:
        """
        List all bank accounts for the user.

        Args:
            ctx: Run context with database and user info

        Returns:
            Formatted list of bank accounts or message if none found
        """
        logger.info("=" * 80)
        logger.info("🏦 FINANCE TOOL: list_bank_accounts")
        logger.info("=" * 80)

        try:
            accounts = get_user_bank_accounts(ctx.deps.db, ctx.deps.user_id)

            if not accounts:
                return "No bank accounts found. Use create_bank_account to add one."

            lines = ["**Your Bank Accounts:**\n"]
            for acc in accounts:
                alias = f" ({acc.account_alias})" if acc.account_alias else ""
                last_four = f" •••{acc.last_four}" if acc.last_four else ""
                lines.append(f"- **{acc.bank_name}**{alias} ({acc.country})")
                lines.append(f"  Type: {acc.account_type}{last_four}")
                lines.append(f"  ID: `{acc.id}`\n")

            return "\n".join(lines)
        except Exception as e:
            logger.error(f"Failed to list bank accounts: {e}", exc_info=True)
            return f"Failed to list bank accounts: {str(e)}"

    @agent.tool
    async def update_bank_account(
        ctx: RunContext[AgentDeps],
        account_id: str,
        account_alias: str | None = None,
        account_type: str | None = None,
    ) -> str:
        """
        Update a bank account's details.

        Args:
            ctx: Run context with database and user info
            account_id: The UUID of the account to update
            account_alias: New friendly name for the account
            account_type: New account type ('checking', 'savings', 'credit')

        Returns:
            Success message or error
        """
        logger.info("=" * 80)
        logger.info("🏦 FINANCE TOOL: update_bank_account")
        logger.info(f"   Account ID: {account_id}")
        logger.info("=" * 80)

        try:
            account = update_bank_account_fn(
                db=ctx.deps.db,
                account_id=account_id,
                user_id=ctx.deps.user_id,
                account_alias=account_alias,
                account_type=account_type,
            )

            if not account:
                return f"Account not found or doesn't belong to you: {account_id}"

            return f"Updated {account.bank_name} account. Alias: {account.account_alias}, Type: {account.account_type}"
        except Exception as e:
            logger.error(f"Failed to update bank account: {e}", exc_info=True)
            return f"Failed to update bank account: {str(e)}"

    @agent.tool
    async def delete_bank_account(ctx: RunContext[AgentDeps], account_id: str) -> str:
        """
        Delete a bank account and all its cards and transactions.

        WARNING: This action cannot be undone.

        Args:
            ctx: Run context with database and user info
            account_id: The UUID of the account to delete

        Returns:
            Success message or error
        """
        logger.info("=" * 80)
        logger.info("🏦 FINANCE TOOL: delete_bank_account")
        logger.info(f"   Account ID: {account_id}")
        logger.info("=" * 80)

        try:
            success = delete_bank_account_fn(
                db=ctx.deps.db,
                account_id=account_id,
                user_id=ctx.deps.user_id,
            )

            if not success:
                return f"Account not found or doesn't belong to you: {account_id}"

            return f"Deleted bank account {account_id} and all associated cards and transactions."
        except Exception as e:
            logger.error(f"Failed to delete bank account: {e}", exc_info=True)
            return f"Failed to delete bank account: {str(e)}"

    # =========================================================================
    # Balance Tools
    # =========================================================================

    @agent.tool
    async def update_account_balance(
        ctx: RunContext[AgentDeps],
        account_id: str,
        currency: str,
        balance: float,
    ) -> str:
        """
        Update or set the balance for a specific currency in an account.

        Use this for multi-currency accounts like Wise where you have
        separate balances in EUR, USD, BRL, etc.

        Args:
            ctx: Run context with database and user info
            account_id: The UUID of the bank account
            currency: Currency code (e.g., 'EUR', 'USD', 'BRL')
            balance: Current balance amount

        Returns:
            Success message or error
        """
        logger.info("=" * 80)
        logger.info("💰 FINANCE TOOL: update_account_balance")
        logger.info(f"   Account ID: {account_id}, Currency: {currency}, Balance: {balance}")
        logger.info("=" * 80)

        try:
            result = update_account_balance_fn(
                db=ctx.deps.db,
                account_id=account_id,
                user_id=ctx.deps.user_id,
                currency=currency,
                balance=Decimal(str(balance)),
            )

            if not result:
                return f"Account not found or doesn't belong to you: {account_id}"

            return f"Updated balance: {result.currency} {result.balance:.2f}"
        except Exception as e:
            logger.error(f"Failed to update balance: {e}", exc_info=True)
            return f"Failed to update balance: {str(e)}"

    @agent.tool
    async def get_account_balances(ctx: RunContext[AgentDeps], account_id: str) -> str:
        """
        Get all currency balances for a bank account.

        Args:
            ctx: Run context with database and user info
            account_id: The UUID of the bank account

        Returns:
            Formatted list of balances or error
        """
        logger.info("=" * 80)
        logger.info("💰 FINANCE TOOL: get_account_balances")
        logger.info(f"   Account ID: {account_id}")
        logger.info("=" * 80)

        try:
            balances = get_account_balances_fn(
                db=ctx.deps.db,
                account_id=account_id,
                user_id=ctx.deps.user_id,
            )

            if not balances:
                return f"No balances found for account {account_id}. Use update_account_balance to add one."

            lines = ["**Account Balances:**\n"]
            for bal in balances:
                lines.append(f"- {bal.currency}: {bal.balance:.2f}")

            return "\n".join(lines)
        except Exception as e:
            logger.error(f"Failed to get balances: {e}", exc_info=True)
            return f"Failed to get balances: {str(e)}"

    # =========================================================================
    # Card Tools
    # =========================================================================

    @agent.tool
    async def create_card(
        ctx: RunContext[AgentDeps],
        account_id: str,
        card_type: str,
        last_four: str,
        card_alias: str | None = None,
    ) -> str:
        """
        Create a new card for a bank account.

        Args:
            ctx: Run context with database and user info
            account_id: The UUID of the bank account this card belongs to
            card_type: Type of card ('debit' or 'credit')
            last_four: Last 4 digits of the card number (for identification)
            card_alias: Optional friendly name (e.g., 'Blue card', 'Platinum')

        Returns:
            Success message with card details or error
        """
        logger.info("=" * 80)
        logger.info("💳 FINANCE TOOL: create_card")
        logger.info(f"   Account ID: {account_id}, Type: {card_type}, Last four: {last_four}")
        logger.info("=" * 80)

        try:
            card = create_card_fn(
                db=ctx.deps.db,
                account_id=account_id,
                user_id=ctx.deps.user_id,
                card_type=card_type,
                last_four=last_four,
                card_alias=card_alias,
            )

            if not card:
                return f"Bank account not found or doesn't belong to you: {account_id}"

            alias_info = f" ({card_alias})" if card_alias else ""
            return f"Created {card_type} card{alias_info} ending in {last_four}. Card ID: {card.id}"
        except Exception as e:
            logger.error(f"Failed to create card: {e}", exc_info=True)
            return f"Failed to create card: {str(e)}"

    @agent.tool
    async def list_cards(ctx: RunContext[AgentDeps], account_id: str | None = None) -> str:
        """
        List all cards, optionally filtered by bank account.

        Args:
            ctx: Run context with database and user info
            account_id: Optional account ID to filter cards

        Returns:
            Formatted list of cards or message if none found
        """
        logger.info("=" * 80)
        logger.info("💳 FINANCE TOOL: list_cards")
        logger.info(f"   Account filter: {account_id}")
        logger.info("=" * 80)

        try:
            cards = get_user_cards(ctx.deps.db, ctx.deps.user_id, account_id)

            if not cards:
                return "No cards found. Use create_card to add one."

            lines = ["**Your Cards:**\n"]
            for card in cards:
                alias = f" ({card.card_alias})" if card.card_alias else ""
                status = "Active" if card.is_active else "Inactive"
                lines.append(f"- **{card.card_type.title()}**{alias} •••{card.last_four}")
                lines.append(f"  Status: {status}")
                lines.append(f"  Bank: {card.bank_account.bank_name}")
                lines.append(f"  ID: `{card.id}`\n")

            return "\n".join(lines)
        except Exception as e:
            logger.error(f"Failed to list cards: {e}", exc_info=True)
            return f"Failed to list cards: {str(e)}"

    @agent.tool
    async def update_card(
        ctx: RunContext[AgentDeps],
        card_id: str,
        card_alias: str | None = None,
        is_active: bool | None = None,
    ) -> str:
        """
        Update a card's details.

        Args:
            ctx: Run context with database and user info
            card_id: The UUID of the card to update
            card_alias: New friendly name for the card
            is_active: Whether the card is active (set to False to deactivate)

        Returns:
            Success message or error
        """
        logger.info("=" * 80)
        logger.info("💳 FINANCE TOOL: update_card")
        logger.info(f"   Card ID: {card_id}")
        logger.info("=" * 80)

        try:
            card = update_card_fn(
                db=ctx.deps.db,
                card_id=card_id,
                user_id=ctx.deps.user_id,
                card_alias=card_alias,
                is_active=is_active,
            )

            if not card:
                return f"Card not found or doesn't belong to you: {card_id}"

            status = "active" if card.is_active else "inactive"
            return f"Updated card •••{card.last_four}. Alias: {card.card_alias}, Status: {status}"
        except Exception as e:
            logger.error(f"Failed to update card: {e}", exc_info=True)
            return f"Failed to update card: {str(e)}"

    @agent.tool
    async def delete_card(ctx: RunContext[AgentDeps], card_id: str) -> str:
        """
        Delete a card and all its transactions.

        WARNING: This action cannot be undone.

        Args:
            ctx: Run context with database and user info
            card_id: The UUID of the card to delete

        Returns:
            Success message or error
        """
        logger.info("=" * 80)
        logger.info("💳 FINANCE TOOL: delete_card")
        logger.info(f"   Card ID: {card_id}")
        logger.info("=" * 80)

        try:
            success = delete_card_fn(
                db=ctx.deps.db,
                card_id=card_id,
                user_id=ctx.deps.user_id,
            )

            if not success:
                return f"Card not found or doesn't belong to you: {card_id}"

            return f"Deleted card {card_id} and all associated transactions."
        except Exception as e:
            logger.error(f"Failed to delete card: {e}", exc_info=True)
            return f"Failed to delete card: {str(e)}"

    # =========================================================================
    # Transaction Tools
    # =========================================================================

    @agent.tool
    async def record_transaction(
        ctx: RunContext[AgentDeps],
        amount: float,
        currency: str,
        transaction_type: str,
        transaction_date: str,
        raw_message: str,
        merchant: str | None = None,
        description: str | None = None,
        category: str | None = None,
        card_last_four: str | None = None,
        account_id: str | None = None,
    ) -> str:
        """
        Record a transaction with smart payment method detection.

        This tool automatically determines the payment method based on context:
        - If card_last_four is provided, finds and uses that specific card
        - If account_id is provided, uses that account (or its first active card)
        - If neither provided, returns error asking agent to deduce account from context

        The agent should analyze context clues (currency, merchant location, explicit mentions)
        to determine the account_id before calling this tool.

        Args:
            ctx: Run context with database and user info
            amount: Transaction amount (positive number)
            currency: Currency code (e.g., 'EUR', 'USD', 'BRL')
            transaction_type: Type of transaction ('debit', 'credit', 'transfer')
            transaction_date: Date in ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)
            raw_message: The original message (for reference)
            merchant: Optional merchant/store name
            description: Optional transaction description
            category: Optional category (e.g., 'food', 'transport', 'shopping')
            card_last_four: Optional last 4 digits if specific card mentioned
            account_id: Optional specific account ID (agent should deduce from context)

        Returns:
            Success message with transaction details or error message
        """
        logger.info("=" * 80)
        logger.info("💸 FINANCE TOOL: record_transaction")
        logger.info(f"   Amount: {amount} {currency}, Type: {transaction_type}")
        logger.info(f"   Merchant: {merchant}, Category: {category}")
        logger.info(f"   Hints: card={card_last_four}, account={account_id}")
        logger.info("=" * 80)

        try:
            card_id = None
            bank_account_id = None
            account = None

            # Strategy 1: Find card by last_four if mentioned
            if card_last_four:
                card = get_card_by_last_four_fn(
                    db=ctx.deps.db,
                    user_id=ctx.deps.user_id,
                    last_four=card_last_four,
                )
                if card:
                    card_id = str(card.id)
                    # Get the account for confirmation message
                    account = get_bank_account_by_id(
                        ctx.deps.db, str(card.bank_account_id), ctx.deps.user_id
                    )
                    logger.info(f"Found card by last_four: {card_id}")
                else:
                    # List user's cards to help them
                    cards = get_user_cards(ctx.deps.db, ctx.deps.user_id)
                    if cards:
                        cards_list = ", ".join(
                            [f"•••{c.last_four} ({c.card_alias or c.card_type})" for c in cards]
                        )
                        return f"❌ Card ending in {card_last_four} not found. Your registered cards: {cards_list}. Please register this card first or specify which account to use."
                    else:
                        return f"❌ Card ending in {card_last_four} not found. You have no registered cards. Please create a card first or I can record this as a direct bank transfer - just tell me which account."

            # Strategy 2: Use account-specific payment method (if account_id provided)
            if not card_id and account_id:
                card_id, bank_account_id, account = get_default_payment_method_fn(
                    db=ctx.deps.db,
                    user_id=ctx.deps.user_id,
                    account_id=account_id,
                )

                if not card_id and not bank_account_id:
                    return f"❌ Account {account_id} not found or doesn't belong to you."

            # Strategy 3: If still no payment method, agent needs to determine account from context
            if not card_id and not bank_account_id:
                # The agent should have deduced the account_id from context before calling this tool
                # If we're here, it means the agent couldn't determine it - need to ask user
                accounts = get_user_bank_accounts(ctx.deps.db, ctx.deps.user_id)
                if not accounts:
                    return "❌ No bank accounts found. Please create a bank account first using create_bank_account."
                else:
                    accounts_list = ", ".join(
                        [
                            f"{acc.bank_name} ({acc.account_alias or acc.account_type})"
                            for acc in accounts
                        ]
                    )
                    return f"💡 I need to know which account this transaction is from. Your accounts: {accounts_list}. Which one should I use?"

            # Parse the date
            try:
                if "T" in transaction_date:
                    parsed_date = datetime.fromisoformat(transaction_date)
                else:
                    parsed_date = datetime.strptime(transaction_date, "%Y-%m-%d")
            except ValueError:
                parsed_date = datetime.utcnow()
                logger.warning(f"Could not parse date '{transaction_date}', using current time")

            # Record the transaction
            transaction = record_transaction_fn(
                db=ctx.deps.db,
                user_id=ctx.deps.user_id,
                amount=Decimal(str(amount)),
                currency=currency,
                transaction_type=transaction_type,
                transaction_date=parsed_date,
                raw_message=raw_message,
                card_id=card_id,
                bank_account_id=bank_account_id,
                merchant=merchant,
                description=description,
                category=category,
            )

            if not transaction:
                return "❌ Failed to record transaction. Payment method not found or doesn't belong to you."

            # Build friendly confirmation message
            merchant_info = f" at {merchant}" if merchant else ""
            category_info = f" [{category}]" if category else ""

            # Get payment method details for confirmation
            if card_id:
                card = get_card_by_id(ctx.deps.db, card_id, ctx.deps.user_id)
                source_info = f" (card •••{card.last_four} from {account.bank_name if account else 'account'})"
            else:
                source_info = f" (from {account.bank_name if account else 'bank account'})"

            return f"✓ Recorded {transaction_type}: {currency} {amount:.2f}{merchant_info}{category_info}{source_info}"

        except Exception as e:
            logger.error(f"Failed to record transaction: {e}", exc_info=True)
            return f"❌ Failed to record transaction: {str(e)}"

    @agent.tool
    async def list_transactions(
        ctx: RunContext[AgentDeps],
        days: int = 30,
        category: str | None = None,
        merchant: str | None = None,
    ) -> str:
        """
        List recent transactions with optional filters.

        Args:
            ctx: Run context with database and user info
            days: Number of days to look back (default: 30)
            category: Optional category filter (partial match)
            merchant: Optional merchant filter (partial match)

        Returns:
            Formatted list of transactions or message if none found
        """
        logger.info("=" * 80)
        logger.info("💸 FINANCE TOOL: list_transactions")
        logger.info(f"   Days: {days}, Category: {category}, Merchant: {merchant}")
        logger.info("=" * 80)

        try:
            transactions = get_user_transactions(
                db=ctx.deps.db,
                user_id=ctx.deps.user_id,
                days=days,
                category=category,
                merchant=merchant,
            )

            if not transactions:
                filters = []
                if category:
                    filters.append(f"category='{category}'")
                if merchant:
                    filters.append(f"merchant='{merchant}'")
                filter_info = f" with filters: {', '.join(filters)}" if filters else ""
                return f"No transactions found in the last {days} days{filter_info}."

            lines = [f"**Transactions (last {days} days):**\n"]
            for tx in transactions:
                date_str = tx.transaction_date.strftime("%Y-%m-%d")
                merchant_info = tx.merchant or "Unknown"
                category_info = f" [{tx.category}]" if tx.category else ""
                sign = "-" if tx.transaction_type == "debit" else "+"
                lines.append(
                    f"- {date_str} | {sign}{tx.currency} {tx.amount:.2f} | {merchant_info}{category_info}"
                )

            return "\n".join(lines)
        except Exception as e:
            logger.error(f"Failed to list transactions: {e}", exc_info=True)
            return f"Failed to list transactions: {str(e)}"

    @agent.tool
    async def get_spending_summary(
        ctx: RunContext[AgentDeps],
        days: int = 30,
        group_by: str = "category",
    ) -> str:
        """
        Get a spending summary with totals and breakdown.

        Args:
            ctx: Run context with database and user info
            days: Number of days to analyze (default: 30)
            group_by: How to group spending ('category' or 'merchant')

        Returns:
            Formatted spending summary with breakdown
        """
        logger.info("=" * 80)
        logger.info("📊 FINANCE TOOL: get_spending_summary")
        logger.info(f"   Days: {days}, Group by: {group_by}")
        logger.info("=" * 80)

        try:
            summary = get_spending_summary_fn(
                db=ctx.deps.db,
                user_id=ctx.deps.user_id,
                days=days,
                group_by=group_by,
            )

            lines = [f"**Spending Summary (last {summary['period_days']} days):**\n"]
            lines.append(f"Total Spending: {summary['total_spending']:.2f}")
            lines.append(f"Total Income: {summary['total_income']:.2f}")
            lines.append(f"Net: {summary['total_income'] - summary['total_spending']:.2f}")
            lines.append(f"Transactions: {summary['transaction_count']}\n")

            if summary["breakdown"]:
                lines.append(f"**Breakdown by {group_by.title()}:**")
                for item in summary["breakdown"]:
                    pct = (
                        (item["total"] / summary["total_spending"] * 100)
                        if summary["total_spending"]
                        else 0
                    )
                    lines.append(
                        f"- {item['name']}: {item['total']:.2f} ({pct:.1f}%) - {item['count']} transactions"
                    )
            else:
                lines.append("No spending breakdown available.")

            return "\n".join(lines)
        except Exception as e:
            logger.error(f"Failed to get spending summary: {e}", exc_info=True)
            return f"Failed to get spending summary: {str(e)}"
