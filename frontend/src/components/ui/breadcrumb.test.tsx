import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "./breadcrumb"

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe("Breadcrumb", () => {
  it("renders a nav element with aria-label", () => {
    renderWithRouter(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink to="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )

    const nav = screen.getByRole("navigation", { name: "breadcrumb" })
    expect(nav).toBeInTheDocument()
  })

  it("renders links and current page correctly", () => {
    renderWithRouter(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink to="/">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink to="/hackathons/my-hack">
              My Hackathon
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Schedule</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )

    const dashboardLink = screen.getByRole("link", { name: "Dashboard" })
    expect(dashboardLink).toBeInTheDocument()
    expect(dashboardLink).toHaveAttribute("href", "/")

    const hackathonLink = screen.getByRole("link", {
      name: "My Hackathon",
    })
    expect(hackathonLink).toBeInTheDocument()
    expect(hackathonLink).toHaveAttribute("href", "/hackathons/my-hack")

    const currentPage = screen.getByText("Schedule")
    expect(currentPage).toHaveAttribute("aria-current", "page")
    expect(currentPage).toHaveAttribute("aria-disabled", "true")
  })

  it("renders separator with ChevronRight by default", () => {
    renderWithRouter(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink to="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator data-testid="separator" />
          <BreadcrumbItem>
            <BreadcrumbPage>Page</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )

    const separator = screen.getByTestId("separator")
    expect(separator).toHaveAttribute("aria-hidden", "true")
    expect(separator).toHaveAttribute("role", "presentation")
    // ChevronRight SVG is rendered inside
    expect(separator.querySelector("svg")).toBeInTheDocument()
  })

  it("renders custom separator children", () => {
    renderWithRouter(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink to="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator data-testid="separator">/</BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage>Page</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )

    const separator = screen.getByTestId("separator")
    expect(separator).toHaveTextContent("/")
  })

  it("applies text-muted-foreground to links and text-foreground to current page", () => {
    renderWithRouter(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink to="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Current</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )

    const link = screen.getByRole("link", { name: "Home" })
    expect(link.className).toContain("text-muted-foreground")

    const page = screen.getByText("Current")
    expect(page.className).toContain("text-foreground")
  })

  describe("maxLength truncation", () => {
    it("applies truncation styles to BreadcrumbLink when maxLength is set", () => {
      renderWithRouter(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink to="/test" maxLength={30}>
                A Very Long Hackathon Name That Exceeds Thirty Characters
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )

      const link = screen.getByRole("link", {
        name: "A Very Long Hackathon Name That Exceeds Thirty Characters",
      })
      expect(link.style.maxWidth).toBe("30ch")
      expect(link.style.overflow).toBe("hidden")
      expect(link.style.textOverflow).toBe("ellipsis")
      expect(link.style.whiteSpace).toBe("nowrap")
    })

    it("applies truncation styles to BreadcrumbPage when maxLength is set", () => {
      renderWithRouter(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage maxLength={20}>
                A Very Long Current Page Name
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )

      const page = screen.getByText("A Very Long Current Page Name")
      expect(page.style.maxWidth).toBe("20ch")
      expect(page.style.overflow).toBe("hidden")
      expect(page.style.textOverflow).toBe("ellipsis")
      expect(page.style.whiteSpace).toBe("nowrap")
    })

    it("does not apply truncation styles when maxLength is not set", () => {
      renderWithRouter(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink to="/test">Short Name</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Current</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )

      const link = screen.getByRole("link", { name: "Short Name" })
      expect(link.style.maxWidth).toBe("")

      const page = screen.getByText("Current")
      expect(page.style.maxWidth).toBe("")
    })
  })

  it("accepts custom className on all components", () => {
    renderWithRouter(
      <Breadcrumb className="custom-nav">
        <BreadcrumbList className="custom-list">
          <BreadcrumbItem className="custom-item">
            <BreadcrumbLink to="/" className="custom-link">
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="custom-separator" />
          <BreadcrumbItem>
            <BreadcrumbPage className="custom-page">Current</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )

    expect(
      screen.getByRole("navigation", { name: "breadcrumb" })
    ).toHaveClass("custom-nav")
    expect(screen.getByRole("list")).toHaveClass("custom-list")
    expect(screen.getByRole("link", { name: "Home" })).toHaveClass(
      "custom-link"
    )
    expect(screen.getByText("Current")).toHaveClass("custom-page")
  })
})
