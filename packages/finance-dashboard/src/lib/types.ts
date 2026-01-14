// Finance Dashboard Types - mirrors Python models

export interface User {
  id: string;
  whatsapp_jid: string;
  phone: string | null;
  name: string | null;
  created_at: string;
}

export interface Balance {
  id?: string;
  currency: string;
  balance: number;
  updated_at?: string;
}

export interface BankAccount {
  id: string;
  bank_name: string;
  country: string;
  account_alias: string | null;
  account_type: 'checking' | 'savings' | 'credit';
  last_four: string | null;
  created_at: string;
  balances: Balance[];
}

export interface BankAccountCreate {
  bank_name: string;
  country: string;
  account_alias?: string | null;
  account_type: 'checking' | 'savings' | 'credit';
  last_four?: string | null;
}

export interface Card {
  id: string;
  bank_account_id: string;
  card_type: 'debit' | 'credit';
  last_four: string;
  card_alias: string | null;
  is_active: boolean;
  created_at: string;
  bank_name?: string;
}

export interface CardCreate {
  bank_account_id: string;
  card_type: 'debit' | 'credit';
  last_four: string;
  card_alias?: string | null;
  is_active?: boolean;
}

export interface Transaction {
  id: string;
  card_id: string | null;
  bank_account_id: string | null;
  amount: number;
  currency: string;
  merchant: string | null;
  description: string | null;
  category: string | null;
  transaction_type: 'debit' | 'credit' | 'transfer';
  transaction_date: string;
  created_at: string;
  card_last_four?: string | null;
  bank_name?: string | null;
}

export interface TransactionCreate {
  card_id?: string | null;
  bank_account_id?: string | null;
  amount: number;
  currency: string;
  merchant?: string | null;
  description?: string | null;
  category?: string | null;
  transaction_type: 'debit' | 'credit' | 'transfer';
  transaction_date: string;
  raw_message?: string;
}

export interface SpendingSummary {
  category: string;
  total: number;
  count: number;
  currency: string;
}

export interface MonthlySummary {
  month: string;
  total: number;
  count: number;
  currency: string;
}

// Common transaction categories
export const CATEGORIES = [
  'groceries',
  'restaurants',
  'transport',
  'entertainment',
  'shopping',
  'utilities',
  'healthcare',
  'travel',
  'subscriptions',
  'other',
] as const;

export type Category = (typeof CATEGORIES)[number];

// Currency options
export const CURRENCIES = ['EUR', 'USD', 'BRL', 'GBP'] as const;
export type Currency = (typeof CURRENCIES)[number];

// Country codes
export const COUNTRIES = [
  { code: 'BR', name: 'Brazil' },
  { code: 'DE', name: 'Germany' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'PT', name: 'Portugal' },
] as const;
