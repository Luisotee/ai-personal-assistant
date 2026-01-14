'use client';

import { Building2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import type { BankAccount, Currency } from '@/lib/types';
import { formatCurrency, formatConvertedCurrency } from '@/lib/currency';

interface BalanceDetailsSheetProps {
  accounts: BankAccount[];
  totalInPrimary: number | null;
  primaryCurrency: Currency;
  convertToPrimary: (amount: number, currency: string) => number;
  children: React.ReactNode;
}

export function BalanceDetailsSheet({
  accounts,
  totalInPrimary,
  primaryCurrency,
  convertToPrimary,
  children,
}: BalanceDetailsSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Balance Details</SheetTitle>
          <SheetDescription>
            Breakdown of balances across {accounts.length} account
            {accounts.length !== 1 ? 's' : ''}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-auto">
          {accounts.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              No accounts found
            </div>
          ) : (
            <div className="space-y-1">
              {accounts.map((account) => (
                <div key={account.id} className="rounded-lg border p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                      <Building2 className="size-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{account.bank_name}</span>
                        {account.last_four && (
                          <span className="text-xs text-muted-foreground">
                            •{account.last_four}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs capitalize">
                          {account.account_type}
                        </Badge>
                        {account.account_alias && (
                          <span className="text-xs text-muted-foreground">
                            {account.account_alias}
                          </span>
                        )}
                      </div>
                      <div className="pt-2">
                        {account.balances.length === 0 ? (
                          <span className="text-sm text-muted-foreground">No balances</span>
                        ) : (
                          <div className="space-y-1">
                            {account.balances.map((balance) => {
                              const isNonPrimary =
                                balance.currency.toUpperCase() !== primaryCurrency.toUpperCase();
                              const converted = isNonPrimary
                                ? convertToPrimary(balance.balance, balance.currency)
                                : null;

                              return (
                                <div
                                  key={balance.currency}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span className="text-muted-foreground">{balance.currency}</span>
                                  <div className="text-right">
                                    <span className="font-medium">
                                      {formatCurrency(balance.balance, balance.currency)}
                                    </span>
                                    {converted !== null && (
                                      <span className="ml-2 text-xs text-muted-foreground">
                                        ({formatConvertedCurrency(converted, primaryCurrency)})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {totalInPrimary !== null && accounts.length > 0 && (
          <SheetFooter className="border-t pt-4">
            <div className="flex w-full items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total</span>
              <span className="text-lg font-bold">
                {formatConvertedCurrency(totalInPrimary, primaryCurrency)}
              </span>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
