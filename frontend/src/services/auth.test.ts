import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { authService } from "./auth"
import { api } from "./api"
import { refreshTimer } from "@/utils/refreshTimer"
import type { AuthResponse } from "@/types"

// Mock dependencies
vi.mock("./api", () => ({
  api: {
    post: vi.fn(),
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
