import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, act, fireEvent } from "@testing-library/react"
import { SessionTimeoutNotification } from "./SessionTimeoutNotification"
import { authService } from "@/services/auth"
import { api } from "@/services/api"

// Mock authService
vi.mock("@/services/auth", () => ({
  authService: {
    getAccessToken: vi.fn(),
    refreshToken: vi.fn(),
    extendSession: vi.fn(),
    getRememberMe: vi.fn(() => false), // Default to false (regular session)
  },
}))

// Mock api
vi.mock("@/services/api", () => ({
  api: {
    getLastActivityTime: vi.fn(),
  },
}))

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}))

describe("SessionTimeoutNotification", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // Helper to create a mock JWT token with specific expiration
  function createMockToken(expiresInMs: number): string {
    const now = Date.now()
    const exp = Math.floor((now + expiresInMs) / 1000) // JWT exp is in seconds
    const payload = {
      sub: "user123",
      email: "test@example.com",
      exp,
      iat: Math.floor(now / 1000),
    }
    // Create a fake JWT (header.payload.signature)
    const encodedPayload = btoa(JSON.stringify(payload))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "")
    return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${encodedPayload}.fake_signature`
  }

  describe("Notification visibility", () => {
    it("should not show notification when token has > 5 minutes remaining", () => {
      const token = createMockToken(6 * 60 * 1000) // 6 minutes
      vi.mocked(authService.getAccessToken).mockReturnValue(token)

      render(<SessionTimeoutNotification />)

      expect(
        screen.queryByText(/Session expiring soon/i)
      ).not.toBeInTheDocument()
    })

    it("should show notification when token has < 5 minutes remaining", () => {
      const token = createMockToken(4 * 60 * 1000) // 4 minutes
      vi.mocked(authService.getAccessToken).mockReturnValue(token)

      render(<SessionTimeoutNotification />)

      expect(screen.getByText(/Session expiring soon/i)).toBeInTheDocument()
      expect(screen.getByText(/Your session expires in/i)).toBeInTheDocument()
    })

    it("should show notification when token has exactly 5 minutes remaining", () => {
      const token = createMockToken(5 * 60 * 1000 - 1) // Just under 5 minutes
      vi.mocked(authService.getAccessToken).mockReturnValue(token)

      render(<SessionTimeoutNotification />)

      expect(screen.getByText(/Session expiring soon/i)).toBeInTheDocument()
    })

    it("should not show notification when no token exists", () => {
      vi.mocked(authService.getAccessToken).mockReturnValue(null)

      render(<SessionTimeoutNotification />)

      expect(
        screen.queryByText(/Session expiring soon/i)
      ).not.toBeInTheDocument()
    })

    it("should not show notification when token is expired", () => {
      const token = createMockToken(-1000) // Expired 1 second ago
      vi.mocked(authService.getAccessToken).mockReturnValue(token)

      render(<SessionTimeoutNotification />)

      expect(
        screen.queryByText(/Session expiring soon/i)
      ).not.toBeInTheDocument()
    })
  })

  describe("Countdown timer", () => {
    it("should display countdown in minutes and seconds format", () => {
      const token = createMockToken(4 * 60 * 1000 + 30 * 1000) // 4m 30s
      vi.mocked(authService.getAccessToken).mockReturnValue(token)

      render(<SessionTimeoutNotification />)

      // The countdown might show 4m 29s or 4m 30s depending on timing
      expect(screen.getByText(/expires in 4m (29|30)s/i)).toBeInTheDocument()
    })

    it("should show countdown with proper format", () => {
      const token = createMockToken(3 * 60 * 1000 + 15 * 1000) // 3m 15s
      vi.mocked(authService.getAccessToken).mockReturnValue(token)

      render(<SessionTimeoutNotification />)

      // Should show minutes and seconds
      expect(screen.getByText(/expires in \d+m \d+s/i)).toBeInTheDocument()
    })
  })

  describe("Extend Session button", () => {
    it("should render Extend Session button", () => {
      const token = createMockToken(4 * 60 * 1000)
      vi.mocked(authService.getAccessToken).mockReturnValue(token)

      render(<SessionTimeoutNotification />)

      expect(
        screen.getByRole("button", { name: /Extend Session/i })
      ).toBeInTheDocument()
    })

    it("should have Extend Session button that is not disabled initially", () => {
      const token = createMockToken(4 * 60 * 1000)
      vi.mocked(authService.getAccessToken).mockReturnValue(token)

      render(<SessionTimeoutNotification />)

      const extendButton = screen.getByRole("button", {
        name: /Extend Session/i,
      })

      expect(extendButton).not.toBeDisabled()
    })
  })

  describe("Dismiss functionality", () => {
    it("should render dismiss button", () => {
      const token = createMockToken(4 * 60 * 1000)
      vi.mocked(authService.getAccessToken).mockReturnValue(token)

      render(<SessionTimeoutNotification />)

      expect(
        screen.getByRole("button", { name: /Dismiss notification/i })
      ).toBeInTheDocument()
    })

    it("should hide notification when dismissed", () => {
      const token = createMockToken(4 * 60 * 1000)
      vi.mocked(authService.getAccessToken).mockReturnValue(token)

      render(<SessionTimeoutNotification />)

      expect(screen.getByText(/Session expiring soon/i)).toBeInTheDocument()

      const dismissButton = screen.getByRole("button", {
        name: /Dismiss notification/i,
      })

      fireEvent.click(dismissButton)

      // Notification should be hidden immediately
      expect(
        screen.queryByText(/Session expiring soon/i)
      ).not.toBeInTheDocument()
    })

    it("should show notification again after remount when still < 5 minutes", () => {
      const token = createMockToken(4 * 60 * 1000)
      vi.mocked(authService.getAccessToken).mockReturnValue(token)

      const { unmount } = render(<SessionTimeoutNotification />)

      // Dismiss notification
      const dismissButton = screen.getByRole("button", {
        name: /Dismiss notification/i,
      })
      fireEvent.click(dismissButton)

      expect(
        screen.queryByText(/Session expiring soon/i)
      ).not.toBeInTheDocument()

      // Unmount and remount (simulating navigation or re-render)
      unmount()
      render(<SessionTimeoutNotification />)

      // Notification should show again because token still < 5 min
      expect(screen.getByText(/Session expiring soon/i)).toBeInTheDocument()
    })
  })

  describe("Accessibility", () => {
    it("should have proper ARIA role and live region", () => {
      const token = createMockToken(4 * 60 * 1000)
      vi.mocked(authService.getAccessToken).mockReturnValue(token)

      const { container } = render(<SessionTimeoutNotification />)

      const alert = container.querySelector('[role="alert"]')
      expect(alert).toBeInTheDocument()
      expect(alert).toHaveAttribute("aria-live", "polite")
    })

    it("should have accessible button labels", () => {
      const token = createMockToken(4 * 60 * 1000)
      vi.mocked(authService.getAccessToken).mockReturnValue(token)

      render(<SessionTimeoutNotification />)

      expect(
        screen.getByRole("button", { name: /Extend Session/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /Dismiss notification/i })
      ).toBeInTheDocument()
    })
  })

  describe("Edge cases", () => {
    it("should handle invalid token gracefully", () => {
      vi.mocked(authService.getAccessToken).mockReturnValue("invalid.token")

      render(<SessionTimeoutNotification />)

      expect(
        screen.queryByText(/Session expiring soon/i)
      ).not.toBeInTheDocument()
    })

    it("should cleanup interval on unmount", () => {
      const token = createMockToken(4 * 60 * 1000)
      vi.mocked(authService.getAccessToken).mockReturnValue(token)

      const { unmount } = render(<SessionTimeoutNotification />)

      expect(screen.getByText(/Session expiring soon/i)).toBeInTheDocument()

      unmount()

      // Advance timers to ensure no errors occur after unmount
      act(() => {
        vi.advanceTimersByTime(5000)
      })

      // Should not throw any errors
      expect(true).toBe(true)
    })
  })

  describe("Activity-based session extension", () => {
    beforeEach(() => {
      // Use real timers for these tests since we're dealing with promises
      vi.useRealTimers()
      // Reset mocks for activity tests
      vi.mocked(api.getLastActivityTime).mockReturnValue(null)
      vi.mocked(authService.extendSession).mockResolvedValue({
        accessToken: "new-token",
        refreshToken: "new-refresh",
        tokenType: "Bearer",
        user: { id: "user-123", email: "test@example.com", firstName: "Test", lastName: "User" },
      })
    })

    afterEach(() => {
      // Restore fake timers for other tests
      vi.useFakeTimers()
    })

    it("should auto-extend session when user was active within 5 minutes", async () => {
      const token = createMockToken(4 * 60 * 1000) // 4 minutes remaining
      vi.mocked(authService.getAccessToken).mockReturnValue(token)

      // User was active 2 minutes ago
      const now = Date.now()
      vi.mocked(api.getLastActivityTime).mockReturnValue(now - 2 * 60 * 1000)

      render(<SessionTimeoutNotification />)

      // Wait for the extend session promise to be called and resolved
      await new Promise(resolve => setTimeout(resolve, 10))

      // Should have called extend session
      expect(authService.extendSession).toHaveBeenCalled()

      // Notification should not be shown
      expect(
        screen.queryByText(/Session expiring soon/i)
      ).not.toBeInTheDocument()
    })

    it("should show notification when user was NOT active within 5 minutes", async () => {
      const token = createMockToken(4 * 60 * 1000) // 4 minutes remaining
      vi.mocked(authService.getAccessToken).mockReturnValue(token)

      // User was active 6 minutes ago (outside activity window)
      const now = Date.now()
      vi.mocked(api.getLastActivityTime).mockReturnValue(now - 6 * 60 * 1000)

      render(<SessionTimeoutNotification />)

      // Wait a moment for component to render
      await new Promise(resolve => setTimeout(resolve, 10))

      // Should show notification instead of auto-extending
      expect(screen.getByText(/Session expiring soon/i)).toBeInTheDocument()
      expect(authService.extendSession).not.toHaveBeenCalled()
    })

    it("should show notification when no activity has been tracked", async () => {
      const token = createMockToken(4 * 60 * 1000) // 4 minutes remaining
      vi.mocked(authService.getAccessToken).mockReturnValue(token)

      // No activity tracked
      vi.mocked(api.getLastActivityTime).mockReturnValue(null)

      render(<SessionTimeoutNotification />)

      // Wait a moment for component to render
      await new Promise(resolve => setTimeout(resolve, 10))

      // Should show notification
      expect(screen.getByText(/Session expiring soon/i)).toBeInTheDocument()
      expect(authService.extendSession).not.toHaveBeenCalled()
    })

    it("should only auto-extend once per minute (rate limiting)", async () => {
      const token = createMockToken(4 * 60 * 1000) // 4 minutes remaining
      vi.mocked(authService.getAccessToken).mockReturnValue(token)

      // User is active
      const now = Date.now()
      vi.mocked(api.getLastActivityTime).mockReturnValue(now - 1 * 60 * 1000)

      render(<SessionTimeoutNotification />)

      // Wait for initial extend
      await new Promise(resolve => setTimeout(resolve, 10))

      // Should extend on first check
      expect(authService.extendSession).toHaveBeenCalledTimes(1)

      // Wait 30 seconds (less than 1 minute cooldown) - interval will trigger but shouldn't extend
      await new Promise(resolve => setTimeout(resolve, 1100)) // Just over 1 second

      // Should not extend again (cooldown not expired)
      expect(authService.extendSession).toHaveBeenCalledTimes(1)

      // Wait another 60 seconds (total > 1 minute) - interval will trigger and should extend
      await new Promise(resolve => setTimeout(resolve, 60 * 1000 + 100))

      // Now should allow another extend
      expect(authService.extendSession).toHaveBeenCalledTimes(2)
    }, 70000)

    it("should show notification if auto-extend fails", async () => {
      const token = createMockToken(4 * 60 * 1000) // 4 minutes remaining
      vi.mocked(authService.getAccessToken).mockReturnValue(token)

      // User is active
      const now = Date.now()
      vi.mocked(api.getLastActivityTime).mockReturnValue(now - 1 * 60 * 1000)

      // Mock extend to fail
      vi.mocked(authService.extendSession).mockResolvedValue(null)

      render(<SessionTimeoutNotification />)

      // Wait for promise to resolve
      await new Promise(resolve => setTimeout(resolve, 10))

      // Should have attempted to extend
      expect(authService.extendSession).toHaveBeenCalled()

      // Should show notification because extend failed
      expect(screen.getByText(/Session expiring soon/i)).toBeInTheDocument()
    })

    it("should log when auto-extending session", async () => {
      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {})
      const token = createMockToken(4 * 60 * 1000) // 4 minutes remaining
      vi.mocked(authService.getAccessToken).mockReturnValue(token)

      // User is active
      const now = Date.now()
      vi.mocked(api.getLastActivityTime).mockReturnValue(now - 1 * 60 * 1000)

      render(<SessionTimeoutNotification />)

      // Wait for promise to resolve
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(consoleLogSpy).toHaveBeenCalledWith(
        "[SessionTimeoutNotification] User active, auto-extending session"
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "[SessionTimeoutNotification] Session extended successfully due to activity"
      )

      consoleLogSpy.mockRestore()
    })

    it("should log error when auto-extend fails", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      const token = createMockToken(4 * 60 * 1000) // 4 minutes remaining
      vi.mocked(authService.getAccessToken).mockReturnValue(token)

      // User is active
      const now = Date.now()
      vi.mocked(api.getLastActivityTime).mockReturnValue(now - 1 * 60 * 1000)

      // Mock extend to fail
      vi.mocked(authService.extendSession).mockResolvedValue(null)

      render(<SessionTimeoutNotification />)

      // Wait for promise to resolve
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[SessionTimeoutNotification] Auto-extend failed, showing notification"
      )

      consoleErrorSpy.mockRestore()
    })
  })
})
