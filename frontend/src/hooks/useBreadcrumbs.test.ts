import { describe, it, expect, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import { useBreadcrumbs } from "./useBreadcrumbs"

// Mock react-router-dom's useLocation
const mockPathname = vi.fn<() => string>()
vi.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname: mockPathname() }),
}))

describe("useBreadcrumbs", () => {
  describe("simple paths", () => {
    it("returns only Dashboard for root path", () => {
      mockPathname.mockReturnValue("/")
      const { result } = renderHook(() => useBreadcrumbs())
      expect(result.current).toEqual([{ label: "Dashboard", href: "/" }])
    })

    it("returns Dashboard > Settings for /settings", () => {
      mockPathname.mockReturnValue("/settings")
      const { result } = renderHook(() => useBreadcrumbs())
      expect(result.current).toEqual([
        { label: "Dashboard", href: "/" },
        { label: "Settings" },
      ])
    })
  })

  describe("nested paths", () => {
    it("returns Dashboard > Settings > Sessions for /settings/sessions", () => {
      mockPathname.mockReturnValue("/settings/sessions")
      const { result } = renderHook(() => useBreadcrumbs())
      expect(result.current).toEqual([
        { label: "Dashboard", href: "/" },
        { label: "Settings", href: "/settings" },
        { label: "Sessions" },
      ])
    })

    it("returns Dashboard > New Hackathon for /hackathons/new", () => {
      mockPathname.mockReturnValue("/hackathons/new")
      const { result } = renderHook(() => useBreadcrumbs())
      expect(result.current).toEqual([
        { label: "Dashboard", href: "/" },
        { label: "New Hackathon" },
      ])
    })

    it("skips hackathons segment but keeps it in href", () => {
      mockPathname.mockReturnValue("/hackathons/my-hack/schedule")
      const { result } = renderHook(() =>
        useBreadcrumbs({ "my-hack": "My Hackathon" })
      )
      expect(result.current).toEqual([
        { label: "Dashboard", href: "/" },
        { label: "My Hackathon", href: "/hackathons/my-hack" },
        { label: "Schedule" },
      ])
    })

    it("handles deeply nested paths with teams", () => {
      mockPathname.mockReturnValue("/hackathons/my-hack/teams/42")
      const { result } = renderHook(() =>
        useBreadcrumbs({ "my-hack": "My Hackathon", "42": "Team Alpha" })
      )
      expect(result.current).toEqual([
        { label: "Dashboard", href: "/" },
        { label: "My Hackathon", href: "/hackathons/my-hack" },
        { label: "Teams", href: "/hackathons/my-hack/teams" },
        { label: "Team Alpha" },
      ])
    })

    it("handles judge > projectId paths", () => {
      mockPathname.mockReturnValue("/hackathons/my-hack/judge/99")
      const { result } = renderHook(() =>
        useBreadcrumbs({ "my-hack": "My Hackathon", "99": "Cool Project" })
      )
      expect(result.current).toEqual([
        { label: "Dashboard", href: "/" },
        { label: "My Hackathon", href: "/hackathons/my-hack" },
        { label: "Judging", href: "/hackathons/my-hack/judge" },
        { label: "Cool Project" },
      ])
    })
  })

  describe("override resolution", () => {
    it("uses override for dynamic slug segment", () => {
      mockPathname.mockReturnValue("/hackathons/spring-2025-hackathon")
      const { result } = renderHook(() =>
        useBreadcrumbs({
          "spring-2025-hackathon": "Spring 2025 Hackathon",
        })
      )
      expect(result.current).toEqual([
        { label: "Dashboard", href: "/" },
        { label: "Spring 2025 Hackathon" },
      ])
    })

    it("does not apply overrides to static segments", () => {
      mockPathname.mockReturnValue("/hackathons/my-hack/schedule")
      const { result } = renderHook(() =>
        useBreadcrumbs({ schedule: "My Custom Schedule" })
      )
      // Static label takes precedence
      expect(result.current[2]).toEqual({ label: "Schedule" })
    })
  })

  describe("slug formatting", () => {
    it("formats slug as title case when no override provided", () => {
      mockPathname.mockReturnValue("/hackathons/my-cool-hackathon")
      const { result } = renderHook(() => useBreadcrumbs())
      expect(result.current).toEqual([
        { label: "Dashboard", href: "/" },
        { label: "My Cool Hackathon" },
      ])
    })

    it("formats single-word slug", () => {
      mockPathname.mockReturnValue("/hackathons/demo")
      const { result } = renderHook(() => useBreadcrumbs())
      expect(result.current).toEqual([
        { label: "Dashboard", href: "/" },
        { label: "Demo" },
      ])
    })

    it("formats numeric segment as-is", () => {
      mockPathname.mockReturnValue("/hackathons/my-hack/teams/42")
      const { result } = renderHook(() =>
        useBreadcrumbs({ "my-hack": "My Hack" })
      )
      expect(result.current[3]).toEqual({ label: "42" })
    })
  })

  describe("last segment has no href", () => {
    it("last segment has no href for nested path", () => {
      mockPathname.mockReturnValue("/hackathons/my-hack/schedule")
      const { result } = renderHook(() =>
        useBreadcrumbs({ "my-hack": "My Hack" })
      )
      const last = result.current[result.current.length - 1]
      expect(last.href).toBeUndefined()
    })

    it("Dashboard keeps href when it is the only segment", () => {
      mockPathname.mockReturnValue("/")
      const { result } = renderHook(() => useBreadcrumbs())
      expect(result.current[0].href).toBe("/")
    })
  })
})
