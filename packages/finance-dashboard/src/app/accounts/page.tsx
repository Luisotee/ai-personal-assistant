"use client";

import { useEffect, useState } from "react";
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
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  updateBalance,
} from "@/lib/api";
import type { BankAccount, BankAccountCreate } from "@/lib/types";
import { COUNTRIES, CURRENCIES } from "@/lib/types";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [balanceAccount, setBalanceAccount] = useState<BankAccount | null>(null);

  // Form state
  const [formData, setFormData] = useState<BankAccountCreate>({
    bank_name: "",
    country: "DE",
    account_alias: "",
    account_type: "checking",
    last_four: "",
  });

  // Balance form state
  const [balanceCurrency, setBalanceCurrency] = useState("EUR");
  const [balanceAmount, setBalanceAmount] = useState("");

  async function fetchAccounts() {
    try {
      setLoading(true);
      const data = await getAccounts();
      setAccounts(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAccounts();
  }, []);

  function resetForm() {
    setFormData({
      bank_name: "",
      country: "DE",
      account_alias: "",
      account_type: "checking",
      last_four: "",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      if (editingAccount) {
        await updateAccount(editingAccount.id, formData);
      } else {
        await createAccount(formData);
      }

      await fetchAccounts();
      setIsCreateOpen(false);
      setEditingAccount(null);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save account");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this account?")) return;

    try {
      await deleteAccount(id);
      await fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
    }
  }

  async function handleUpdateBalance(e: React.FormEvent) {
    e.preventDefault();
    if (!balanceAccount) return;

    try {
      await updateBalance(balanceAccount.id, balanceCurrency, parseFloat(balanceAmount));
      await fetchAccounts();
      setBalanceAccount(null);
      setBalanceAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update balance");
    }
  }

  function openEdit(account: BankAccount) {
    setFormData({
      bank_name: account.bank_name,
      country: account.country,
      account_alias: account.account_alias || "",
      account_type: account.account_type,
      last_four: account.last_four || "",
    });
    setEditingAccount(account);
    setIsCreateOpen(true);
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-lg text-slate-500">Loading accounts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Bank Accounts</h1>
        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) {
              setEditingAccount(null);
              resetForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>Add Account</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAccount ? "Edit Account" : "Add Bank Account"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input
                  id="bank_name"
                  value={formData.bank_name}
                  onChange={(e) =>
                    setFormData({ ...formData, bank_name: e.target.value })
                  }
                  placeholder="e.g., Wise, N26, Nubank"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select
                    value={formData.country}
                    onValueChange={(value) =>
                      setFormData({ ...formData, country: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account_type">Account Type</Label>
                  <Select
                    value={formData.account_type}
                    onValueChange={(value: "checking" | "savings" | "credit") =>
                      setFormData({ ...formData, account_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checking">Checking</SelectItem>
                      <SelectItem value="savings">Savings</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="account_alias">Alias (optional)</Label>
                  <Input
                    id="account_alias"
                    value={formData.account_alias || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, account_alias: e.target.value })
                    }
                    placeholder="e.g., Main Account"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_four">Last 4 Digits (optional)</Label>
                  <Input
                    id="last_four"
                    value={formData.last_four || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, last_four: e.target.value })
                    }
                    placeholder="e.g., 1234"
                    maxLength={4}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingAccount(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingAccount ? "Save Changes" : "Create Account"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>
      )}

      {/* Balance Update Dialog */}
      <Dialog
        open={!!balanceAccount}
        onOpenChange={(open) => {
          if (!open) {
            setBalanceAccount(null);
            setBalanceAmount("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Balance</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateBalance} className="space-y-4">
            <div className="space-y-2">
              <Label>Account</Label>
              <p className="text-sm text-slate-600">
                {balanceAccount?.bank_name} ({balanceAccount?.account_alias || "No alias"})
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="balance_currency">Currency</Label>
                <Select
                  value={balanceCurrency}
                  onValueChange={setBalanceCurrency}
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
                <Label htmlFor="balance_amount">Amount</Label>
                <Input
                  id="balance_amount"
                  type="number"
                  step="0.01"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setBalanceAccount(null);
                  setBalanceAmount("");
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Update Balance</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bank</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Alias</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Balances</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">
                      {account.bank_name}
                      {account.last_four && (
                        <span className="ml-2 text-slate-400">
                          ****{account.last_four}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{account.account_type}</Badge>
                    </TableCell>
                    <TableCell>{account.account_alias || "-"}</TableCell>
                    <TableCell>{account.country}</TableCell>
                    <TableCell>
                      {account.balances.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {account.balances.map((b) => (
                            <Badge key={b.currency} variant="secondary">
                              {new Intl.NumberFormat("de-DE", {
                                style: "currency",
                                currency: b.currency,
                              }).format(b.balance)}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">No balances</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setBalanceAccount(account)}
                        >
                          Balance
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(account)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(account.id)}
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
            <div className="py-8 text-center text-slate-500">
              No accounts yet. Add your first bank account to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
