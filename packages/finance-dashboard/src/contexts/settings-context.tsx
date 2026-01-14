'use client';

import * as React from 'react';
import type { Currency } from '@/lib/types';
import { CURRENCIES } from '@/lib/types';
import { fetchExchangeRates, convertCurrency, type ExchangeRates } from '@/lib/currency';

const CURRENCY_STORAGE_KEY = 'finance_dashboard_primary_currency';

interface SettingsContextProps {
  primaryCurrency: Currency;
  setPrimaryCurrency: (currency: Currency) => void;
  exchangeRates: ExchangeRates | null;
  isLoadingRates: boolean;
  convertToPrimary: (amount: number, fromCurrency: string) => number;
}

const SettingsContext = React.createContext<SettingsContextProps | null>(null);

export function useSettings() {
  const context = React.useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

function getStoredCurrency(): Currency {
  if (typeof window === 'undefined') return 'EUR';
  const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
  if (stored && CURRENCIES.includes(stored as Currency)) {
    return stored as Currency;
  }
  return 'EUR';
}

function setStoredCurrency(currency: Currency): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [primaryCurrency, setPrimaryCurrencyState] = React.useState<Currency>('EUR');
  const [exchangeRates, setExchangeRates] = React.useState<ExchangeRates | null>(null);
  const [isLoadingRates, setIsLoadingRates] = React.useState(true);
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Initialize from localStorage on mount
  React.useEffect(() => {
    setPrimaryCurrencyState(getStoredCurrency());
    setIsInitialized(true);
  }, []);

  // Fetch exchange rates when primary currency changes
  React.useEffect(() => {
    if (!isInitialized) return;

    let cancelled = false;

    async function loadRates() {
      setIsLoadingRates(true);
      try {
        const rates = await fetchExchangeRates(primaryCurrency);
        if (!cancelled) {
          setExchangeRates(rates);
        }
      } catch (err) {
        // Log error but don't crash - conversion will gracefully fallback
        console.error('Failed to fetch exchange rates:', err);
        if (!cancelled) {
          setExchangeRates(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingRates(false);
        }
      }
    }

    loadRates();

    return () => {
      cancelled = true;
    };
  }, [primaryCurrency, isInitialized]);

  const setPrimaryCurrency = React.useCallback((currency: Currency) => {
    setStoredCurrency(currency);
    setPrimaryCurrencyState(currency);
  }, []);

  const convertToPrimary = React.useCallback(
    (amount: number, fromCurrency: string): number => {
      if (!exchangeRates?.rates) {
        return amount;
      }
      return convertCurrency(amount, fromCurrency, primaryCurrency, exchangeRates.rates);
    },
    [exchangeRates, primaryCurrency]
  );

  const value = React.useMemo(
    () => ({
      primaryCurrency,
      setPrimaryCurrency,
      exchangeRates,
      isLoadingRates,
      convertToPrimary,
    }),
    [primaryCurrency, setPrimaryCurrency, exchangeRates, isLoadingRates, convertToPrimary]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
