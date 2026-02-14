import { useState, useEffect, useRef, useCallback } from "react"

interface UseScrollSpyOptions {
  /** IDs of sections to observe */
  sectionIds: string[]
  /** Offset from top of viewport (for sticky headers), default 120 */
  rootMargin?: number
}

/**
 * Observes sections via IntersectionObserver and returns the ID
 * of the section currently most visible in the viewport.
 *
 * Provides a `suppressUntil` function that temporarily pauses
 * scrollspy updates (useful during programmatic scroll-to-section).
 */
export function useScrollSpy({ sectionIds, rootMargin = 120 }: UseScrollSpyOptions) {
  const [activeId, setActiveId] = useState<string | undefined>(undefined)
  const suppressedUntilRef = useRef<number>(0)
  const ratioMap = useRef<Map<string, number>>(new Map())

  /** Temporarily suppress scrollspy updates for `ms` milliseconds */
  const suppressFor = useCallback((ms: number) => {
    suppressedUntilRef.current = Date.now() + ms
  }, [])

  useEffect(() => {
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)

    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < suppressedUntilRef.current) return

        for (const entry of entries) {
          ratioMap.current.set(entry.target.id, entry.intersectionRatio)
        }

        // Find the section with the highest intersection ratio
        let bestId: string | undefined
        let bestRatio = 0
        for (const [id, ratio] of ratioMap.current) {
          if (ratio > bestRatio) {
            bestRatio = ratio
            bestId = id
          }
        }

        if (bestId) {
          setActiveId(bestId)
        }
      },
      {
        // Negative top margin accounts for sticky header + nav bar
        rootMargin: `-${rootMargin}px 0px 0px 0px`,
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
      }
    )

    for (const el of elements) {
      observer.observe(el)
    }

    return () => {
      observer.disconnect()
      ratioMap.current.clear()
    }
  }, [sectionIds, rootMargin])

  return { activeId, suppressFor }
}
