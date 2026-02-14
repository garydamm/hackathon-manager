import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SectionNav, type SectionNavItem } from "./SectionNav"

const sections: SectionNavItem[] = [
  { id: "overview", label: "Overview" },
  { id: "teams", label: "Teams" },
  { id: "projects", label: "Projects" },
  { id: "schedule", label: "Schedule", disabled: true },
  { id: "judging", label: "Judging", disabled: true },
]

describe("SectionNav", () => {
  it("renders all section tabs", () => {
    render(<SectionNav sections={sections} />)
    expect(screen.getByText("Overview")).toBeInTheDocument()
    expect(screen.getByText("Teams")).toBeInTheDocument()
    expect(screen.getByText("Projects")).toBeInTheDocument()
    expect(screen.getByText("Schedule")).toBeInTheDocument()
    expect(screen.getByText("Judging")).toBeInTheDocument()
  })

  it("renders with tablist role", () => {
    render(<SectionNav sections={sections} />)
    expect(screen.getByRole("tablist")).toBeInTheDocument()
  })

  it("renders tabs with tab role", () => {
    render(<SectionNav sections={sections} />)
    const tabs = screen.getAllByRole("tab")
    expect(tabs).toHaveLength(5)
  })

  it("marks the active tab with aria-selected", () => {
    render(<SectionNav sections={sections} activeId="teams" />)
    const teamsTab = screen.getByText("Teams")
    expect(teamsTab).toHaveAttribute("aria-selected", "true")
    const overviewTab = screen.getByText("Overview")
    expect(overviewTab).toHaveAttribute("aria-selected", "false")
  })

  it("applies active styling to the active tab", () => {
    render(<SectionNav sections={sections} activeId="overview" />)
    const tab = screen.getByText("Overview")
    expect(tab.className).toContain("border-primary")
    expect(tab.className).toContain("text-foreground")
  })

  it("applies inactive styling to non-active, non-disabled tabs", () => {
    render(<SectionNav sections={sections} activeId="overview" />)
    const tab = screen.getByText("Teams")
    expect(tab.className).toContain("text-muted-foreground")
    expect(tab.className).toContain("hover:text-foreground")
    expect(tab.className).toContain("border-transparent")
  })

  it("applies disabled styling to disabled tabs", () => {
    render(<SectionNav sections={sections} />)
    const tab = screen.getByText("Schedule")
    expect(tab.className).toContain("text-muted-foreground/50")
    expect(tab.className).toContain("cursor-not-allowed")
  })

  it("marks disabled tabs with aria-disabled", () => {
    render(<SectionNav sections={sections} />)
    const tab = screen.getByText("Schedule")
    expect(tab).toHaveAttribute("aria-disabled", "true")
  })

  it("sets tabIndex -1 on disabled tabs", () => {
    render(<SectionNav sections={sections} />)
    const tab = screen.getByText("Schedule")
    expect(tab).toHaveAttribute("tabindex", "-1")
  })

  it("calls onTabClick when a non-disabled tab is clicked", async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<SectionNav sections={sections} onTabClick={handleClick} />)
    await user.click(screen.getByText("Teams"))
    expect(handleClick).toHaveBeenCalledWith("teams")
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it("does not call onTabClick when a disabled tab is clicked", async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<SectionNav sections={sections} onTabClick={handleClick} />)
    await user.click(screen.getByText("Schedule"))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it("uses sticky positioning", () => {
    const { container } = render(<SectionNav sections={sections} />)
    const nav = container.querySelector("nav")
    expect(nav?.className).toContain("sticky")
  })

  it("uses bg-background for solid background", () => {
    const { container } = render(<SectionNav sections={sections} />)
    const nav = container.querySelector("nav")
    expect(nav?.className).toContain("bg-background")
  })

  it("has bottom border for visual separation", () => {
    const { container } = render(<SectionNav sections={sections} />)
    const nav = container.querySelector("nav")
    expect(nav?.className).toContain("border-b")
  })

  it("applies custom stickyTop class", () => {
    const { container } = render(
      <SectionNav sections={sections} stickyTop="top-20" />
    )
    const nav = container.querySelector("nav")
    expect(nav?.className).toContain("top-20")
  })

  it("defaults stickyTop to top-16", () => {
    const { container } = render(<SectionNav sections={sections} />)
    const nav = container.querySelector("nav")
    expect(nav?.className).toContain("top-16")
  })

  it("applies additional className", () => {
    const { container } = render(
      <SectionNav sections={sections} className="my-custom-class" />
    )
    const nav = container.querySelector("nav")
    expect(nav?.className).toContain("my-custom-class")
  })

  it("ensures minimum touch target height of 44px", () => {
    render(<SectionNav sections={sections} />)
    const tabs = screen.getAllByRole("tab")
    for (const tab of tabs) {
      expect(tab.className).toContain("min-h-[44px]")
    }
  })

  it("renders with hidden scrollbar styles for horizontal scroll", () => {
    const { container } = render(<SectionNav sections={sections} />)
    const scrollContainer = container.querySelector(".overflow-x-auto")
    expect(scrollContainer).toBeInTheDocument()
  })
})
