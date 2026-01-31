import { api } from "./api"
import type { AuthResponse, LoginRequest, RegisterRequest, User, ForgotPasswordRequest, ResetPasswordRequest, PasswordResetResponse } from "@/types"
import { refreshTimer } from "@/utils/refreshTimer"

const ACCESS_TOKEN_KEY = "accessToken"
const REFRESH_TOKEN_KEY = "refreshToken"
const USER_KEY = "user"

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/auth/login", credentials, {
      skipAuth: true,
    })
    this.setSession(response)
    this.startRefreshTimer()
    return response
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/auth/register", data, {
      skipAuth: true,
    })
    this.setSession(response)
    this.startRefreshTimer()
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
      this.startRefreshTimer()
      return response
    } catch {
      this.clearSession()
      return null
    }
  },

  async forgotPassword(email: string): Promise<PasswordResetResponse> {
    const response = await api.post<PasswordResetResponse>(
      "/auth/forgot-password",
      { email } as ForgotPasswordRequest,
      { skipAuth: true }
    )
    return response
  },

  async resetPassword(
    token: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<PasswordResetResponse> {
    const response = await api.post<PasswordResetResponse>(
      "/auth/reset-password",
      { token, newPassword, confirmPassword } as ResetPasswordRequest,
      { skipAuth: true }
    )
    return response
  },

  logout(): void {
    refreshTimer.clear()
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

  /**
   * Starts the refresh timer for the current access token
   * Timer will trigger a refresh 5 minutes before token expiration
   */
  startRefreshTimer(): void {
    const accessToken = this.getAccessToken()
    if (!accessToken) {
      return
    }

    refreshTimer.start(accessToken, async () => {
      await this.refreshToken()
    })
  },

  /**
   * Initialize refresh timer on app load if user is authenticated
   * Should be called when app starts
   */
  initializeRefreshTimer(): void {
    if (this.isAuthenticated()) {
      this.startRefreshTimer()
    }
  },
}
