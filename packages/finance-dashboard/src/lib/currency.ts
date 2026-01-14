// Currency utilities for exchange rate fetching and conversion

const EXCHANGE_API_BASE =
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies';

export interface ExchangeRates {
  date: string;
  rates: Record<string, number>;
}

/**
 * Fetch exchange rates from the free currency API
 * Returns rates relative to the base currency (e.g., if base is EUR, rates show how many of each currency equals 1 EUR)
 */
export async function fetchExchangeRates(baseCurrency: string): Promise<ExchangeRates> {
  const base = baseCurrency.toLowerCase();
  const url = `${EXCHANGE_API_BASE}/${base}.min.json`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch exchange rates: ${response.statusText}`);
  }

  const data = await response.json();

  // API returns { date: "2025-01-14", [base]: { eur: 1.0, usd: 1.08, ... } }
  return {
    date: data.date,
    rates: data[base] || {},
  };
}

/**
 * Convert an amount from one currency to another using exchange rates
 * Rates should be relative to the target currency (fetched with target as base)
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>
): number {
  // Skip conversion for "ALL" which is a marker meaning mixed currencies from API
  // (Also avoids confusion with Albanian Lek which has the same ISO code)
  if (fromCurrency.toUpperCase() === 'ALL') {
    return amount;
  }

  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
    return amount;
  }

  const from = fromCurrency.toLowerCase();
  const rate = rates[from];

  if (!rate || rate === 0) {
    // If no rate available, return original amount
    return amount;
  }

  // rates are relative to toCurrency, so 1 toCurrency = rate fromCurrency
  // To convert from fromCurrency to toCurrency: amount / rate
  return amount / rate;
}

/**
 * Format a number as currency with proper locale
 */
export function formatCurrency(value: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Format a number as currency with approximate symbol for converted values
 */
export function formatConvertedCurrency(value: number, currency = 'EUR'): string {
  return `≈ ${formatCurrency(value, currency)}`;
}
