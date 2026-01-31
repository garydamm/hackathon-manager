import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { authService } from "./auth"
import { api } from "./api"
import { refreshTimer } from "@/utils/refreshTimer"
import type { AuthResponse } from "@/types"

// Mock dependencies
vi.mock("./api", () => ({
  api: {
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock("@/utils/refreshTimer", () => ({
  refreshTimer: {
    start: vi.fn(),
    clear: vi.fn(),
  },
}))

describe("authService - remember me preference", () => {
  const mockAuthResponse: AuthResponse = {
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
    tokenType: "Bearer",
    user: {
      id: "user-123",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("setSession", () => {
    it("should store rememberMe=true in localStorage", () => {
      authService.setSession(mockAuthResponse, true)

      expect(localStorage.getItem("rememberMe")).toBe("true")
    })

    it("should store rememberMe=false in localStorage", () => {
      authService.setSession(mockAuthResponse, false)

      expect(localStorage.getItem("rememberMe")).toBe("false")
    })

    it("should not modify rememberMe when not provided", () => {
      localStorage.setItem("rememberMe", "true")

      authService.setSession(mockAuthResponse)

      expect(localStorage.getItem("rememberMe")).toBe("true")
    })
  })

  describe("login", () => {
    it("should store rememberMe=true when logging in with rememberMe", async () => {
      vi.mocked(api.post).mockResolvedValue(mockAuthResponse)

      await authService.login({
        email: "test@example.com",
        password: "password123",
        rememberMe: true,
      })

      expect(localStorage.getItem("rememberMe")).toBe("true")
    })

    it("should store rememberMe=false when logging in without rememberMe", async () => {
      vi.mocked(api.post).mockResolvedValue(mockAuthResponse)

      await authService.login({
        email: "test@example.com",
        password: "password123",
        rememberMe: false,
      })

      expect(localStorage.getItem("rememberMe")).toBe("false")
    })

    it("should pass rememberMe flag to refreshTimer.start", async () => {
      vi.mocked(api.post).mockResolvedValue(mockAuthResponse)
      localStorage.setItem("accessToken", "test-token")

      await authService.login({
        email: "test@example.com",
        password: "password123",
        rememberMe: true,
      })

      // Need to get the token from localStorage for the timer
      expect(refreshTimer.start).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        true
      )
    })
  })

  describe("getRememberMe", () => {
    it("should return true when rememberMe is 'true'", () => {
      localStorage.setItem("rememberMe", "true")

      expect(authService.getRememberMe()).toBe(true)
    })

    it("should return false when rememberMe is 'false'", () => {
      localStorage.setItem("rememberMe", "false")

      expect(authService.getRememberMe()).toBe(false)
    })

    it("should return false when rememberMe is not set", () => {
      expect(authService.getRememberMe()).toBe(false)
    })
  })

  describe("clearSession", () => {
    it("should remove rememberMe from localStorage", () => {
      localStorage.setItem("accessToken", "token")
      localStorage.setItem("refreshToken", "refresh")
      localStorage.setItem("user", JSON.stringify(mockAuthResponse.user))
      localStorage.setItem("rememberMe", "true")

      authService.clearSession()

      expect(localStorage.getItem("rememberMe")).toBeNull()
    })
  })

  describe("logout", () => {
    it("should clear rememberMe preference", () => {
      localStorage.setItem("accessToken", "token")
      localStorage.setItem("rememberMe", "true")

      authService.logout()

      expect(localStorage.getItem("rememberMe")).toBeNull()
    })
  })
})

describe("authService - extendSession", () => {
  const mockAuthResponse: AuthResponse = {
    accessToken: "new-access-token",
    refreshToken: "new-refresh-token",
    tokenType: "Bearer",
    user: {
      id: "user-123",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("extendSession", () => {
    it("should call POST /auth/extend-session endpoint", async () => {
      vi.mocked(api.post).mockResolvedValue(mockAuthResponse)

      await authService.extendSession()

      expect(api.post).toHaveBeenCalledWith("/auth/extend-session")
    })

    it("should save tokens and user to localStorage on success", async () => {
      vi.mocked(api.post).mockResolvedValue(mockAuthResponse)

      await authService.extendSession()

      expect(localStorage.getItem("accessToken")).toBe("new-access-token")
      expect(localStorage.getItem("refreshToken")).toBe("new-refresh-token")
      expect(localStorage.getItem("user")).toBe(JSON.stringify(mockAuthResponse.user))
    })

    it("should restart refresh timer on success", async () => {
      vi.mocked(api.post).mockResolvedValue(mockAuthResponse)

      await authService.extendSession()

      expect(refreshTimer.start).toHaveBeenCalled()
    })

    it("should return AuthResponse on success", async () => {
      vi.mocked(api.post).mockResolvedValue(mockAuthResponse)

      const result = await authService.extendSession()

      expect(result).toEqual(mockAuthResponse)
    })

    it("should return null on failure", async () => {
      vi.mocked(api.post).mockRejectedValue(new Error("Network error"))

      const result = await authService.extendSession()

      expect(result).toBeNull()
    })

    it("should log error on failure", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      const error = new Error("Network error")
      vi.mocked(api.post).mockRejectedValue(error)

      await authService.extendSession()

      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to extend session:", error)
      consoleErrorSpy.mockRestore()
    })

    it("should not clear session on failure", async () => {
      vi.mocked(api.post).mockRejectedValue(new Error("Network error"))

      // Set up existing session
      localStorage.setItem("accessToken", "existing-token")
      localStorage.setItem("refreshToken", "existing-refresh")

      await authService.extendSession()

      // Session should still be there
      expect(localStorage.getItem("accessToken")).toBe("existing-token")
      expect(localStorage.getItem("refreshToken")).toBe("existing-refresh")
    })

    it("should handle rate limiting error (429)", async () => {
      const rateLimitError = {
        status: 429,
        message: "Too many requests",
      }
      vi.mocked(api.post).mockRejectedValue(rateLimitError)

      const result = await authService.extendSession()

      expect(result).toBeNull()
    })
  })
})

describe("authService - cookie-based authentication", () => {
  const mockAuthResponse: AuthResponse = {
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
    tokenType: "Bearer",
    user: {
      id: "user-123",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    authService.useCookies = false // Reset to default
  })

  afterEach(() => {
    vi.restoreAllMocks()
    authService.useCookies = false // Reset to default
  })

  describe("login with useCookies=true", () => {
    it("should send useCookies=true query param when useCookies flag is set", async () => {
      authService.useCookies = true
      vi.mocked(api.post).mockResolvedValue(mockAuthResponse)

      await authService.login({
        email: "test@example.com",
        password: "password123",
      })

      expect(api.post).toHaveBeenCalledWith(
        "/auth/login?useCookies=true",
        expect.objectContaining({
          email: "test@example.com",
          password: "password123",
        }),
        expect.objectContaining({ skipAuth: true })
      )
    })

    it("should NOT store tokens in localStorage when using cookies", async () => {
      authService.useCookies = true
      vi.mocked(api.post).mockResolvedValue(mockAuthResponse)

      await authService.login({
        email: "test@example.com",
        password: "password123",
      })

      expect(localStorage.getItem("accessToken")).toBeNull()
      expect(localStorage.getItem("refreshToken")).toBeNull()
    })

    it("should still store user object in localStorage when using cookies", async () => {
      authService.useCookies = true
      vi.mocked(api.post).mockResolvedValue(mockAuthResponse)

      await authService.login({
        email: "test@example.com",
        password: "password123",
      })

      expect(localStorage.getItem("user")).toBe(JSON.stringify(mockAuthResponse.user))
    })

    it("should start refresh timer with token from response body", async () => {
      authService.useCookies = true
      vi.mocked(api.post).mockResolvedValue(mockAuthResponse)

      await authService.login({
        email: "test@example.com",
        password: "password123",
        rememberMe: true,
      })

      expect(refreshTimer.start).toHaveBeenCalledWith(
        "test-access-token",
        expect.any(Function),
        true
      )
    })
  })

  describe("register with useCookies=true", () => {
    it("should send useCookies=true query param when useCookies flag is set", async () => {
      authService.useCookies = true
      vi.mocked(api.post).mockResolvedValue(mockAuthResponse)

      await authService.register({
        email: "test@example.com",
        password: "password123",
        firstName: "Test",
        lastName: "User",
      })

      expect(api.post).toHaveBeenCalledWith(
        "/auth/register?useCookies=true",
        expect.objectContaining({
          email: "test@example.com",
          firstName: "Test",
          lastName: "User",
        }),
        expect.objectContaining({ skipAuth: true })
      )
    })

    it("should NOT store tokens in localStorage when using cookies", async () => {
      authService.useCookies = true
      vi.mocked(api.post).mockResolvedValue(mockAuthResponse)

      await authService.register({
        email: "test@example.com",
        password: "password123",
        firstName: "Test",
        lastName: "User",
      })

      expect(localStorage.getItem("accessToken")).toBeNull()
      expect(localStorage.getItem("refreshToken")).toBeNull()
    })
  })

  describe("refreshToken with useCookies=true", () => {
    it("should send useCookies=true query param when useCookies flag is set", async () => {
      authService.useCookies = true
      vi.mocked(api.post).mockResolvedValue(mockAuthResponse)

      await authService.refreshToken()

      expect(api.post).toHaveBeenCalledWith(
        "/auth/refresh?useCookies=true",
        { refreshToken: "" },
        expect.objectContaining({ skipAuth: true })
      )
    })

    it("should NOT read refreshToken from localStorage when using cookies", async () => {
      authService.useCookies = true
      localStorage.setItem("refreshToken", "should-not-use-this")
      vi.mocked(api.post).mockResolvedValue(mockAuthResponse)

      await authService.refreshToken()

      // Should send empty refreshToken (backend reads from cookie)
      expect(api.post).toHaveBeenCalledWith(
        "/auth/refresh?useCookies=true",
        { refreshToken: "" },
        expect.objectContaining({ skipAuth: true })
      )
    })

    it("should start refresh timer with token from response body", async () => {
      authService.useCookies = true
      vi.mocked(api.post).mockResolvedValue(mockAuthResponse)

      await authService.refreshToken()

      expect(refreshTimer.start).toHaveBeenCalledWith(
        "test-access-token",
        expect.any(Function),
        expect.any(Boolean)
      )
    })
  })

  describe("logout with useCookies=true", () => {
    it("should call DELETE /auth/logout endpoint when using cookies", async () => {
      authService.useCookies = true
      vi.mocked(api.delete).mockResolvedValue(undefined)
      localStorage.setItem("user", JSON.stringify(mockAuthResponse.user))

      await authService.logout()

      expect(api.delete).toHaveBeenCalledWith("/auth/logout")
    })

    it("should clear localStorage even if logout endpoint fails", async () => {
      authService.useCookies = true
      vi.mocked(api.delete).mockRejectedValue(new Error("Network error"))
      localStorage.setItem("user", JSON.stringify(mockAuthResponse.user))
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      await authService.logout()

      expect(localStorage.getItem("user")).toBeNull()
      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })

    it("should NOT call logout endpoint when using localStorage", async () => {
      authService.useCookies = false
      vi.mocked(api.delete).mockResolvedValue(undefined)

      await authService.logout()

      expect(api.delete).not.toHaveBeenCalled()
    })
  })

  describe("getAccessToken with useCookies=true", () => {
    it("should return null when using cookies (token in HttpOnly cookie)", () => {
      authService.useCookies = true
      localStorage.setItem("accessToken", "should-not-return-this")

      const token = authService.getAccessToken()

      expect(token).toBeNull()
    })

    it("should return token from localStorage when NOT using cookies", () => {
      authService.useCookies = false
      localStorage.setItem("accessToken", "test-token")

      const token = authService.getAccessToken()

      expect(token).toBe("test-token")
    })
  })

  describe("isAuthenticated with useCookies=true", () => {
    it("should check user object when using cookies", () => {
      authService.useCookies = true
      localStorage.setItem("user", JSON.stringify(mockAuthResponse.user))

      const isAuth = authService.isAuthenticated()

      expect(isAuth).toBe(true)
    })

    it("should return false when no user object and using cookies", () => {
      authService.useCookies = true

      const isAuth = authService.isAuthenticated()

      expect(isAuth).toBe(false)
    })

    it("should check access token when using localStorage", () => {
      authService.useCookies = false
      localStorage.setItem("accessToken", "test-token")

      const isAuth = authService.isAuthenticated()

      expect(isAuth).toBe(true)
    })
  })

  describe("login without useCookies (localStorage mode)", () => {
    it("should NOT send useCookies query param when flag is false", async () => {
      authService.useCookies = false
      vi.mocked(api.post).mockResolvedValue(mockAuthResponse)

      await authService.login({
        email: "test@example.com",
        password: "password123",
      })

      expect(api.post).toHaveBeenCalledWith(
        "/auth/login",
        expect.any(Object),
        expect.objectContaining({ skipAuth: true })
      )
    })

    it("should store tokens in localStorage when NOT using cookies", async () => {
      authService.useCookies = false
      vi.mocked(api.post).mockResolvedValue(mockAuthResponse)

      await authService.login({
        email: "test@example.com",
        password: "password123",
      })

      expect(localStorage.getItem("accessToken")).toBe("test-access-token")
      expect(localStorage.getItem("refreshToken")).toBe("test-refresh-token")
    })
  })
})
