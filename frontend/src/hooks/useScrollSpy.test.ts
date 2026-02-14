import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useScrollSpy } from "./useScrollSpy"

// Store the IntersectionObserver callback so we can trigger it manually
let observerCallback: IntersectionObserverCallback
let observerOptions: IntersectionObserverInit | undefined
const observeMock = vi.fn()
const disconnectMock = vi.fn()

class MockIntersectionObserver {
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    observerCallback = callback
    observerOptions = options
  }
  observe = observeMock
  unobserve = vi.fn()
  disconnect = disconnectMock
  takeRecords = vi.fn().mockReturnValue([])
  root = null
  rootMargin = ""
  thresholds = []
}

beforeEach(() => {
  observeMock.mockClear()
  disconnectMock.mockClear()
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver)
})

afterEach(() => {
  vi.unstubAllGlobals()
  // Clean up DOM elements
  document.body.innerHTML = ""
})

function createSection(id: string): HTMLElement {
  const el = document.createElement("div")
  el.id = id
  document.body.appendChild(el)
  return el
}

function fireEntries(entries: Array<{ target: HTMLElement; intersectionRatio: number }>) {
  observerCallback(
    entries.map((e) => ({
      target: e.target,
      intersectionRatio: e.intersectionRatio,
      // Minimal required props for the IntersectionObserverEntry interface
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRect: {} as DOMRectReadOnly,
      isIntersecting: e.intersectionRatio > 0,
      rootBounds: null,
      time: Date.now(),
    })),
    {} as IntersectionObserver
  )
}

describe("useScrollSpy", () => {
  it("returns undefined activeId initially", () => {
    createSection("overview")
    createSection("teams")

    const { result } = renderHook(() =>
      useScrollSpy({ sectionIds: ["overview", "teams"] })
    )

    expect(result.current.activeId).toBeUndefined()
  })

  it("observes all section elements that exist in the DOM", () => {
    const el1 = createSection("overview")
    const el2 = createSection("teams")

    renderHook(() => useScrollSpy({ sectionIds: ["overview", "teams"] }))

    expect(observeMock).toHaveBeenCalledTimes(2)
    expect(observeMock).toHaveBeenCalledWith(el1)
    expect(observeMock).toHaveBeenCalledWith(el2)
  })

  it("skips section IDs that do not exist in the DOM", () => {
    createSection("overview")
    // "teams" not in DOM

    renderHook(() => useScrollSpy({ sectionIds: ["overview", "teams"] }))

    expect(observeMock).toHaveBeenCalledTimes(1)
  })

  it("sets activeId to the section with highest intersection ratio", () => {
    const el1 = createSection("overview")
    const el2 = createSection("teams")

    const { result } = renderHook(() =>
      useScrollSpy({ sectionIds: ["overview", "teams"] })
    )

    act(() => {
      fireEntries([
        { target: el1, intersectionRatio: 0.3 },
        { target: el2, intersectionRatio: 0.7 },
      ])
    })

    expect(result.current.activeId).toBe("teams")
  })

  it("updates activeId when intersection ratios change", () => {
    const el1 = createSection("overview")
    const el2 = createSection("teams")

    const { result } = renderHook(() =>
      useScrollSpy({ sectionIds: ["overview", "teams"] })
    )

    act(() => {
      fireEntries([
        { target: el1, intersectionRatio: 0.8 },
        { target: el2, intersectionRatio: 0.2 },
      ])
    })

    expect(result.current.activeId).toBe("overview")

    act(() => {
      fireEntries([
        { target: el1, intersectionRatio: 0.1 },
        { target: el2, intersectionRatio: 0.9 },
      ])
    })

    expect(result.current.activeId).toBe("teams")
  })

  it("suppresses updates during suppressFor period", () => {
    const el1 = createSection("overview")
    const el2 = createSection("teams")

    const { result } = renderHook(() =>
      useScrollSpy({ sectionIds: ["overview", "teams"] })
    )

    // Set initial active
    act(() => {
      fireEntries([{ target: el1, intersectionRatio: 0.8 }])
    })
    expect(result.current.activeId).toBe("overview")

    // Suppress for 1 second
    act(() => {
      result.current.suppressFor(1000)
    })

    // Fire new entries — should be ignored
    act(() => {
      fireEntries([
        { target: el1, intersectionRatio: 0.1 },
        { target: el2, intersectionRatio: 0.9 },
      ])
    })

    expect(result.current.activeId).toBe("overview")
  })

  it("resumes updates after suppress period expires", () => {
    const el1 = createSection("overview")
    const el2 = createSection("teams")

    vi.useFakeTimers()

    const { result } = renderHook(() =>
      useScrollSpy({ sectionIds: ["overview", "teams"] })
    )

    act(() => {
      fireEntries([{ target: el1, intersectionRatio: 0.8 }])
    })
    expect(result.current.activeId).toBe("overview")

    act(() => {
      result.current.suppressFor(500)
    })

    // Advance past the suppression period
    act(() => {
      vi.advanceTimersByTime(600)
    })

    // Now fire entries — should work
    act(() => {
      fireEntries([
        { target: el1, intersectionRatio: 0.1 },
        { target: el2, intersectionRatio: 0.9 },
      ])
    })

    expect(result.current.activeId).toBe("teams")

    vi.useRealTimers()
  })

  it("passes rootMargin to IntersectionObserver options", () => {
    createSection("overview")

    renderHook(() => useScrollSpy({ sectionIds: ["overview"], rootMargin: 200 }))

    expect(observerOptions?.rootMargin).toBe("-200px 0px 0px 0px")
  })

  it("uses default rootMargin of 120", () => {
    createSection("overview")

    renderHook(() => useScrollSpy({ sectionIds: ["overview"] }))

    expect(observerOptions?.rootMargin).toBe("-120px 0px 0px 0px")
  })

  it("disconnects observer on unmount", () => {
    createSection("overview")

    const { unmount } = renderHook(() =>
      useScrollSpy({ sectionIds: ["overview"] })
    )

    unmount()

    expect(disconnectMock).toHaveBeenCalledTimes(1)
  })

  it("does not create observer when no elements exist", () => {
    // No elements in DOM

    renderHook(() => useScrollSpy({ sectionIds: ["overview", "teams"] }))

    expect(observeMock).not.toHaveBeenCalled()
  })

  it("provides multiple thresholds for smooth tracking", () => {
    createSection("overview")

    renderHook(() => useScrollSpy({ sectionIds: ["overview"] }))

    expect(observerOptions?.threshold).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1])
  })

  it("re-creates observer when sectionIds change", () => {
    createSection("overview")
    createSection("teams")

    const { rerender } = renderHook(
      ({ ids }: { ids: string[] }) => useScrollSpy({ sectionIds: ids }),
      { initialProps: { ids: ["overview"] } }
    )

    expect(observeMock).toHaveBeenCalledTimes(1)

    rerender({ ids: ["overview", "teams"] })

    // Previous observer disconnected, new one created
    expect(disconnectMock).toHaveBeenCalledTimes(1)
    expect(observeMock).toHaveBeenCalledTimes(3) // 1 initial + 2 after rerender
  })
})
