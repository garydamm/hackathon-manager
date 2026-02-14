import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { TeamThumbnail } from "./TeamThumbnail"
import type { Team } from "@/types"

const mockTeam: Team = {
  id: "team-1",
  hackathonId: "hack-1",
  name: "Alpha Team",
  description: "A great team building cool stuff",
  isOpen: true,
  memberCount: 3,
  members: [
    {
      id: "m1",
      user: { id: "u1", email: "a@test.com", firstName: "Alice", lastName: "Smith", displayName: "Alice S" },
      isLeader: true,
      joinedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "m2",
      user: { id: "u2", email: "b@test.com", firstName: "Bob", lastName: "Jones", displayName: null },
      isLeader: false,
      joinedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "m3",
      user: { id: "u3", email: "c@test.com", firstName: "Charlie", lastName: "Brown", displayName: "Charlie B" },
      isLeader: false,
      joinedAt: "2024-01-01T00:00:00Z",
    },
  ],
}

const closedTeam: Team = {
  ...mockTeam,
  id: "team-2",
  name: "Beta Team",
  description: null,
  isOpen: false,
  memberCount: 1,
  members: [],
}

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe("TeamThumbnail", () => {
  describe("detailed variant", () => {
    it("renders team name", () => {
      renderWithRouter(
        <TeamThumbnail team={mockTeam} hackathonSlug="my-hack" index={0} variant="detailed" />
      )
      expect(screen.getByText("Alpha Team")).toBeInTheDocument()
    })

    it("renders team description", () => {
      renderWithRouter(
        <TeamThumbnail team={mockTeam} hackathonSlug="my-hack" index={0} variant="detailed" />
      )
      expect(screen.getByText("A great team building cool stuff")).toBeInTheDocument()
    })

    it("renders team initial in header", () => {
      const { container } = renderWithRouter(
        <TeamThumbnail team={mockTeam} hackathonSlug="my-hack" index={0} variant="detailed" />
      )
      const headerInitial = container.querySelector(".text-2xl.font-bold.text-primary")
      expect(headerInitial).toBeInTheDocument()
      expect(headerInitial?.textContent).toBe("A")
    })

    it("shows Open badge for open teams", () => {
      renderWithRouter(
        <TeamThumbnail team={mockTeam} hackathonSlug="my-hack" index={0} variant="detailed" />
      )
      expect(screen.getByText("Open")).toBeInTheDocument()
    })

    it("shows Closed badge for closed teams", () => {
      renderWithRouter(
        <TeamThumbnail team={closedTeam} hackathonSlug="my-hack" index={0} variant="detailed" />
      )
      expect(screen.getByText("Closed")).toBeInTheDocument()
    })

    it("renders member count with max team size", () => {
      renderWithRouter(
        <TeamThumbnail team={mockTeam} hackathonSlug="my-hack" maxTeamSize={5} index={0} variant="detailed" />
      )
      expect(screen.getByText("3 / 5 members")).toBeInTheDocument()
    })

    it("renders member count without max team size", () => {
      renderWithRouter(
        <TeamThumbnail team={mockTeam} hackathonSlug="my-hack" index={0} variant="detailed" />
      )
      expect(screen.getByText("3 members")).toBeInTheDocument()
    })

    it("renders member avatar initials", () => {
      const { container } = renderWithRouter(
        <TeamThumbnail team={mockTeam} hackathonSlug="my-hack" index={0} variant="detailed" />
      )
      // Member avatar circles are in the -space-x-2 container
      const avatarContainer = container.querySelector(".-space-x-2")
      expect(avatarContainer).toBeInTheDocument()
      const avatarInitials = avatarContainer!.querySelectorAll(".text-xs.font-medium.text-primary")
      expect(avatarInitials).toHaveLength(3)
      expect(avatarInitials[0].textContent).toBe("A") // Alice S
      expect(avatarInitials[1].textContent).toBe("B") // Bob (firstName)
      expect(avatarInitials[2].textContent).toBe("C") // Charlie B
    })

    it("shows +N overflow when more than 5 members", () => {
      const bigTeam: Team = {
        ...mockTeam,
        memberCount: 7,
        members: Array.from({ length: 7 }, (_, i) => ({
          id: `m${i}`,
          user: {
            id: `u${i}`,
            email: `user${i}@test.com`,
            firstName: `User${i}`,
            lastName: "Test",
            displayName: null,
          },
          isLeader: i === 0,
          joinedAt: "2024-01-01T00:00:00Z",
        })),
      }
      renderWithRouter(
        <TeamThumbnail team={bigTeam} hackathonSlug="my-hack" index={0} variant="detailed" />
      )
      expect(screen.getByText("+2")).toBeInTheDocument()
    })

    it("links to team detail page", () => {
      renderWithRouter(
        <TeamThumbnail team={mockTeam} hackathonSlug="my-hack" index={0} variant="detailed" />
      )
      const link = screen.getByRole("link")
      expect(link).toHaveAttribute("href", "/hackathons/my-hack/teams/team-1")
    })

    it("does not render description when null", () => {
      renderWithRouter(
        <TeamThumbnail team={closedTeam} hackathonSlug="my-hack" index={0} variant="detailed" />
      )
      expect(screen.queryByText("A great team building cool stuff")).not.toBeInTheDocument()
    })
  })

  describe("compact variant", () => {
    it("renders team name", () => {
      renderWithRouter(
        <TeamThumbnail team={mockTeam} hackathonSlug="my-hack" index={0} variant="compact" />
      )
      expect(screen.getByText("Alpha Team")).toBeInTheDocument()
    })

    it("renders team initial", () => {
      renderWithRouter(
        <TeamThumbnail team={mockTeam} hackathonSlug="my-hack" index={0} variant="compact" />
      )
      expect(screen.getByText("A")).toBeInTheDocument()
    })

    it("renders member count", () => {
      renderWithRouter(
        <TeamThumbnail team={mockTeam} hackathonSlug="my-hack" index={0} variant="compact" />
      )
      expect(screen.getByText("3 members")).toBeInTheDocument()
    })

    it("does not show description", () => {
      renderWithRouter(
        <TeamThumbnail team={mockTeam} hackathonSlug="my-hack" index={0} variant="compact" />
      )
      // Description text should not appear in compact mode
      expect(screen.queryByText("A great team building cool stuff")).not.toBeInTheDocument()
    })

    it("does not show Open/Closed badge", () => {
      renderWithRouter(
        <TeamThumbnail team={mockTeam} hackathonSlug="my-hack" index={0} variant="compact" />
      )
      expect(screen.queryByText("Open")).not.toBeInTheDocument()
    })

    it("does not show member avatars", () => {
      renderWithRouter(
        <TeamThumbnail team={mockTeam} hackathonSlug="my-hack" index={0} variant="compact" />
      )
      // No avatar initials for members (only the team initial "A" should appear)
      expect(screen.queryByText("B")).not.toBeInTheDocument()
      expect(screen.queryByText("C")).not.toBeInTheDocument()
    })

    it("links to team detail page", () => {
      renderWithRouter(
        <TeamThumbnail team={mockTeam} hackathonSlug="my-hack" index={0} variant="compact" />
      )
      const link = screen.getByRole("link")
      expect(link).toHaveAttribute("href", "/hackathons/my-hack/teams/team-1")
    })
  })
})
