import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import { api, setAccessToken } from '@/lib/api'

interface AdminUser {
  id: string
  name: string | null
  email: string | null
  role: string
}

interface AuthContextValue {
  user: AdminUser | null
  isAuthenticated: boolean
  isRestoring: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  hasPermission: (...roles: string[]) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  // True until the initial /auth/refresh attempt (using the httpOnly cookie
  // from a previous login) resolves — prevents a flash-redirect to /login on
  // every page reload while that request is still in flight.
  const [isRestoring, setIsRestoring] = useState(true)

  useEffect(() => {
    api
      .post<{ user: AdminUser; accessToken: string }>('/auth/refresh')
      .then(({ data }) => {
        setAccessToken(data.accessToken)
        setUser(data.user)
      })
      .catch(() => {
        // No valid session cookie (first visit, expired, or logged out) — stay logged out.
      })
      .finally(() => setIsRestoring(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<{ user: AdminUser; accessToken: string }>('/auth/admin/login', {
      email,
      password,
    })
    setAccessToken(data.accessToken)
    setUser(data.user)
  }, [])

  const logout = useCallback(() => {
    setAccessToken(null)
    setUser(null)
  }, [])

  // Granular permissions aren't modeled yet — role membership stands in for now.
  const hasPermission = useCallback((...roles: string[]) => !!user && roles.includes(user.role), [user])

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, isRestoring, login, logout, hasPermission }),
    [user, isRestoring, login, logout, hasPermission]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
