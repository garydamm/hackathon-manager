import { useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { motion } from "framer-motion"
import {
  Loader2,
  ArrowLeft,
  Calendar,
  Users,
  Globe,
  MapPin,
  Clock,
  Edit,
  Save,
  X,
  UsersRound,
  UserPlus,
  CheckCircle,
  FolderKanban,
  FolderPlus,
  Gavel,
  User,
  Archive,
} from "lucide-react"
import { AppLayout } from "@/components/layouts/AppLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RegisterModal } from "@/components/RegisterModal"
import { UnregisterModal } from "@/components/UnregisterModal"
import { ArchiveModal } from "@/components/ArchiveModal"
import { ProjectCard } from "@/components/ProjectCard"
import { TeamThumbnail } from "@/components/TeamThumbnail"
import { ProjectDetailModal } from "@/components/ProjectDetailModal"
import { JudgingCriteriaSection } from "@/components/JudgingCriteriaSection"
import { JudgesSection } from "@/components/JudgesSection"
import { LeaderboardSection } from "@/components/LeaderboardSection"
import { ResultsSection } from "@/components/ResultsSection"
import { ScheduleManagementSection } from "@/components/ScheduleManagementSection"
import { OrganizersSection } from "@/components/OrganizersSection"
import { ParticipantsSection } from "@/components/ParticipantsSection"
import { hackathonService } from "@/services/hackathons"
import { teamService } from "@/services/teams"
import { projectService } from "@/services/projects"
import { ProjectForm } from "@/components/ProjectForm"
import type { Project, CreateProjectRequest } from "@/types"
import { ApiError } from "@/services/api"
import { useAuth } from "@/contexts/AuthContext"
import type { Hackathon, HackathonStatus } from "@/types"

const updateHackathonSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  rules: z.string().optional(),
  status: z.string(),
  bannerUrl: z.string().optional(),
  logoUrl: z.string().optional(),
  location: z.string().optional(),
  isVirtual: z.boolean(),
  timezone: z.string(),
  startsAt: z.string().min(1, "Start date is required"),
  endsAt: z.string().min(1, "End date is required"),
  registrationOpensAt: z.string().optional(),
  registrationClosesAt: z.string().optional(),
  maxTeamSize: z.number().min(1).max(20),
  minTeamSize: z.number().min(1).max(10),
  maxParticipants: z.string().optional(),
})

type UpdateFormData = z.infer<typeof updateHackathonSchema>

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatDateForInput(dateString: string | null | undefined): string {
  if (!dateString) return ""
  const date = new Date(dateString)
  return date.toISOString().slice(0, 16)
}

function formatStatus(status: HackathonStatus): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function getStatusColor(status: HackathonStatus): string {
  const colors: Record<HackathonStatus, string> = {
    draft: "bg-gray-100 text-gray-700",
    registration_open: "bg-green-100 text-green-700",
    registration_closed: "bg-yellow-100 text-yellow-700",
    in_progress: "bg-blue-100 text-blue-700",
    judging: "bg-purple-100 text-purple-700",
    completed: "bg-gray-100 text-gray-700",
    cancelled: "bg-red-100 text-red-700",
  }
  return colors[status]
}

