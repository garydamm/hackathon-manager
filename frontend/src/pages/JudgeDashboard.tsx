import { useParams, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import {
  Loader2,
  Gavel,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react"
import { AppLayout } from "@/components/layouts/AppLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { hackathonService } from "@/services/hackathons"
import { judgingService } from "@/services/judging"
import type { JudgeAssignment } from "@/types"
import { ApiError } from "@/services/api"

type ScoringStatus = "not_started" | "in_progress" | "completed"

function getScoringStatus(assignment: JudgeAssignment, _totalCriteria: number): ScoringStatus {
  if (assignment.completedAt) {
    return "completed"
  }
  const scoredCount = assignment.scores?.length ?? 0
  if (scoredCount === 0) {
    return "not_started"
  }
  return "in_progress"
}

function getStatusBadge(status: ScoringStatus) {
  switch (status) {
    case "completed":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </span>
      )
    case "in_progress":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
          <Clock className="h-3 w-3" />
          In Progress
        </span>
      )
    case "not_started":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          <AlertCircle className="h-3 w-3" />
          Not Started
        </span>
      )
  }
}

function ProjectAssignmentCard({
  assignment,
  totalCriteria,
  hackathonSlug,
}: {
  assignment: JudgeAssignment
  totalCriteria: number
  hackathonSlug: string
}) {
  const navigate = useNavigate()
  const status = getScoringStatus(assignment, totalCriteria)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="cursor-pointer"
      onClick={() => navigate(`/hackathons/${hackathonSlug}/judge/${assignment.projectId}`)}
    >
      <Card className="h-full hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">{assignment.projectName}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {assignment.scores?.length ?? 0} of {totalCriteria} criteria scored
              </p>
            </div>
            <div className="flex-shrink-0">
              {getStatusBadge(status)}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function JudgeDashboardPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const {
    data: hackathon,
    isLoading: hackathonLoading,
    error: hackathonError,
  } = useQuery({
    queryKey: ["hackathon", slug],
    queryFn: () => hackathonService.getBySlug(slug!),
    enabled: !!slug,
  })

  const {
    data: assignments,
    isLoading: assignmentsLoading,
    error: assignmentsError,
  } = useQuery({
    queryKey: ["judge-assignments", hackathon?.id],
    queryFn: () => judgingService.getMyAssignments(hackathon!.id),
    enabled: !!hackathon?.id,
  })

  const {
    data: criteria,
    isLoading: criteriaLoading,
  } = useQuery({
    queryKey: ["judging-criteria", hackathon?.id],
    queryFn: () => judgingService.getCriteria(hackathon!.id),
    enabled: !!hackathon?.id,
  })

  const isLoading = hackathonLoading || assignmentsLoading || criteriaLoading
  const error = hackathonError || assignmentsError

  // Check if user has judge role or is organizer (organizers have judging capabilities)
  const isJudge = hackathon?.userRole === "judge" || hackathon?.userRole === "organizer"

  // Calculate progress
  const totalProjects = assignments?.length ?? 0
  const completedProjects = assignments?.filter((a) => a.completedAt).length ?? 0
  const progressPercent = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0

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
              {error instanceof ApiError ? error.message : "Failed to load hackathon."}
            </p>
            <Button className="mt-4" onClick={() => navigate("/")}>
              Go Back
            </Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!isJudge) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You don't have judge permissions for this hackathon.
            </p>
            <Button onClick={() => navigate(`/hackathons/${slug}`)}>
              Back to Hackathon
            </Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  const totalCriteria = criteria?.length ?? 0
  const breadcrumbOverrides = slug && hackathon ? { [slug]: hackathon.name } : undefined

  return (
    <AppLayout breadcrumbOverrides={breadcrumbOverrides}>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Gavel className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Judge Dashboard</h1>
            </div>
            <p className="text-muted-foreground">{hackathon.name}</p>
          </div>

          {/* Progress Card */}
          <Card>
            <CardHeader>
              <CardTitle>Your Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium">
                    {completedProjects} of {totalProjects} projects scored
                  </span>
                  <span className="text-lg font-bold text-primary">{progressPercent}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
                {completedProjects === totalProjects && totalProjects > 0 && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">All projects scored!</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Projects List */}
          <Card>
            <CardHeader>
              <CardTitle>Projects to Score</CardTitle>
            </CardHeader>
            <CardContent>
              {totalProjects === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No projects have been submitted yet.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {assignments!.map((assignment) => (
                    <ProjectAssignmentCard
                      key={assignment.id}
                      assignment={assignment}
                      totalCriteria={totalCriteria}
                      hackathonSlug={slug!}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  )
}
