import { api } from "./api"
import type { AuthResponse, LoginRequest, RegisterRequest, User } from "@/types"

const ACCESS_TOKEN_KEY = "accessToken"
const REFRESH_TOKEN_KEY = "refreshToken"
const USER_KEY = "user"

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/auth/login", credentials, {
      skipAuth: true,
    })
    this.setSession(response)
    return response
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/auth/register", data, {
      skipAuth: true,
    })
    this.setSession(response)
    return response
  },

  async refreshToken(): Promise<AuthResponse | null> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!refreshToken) return null

    try {
      const response = await api.post<AuthResponse>(
        "/auth/refresh",
        { refreshToken },
        { skipAuth: true }
      )
      this.setSession(response)
      return response
    } catch {
      this.clearSession()
      return null
    }
  },

  logout(): void {
    this.clearSession()
  },

  setSession(authResponse: AuthResponse): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, authResponse.accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, authResponse.refreshToken)
    localStorage.setItem(USER_KEY, JSON.stringify(authResponse.user))
  },

  clearSession(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  },

  getUser(): User | null {
    const userStr = localStorage.getItem(USER_KEY)
    if (!userStr) return null
    try {
      return JSON.parse(userStr) as User
    } catch {
      return null
    }
  },

  isAuthenticated(): boolean {
    return !!this.getAccessToken()
  },
}
