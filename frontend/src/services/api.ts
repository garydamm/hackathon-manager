const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api"

interface RequestOptions extends RequestInit {
  skipAuth?: boolean
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private getAuthToken(): string | null {
    return localStorage.getItem("accessToken")
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { skipAuth = false, ...fetchOptions } = options
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
