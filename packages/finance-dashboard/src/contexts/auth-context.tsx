'use client';

import * as React from 'react';
import type { User } from '@/lib/types';
import { getUsers, getStoredUserId, setStoredUserId, clearStoredUserId } from '@/lib/api';

interface AuthContextProps {
  user: User | null;
  users: User[];
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (userId: string) => void;
  logout: () => void;
  error: string | null;
}

const AuthContext = React.createContext<AuthContextProps | null>(null);

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [users, setUsers] = React.useState<User[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Load users and check stored user on mount
  React.useEffect(() => {
    async function initialize() {
      try {
        // Fetch all available users
        const fetchedUsers = await getUsers();
        setUsers(fetchedUsers);

        // Check localStorage for stored user
        const storedUserId = getStoredUserId();
        if (storedUserId) {
          const storedUser = fetchedUsers.find((u) => u.id === storedUserId);
          if (storedUser) {
            setUser(storedUser);
          } else {
            // Stored user no longer exists, clear it
            clearStoredUserId();
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load users');
      } finally {
        setIsLoading(false);
      }
    }

    initialize();
  }, []);

  const login = React.useCallback(
    (userId: string) => {
      const selectedUser = users.find((u) => u.id === userId);
      if (selectedUser) {
        setStoredUserId(userId);
        setUser(selectedUser);
      }
    },
    [users]
  );

  const logout = React.useCallback(() => {
    clearStoredUserId();
    setUser(null);
  }, []);

  const value = React.useMemo(
    () => ({
      user,
      users,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
      error,
    }),
    [user, users, isLoading, login, logout, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
