import { useState, useEffect, useContext, ReactNode } from 'react';
import { useGetMe, setAuthTokenGetter, getGetMeQueryKey } from '@workspace/api-client-react';
import type { User } from '@workspace/api-client-react';
import { AuthContext, AuthContextType } from './auth-context-ref';

export type { AuthContextType };
export { AuthContext };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('crm_token'));
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem('crm_token'));
  }, []);

  const { data: meData, isLoading: isLoadingMe, error } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
      queryKey: getGetMeQueryKey(),
    },
  });

  useEffect(() => {
    if (meData) setUser(meData);
  }, [meData]);

  useEffect(() => {
    if (error) {
      localStorage.removeItem('crm_token');
      setToken(null);
      setUser(null);
    }
  }, [error]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('crm_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('crm_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading: isLoadingMe && !!token, login, logout: handleLogout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
