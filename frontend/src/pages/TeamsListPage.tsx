import { useState, useMemo, useEffect } from "react"
import { useParams, Link, useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { ArrowLeft, Loader2, Search, Users, Plus } from "lucide-react"
import { AppLayout } from "@/components/layouts/AppLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { TeamCard } from "@/components/TeamCard"
import { CreateTeamModal } from "@/components/CreateTeamModal"
import { hackathonService } from "@/services/hackathons"
import { teamService } from "@/services/teams"
import { ApiError } from "@/services/api"

export function TeamsListPage() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState("")
  const [showOpenOnly, setShowOpenOnly] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Open modal if URL has ?create=true
  useEffect(() => {
    if (searchParams.get("create") === "true") {
      setIsCreateModalOpen(true)
    }
  }, [searchParams])

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false)
    // Remove ?create=true from URL
    if (searchParams.has("create")) {
      searchParams.delete("create")
      setSearchParams(searchParams, { replace: true })
    }
  }

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true)
  }

  const {
    data: hackathon,
    isLoading: isLoadingHackathon,
    error: hackathonError,
  } = useQuery({
    queryKey: ["hackathon", slug],
    queryFn: () => hackathonService.getBySlug(slug!),
    enabled: !!slug,
  })

  const {
    data: teams,
    isLoading: isLoadingTeams,
    error: teamsError,
  } = useQuery({
    queryKey: ["teams", hackathon?.id],
    queryFn: () => teamService.getTeamsByHackathon(hackathon!.id),
    enabled: !!hackathon?.id,
  })

  const { data: myTeam } = useQuery({
    queryKey: ["myTeam", hackathon?.id],
    queryFn: () => teamService.getMyTeam(hackathon!.id),
    enabled: !!hackathon?.id,
  })

  // User can create a team if they're a registered participant and don't have a team
  const canCreateTeam = hackathon?.userRole === "participant" && !myTeam

  const filteredTeams = useMemo(() => {
    if (!teams) return []

    return teams.filter((team) => {
      const matchesSearch = team.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
      const matchesOpenFilter = !showOpenOnly || team.isOpen

      return matchesSearch && matchesOpenFilter
    })
  }, [teams, searchQuery, showOpenOnly])

  const isLoading = isLoadingHackathon || isLoadingTeams
  const error = hackathonError || teamsError

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    )
  }

  if (error || !hackathon) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="text-center py-12">
            <p className="text-destructive">
              {error instanceof ApiError
                ? error.message
                : "Failed to load teams."}
            </p>
            <Link to="/">
              <Button className="mt-4">Go Back</Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Link to={`/hackathons/${slug}`}>
              <Button variant="ghost">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to {hackathon.name}
              </Button>
            </Link>
          </div>

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Teams</h1>
              <p className="text-muted-foreground">
                Browse teams participating in {hackathon.name}
              </p>
            </div>
            {canCreateTeam && (
              <Button onClick={handleOpenCreateModal}>
                <Plus className="h-4 w-4 mr-2" />
                Create Team
              </Button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search teams by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="open-only"
                checked={showOpenOnly}
                onCheckedChange={setShowOpenOnly}
              />
              <Label htmlFor="open-only" className="cursor-pointer">
                Show open teams only
              </Label>
            </div>
          </div>

          {/* Teams Grid */}
          {filteredTeams.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No teams found</h3>
              <p className="mt-2 text-muted-foreground">
                {teams && teams.length > 0
                  ? "Try adjusting your filters to see more teams."
                  : "No teams have been created for this hackathon yet."}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTeams.map((team, index) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  hackathonSlug={slug!}
                  maxTeamSize={hackathon.maxTeamSize}
                  index={index}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* Create Team Modal */}
        <CreateTeamModal
          isOpen={isCreateModalOpen}
          onClose={handleCloseCreateModal}
          hackathonId={hackathon.id}
          hackathonSlug={slug!}
        />
      </div>
    </AppLayout>
  )
}
