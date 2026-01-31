import { api } from "./api"
import type { AuthResponse, LoginRequest, RegisterRequest, User, ForgotPasswordRequest, ResetPasswordRequest, PasswordResetResponse, SessionResponse } from "@/types"
import { refreshTimer } from "@/utils/refreshTimer"

const ACCESS_TOKEN_KEY = "accessToken"
const REFRESH_TOKEN_KEY = "refreshToken"
const USER_KEY = "user"
const REMEMBER_ME_KEY = "rememberMe"

export const authService = {
  // Flag to control whether to use cookies or localStorage for tokens
  // Reads from VITE_USE_COOKIES environment variable (default: false)
  useCookies: import.meta.env.VITE_USE_COOKIES === 'true',

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const url = this.useCookies
      ? "/auth/login?useCookies=true"
      : "/auth/login"

    const response = await api.post<AuthResponse>(url, credentials, {
      skipAuth: true,
    })
    this.setSession(response, credentials.rememberMe)
    // Pass token from response to start timer (even in cookie mode, response includes token)
    this.startRefreshTimerWithToken(response.accessToken, credentials.rememberMe)
    return response
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const url = this.useCookies
      ? "/auth/register?useCookies=true"
      : "/auth/register"

    const response = await api.post<AuthResponse>(url, data, {
      skipAuth: true,
    })
    this.setSession(response)
    // Pass token from response to start timer (even in cookie mode, response includes token)
    this.startRefreshTimerWithToken(response.accessToken)
    return response
  },

  async refreshToken(): Promise<AuthResponse | null> {
    // When using cookies, refreshToken is sent automatically via cookie
    // When using localStorage, we need to send it in the request body
    if (this.useCookies) {
      try {
        const url = "/auth/refresh?useCookies=true"
        const response = await api.post<AuthResponse>(
          url,
          { refreshToken: "" }, // Backend will read from cookie
          { skipAuth: true }
        )
        this.setSession(response)
        // Pass token from response to start timer
        this.startRefreshTimerWithToken(response.accessToken)
        return response
      } catch {
        this.clearSession()
        return null
      }
    } else {
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
    }
  },

  async extendSession(): Promise<AuthResponse | null> {
    try {
      const response = await api.post<AuthResponse>("/auth/extend-session")
      this.setSession(response)
      // Pass token from response to start timer
      this.startRefreshTimerWithToken(response.accessToken)
      return response
    } catch (error) {
      console.error("Failed to extend session:", error)
      return null
    }
  },

  async listSessions(): Promise<SessionResponse[]> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    const response = await api.get<SessionResponse[]>("/auth/sessions", {
      headers: refreshToken ? { "X-Refresh-Token": refreshToken } : undefined
    })
    return response
  },

  async revokeSession(sessionId: string): Promise<void> {
    await api.delete(`/auth/sessions/${sessionId}`)
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

  async logout(): Promise<void> {
    refreshTimer.clear()

    // If using cookies, call backend logout endpoint to clear cookies
    if (this.useCookies) {
      try {
        await api.delete("/auth/logout")
      } catch (error) {
        console.error("Failed to call logout endpoint:", error)
      }
    }

    this.clearSession()
  },

  setSession(authResponse: AuthResponse, rememberMe?: boolean): void {
    // When using cookies, don't store tokens in localStorage
    // Browser automatically manages cookies
    if (!this.useCookies) {
      localStorage.setItem(ACCESS_TOKEN_KEY, authResponse.accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, authResponse.refreshToken)
    }

    // Always store user object (not sensitive) and rememberMe preference
    localStorage.setItem(USER_KEY, JSON.stringify(authResponse.user))

    // Store rememberMe preference if provided (during login)
    if (rememberMe !== undefined) {
      localStorage.setItem(REMEMBER_ME_KEY, String(rememberMe))
    }
  },

  clearSession(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(REMEMBER_ME_KEY)
  },

  getAccessToken(): string | null {
    // When using cookies, tokens are in HttpOnly cookies (not accessible from JS)
    // Return null so API client doesn't add Authorization header
    // Browser will automatically send cookie with requests
    if (this.useCookies) {
      return null
    }
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
    // When using cookies, check if user object exists (tokens are in HttpOnly cookies)
    // When using localStorage, check if access token exists
    if (this.useCookies) {
      return !!this.getUser()
    }
    return !!this.getAccessToken()
  },

  getRememberMe(): boolean {
    const rememberMe = localStorage.getItem(REMEMBER_ME_KEY)
    return rememberMe === "true"
  },

  /**
   * Starts the refresh timer for the current access token
   * Timer will trigger a refresh before token expiration
   * (5 minutes for regular sessions, 30 minutes for remember me sessions)
   */
  startRefreshTimer(): void {
    const accessToken = this.getAccessToken()
    if (!accessToken) {
      return
    }

    const isRememberMe = this.getRememberMe()
    refreshTimer.start(accessToken, async () => {
      await this.refreshToken()
    }, isRememberMe)
  },

  /**
   * Starts the refresh timer with a specific token (used in cookie mode)
   * In cookie mode, tokens aren't in localStorage but are still returned in response body
   */
  startRefreshTimerWithToken(accessToken: string, rememberMe?: boolean): void {
    const isRememberMe = rememberMe !== undefined ? rememberMe : this.getRememberMe()
    refreshTimer.start(accessToken, async () => {
      await this.refreshToken()
    }, isRememberMe)
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
