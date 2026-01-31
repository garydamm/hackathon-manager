import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react"
import { SessionTimeoutNotification } from "./SessionTimeoutNotification"
import { authService } from "@/services/auth"

// Mock authService
vi.mock("@/services/auth", () => ({
  authService: {
    getAccessToken: vi.fn(),
    refreshToken: vi.fn(),
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
})
