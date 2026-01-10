// Finance Dashboard API Client

import type {
  Balance,
  BankAccount,
  BankAccountCreate,
  Card,
  CardCreate,
  MonthlySummary,
  SpendingSummary,
  Transaction,
  TransactionCreate,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new ApiError(response.status, error.detail || "Request failed");
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// =============================================================================
// Bank Accounts
// =============================================================================

export async function getAccounts(): Promise<BankAccount[]> {
  return fetchApi<BankAccount[]>("/finance/accounts");
}

export async function getAccount(id: string): Promise<BankAccount> {
  return fetchApi<BankAccount>(`/finance/accounts/${id}`);
}

export async function createAccount(data: BankAccountCreate): Promise<BankAccount> {
  return fetchApi<BankAccount>("/finance/accounts", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateAccount(
  id: string,
  data: Partial<BankAccountCreate>
): Promise<BankAccount> {
  return fetchApi<BankAccount>(`/finance/accounts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteAccount(id: string): Promise<void> {
  return fetchApi<void>(`/finance/accounts/${id}`, {
    method: "DELETE",
  });
}

// =============================================================================
// Account Balances
// =============================================================================

export async function getBalances(accountId: string): Promise<Balance[]> {
  return fetchApi<Balance[]>(`/finance/accounts/${accountId}/balances`);
}

export async function updateBalance(
  accountId: string,
  currency: string,
  balance: number
): Promise<Balance> {
  return fetchApi<Balance>(`/finance/accounts/${accountId}/balances`, {
    method: "PUT",
    body: JSON.stringify({ currency, balance }),
  });
}

// =============================================================================
// Cards
// =============================================================================

export async function getCards(accountId?: string): Promise<Card[]> {
  const params = accountId ? `?account_id=${accountId}` : "";
  return fetchApi<Card[]>(`/finance/cards${params}`);
}

export async function getCard(id: string): Promise<Card> {
  return fetchApi<Card>(`/finance/cards/${id}`);
}

export async function createCard(data: CardCreate): Promise<Card> {
  return fetchApi<Card>("/finance/cards", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCard(
  id: string,
  data: Partial<CardCreate>
): Promise<Card> {
  return fetchApi<Card>(`/finance/cards/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteCard(id: string): Promise<void> {
  return fetchApi<void>(`/finance/cards/${id}`, {
    method: "DELETE",
  });
}

// =============================================================================
// Transactions
// =============================================================================

export interface TransactionFilters {
  card_id?: string;
  category?: string;
  transaction_type?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export async function getTransactions(
  filters: TransactionFilters = {}
): Promise<Transaction[]> {
  const params = new URLSearchParams();
  if (filters.card_id) params.set("card_id", filters.card_id);
  if (filters.category) params.set("category", filters.category);
  if (filters.transaction_type) params.set("transaction_type", filters.transaction_type);
  if (filters.start_date) params.set("start_date", filters.start_date);
  if (filters.end_date) params.set("end_date", filters.end_date);
  if (filters.limit) params.set("limit", filters.limit.toString());
  if (filters.offset) params.set("offset", filters.offset.toString());

  const query = params.toString();
  return fetchApi<Transaction[]>(`/finance/transactions${query ? `?${query}` : ""}`);
}

export async function getTransaction(id: string): Promise<Transaction> {
  return fetchApi<Transaction>(`/finance/transactions/${id}`);
}

export async function createTransaction(data: TransactionCreate): Promise<Transaction> {
  return fetchApi<Transaction>("/finance/transactions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTransaction(
  id: string,
  data: Partial<TransactionCreate>
): Promise<Transaction> {
  return fetchApi<Transaction>(`/finance/transactions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  return fetchApi<void>(`/finance/transactions/${id}`, {
    method: "DELETE",
  });
}

// =============================================================================
// Analytics
// =============================================================================

export interface AnalyticsFilters {
  start_date?: string;
  end_date?: string;
  currency?: string;
}

export async function getSpendingByCategory(
  filters: AnalyticsFilters = {}
): Promise<SpendingSummary[]> {
  const params = new URLSearchParams();
  if (filters.start_date) params.set("start_date", filters.start_date);
  if (filters.end_date) params.set("end_date", filters.end_date);
  if (filters.currency) params.set("currency", filters.currency);

  const query = params.toString();
  return fetchApi<SpendingSummary[]>(
    `/finance/analytics/spending${query ? `?${query}` : ""}`
  );
}

export async function getMonthlySpending(
  months: number = 6,
  currency: string = "EUR"
): Promise<MonthlySummary[]> {
  return fetchApi<MonthlySummary[]>(
    `/finance/analytics/monthly?months=${months}&currency=${currency}`
  );
}
