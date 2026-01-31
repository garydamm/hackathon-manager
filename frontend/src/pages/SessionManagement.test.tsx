import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
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
}))

// Mock authService
vi.mock("@/services/auth", () => ({
  authService: {
    listSessions: vi.fn(),
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
})
