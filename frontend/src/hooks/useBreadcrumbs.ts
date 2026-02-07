import { useLocation } from "react-router-dom"

export interface BreadcrumbSegment {
  label: string
  href?: string
}

const STATIC_LABELS: Record<string, string> = {
  new: "New Hackathon",
  schedule: "Schedule",
  teams: "Teams",
  judge: "Judging",
  settings: "Settings",
  sessions: "Sessions",
}

const SKIPPED_SEGMENTS = new Set(["hackathons"])

function formatSlug(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function useBreadcrumbs(
  overrides?: Record<string, string>
): BreadcrumbSegment[] {
  const { pathname } = useLocation()

  const parts = pathname.split("/").filter(Boolean)
  const segments: BreadcrumbSegment[] = [{ label: "Dashboard", href: "/" }]

  let hrefSoFar = ""

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    hrefSoFar += `/${part}`

    if (SKIPPED_SEGMENTS.has(part)) {
      continue
    }

    const label =
      STATIC_LABELS[part] ?? overrides?.[part] ?? formatSlug(part)

    segments.push({ label, href: hrefSoFar })
  }

  // Last segment has no href (it's the current page)
  if (segments.length > 1) {
    const last = segments[segments.length - 1]
    delete last.href
  }

  return segments
}
