"use client";

import { useEffect, useState } from "react";
import { Receipt, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getAccounts,
  getCards,
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  type TransactionFilters,
} from "@/lib/api";
import type { BankAccount, Card as CardType, Transaction, TransactionCreate } from "@/lib/types";
import { CATEGORIES, CURRENCIES } from "@/lib/types";

function TransactionsTableSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cards, setCards] = useState<CardType[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Filter state
  const [filters, setFilters] = useState<TransactionFilters>({
    limit: 50,
  });

  // Form state - sourceType determines whether we use card or account
  const [sourceType, setSourceType] = useState<"card" | "account">("card");
  const [formData, setFormData] = useState<TransactionCreate>({
    card_id: null,
    bank_account_id: null,
    amount: 0,
    currency: "EUR",
    merchant: "",
    description: "",
    category: "",
    transaction_type: "debit",
    transaction_date: new Date().toISOString().split("T")[0],
    raw_message: "",
  });

  async function fetchData() {
    try {
      setLoading(true);
      const [transactionsData, cardsData, accountsData] = await Promise.all([
        getTransactions(filters),
        getCards(),
        getAccounts(),
      ]);
      setTransactions(transactionsData);
      setCards(cardsData);
      setAccounts(accountsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  function resetForm() {
    // Default to card if available, otherwise account
    const defaultToCard = cards.length > 0;
    setSourceType(defaultToCard ? "card" : "account");
    setFormData({
      card_id: defaultToCard ? cards[0]?.id : null,
      bank_account_id: !defaultToCard ? accounts[0]?.id : null,
      amount: 0,
      currency: "EUR",
      merchant: "",
      description: "",
      category: "",
      transaction_type: "debit",
      transaction_date: new Date().toISOString().split("T")[0],
      raw_message: "",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      // Build submit data based on sourceType
      const submitData: TransactionCreate = {
        ...formData,
        card_id: sourceType === "card" ? formData.card_id : null,
        bank_account_id: sourceType === "account" ? formData.bank_account_id : null,
        transaction_date: new Date(formData.transaction_date).toISOString(),
      };

      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, submitData);
      } else {
        await createTransaction(submitData);
      }

      await fetchData();
      setIsCreateOpen(false);
      setEditingTransaction(null);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save transaction");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    try {
      await deleteTransaction(id);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete transaction");
    }
  }

  function openEdit(tx: Transaction) {
    // Determine source type from the transaction
    const isCardTransaction = !!tx.card_id;
    setSourceType(isCardTransaction ? "card" : "account");
    setFormData({
      card_id: tx.card_id,
      bank_account_id: tx.bank_account_id,
      amount: Math.abs(tx.amount),
      currency: tx.currency,
      merchant: tx.merchant || "",
      description: tx.description || "",
      category: tx.category || "",
      transaction_type: tx.transaction_type,
      transaction_date: tx.transaction_date.split("T")[0],
      raw_message: "",
    });
    setEditingTransaction(tx);
    setIsCreateOpen(true);
  }

  const formatCurrency = (value: number, currency: string) =>
    new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency,
    }).format(Math.abs(value));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">
            View and manage your transactions
          </p>
        </div>
        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) {
              setEditingTransaction(null);
              resetForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button disabled={cards.length === 0 && accounts.length === 0}>Add Transaction</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingTransaction ? "Edit Transaction" : "Add Transaction"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Source type selector */}
              <div className="space-y-2">
                <Label>Transaction Source</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={sourceType === "card" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSourceType("card");
                      setFormData({
                        ...formData,
                        card_id: cards[0]?.id || null,
                        bank_account_id: null,
                      });
                    }}
                    disabled={cards.length === 0 || !!editingTransaction}
                  >
                    Card
                  </Button>
                  <Button
                    type="button"
                    variant={sourceType === "account" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSourceType("account");
                      setFormData({
                        ...formData,
                        card_id: null,
                        bank_account_id: accounts[0]?.id || null,
                      });
                    }}
                    disabled={accounts.length === 0 || !!editingTransaction}
                  >
                    Bank Transfer
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {sourceType === "card"
                    ? "For card purchases, ATM withdrawals"
                    : "For PIX, wire transfers, direct debits"}
                </p>
              </div>

              {/* Card or Account selector based on sourceType */}
              {sourceType === "card" ? (
                <div className="space-y-2">
                  <Label htmlFor="card">Card</Label>
                  <Select
                    value={formData.card_id || ""}
                    onValueChange={(value) =>
                      setFormData({ ...formData, card_id: value })
                    }
                    disabled={!!editingTransaction}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select card" />
                    </SelectTrigger>
                    <SelectContent>
                      {cards.map((card) => (
                        <SelectItem key={card.id} value={card.id}>
                          **** {card.last_four} ({card.bank_name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="account">Bank Account</Label>
                  <Select
                    value={formData.bank_account_id || ""}
                    onValueChange={(value) =>
                      setFormData({ ...formData, bank_account_id: value })
                    }
                    disabled={!!editingTransaction}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.bank_name} ({account.account_alias || account.account_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) =>
                      setFormData({ ...formData, currency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transaction_type">Type</Label>
                  <Select
                    value={formData.transaction_type}
                    onValueChange={(value: "debit" | "credit" | "transfer") =>
                      setFormData({ ...formData, transaction_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debit">Debit</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="merchant">Merchant</Label>
                  <Input
                    id="merchant"
                    value={formData.merchant || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, merchant: e.target.value })
                    }
                    placeholder="e.g., Amazon, REWE"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category || ""}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c.charAt(0).toUpperCase() + c.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transaction_date">Date</Label>
                <Input
                  id="transaction_date"
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) =>
                    setFormData({ ...formData, transaction_date: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Additional notes"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingTransaction(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTransaction ? "Save Changes" : "Create Transaction"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive">{error}</div>
      )}

      {cards.length === 0 && accounts.length === 0 && !loading && (
        <div className="flex items-center gap-3 rounded-lg bg-warning/10 p-4 text-warning">
          <AlertTriangle className="size-5" />
          <span>You need to create a bank account or card before adding transactions.</span>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="w-40">
              <Select
                value={filters.card_id || "all"}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    card_id: value === "all" ? undefined : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All cards" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All cards</SelectItem>
                  {cards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      **** {card.last_four}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-40">
              <Select
                value={filters.category || "all"}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    category: value === "all" ? undefined : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-32">
              <Select
                value={filters.transaction_type || "all"}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    transaction_type: value === "all" ? undefined : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="debit">Debit</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              onClick={() =>
                setFilters({ limit: 50 })
              }
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && transactions.length === 0 ? (
            <TransactionsTableSkeleton />
          ) : transactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      {new Date(tx.transaction_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium">
                      {tx.merchant || tx.description || "-"}
                    </TableCell>
                    <TableCell>
                      {tx.category ? (
                        <Badge variant="outline">
                          {tx.category.charAt(0).toUpperCase() + tx.category.slice(1)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {tx.card_id ? (
                        <span className="text-sm">**** {tx.card_last_four}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {tx.bank_name || "Bank"} <Badge variant="outline" className="ml-1 text-xs">Transfer</Badge>
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={tx.transaction_type === "credit" ? "default" : "secondary"}
                        className={tx.transaction_type === "credit" ? "bg-success hover:bg-success/80" : ""}
                      >
                        {tx.transaction_type}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold ${
                        tx.transaction_type === "credit"
                          ? "text-success"
                          : "text-destructive"
                      }`}
                    >
                      {tx.transaction_type === "credit" ? "+" : "-"}
                      {formatCurrency(tx.amount, tx.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(tx)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(tx.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              icon={Receipt}
              title="No transactions found"
              description={
                cards.length === 0 && accounts.length === 0
                  ? "Create a bank account or card first, then add transactions."
                  : "Add your first transaction to start tracking your spending."
              }
              action={
                cards.length > 0 || accounts.length > 0 ? (
                  <Button onClick={() => setIsCreateOpen(true)}>
                    Add Transaction
                  </Button>
                ) : undefined
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
