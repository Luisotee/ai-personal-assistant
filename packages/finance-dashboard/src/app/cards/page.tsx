"use client";

import { useEffect, useState } from "react";
import { CreditCard, AlertTriangle } from "lucide-react";
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
  createCard,
  updateCard,
  deleteCard,
} from "@/lib/api";
import type { BankAccount, Card as CardType, CardCreate } from "@/lib/types";

function CardsTableSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}

export default function CardsPage() {
  const [cards, setCards] = useState<CardType[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardType | null>(null);

  // Form state
  const [formData, setFormData] = useState<CardCreate>({
    bank_account_id: "",
    card_type: "debit",
    last_four: "",
    card_alias: "",
    is_active: true,
  });

  async function fetchData() {
    try {
      setLoading(true);
      const [cardsData, accountsData] = await Promise.all([
        getCards(),
        getAccounts(),
      ]);
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
  }, []);

  function resetForm() {
    setFormData({
      bank_account_id: accounts[0]?.id || "",
      card_type: "debit",
      last_four: "",
      card_alias: "",
      is_active: true,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      if (editingCard) {
        await updateCard(editingCard.id, {
          card_type: formData.card_type,
          card_alias: formData.card_alias,
          is_active: formData.is_active,
        });
      } else {
        await createCard(formData);
      }

      await fetchData();
      setIsCreateOpen(false);
      setEditingCard(null);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save card");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this card?")) return;

    try {
      await deleteCard(id);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete card");
    }
  }

  async function handleToggleActive(card: CardType) {
    try {
      await updateCard(card.id, { is_active: !card.is_active });
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update card");
    }
  }

  function openEdit(card: CardType) {
    setFormData({
      bank_account_id: card.bank_account_id,
      card_type: card.card_type,
      last_four: card.last_four,
      card_alias: card.card_alias || "",
      is_active: card.is_active,
    });
    setEditingCard(card);
    setIsCreateOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cards</h1>
          <p className="text-muted-foreground">
            Manage your debit and credit cards
          </p>
        </div>
        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) {
              setEditingCard(null);
              resetForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button disabled={accounts.length === 0}>Add Card</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCard ? "Edit Card" : "Add Card"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingCard && (
                <div className="space-y-2">
                  <Label htmlFor="bank_account">Bank Account</Label>
                  <Select
                    value={formData.bank_account_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, bank_account_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.bank_name}
                          {account.account_alias && ` (${account.account_alias})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="card_type">Card Type</Label>
                  <Select
                    value={formData.card_type}
                    onValueChange={(value: "debit" | "credit") =>
                      setFormData({ ...formData, card_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debit">Debit</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_four">Last 4 Digits</Label>
                  <Input
                    id="last_four"
                    value={formData.last_four}
                    onChange={(e) =>
                      setFormData({ ...formData, last_four: e.target.value })
                    }
                    placeholder="1234"
                    maxLength={4}
                    required
                    disabled={!!editingCard}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="card_alias">Alias (optional)</Label>
                <Input
                  id="card_alias"
                  value={formData.card_alias || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, card_alias: e.target.value })
                  }
                  placeholder="e.g., Blue Card, Travel Card"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="h-4 w-4"
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  Card is active
                </Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingCard(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingCard ? "Save Changes" : "Create Card"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive">{error}</div>
      )}

      {accounts.length === 0 && !loading && (
        <div className="flex items-center gap-3 rounded-lg bg-warning/10 p-4 text-warning">
          <AlertTriangle className="size-5" />
          <span>You need to create a bank account before adding cards.</span>
        </div>
      )}

      {/* Cards Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Cards</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <CardsTableSkeleton />
          ) : cards.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Card</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Bank Account</TableHead>
                  <TableHead>Alias</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cards.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell className="font-medium">
                      **** {card.last_four}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={card.card_type === "credit" ? "default" : "outline"}
                      >
                        {card.card_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{card.bank_name || "Unknown"}</TableCell>
                    <TableCell>{card.card_alias || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={card.is_active ? "default" : "secondary"}
                        className={card.is_active ? "bg-success hover:bg-success/80" : ""}
                      >
                        {card.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(card)}
                        >
                          {card.is_active ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(card)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(card.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : accounts.length > 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No cards yet"
              description="Add your first card to start tracking transactions."
              action={
                <Button onClick={() => setIsCreateOpen(true)}>
                  Add Card
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={CreditCard}
              title="No cards yet"
              description="Create a bank account first, then add your cards."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
