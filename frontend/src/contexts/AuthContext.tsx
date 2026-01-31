import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import { authService } from "@/services/auth"
import { setSessionExpiredCallback } from "@/services/api"
import type { User, LoginRequest, RegisterRequest } from "@/types"

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  sessionExpired: boolean
  login: (credentials: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
  clearSessionExpiredFlag: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)

  useEffect(() => {
    const storedUser = authService.getUser()
    if (storedUser) {
      setUser(storedUser)
      // Initialize refresh timer if user is already logged in
      authService.initializeRefreshTimer()
    }
    setIsLoading(false)
  }, [])

  // Set up session expired callback
  useEffect(() => {
    setSessionExpiredCallback(() => {
      setUser(null)
      setSessionExpired(true)
    })
  }, [])

  const login = useCallback(async (credentials: LoginRequest) => {
    const response = await authService.login(credentials)
    setUser(response.user)
    setSessionExpired(false)
  }, [])

  const register = useCallback(async (data: RegisterRequest) => {
    const response = await authService.register(data)
    setUser(response.user)
    setSessionExpired(false)
  }, [])

  const logout = useCallback(async () => {
    await authService.logout()
    setUser(null)
    setSessionExpired(false)
  }, [])

  const clearSessionExpiredFlag = useCallback(() => {
    setSessionExpired(false)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        sessionExpired,
        login,
        register,
        logout,
        clearSessionExpiredFlag,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
