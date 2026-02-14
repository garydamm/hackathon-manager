import { useRef, useCallback, useEffect } from "react"
import { cn } from "@/lib/utils"

export interface SectionNavItem {
  id: string
  label: string
  disabled?: boolean
}

interface SectionNavProps {
  sections: SectionNavItem[]
  activeId?: string
  onTabClick?: (sectionId: string) => void
  className?: string
  stickyTop?: string
}

export function SectionNav({
  sections,
  activeId,
  onTabClick,
  className,
  stickyTop = "top-16",
}: SectionNavProps) {
  const navRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll the active tab into view within the horizontal nav bar
  useEffect(() => {
    if (!activeId || !scrollContainerRef.current) return
    const container = scrollContainerRef.current
    const activeButton = container.querySelector(
      `[data-section-id="${activeId}"]`
    ) as HTMLElement | null
    if (!activeButton) return
    const containerRect = container.getBoundingClientRect()
    const buttonRect = activeButton.getBoundingClientRect()
    // Only scroll if the button is not fully visible
    if (
      buttonRect.left < containerRect.left ||
      buttonRect.right > containerRect.right
    ) {
      activeButton.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      })
    }
  }, [activeId])

  const handleClick = useCallback(
    (section: SectionNavItem) => {
      if (section.disabled) return
      onTabClick?.(section.id)
    },
    [onTabClick]
  )

  return (
    <nav
      ref={navRef}
      className={cn(
        "sticky z-40 bg-background border-b border-border",
        stickyTop,
        className
      )}
      role="tablist"
      aria-label="Page sections"
    >
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {sections.map((section) => {
          const isActive = section.id === activeId
          const isDisabled = section.disabled === true

          return (
            <button
              key={section.id}
              data-section-id={section.id}
              role="tab"
              aria-selected={isActive}
              aria-disabled={isDisabled}
              tabIndex={isDisabled ? -1 : 0}
              onClick={() => handleClick(section)}
              className={cn(
                "shrink-0 min-h-[44px] px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2",
                isActive &&
                  "border-primary text-foreground",
                !isActive &&
                  !isDisabled &&
                  "border-transparent text-muted-foreground hover:text-foreground",
                isDisabled &&
                  "border-transparent text-muted-foreground/50 cursor-not-allowed"
              )}
            >
              {section.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
