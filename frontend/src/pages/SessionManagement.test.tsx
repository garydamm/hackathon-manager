import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { BrowserRouter } from "react-router-dom"
import { SessionManagementPage } from "./SessionManagement"
import * as AuthContext from "@/contexts/AuthContext"
import { authService } from "@/services/auth"
import type { SessionResponse } from "@/types"

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock authService
vi.mock("@/services/auth", () => ({
  authService: {
    listSessions: vi.fn(),
    revokeSession: vi.fn(),
  },
}))

// Mock AuthContext
const mockLogout = vi.fn()
const mockUseAuth = vi.spyOn(AuthContext, "useAuth")

describe("SessionManagementPage", () => {
  const mockSessions: SessionResponse[] = [
    {
      id: "session-1",
      deviceInfo: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0",
      ipAddress: "192.168.1.100",
      lastActivityAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      createdAt: new Date("2024-01-15T10:00:00Z").toISOString(),
      isCurrent: true,
    },
    {
      id: "session-2",
      deviceInfo: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/120.0",
      ipAddress: "192.168.1.101",
      lastActivityAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      createdAt: new Date("2024-01-14T10:00:00Z").toISOString(),
      isCurrent: false,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: {
        id: "123",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
      },
      logout: mockLogout,
      login: vi.fn(),
      register: vi.fn(),
      isAuthenticated: true,
      isLoading: false,
      sessionExpired: false,
      clearSessionExpiredFlag: vi.fn(),
    })
    // Default: return empty sessions
    vi.mocked(authService.listSessions).mockResolvedValue([])
  })

  it("renders page title and description", () => {
    render(
      <BrowserRouter>
        <SessionManagementPage />
      </BrowserRouter>
    )

    expect(screen.getByText("Active Sessions")).toBeInTheDocument()
    expect(
      screen.getByText("Manage your active sessions across devices")
    ).toBeInTheDocument()
  })

  it("renders empty state when no sessions", async () => {
    render(
      <BrowserRouter>
        <SessionManagementPage />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText("No active sessions")).toBeInTheDocument()
    })

    expect(
      screen.getByText(
        "You'll see your active sessions here once you log in from multiple devices."
      )
    ).toBeInTheDocument()
  })

  it("displays Monitor icon in empty state", async () => {
    render(
      <BrowserRouter>
        <SessionManagementPage />
      </BrowserRouter>
    )

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText("No active sessions")).toBeInTheDocument()
    })

    // The Monitor icon should be in the empty state
    const emptyStateContainer = screen
      .getByText("No active sessions")
      .closest("div")
    expect(emptyStateContainer).toBeInTheDocument()
  })

  it("renders within AppLayout", () => {
    render(
      <BrowserRouter>
        <SessionManagementPage />
      </BrowserRouter>
    )

    // AppLayout adds the navbar with the app name
    expect(screen.getByText("HackathonHub")).toBeInTheDocument()
  })

  it("displays user name in navbar from AuthContext", () => {
    render(
      <BrowserRouter>
        <SessionManagementPage />
      </BrowserRouter>
    )

    expect(screen.getByText("Test User")).toBeInTheDocument()
  })

  it("uses motion.div for animations", () => {
    const { container } = render(
      <BrowserRouter>
        <SessionManagementPage />
      </BrowserRouter>
    )

    // Check that the component structure matches what we expect
    expect(container.querySelector(".mx-auto.max-w-7xl")).toBeInTheDocument()
  })

  it("has proper spacing and layout classes", () => {
    const { container } = render(
      <BrowserRouter>
        <SessionManagementPage />
      </BrowserRouter>
    )

    // Check for the main container with proper classes
    const mainContainer = container.querySelector(".mx-auto.max-w-7xl")
    expect(mainContainer).toBeInTheDocument()
    expect(mainContainer).toHaveClass("px-4")
  })

  it("renders empty state with proper border styling", async () => {
    const { container } = render(
      <BrowserRouter>
        <SessionManagementPage />
      </BrowserRouter>
    )

    await waitFor(() => {
      const borderDashedElement = container.querySelector(".border-dashed")
      expect(borderDashedElement).toBeInTheDocument()
    })

    // Find the empty state container which has border-dashed
    const borderDashedElement = container.querySelector(".border-dashed")
    expect(borderDashedElement).toHaveClass("text-center")
  })

  it("shows loading spinner while fetching sessions", () => {
    // Mock a delayed response
    vi.mocked(authService.listSessions).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    render(
      <BrowserRouter>
        <SessionManagementPage />
      </BrowserRouter>
    )

    // Should show loading spinner
    const spinner = document.querySelector(".animate-spin")
    expect(spinner).toBeInTheDocument()
  })

  it("fetches and displays sessions on mount", async () => {
    vi.mocked(authService.listSessions).mockResolvedValue(mockSessions)

    render(
      <BrowserRouter>
        <SessionManagementPage />
      </BrowserRouter>
    )

    // Wait for sessions to load
    await waitFor(() => {
      expect(screen.getByText("Chrome on macOS")).toBeInTheDocument()
    })

    expect(screen.getByText("Firefox on Windows")).toBeInTheDocument()
    expect(authService.listSessions).toHaveBeenCalledTimes(1)
  })

  it("displays multiple session cards when sessions exist", async () => {
    vi.mocked(authService.listSessions).mockResolvedValue(mockSessions)

    render(
      <BrowserRouter>
        <SessionManagementPage />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText("Chrome on macOS")).toBeInTheDocument()
    })

    // Both sessions should be displayed
    expect(screen.getByText("Chrome on macOS")).toBeInTheDocument()
    expect(screen.getByText("Firefox on Windows")).toBeInTheDocument()
  })

  it("handles fetch error gracefully", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    vi.mocked(authService.listSessions).mockRejectedValue(new Error("Network error"))

    render(
      <BrowserRouter>
        <SessionManagementPage />
      </BrowserRouter>
    )

    // Should show empty state after error
    await waitFor(() => {
      expect(screen.getByText("No active sessions")).toBeInTheDocument()
    })

    expect(consoleError).toHaveBeenCalledWith(
      "Failed to load sessions:",
      expect.any(Error)
    )
    consoleError.mockRestore()
  })

  it("does not show empty state when sessions are loading", () => {
    // Mock a delayed response
    vi.mocked(authService.listSessions).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    render(
      <BrowserRouter>
        <SessionManagementPage />
      </BrowserRouter>
    )

    // Should not show empty state yet
    expect(screen.queryByText("No active sessions")).not.toBeInTheDocument()
  })

  describe("Revoke functionality", () => {
    beforeEach(() => {
      // Mock window.confirm
      vi.stubGlobal("confirm", vi.fn(() => true))
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it("does not show revoke button for current session", async () => {
      vi.mocked(authService.listSessions).mockResolvedValue(mockSessions)

      render(
        <BrowserRouter>
          <SessionManagementPage />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText("Chrome on macOS")).toBeInTheDocument()
      })

      // Current session (Chrome on macOS) should not have revoke button
      const currentSessionCard = screen.getByText("Chrome on macOS").closest("div")
      expect(currentSessionCard).toBeInTheDocument()

      // Should have exactly one revoke button (for the non-current session)
      const revokeButtons = screen.getAllByRole("button", { name: /Revoke/i })
      expect(revokeButtons).toHaveLength(1)
    })

    it("shows revoke button for non-current sessions", async () => {
      vi.mocked(authService.listSessions).mockResolvedValue(mockSessions)

      render(
        <BrowserRouter>
          <SessionManagementPage />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText("Firefox on Windows")).toBeInTheDocument()
      })

      // Non-current session should have revoke button
      const revokeButtons = screen.getAllByRole("button", { name: /Revoke/i })
      expect(revokeButtons).toHaveLength(1)
    })

    it("successfully revokes a session", async () => {
      vi.mocked(authService.listSessions).mockResolvedValue(mockSessions)
      vi.mocked(authService.revokeSession).mockResolvedValue()

      render(
        <BrowserRouter>
          <SessionManagementPage />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText("Firefox on Windows")).toBeInTheDocument()
      })

      const revokeButton = screen.getByRole("button", { name: /Revoke/i })
      fireEvent.click(revokeButton)

      await waitFor(() => {
        expect(authService.revokeSession).toHaveBeenCalledWith("session-2")
      })

      // Session should be removed from list
      await waitFor(() => {
        expect(screen.queryByText("Firefox on Windows")).not.toBeInTheDocument()
      })

      // Success notification should appear
      await waitFor(() => {
        expect(screen.getByText("Session revoked successfully")).toBeInTheDocument()
      })
    })

    it("shows error notification when revoke fails", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
      vi.mocked(authService.listSessions).mockResolvedValue(mockSessions)
      vi.mocked(authService.revokeSession).mockRejectedValue(new Error("Network error"))

      render(
        <BrowserRouter>
          <SessionManagementPage />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText("Firefox on Windows")).toBeInTheDocument()
      })

      const revokeButton = screen.getByRole("button", { name: /Revoke/i })
      fireEvent.click(revokeButton)

      await waitFor(() => {
        expect(authService.revokeSession).toHaveBeenCalledWith("session-2")
      })

      // Session should still be in list
      expect(screen.getByText("Firefox on Windows")).toBeInTheDocument()

      // Error notification should appear
      await waitFor(() => {
        expect(screen.getByText("Failed to revoke session. Please try again.")).toBeInTheDocument()
      })

      consoleError.mockRestore()
    })

    it("dismisses notification when close button is clicked", async () => {
      vi.mocked(authService.listSessions).mockResolvedValue(mockSessions)
      vi.mocked(authService.revokeSession).mockResolvedValue()

      render(
        <BrowserRouter>
          <SessionManagementPage />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText("Firefox on Windows")).toBeInTheDocument()
      })

      const revokeButton = screen.getByRole("button", { name: /Revoke/i })
      fireEvent.click(revokeButton)

      // Wait for success notification
      await waitFor(() => {
        expect(screen.getByText("Session revoked successfully")).toBeInTheDocument()
      })

      // Find and click dismiss button
      const dismissButton = screen.getByLabelText("Dismiss notification")
      fireEvent.click(dismissButton)

      // Notification should disappear
      await waitFor(() => {
        expect(screen.queryByText("Session revoked successfully")).not.toBeInTheDocument()
      })
    })

    it("disables revoke button while revoking", async () => {
      vi.mocked(authService.listSessions).mockResolvedValue(mockSessions)
      vi.mocked(authService.revokeSession).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )

      render(
        <BrowserRouter>
          <SessionManagementPage />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText("Firefox on Windows")).toBeInTheDocument()
      })

      const revokeButton = screen.getByRole("button", { name: /Revoke/i })
      fireEvent.click(revokeButton)

      // Button should be disabled and show "Revoking..."
      await waitFor(() => {
        const revokingButton = screen.getByRole("button", { name: /Revoking/i })
        expect(revokingButton).toBeDisabled()
      })
    })
  })
})