const STATUS_OPTIONS: { value: HackathonStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "registration_open", label: "Registration Open" },
  { value: "registration_closed", label: "Registration Closed" },
  { value: "in_progress", label: "In Progress" },
  { value: "judging", label: "Judging" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

function TeamsSection({ hackathon }: { hackathon: Hackathon }) {
  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ["teams", hackathon.id],
    queryFn: () => teamService.getTeamsByHackathon(hackathon.id),
  })

  const { isLoading: myTeamLoading } = useQuery({
    queryKey: ["myTeam", hackathon.id],
    queryFn: () => teamService.getMyTeam(hackathon.id),
  })

  const canCreateTeam = hackathon.userRole === "participant" || hackathon.userRole === "organizer"
  const teamsCount = teams?.length ?? 0
  const variant = teamsCount >= 10 ? "compact" as const : "detailed" as const

  if (teamsLoading || myTeamLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersRound className="h-5 w-5" />
            Teams
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <UsersRound className="h-5 w-5" />
            Teams ({teamsCount})
          </span>
          {canCreateTeam && (
            <Button asChild size="sm">
              <Link to={`/hackathons/${hackathon.slug}/teams?create=true`}>
                <UserPlus className="h-4 w-4 mr-2" />
                Create Team
              </Link>
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {teamsCount === 0 ? (
          <div className="text-center py-8">
            <UsersRound className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">No teams yet</p>
            {canCreateTeam && (
              <Button asChild>
                <Link to={`/hackathons/${hackathon.slug}/teams?create=true`}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Team
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div
            className={
              variant === "detailed"
                ? "grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                : "grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            }
          >
            {(teams ?? []).map((team, index) => (
              <TeamThumbnail
                key={team.id}
                team={team}
                hackathonSlug={hackathon.slug}
                maxTeamSize={hackathon.maxTeamSize}
                index={index}
                variant={variant}
              />
            ))}
          </div>
        )}

        {teamsCount > 0 && (
          <div className="text-center pt-2">
            <Button asChild variant="outline" size="sm">
              <Link to={`/hackathons/${hackathon.slug}/teams`}>View All Teams</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

type ProjectFilter = "all" | "team" | "independent"

function ProjectsSection({ hackathon }: { hackathon: Hackathon }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [filter, setFilter] = useState<ProjectFilter>("all")

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["projects", "hackathon", hackathon.id],
    queryFn: () => projectService.getProjectsByHackathon(hackathon.id),
  })

  const createProjectMutation = useMutation({
    mutationFn: (request: CreateProjectRequest) => projectService.createProject(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", "hackathon", hackathon.id] })
      setShowProjectForm(false)
    },
  })

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, ...request }: { id: string } & import("@/types").UpdateProjectRequest) =>
      projectService.updateProject(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", "hackathon", hackathon.id] })
      setEditingProject(null)
      setSelectedProject(null)
    },
  })

  const handleProjectFormSubmit = async (data: {
    name: string
    tagline?: string
    description?: string
    demoUrl?: string
    videoUrl?: string
    repositoryUrl?: string
    presentationUrl?: string
  }) => {
    const cleanedData = {
      name: data.name,
      tagline: data.tagline || undefined,
      description: data.description || undefined,
      demoUrl: data.demoUrl || undefined,
      videoUrl: data.videoUrl || undefined,
      repositoryUrl: data.repositoryUrl || undefined,
      presentationUrl: data.presentationUrl || undefined,
    }

    await createProjectMutation.mutateAsync({
      hackathonId: hackathon.id,
      ...cleanedData,
    })
  }

  const handleEditFormSubmit = async (data: {
    name: string
    tagline?: string
    description?: string
    demoUrl?: string
    videoUrl?: string
    repositoryUrl?: string
    presentationUrl?: string
  }) => {
    if (!editingProject) return
    const cleanedData = {
      name: data.name,
      tagline: data.tagline || undefined,
      description: data.description || undefined,
      demoUrl: data.demoUrl || undefined,
      videoUrl: data.videoUrl || undefined,
      repositoryUrl: data.repositoryUrl || undefined,
      presentationUrl: data.presentationUrl || undefined,
    }
    await updateProjectMutation.mutateAsync({ id: editingProject.id, ...cleanedData })
  }

  const canCreateProject = hackathon.userRole === "participant" || hackathon.userRole === "organizer"
  const isOrganizer = hackathon.userRole === "organizer"

  const filteredProjects = (projects ?? []).filter((p) => {
    if (filter === "team") return !!p.teamId
    if (filter === "independent") return !p.teamId
    return true
  })
  const projectsCount = projects?.length ?? 0

  if (projectsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            Projects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5" />
              Projects ({projectsCount})
            </span>
            {canCreateProject && (
              <Button size="sm" onClick={() => setShowProjectForm(true)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter tabs */}
          {projectsCount > 0 && (
            <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
              {([
                { value: "all" as const, label: "All" },
                { value: "team" as const, label: "Team Projects" },
                { value: "independent" as const, label: "Independent" },
              ]).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    filter === option.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {projectsCount === 0 ? (
            <div className="text-center py-8">
              <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-4">
                No projects have been created yet.
              </p>
              {canCreateProject && (
                <Button onClick={() => setShowProjectForm(true)}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              )}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No {filter === "team" ? "team" : "independent"} projects found.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredProjects.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  index={index}
                  onClick={() => setSelectedProject(project)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Project Detail Modal */}
      {selectedProject && (
        <ProjectDetailModal
          isOpen={!!selectedProject}
          onClose={() => setSelectedProject(null)}
          project={selectedProject}
          hackathonSlug={hackathon.slug}
          canEdit={isOrganizer || selectedProject.createdById === user?.id}
          onEdit={() => {
            setEditingProject(selectedProject)
            setSelectedProject(null)
          }}
        />
      )}

      {/* Project Creation Form */}
      <ProjectForm
        isOpen={showProjectForm}
        onClose={() => setShowProjectForm(false)}
        onSubmit={handleProjectFormSubmit}
        isLoading={createProjectMutation.isPending}
      />

      {/* Project Edit Form */}
      <ProjectForm
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        onSubmit={handleEditFormSubmit}
        project={editingProject}
        isLoading={updateProjectMutation.isPending}
      />
    </>
  )
}

function ViewMode({
  hackathon,
  onRegisterClick,
  onUnregisterClick,
  isOrganizer,
}: {
  hackathon: Hackathon
  onRegisterClick: () => void
  onUnregisterClick: () => void
  isOrganizer: boolean
}) {
  const { data: organizers } = useQuery({
    queryKey: ["organizers", hackathon.id],
    queryFn: () => hackathonService.getOrganizers(hackathon.id),
  })

  const showTeamsSection =
    hackathon.status === "registration_open" || hackathon.status === "in_progress"

  const isRegistered = hackathon.userRole === "participant"
  const isJudge = hackathon.userRole === "judge"
  const isRegistrationOpen = hackathon.status === "registration_open"
  const isFull =
    hackathon.maxParticipants != null &&
    (hackathon.participantCount ?? 0) >= hackathon.maxParticipants

  const showRegisterButton = isRegistrationOpen && !isRegistered

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        {hackathon.bannerUrl && (
          <img
            src={hackathon.bannerUrl}
            alt={hackathon.name}
            className="w-full h-48 object-cover rounded-xl"
          />
        )}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {hackathon.logoUrl && (
                <img
                  src={hackathon.logoUrl}
                  alt=""
                  className="w-12 h-12 rounded-lg object-contain"
                />
              )}
              <h1 className="text-3xl font-bold">{hackathon.name}</h1>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                  hackathon.status
                )}`}
              >
                {formatStatus(hackathon.status)}
              </span>
              {hackathon.userRole === "participant" && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  Registered
                </span>
              )}
            </div>
            {organizers && organizers.length > 0 && (
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Organized by:</span>
                <div className="flex items-center gap-2">
                  {organizers.slice(0, 2).map((organizer, index) => (
                    <a
                      key={organizer.userId}
                      href={`mailto:${organizer.email}`}
                      className="hover:text-primary transition-colors"
                      title={organizer.email}
                    >
                      {organizer.displayName || `${organizer.firstName} ${organizer.lastName}`}
                      {index < Math.min(organizers.length, 2) - 1 && ","}
                    </a>
                  ))}
                  {organizers.length > 2 && (
                    <span className="text-muted-foreground">
                      +{organizers.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {showRegisterButton && (
                <Button onClick={onRegisterClick} disabled={isFull}>
                  {isFull ? "Registration Full" : "Register"}
                </Button>
              )}
              {isRegistered && (
                <Button variant="outline" onClick={onUnregisterClick}>
                  Unregister
                </Button>
              )}
              {(isJudge || isOrganizer) && (
                <Button asChild>
                  <Link to={`/hackathons/${hackathon.slug}/judge`}>
                    <Gavel className="h-4 w-4 mr-2" />
                    Judge Projects
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Archived Banner */}
      {hackathon.archived && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Archive className="h-5 w-5 text-amber-600" />
            <div>
              <h3 className="font-semibold text-amber-900">This hackathon is archived</h3>
              <p className="text-sm text-amber-700 mt-1">
                This event is archived and no longer accepting new registrations or submissions.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Info */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Starts</p>
                <p className="font-medium">{formatDate(hackathon.startsAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Ends</p>
                <p className="font-medium">{formatDate(hackathon.endsAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {hackathon.isVirtual ? (
                <Globe className="h-5 w-5 text-muted-foreground" />
              ) : (
                <MapPin className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">
                  {hackathon.isVirtual ? "Virtual" : hackathon.location || "TBA"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Participants</p>
                <p className="font-medium">
                  {hackathon.participantCount ?? 0}
                  {hackathon.maxParticipants && ` / ${hackathon.maxParticipants}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Full Schedule Card - visible to all registered users */}
      {hackathon.userRole && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <Link
              to={`/hackathons/${hackathon.slug}/schedule`}
              className="flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                    View Full Schedule
                  </p>
                  <p className="text-sm text-muted-foreground">
                    See all events and RSVP
                  </p>
                </div>
              </div>
              <ArrowLeft className="h-5 w-5 text-muted-foreground rotate-180 group-hover:translate-x-1 transition-transform" />
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Description */}
      {hackathon.description && (
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{hackathon.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Rules */}
      {hackathon.rules && (
        <Card>
          <CardHeader>
            <CardTitle>Rules & Guidelines</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{hackathon.rules}</p>
          </CardContent>
        </Card>
      )}

      {/* Team Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Team Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Min Team Size</p>
              <p className="text-lg font-medium">{hackathon.minTeamSize}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Max Team Size</p>
              <p className="text-lg font-medium">{hackathon.maxTeamSize}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Timezone</p>
              <p className="text-lg font-medium">{hackathon.timezone}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organizers Section - visible to all users */}
      <OrganizersSection
        hackathonId={hackathon.id}
        canEdit={isOrganizer}
        hackathon={hackathon}
      />

      {/* Participants Section - visible to authenticated users */}
      <ParticipantsSection
        hackathonId={hackathon.id}
        hackathon={hackathon}
        onRegisterClick={onRegisterClick}
      />

      {/* Judging Criteria Section - visible to organizers only */}
      {isOrganizer && <JudgingCriteriaSection hackathonId={hackathon.id} />}

      {/* Judges Section - visible to organizers only */}
      {isOrganizer && <JudgesSection hackathonId={hackathon.id} />}

      {/* Schedule Management Section - visible to organizers only */}
      {isOrganizer && <ScheduleManagementSection hackathonId={hackathon.id} />}

      {/* Leaderboard Section - visible to organizers only */}
      {isOrganizer && <LeaderboardSection hackathonId={hackathon.id} />}

      {/* Results Section - visible to all users */}
      {!isOrganizer && (
        <ResultsSection
          hackathonId={hackathon.id}
          hackathonStatus={hackathon.status}
        />
      )}

      {/* Teams Section */}
      {showTeamsSection && <TeamsSection hackathon={hackathon} />}

      {/* Projects Section */}
      <ProjectsSection hackathon={hackathon} />
    </div>
  )
}

function EditMode({
  hackathon,
  onSave,
  onCancel,
  isSaving,
  onArchiveClick,
}: {
  hackathon: Hackathon
  onSave: (data: UpdateFormData) => void
  onCancel: () => void
  isSaving: boolean
  onArchiveClick: (mode: "archive" | "unarchive") => void
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UpdateFormData>({
    resolver: zodResolver(updateHackathonSchema),
    defaultValues: {
      name: hackathon.name,
      description: hackathon.description || "",
      rules: hackathon.rules || "",
      status: hackathon.status,
      bannerUrl: hackathon.bannerUrl || "",
      logoUrl: hackathon.logoUrl || "",
      location: hackathon.location || "",
      isVirtual: hackathon.isVirtual,
      timezone: hackathon.timezone,
      startsAt: formatDateForInput(hackathon.startsAt),
      endsAt: formatDateForInput(hackathon.endsAt),
      registrationOpensAt: formatDateForInput(hackathon.registrationOpensAt),
      registrationClosesAt: formatDateForInput(hackathon.registrationClosesAt),
      maxTeamSize: hackathon.maxTeamSize,
      minTeamSize: hackathon.minTeamSize,
      maxParticipants: hackathon.maxParticipants?.toString() || "",
    },
  })

  const isVirtual = watch("isVirtual")

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-8">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm"
              {...register("status")}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rules">Rules & Guidelines</Label>
            <Textarea id="rules" {...register("rules")} />
          </div>
        </CardContent>
      </Card>

      {/* Date & Time */}
      <Card>
        <CardHeader>
          <CardTitle>Date & Time</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startsAt">Start Date & Time</Label>
              <Input id="startsAt" type="datetime-local" {...register("startsAt")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endsAt">End Date & Time</Label>
              <Input id="endsAt" type="datetime-local" {...register("endsAt")} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="registrationOpensAt">Registration Opens</Label>
              <Input
                id="registrationOpensAt"
                type="datetime-local"
                {...register("registrationOpensAt")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registrationClosesAt">Registration Closes</Label>
              <Input
                id="registrationClosesAt"
                type="datetime-local"
                {...register("registrationClosesAt")}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Input id="timezone" {...register("timezone")} />
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Virtual Event</Label>
              <p className="text-sm text-muted-foreground">
                Is this an online-only hackathon?
              </p>
            </div>
            <Switch
              checked={isVirtual}
              onCheckedChange={(checked) => setValue("isVirtual", checked)}
            />
          </div>
          {!isVirtual && (
            <div className="space-y-2">
              <Label htmlFor="location">Venue Address</Label>
              <Input id="location" {...register("location")} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Team Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="minTeamSize">Min Team Size</Label>
              <Input
                id="minTeamSize"
                type="number"
                min={1}
                max={10}
                {...register("minTeamSize", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxTeamSize">Max Team Size</Label>
              <Input
                id="maxTeamSize"
                type="number"
                min={1}
                max={20}
                {...register("maxTeamSize", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxParticipants">Max Participants</Label>
              <Input
                id="maxParticipants"
                type="number"
                min={1}
                placeholder="Unlimited"
                {...register("maxParticipants")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input id="logoUrl" type="url" {...register("logoUrl")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bannerUrl">Banner URL</Label>
              <Input id="bannerUrl" type="url" {...register("bannerUrl")} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Archive Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Archive Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <Archive className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex-1 space-y-3">
              <div>
                <p className="font-medium">
                  {hackathon.archived ? "This hackathon is archived" : "Archive this hackathon"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {hackathon.archived
                    ? "Archived hackathons are hidden from the dashboard but remain accessible via direct URL. You can unarchive it to restore visibility."
                    : "Archiving will hide this hackathon from the dashboard and prevent new registrations or submissions. All existing data will be preserved."}
                </p>
              </div>
              <Button
                type="button"
                variant={hackathon.archived ? "default" : "destructive"}
                onClick={() => onArchiveClick(hackathon.archived ? "unarchive" : "archive")}
              >
                <Archive className="h-4 w-4 mr-2" />
                {hackathon.archived ? "Unarchive Hackathon" : "Archive Hackathon"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

export function HackathonDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [isUnregisterModalOpen, setIsUnregisterModalOpen] = useState(false)
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false)
  const [archiveMode, setArchiveMode] = useState<"archive" | "unarchive">("archive")

  const {
    data: hackathon,
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: ["hackathon", slug],
    queryFn: () => hackathonService.getBySlug(slug!),
    enabled: !!slug,
  })

  const updateMutation = useMutation({
    mutationFn: (data: UpdateFormData) => {
      const toISOString = (dateStr: string | undefined): string | undefined => {
        if (!dateStr) return undefined
        return new Date(dateStr).toISOString()
      }

      return hackathonService.update(hackathon!.id, {
        ...data,
        status: data.status as HackathonStatus,
        bannerUrl: data.bannerUrl || undefined,
        logoUrl: data.logoUrl || undefined,
        location: data.location || undefined,
        registrationOpensAt: toISOString(data.registrationOpensAt),
        registrationClosesAt: toISOString(data.registrationClosesAt),
        startsAt: toISOString(data.startsAt),
        endsAt: toISOString(data.endsAt),
        maxParticipants: data.maxParticipants ? Number(data.maxParticipants) : undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hackathon", slug] })
      queryClient.invalidateQueries({ queryKey: ["hackathons"] })
      setIsEditing(false)
      setError(null)
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to update hackathon. Please try again.")
      }
    },
  })

  const canEdit = hackathon?.userRole === "organizer" || hackathon?.userRole === "admin"

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    )
  }

  if (fetchError || !hackathon) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="text-center py-12">
            <p className="text-destructive">
              {fetchError instanceof ApiError
                ? fetchError.message
                : "Failed to load hackathon."}
            </p>
            <Button className="mt-4" onClick={() => navigate("/")}>
              Go Back
            </Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  const breadcrumbOverrides = slug && hackathon ? { [slug]: hackathon.name } : undefined

  return (
    <AppLayout breadcrumbOverrides={breadcrumbOverrides}>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Actions */}
          {canEdit && !isEditing && (
            <div className="flex justify-end">
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm"
            >
              {error}
            </motion.div>
          )}

          {isEditing ? (
            <EditMode
              hackathon={hackathon}
              onSave={(data) => updateMutation.mutate(data)}
              onCancel={() => setIsEditing(false)}
              isSaving={updateMutation.isPending}
              onArchiveClick={(mode) => {
                setArchiveMode(mode)
                setIsArchiveModalOpen(true)
              }}
            />
          ) : (
            <ViewMode
              hackathon={hackathon}
              onRegisterClick={() => setIsRegisterModalOpen(true)}
              onUnregisterClick={() => setIsUnregisterModalOpen(true)}
              isOrganizer={canEdit}
            />
          )}
        </motion.div>
      </div>

      {/* Register Modal */}
      <RegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        hackathon={hackathon}
      />

      {/* Unregister Modal */}
      <UnregisterModal
        isOpen={isUnregisterModalOpen}
        onClose={() => setIsUnregisterModalOpen(false)}
        hackathon={hackathon}
      />

      {/* Archive Modal */}
      <ArchiveModal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        hackathon={hackathon}
        mode={archiveMode}
      />
    </AppLayout>
  )
}
