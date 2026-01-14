'use client';

import { useState } from 'react';
import { DollarSign, User } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export function LoginPage() {
  const { users, login, error } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const handleLogin = () => {
    if (selectedUserId) {
      login(selectedUserId);
    }
  };

  // Helper to get display name for user
  const getUserDisplayName = (user: (typeof users)[0]) => {
    if (user.name) return user.name;
    if (user.phone) return user.phone;
    // Format WhatsApp JID to be more readable
    return user.whatsapp_jid.replace(/@.*$/, '');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <DollarSign className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Finance Dashboard</CardTitle>
          <CardDescription>Select your account to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          {users.length === 0 ? (
            <div className="text-center text-muted-foreground">
              <User className="mx-auto h-12 w-12 mb-2 opacity-50" />
              <p>No users found.</p>
              <p className="text-sm">Please add users via WhatsApp first.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="user-select">Account</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="user-select">
                  <SelectValue placeholder="Choose an account..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {getUserDisplayName(user)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
        {users.length > 0 && (
          <CardFooter>
            <Button onClick={handleLogin} disabled={!selectedUserId} className="w-full">
              Continue
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
