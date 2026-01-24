import { useState } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Loader2, Users, Crown, UserPlus, LogOut, X, Pencil, Copy, RefreshCw, Check, Ticket, FolderKanban, FolderPlus, Send, Undo2 } from "lucide-react"
import { AppLayout } from "@/components/layouts/AppLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { hackathonService } from "@/services/hackathons"
import { teamService } from "@/services/teams"
import { projectService } from "@/services/projects"
import { ApiError } from "@/services/api"
import { useAuth } from "@/contexts/AuthContext"
import { EditTeamModal } from "@/components/EditTeamModal"
import { ProjectCard } from "@/components/ProjectCard"
import { ProjectForm } from "@/components/ProjectForm"
import type { Project, CreateProjectRequest, UpdateProjectRequest } from "@/types"

export function TeamDetailPage() {
  const { slug, teamId } = useParams<{ slug: string; teamId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [showJoinConfirm, setShowJoinConfirm] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [leaveError, setLeaveError] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [showUnsubmitConfirm, setShowUnsubmitConfirm] = useState(false)

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
    data: team,
    isLoading: isLoadingTeam,
    error: teamError,
    refetch: refetchTeam,
  } = useQuery({
    queryKey: ["team", teamId],
    queryFn: () => teamService.getTeam(teamId!),
    enabled: !!teamId,
  })

  // Fetch user's team in this hackathon
  const { data: myTeam, isLoading: isLoadingMyTeam } = useQuery({
    queryKey: ["myTeam", hackathon?.id],
    queryFn: () => teamService.getMyTeam(hackathon!.id),
    enabled: !!hackathon?.id,
  })

  // Fetch team's project
  const {
    data: project,
    isLoading: isLoadingProject,
    refetch: refetchProject,
  } = useQuery({
    queryKey: ["project", "team", teamId],
    queryFn: () => projectService.getProjectByTeam(teamId!),
    enabled: !!teamId,
  })

  const joinMutation = useMutation({
    mutationFn: () => teamService.joinTeam(teamId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", teamId] })
      queryClient.invalidateQueries({ queryKey: ["myTeam", hackathon?.id] })
      queryClient.invalidateQueries({ queryKey: ["teams", hackathon?.id] })
      setShowJoinConfirm(false)
      setJoinError(null)
      // Refetch team to show member view
      refetchTeam()
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setJoinError(err.message)
      } else {
        setJoinError("Failed to join team. Please try again.")
      }
    },
  })

  const leaveMutation = useMutation({
    mutationFn: () => teamService.leaveTeam(teamId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", teamId] })
      queryClient.invalidateQueries({ queryKey: ["myTeam", hackathon?.id] })
      queryClient.invalidateQueries({ queryKey: ["teams", hackathon?.id] })
      setShowLeaveConfirm(false)
      setLeaveError(null)
      // Navigate to hackathon detail page
      navigate(`/hackathons/${slug}`)
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setLeaveError(err.message)
      } else {
        setLeaveError("Failed to leave team. Please try again.")
      }
    },
  })

  const regenerateMutation = useMutation({
    mutationFn: () => teamService.regenerateInviteCode(teamId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", teamId] })
      setShowRegenerateConfirm(false)
      refetchTeam()
    },
  })

  const createProjectMutation = useMutation({
    mutationFn: (request: CreateProjectRequest) => projectService.createProject(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", "team", teamId] })
      setShowProjectForm(false)
      refetchProject()
    },
  })

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateProjectRequest }) =>
      projectService.updateProject(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", "team", teamId] })
      setShowProjectForm(false)
      setEditingProject(null)
      refetchProject()
    },
  })

  const submitProjectMutation = useMutation({
    mutationFn: (id: string) => projectService.submitProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", "team", teamId] })
      setShowSubmitConfirm(false)
      refetchProject()
    },
  })

  const unsubmitProjectMutation = useMutation({
    mutationFn: (id: string) => projectService.unsubmitProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", "team", teamId] })
      setShowUnsubmitConfirm(false)
      refetchProject()
    },
  })

  const isLoading = isLoadingHackathon || isLoadingTeam || isLoadingMyTeam || isLoadingProject
  const error = hackathonError || teamError

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    )
  }

  if (error || !hackathon || !team) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="text-center py-12">
            <p className="text-destructive">
              {error instanceof ApiError
                ? error.message
                : "Failed to load team."}
            </p>
            <Link to={slug ? `/hackathons/${slug}/teams` : "/"}>
              <Button className="mt-4">Go Back</Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  const members = team.members ?? []
  const isTeamFull = team.memberCount >= hackathon.maxTeamSize
  const isRegistered = hackathon.userRole === "participant"
  const hasTeam = !!myTeam
  const isOnThisTeam = myTeam?.id === team.id

  // Find if current user is the leader of this team
  const currentUserMember = members.find((m) => m.user.id === user?.id)
  const isLeader = isOnThisTeam && currentUserMember?.isLeader === true
  const hasOtherMembers = members.length > 1

  // Show join button if: team is open, user is registered, user has no team
  const canJoin = team.isOpen && isRegistered && !hasTeam
  // Show leave button if user is on this team
  const canLeave = isOnThisTeam

  const handleJoinClick = () => {
    setJoinError(null)
    setShowJoinConfirm(true)
  }

  const handleConfirmJoin = () => {
    joinMutation.mutate()
  }

  const handleLeaveClick = () => {
    setLeaveError(null)
    setShowLeaveConfirm(true)
  }

  const handleConfirmLeave = () => {
    leaveMutation.mutate()
  }

  const handleCopyInviteCode = async () => {
    if (team?.inviteCode) {
      await navigator.clipboard.writeText(team.inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleRegenerateClick = () => {
    setShowRegenerateConfirm(true)
  }

  const handleConfirmRegenerate = () => {
    regenerateMutation.mutate()
  }

  const handleCreateProject = () => {
    setEditingProject(null)
    setShowProjectForm(true)
  }

  const handleEditProject = () => {
    if (project) {
      setEditingProject(project)
      setShowProjectForm(true)
    }
  }

  const handleProjectFormSubmit = async (data: {
    name: string
    tagline?: string
    description?: string
    demoUrl?: string
    videoUrl?: string
    repositoryUrl?: string
    presentationUrl?: string
  }) => {
    // Filter out empty strings
    const cleanedData = {
      name: data.name,
      tagline: data.tagline || undefined,
      description: data.description || undefined,
      demoUrl: data.demoUrl || undefined,
      videoUrl: data.videoUrl || undefined,
      repositoryUrl: data.repositoryUrl || undefined,
      presentationUrl: data.presentationUrl || undefined,
    }

    if (editingProject) {
      await updateProjectMutation.mutateAsync({
        id: editingProject.id,
        request: cleanedData,
      })
    } else {
      await createProjectMutation.mutateAsync({
        teamId: teamId!,
        ...cleanedData,
      })
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Link to={`/hackathons/${slug}/teams`}>
              <Button variant="ghost">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Teams
              </Button>
            </Link>
          </div>

          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold">{team.name}</h1>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    team.isOpen
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {team.isOpen ? "Open to join" : "Closed"}
                </span>
              </div>
              {/* Join Team Button */}
              {canJoin && (
                <Button
                  onClick={handleJoinClick}
                  disabled={isTeamFull}
                >
                  {isTeamFull ? (
                    "Team Full"
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Join Team
                    </>
                  )}
                </Button>
              )}
              {/* Edit Team Button (leader only) */}
              {isLeader && (
                <Button
                  variant="outline"
                  onClick={() => setShowEditModal(true)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Team
                </Button>
              )}
              {/* Leave Team Button */}
              {canLeave && (
                <Button
                  variant="outline"
                  onClick={handleLeaveClick}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Leave Team
                </Button>
              )}
            </div>
          </div>

          {/* Hackathon Link */}
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Participating in</p>
              <Link
                to={`/hackathons/${slug}`}
                className="text-lg font-medium text-primary hover:underline"
              >
                {hackathon.name}
              </Link>
            </CardContent>
          </Card>

          {/* Description */}
          {team.description && (
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{team.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Members */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Members
                </span>
                <span className="text-sm font-normal text-muted-foreground">
                  {team.memberCount} of {hackathon.maxTeamSize} members
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <p className="text-muted-foreground">No members yet.</p>
              ) : (
                <ul className="space-y-3">
                  {members.map((member) => (
                    <li
                      key={member.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                    >
                      {member.user.avatarUrl ? (
                        <img
                          src={member.user.avatarUrl}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {member.user.firstName?.[0] ?? member.user.email[0]}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium">
                          {member.user.displayName ||
                            `${member.user.firstName} ${member.user.lastName}`}
                        </p>
                        {member.user.bio && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {member.user.bio}
                          </p>
                        )}
                      </div>
                      {member.isLeader && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border border-primary/20 text-primary">
                          <Crown className="h-3 w-3" />
                          Leader
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Invite Code Section (visible for team members) */}
          {isOnThisTeam && team.inviteCode && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  Invite Code
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Share this code with others to invite them to your team.
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-4 py-3 bg-muted rounded-lg font-mono text-lg tracking-wider">
                    {team.inviteCode}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyInviteCode}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {copied && (
                  <p className="text-sm text-green-600">Copied to clipboard!</p>
                )}
                {/* Regenerate button (leader only) */}
                {isLeader && (
                  <div className="pt-2 border-t">
                    <Button
                      variant="outline"
                      onClick={handleRegenerateClick}
                      disabled={regenerateMutation.isPending}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${regenerateMutation.isPending ? "animate-spin" : ""}`} />
                      Regenerate Code
                    </Button>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Regenerating will invalidate the current code.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Project Section (visible for team members) */}
          {isOnThisTeam && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FolderKanban className="h-5 w-5" />
                    Project
                  </span>
                  <div className="flex items-center gap-2">
                    {project && project.status === "draft" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleEditProject}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit Project
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setShowSubmitConfirm(true)}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Submit Project
                        </Button>
                      </>
                    )}
                    {project && project.status === "submitted" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowUnsubmitConfirm(true)}
                      >
                        <Undo2 className="h-4 w-4 mr-2" />
                        Unsubmit Project
                      </Button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {project ? (
                  <ProjectCard project={project} index={0} />
                ) : (
                  <div className="text-center py-8">
                    <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Your team hasn't created a project yet.
                    </p>
                    <Button onClick={handleCreateProject}>
                      <FolderPlus className="h-4 w-4 mr-2" />
                      Create Project
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>

      {/* Join Confirmation Dialog */}
      <AnimatePresence>
        {showJoinConfirm && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowJoinConfirm(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />

            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div
                className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <UserPlus className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold">Join Team</h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowJoinConfirm(false)}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <p className="text-muted-foreground">
                  Are you sure you want to join <strong>{team.name}</strong>?
                  Once you join, you won't be able to join another team in this hackathon.
                </p>

                {/* Error message */}
                {joinError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
                  >
                    {joinError}
                  </motion.div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowJoinConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmJoin}
                    disabled={joinMutation.isPending}
                  >
                    {joinMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      "Join Team"
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Leave Confirmation Dialog */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLeaveConfirm(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />

            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div
                className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                      <LogOut className="h-5 w-5 text-destructive" />
                    </div>
                    <h2 className="text-xl font-semibold">Leave Team</h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowLeaveConfirm(false)}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <p className="text-muted-foreground">
                  Are you sure you want to leave <strong>{team.name}</strong>?
                </p>

                {/* Leadership transfer warning */}
                {isLeader && hasOtherMembers && (
                  <div className="p-3 rounded-lg bg-amber-100 text-amber-800 text-sm">
                    As the team leader, your leadership will be automatically transferred to another team member.
                  </div>
                )}

                {/* Error message */}
                {leaveError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
                  >
                    {leaveError}
                  </motion.div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowLeaveConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleConfirmLeave}
                    disabled={leaveMutation.isPending}
                  >
                    {leaveMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Leaving...
                      </>
                    ) : (
                      "Leave Team"
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Team Modal */}
      {team && hackathon && (
        <EditTeamModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          team={team}
          hackathonId={hackathon.id}
        />
      )}

      {/* Regenerate Invite Code Confirmation Dialog */}
      <AnimatePresence>
        {showRegenerateConfirm && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRegenerateConfirm(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />

            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div
                className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                      <RefreshCw className="h-5 w-5 text-amber-600" />
                    </div>
                    <h2 className="text-xl font-semibold">Regenerate Invite Code</h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowRegenerateConfirm(false)}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <p className="text-muted-foreground">
                  Are you sure you want to regenerate the invite code? The current code will stop working immediately and anyone using it won't be able to join.
                </p>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowRegenerateConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmRegenerate}
                    disabled={regenerateMutation.isPending}
                  >
                    {regenerateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      "Regenerate Code"
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Project Form Modal */}
      <ProjectForm
        isOpen={showProjectForm}
        onClose={() => {
          setShowProjectForm(false)
          setEditingProject(null)
        }}
        onSubmit={handleProjectFormSubmit}
        project={editingProject}
        isLoading={createProjectMutation.isPending || updateProjectMutation.isPending}
      />

      {/* Submit Project Confirmation Dialog */}
      <AnimatePresence>
        {showSubmitConfirm && project && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSubmitConfirm(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />

            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div
                className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Send className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold">Submit Project</h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSubmitConfirm(false)}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <p className="text-muted-foreground">
                  Are you sure you want to submit <strong>{project.name}</strong>?
                  Once submitted, you won't be able to edit the project until you unsubmit it.
                </p>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowSubmitConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => submitProjectMutation.mutate(project.id)}
                    disabled={submitProjectMutation.isPending}
                  >
                    {submitProjectMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Project"
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Unsubmit Project Confirmation Dialog */}
      <AnimatePresence>
        {showUnsubmitConfirm && project && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUnsubmitConfirm(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />

            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div
                className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                      <Undo2 className="h-5 w-5 text-amber-600" />
                    </div>
                    <h2 className="text-xl font-semibold">Unsubmit Project</h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowUnsubmitConfirm(false)}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <p className="text-muted-foreground">
                  Are you sure you want to unsubmit <strong>{project.name}</strong>?
                  The project will return to draft status and you can make further edits before resubmitting.
                </p>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowUnsubmitConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => unsubmitProjectMutation.mutate(project.id)}
                    disabled={unsubmitProjectMutation.isPending}
                  >
                    {unsubmitProjectMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Unsubmitting...
                      </>
                    ) : (
                      "Unsubmit Project"
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AppLayout>
  )
}
