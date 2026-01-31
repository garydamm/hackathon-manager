import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { SessionCard } from "./SessionCard"
import type { SessionResponse } from "@/types"

describe("SessionCard", () => {
  const mockSession: SessionResponse = {
    id: "session-1",
    deviceInfo: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    ipAddress: "192.168.1.100",
    lastActivityAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
    createdAt: new Date("2024-01-15T10:00:00Z").toISOString(),
    isCurrent: false,
  }

  it("renders session card with device info", () => {
    render(<SessionCard session={mockSession} />)

    expect(screen.getByText("Chrome on macOS")).toBeInTheDocument()
  })

  it("shows current session badge when isCurrent is true", () => {
    const currentSession = { ...mockSession, isCurrent: true }
    render(<SessionCard session={currentSession} />)

    expect(screen.getByText("Current Session")).toBeInTheDocument()
  })

  it("does not show current session badge when isCurrent is false", () => {
    render(<SessionCard session={mockSession} />)

    expect(screen.queryByText("Current Session")).not.toBeInTheDocument()
  })

  it("displays masked IP address for privacy", () => {
    render(<SessionCard session={mockSession} />)

    expect(screen.getByText(/IP Address: 192\.168\.\*\.\*/)).toBeInTheDocument()
    expect(screen.queryByText(/192\.168\.1\.100/)).not.toBeInTheDocument()
  })

  it("shows relative last activity time", () => {
    render(<SessionCard session={mockSession} />)

    expect(screen.getByText(/Last activity: .* ago/)).toBeInTheDocument()
  })

  it("displays formatted creation date", () => {
    render(<SessionCard session={mockSession} />)

    expect(screen.getByText(/Created: Jan 15, 2024/)).toBeInTheDocument()
  })

  it("applies highlighted styling for current session", () => {
    const currentSession = { ...mockSession, isCurrent: true }
    const { container } = render(<SessionCard session={currentSession} />)

    const card = container.querySelector(".border-primary")
    expect(card).toBeInTheDocument()
  })

  it("applies normal styling for non-current session", () => {
    const { container } = render(<SessionCard session={mockSession} />)

    const card = container.querySelector(".border-border")
    expect(card).toBeInTheDocument()
  })

  describe("Browser detection", () => {
    it("detects Chrome browser", () => {
      const chromeSession = {
        ...mockSession,
        deviceInfo: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
      }
      render(<SessionCard session={chromeSession} />)

      expect(screen.getByText(/Chrome on/)).toBeInTheDocument()
    })

    it("detects Firefox browser", () => {
      const firefoxSession = {
        ...mockSession,
        deviceInfo: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Firefox/120.0",
      }
      render(<SessionCard session={firefoxSession} />)

      expect(screen.getByText(/Firefox on/)).toBeInTheDocument()
    })

    it("detects Safari browser", () => {
      const safariSession = {
        ...mockSession,
        deviceInfo: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15",
      }
      render(<SessionCard session={safariSession} />)

      expect(screen.getByText(/Safari on/)).toBeInTheDocument()
    })

    it("detects Edge browser", () => {
      const edgeSession = {
        ...mockSession,
        deviceInfo: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/120.0.0.0",
      }
      render(<SessionCard session={edgeSession} />)

      expect(screen.getByText(/Edge on/)).toBeInTheDocument()
    })
  })

  describe("OS detection", () => {
    it("detects macOS", () => {
      const macSession = {
        ...mockSession,
        deviceInfo: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0",
      }
      render(<SessionCard session={macSession} />)

      expect(screen.getByText(/on macOS/)).toBeInTheDocument()
    })

    it("detects Windows", () => {
      const windowsSession = {
        ...mockSession,
        deviceInfo: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
      }
      render(<SessionCard session={windowsSession} />)

      expect(screen.getByText(/on Windows/)).toBeInTheDocument()
    })

    it("detects Linux", () => {
      const linuxSession = {
        ...mockSession,
        deviceInfo: "Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0.0.0",
      }
      render(<SessionCard session={linuxSession} />)

      expect(screen.getByText(/on Linux/)).toBeInTheDocument()
    })

    it("detects iOS", () => {
      const iosSession = {
        ...mockSession,
        deviceInfo: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1",
      }
      render(<SessionCard session={iosSession} />)

      expect(screen.getByText(/on iOS/)).toBeInTheDocument()
    })

    it("detects Android", () => {
      const androidSession = {
        ...mockSession,
        deviceInfo: "Mozilla/5.0 (Linux; Android 13) Chrome/120.0.0.0",
      }
      render(<SessionCard session={androidSession} />)

      expect(screen.getByText(/on Android/)).toBeInTheDocument()
    })
  })

  describe("Edge cases", () => {
    it("handles null deviceInfo", () => {
      const nullDeviceSession = { ...mockSession, deviceInfo: null }
      render(<SessionCard session={nullDeviceSession} />)

      expect(screen.getByText("Unknown Browser on Unknown OS")).toBeInTheDocument()
    })

    it("handles null ipAddress", () => {
      const nullIpSession = { ...mockSession, ipAddress: null }
      render(<SessionCard session={nullIpSession} />)

      expect(screen.getByText(/IP Address: Unknown IP/)).toBeInTheDocument()
    })

    it("handles non-IPv4 IP address (returns as-is)", () => {
      const ipv6Session = { ...mockSession, ipAddress: "2001:0db8:85a3::8a2e:0370:7334" }
      render(<SessionCard session={ipv6Session} />)

      expect(screen.getByText(/IP Address: 2001:0db8:85a3::8a2e:0370:7334/)).toBeInTheDocument()
    })

    it("handles invalid IP address format", () => {
      const invalidIpSession = { ...mockSession, ipAddress: "invalid-ip" }
      render(<SessionCard session={invalidIpSession} />)

      expect(screen.getByText(/IP Address: invalid-ip/)).toBeInTheDocument()
    })
  })
})
