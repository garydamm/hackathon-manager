// VITE_API_URL from Render doesn't include /api suffix, so we need to add it
const envUrl = import.meta.env.VITE_API_URL || "http://localhost:8080"
const API_BASE_URL = envUrl.endsWith("/api") ? envUrl : `${envUrl.replace(/\/$/, "")}/api`

interface RequestOptions extends RequestInit {
  skipAuth?: boolean
  skipRetry?: boolean
}

// Callback for when session expires - set by AuthContext
let onSessionExpired: (() => void) | null = null

export function setSessionExpiredCallback(callback: () => void) {
  onSessionExpired = callback
}

class ApiClient {
  private baseUrl: string
  private isRefreshing = false
  private refreshSubscribers: Array<(token: string) => void> = []

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private getAuthToken(): string | null {
    return localStorage.getItem("accessToken")
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem("refreshToken")
  }

  private onAccessTokenRefreshed(token: string) {
    this.refreshSubscribers.forEach((callback) => callback(token))
    this.refreshSubscribers = []
  }

  private addRefreshSubscriber(callback: (token: string) => void) {
    this.refreshSubscribers.push(callback)
  }

  private async refreshAccessToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      return null
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      })

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      localStorage.setItem("accessToken", data.accessToken)
      localStorage.setItem("refreshToken", data.refreshToken)
      localStorage.setItem("user", JSON.stringify(data.user))
      return data.accessToken
    } catch {
      return null
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { skipAuth = false, skipRetry = false, ...fetchOptions } = options
    const url = `${this.baseUrl}${endpoint}`

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...fetchOptions.headers,
    }

    if (!skipAuth) {
      const token = this.getAuthToken()
      if (token) {
        ;(headers as Record<string, string>)["Authorization"] = `Bearer ${token}`
      }
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    })

    // Handle 401 Unauthorized - attempt token refresh and retry
    if (response.status === 401 && !skipAuth && !skipRetry) {
      // If already refreshing, wait for that refresh to complete
      if (this.isRefreshing) {
        return new Promise((resolve, reject) => {
          this.addRefreshSubscriber(async (token: string) => {
            try {
              const retryHeaders = { ...headers }
              ;(retryHeaders as Record<string, string>)["Authorization"] = `Bearer ${token}`
              const retryResponse = await fetch(url, {
                ...fetchOptions,
                headers: retryHeaders,
              })
              if (retryResponse.ok) {
                const data = retryResponse.status === 204 ? {} : await retryResponse.json()
                resolve(data as T)
              } else {
                reject(new ApiError(
                  "Request failed after token refresh",
                  retryResponse.status
                ))
              }
            } catch (error) {
              reject(error)
            }
          })
        })
      }

      // Start token refresh
      this.isRefreshing = true
      const newToken = await this.refreshAccessToken()
      this.isRefreshing = false

      if (newToken) {
        // Notify subscribers
        this.onAccessTokenRefreshed(newToken)

        // Retry original request with new token
        return this.request<T>(endpoint, { ...options, skipRetry: true })
      } else {
        // Refresh failed - clear session and notify
        localStorage.removeItem("accessToken")
        localStorage.removeItem("refreshToken")
        localStorage.removeItem("user")

        if (onSessionExpired) {
          onSessionExpired()
        }

        throw new ApiError(
          "Your session has expired. Please log in again.",
          401
        )
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        errorData.message || `Request failed with status ${response.status}`,
        response.status,
        errorData
      )
    }

    if (response.status === 204) {
      return {} as T
    }

    return response.json()
  }

  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" })
  }

  post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" })
  }
}

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(message: string, status: number, data?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.data = data
  }
}

export const api = new ApiClient(API_BASE_URL)
