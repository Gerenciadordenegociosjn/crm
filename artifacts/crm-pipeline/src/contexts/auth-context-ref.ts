/**
 * ⚠️  Keep this file free of non-type imports from @workspace/api-client-react.
 *
 * AuthContext.tsx imports from @workspace/api-client-react (useGetMe, etc.).
 * When codegen regenerates those files, Vite HMR cascades into AuthContext.tsx
 * and creates a NEW createContext() object — breaking provider/consumer
 * object-identity. By isolating createContext here (which only depends on
 * React, a stable module), the context reference survives every HMR cycle.
 */
import { createContext } from 'react';
// `import type` is erased at compile-time → no runtime dep → not part of HMR cascade
import type { User } from '@workspace/api-client-react';

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);
