import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Save,
  ExternalLink,
  Github,
  Video,
  Presentation,
} from "lucide-react"
import { AppLayout } from "@/components/layouts/AppLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { hackathonService } from "@/services/hackathons"
import { projectService } from "@/services/projects"
import { judgingService } from "@/services/judging"
import { ApiError } from "@/services/api"
import type { JudgingCriteria, JudgeAssignment, SubmitScoresRequest } from "@/types"

const scoreSchema = z.object({
  scores: z.array(
    z.object({
      criteriaId: z.string(),
      criteriaName: z.string(),
      maxScore: z.number(),
      score: z.number().min(0),
      feedback: z.string().optional(),
    })
  ),
})

type ScoreFormData = z.infer<typeof scoreSchema>

export function ProjectScoringPage() {
  const { slug, projectId } = useParams<{ slug: string; projectId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Fetch hackathon details
  const {
    data: hackathon,
    isLoading: hackathonLoading,
    error: hackathonError,
  } = useQuery({
    queryKey: ["hackathon", slug],
    queryFn: () => hackathonService.getBySlug(slug!),
    enabled: !!slug,
  })

  // Fetch project details
  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
  } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectService.getProjectById(projectId!),
    enabled: !!projectId,
  })

  // Fetch criteria
  const {
    data: criteria,
    isLoading: criteriaLoading,
  } = useQuery({
    queryKey: ["judging-criteria", hackathon?.id],
    queryFn: () => judgingService.getCriteria(hackathon!.id),
    enabled: !!hackathon?.id,
  })

  // Fetch judge's assignments to find this project's assignment
  const {
    data: assignments,
    isLoading: assignmentsLoading,
  } = useQuery({
    queryKey: ["judge-assignments", hackathon?.id],
    queryFn: () => judgingService.getMyAssignments(hackathon!.id),
    enabled: !!hackathon?.id,
  })

  // Find the assignment for this project
  const assignment = assignments?.find((a) => a.projectId === projectId)

  const isLoading = hackathonLoading || projectLoading || criteriaLoading || assignmentsLoading
  const queryError = hackathonError || projectError

  // Check if user has judge role
  const isJudge = hackathon?.userRole === "judge"

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<ScoreFormData>({
    resolver: zodResolver(scoreSchema),
    defaultValues: {
      scores: [],
    },
  })

  const { fields } = useFieldArray({
    control,
    name: "scores",
  })

  // Initialize form with criteria and existing scores
  useEffect(() => {
    if (criteria && criteria.length > 0) {
      const formScores = criteria.map((c) => {
        // Find existing score for this criteria
        const existingScore = assignment?.scores?.find((s) => s.criteriaId === c.id)
        return {
          criteriaId: c.id,
          criteriaName: c.name,
          maxScore: c.maxScore,
          score: existingScore?.score ?? 0,
          feedback: existingScore?.feedback ?? "",
        }
      })
      reset({ scores: formScores })
    }
  }, [criteria, assignment, reset])

  const submitMutation = useMutation({
    mutationFn: (data: SubmitScoresRequest) => {
      if (!assignment) {
        throw new Error("No assignment found for this project")
      }
      return judgingService.submitScores(assignment.id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["judge-assignments", hackathon?.id] })
      setError(null)
      setSuccessMessage("Scores saved successfully!")
      // Navigate back to judge dashboard after a short delay
      setTimeout(() => {
        navigate(`/hackathons/${slug}/judge`)
      }, 1500)
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Failed to save scores. Please try again.")
      }
      setSuccessMessage(null)
    },
  })

  const onSubmit = (data: ScoreFormData) => {
    setError(null)
    setSuccessMessage(null)

    // Validate scores are within range
    for (const score of data.scores) {
      if (score.score < 0 || score.score > score.maxScore) {
        setError(`Score for "${score.criteriaName}" must be between 0 and ${score.maxScore}`)
        return
      }
    }

    const request: SubmitScoresRequest = {
      scores: data.scores.map((s) => ({
        criteriaId: s.criteriaId,
        score: s.score,
        feedback: s.feedback || undefined,
      })),
    }

    submitMutation.mutate(request)
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    )
  }

  if (queryError || !hackathon || !project) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="text-center py-12">
            <p className="text-destructive">
              {queryError instanceof ApiError ? queryError.message : "Failed to load project."}
            </p>
            <Button className="mt-4" onClick={() => navigate(`/hackathons/${slug}/judge`)}>
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

  if (!assignment) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">Assignment Not Found</h2>
            <p className="text-muted-foreground mb-4">
              This project is not assigned to you for judging.
            </p>
            <Button onClick={() => navigate(`/hackathons/${slug}/judge`)}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </AppLayout>
    )
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
            <Button variant="ghost" onClick={() => navigate(`/hackathons/${slug}/judge`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>

          {/* Project Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{project.name}</CardTitle>
              {project.tagline && (
                <CardDescription className="text-base">{project.tagline}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {project.description && (
                <div>
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{project.description}</p>
                </div>
              )}

              {project.technologies && project.technologies.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Technologies</h3>
                  <div className="flex flex-wrap gap-2">
                    {project.technologies.map((tech) => (
                      <span
                        key={tech}
                        className="px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Project Links */}
              <div className="flex flex-wrap gap-3 pt-2">
                {project.demoUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={project.demoUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Demo
                    </a>
                  </Button>
                )}
                {project.repositoryUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={project.repositoryUrl} target="_blank" rel="noopener noreferrer">
                      <Github className="h-4 w-4 mr-2" />
                      Repository
                    </a>
                  </Button>
                )}
                {project.videoUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={project.videoUrl} target="_blank" rel="noopener noreferrer">
                      <Video className="h-4 w-4 mr-2" />
                      Video
                    </a>
                  </Button>
                )}
                {project.presentationUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={project.presentationUrl} target="_blank" rel="noopener noreferrer">
                      <Presentation className="h-4 w-4 mr-2" />
                      Presentation
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Scoring Form */}
          <Card>
            <CardHeader>
              <CardTitle>Score Project</CardTitle>
              <CardDescription>
                Rate this project on each criteria below. All scores are required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm mb-6"
                >
                  {error}
                </motion.div>
              )}

              {/* Success message */}
              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-green-100 text-green-700 text-sm mb-6 flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {successMessage}
                </motion.div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {fields.map((field, index) => {
                  const criteriaItem = criteria?.find((c) => c.id === field.criteriaId)
                  const currentScore = watch(`scores.${index}.score`)

                  return (
                    <div key={field.id} className="p-4 border rounded-lg space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-medium">{field.criteriaName}</h4>
                          {criteriaItem?.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {criteriaItem.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-semibold">
                            {currentScore || 0} / {field.maxScore}
                          </span>
                          {criteriaItem?.weight && criteriaItem.weight !== 1 && (
                            <p className="text-xs text-muted-foreground">
                              Weight: {criteriaItem.weight}x
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`score-${field.criteriaId}`}>
                          Score (0-{field.maxScore}) *
                        </Label>
                        <Input
                          id={`score-${field.criteriaId}`}
                          type="number"
                          min={0}
                          max={field.maxScore}
                          step={1}
                          {...register(`scores.${index}.score`, { valueAsNumber: true })}
                        />
                        {errors.scores?.[index]?.score && (
                          <p className="text-sm text-destructive">
                            {errors.scores[index]?.score?.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`feedback-${field.criteriaId}`}>
                          Feedback (optional)
                        </Label>
                        <Textarea
                          id={`feedback-${field.criteriaId}`}
                          placeholder="Add any comments or feedback for this criteria..."
                          rows={2}
                          {...register(`scores.${index}.feedback`)}
                        />
                      </div>
                    </div>
                  )
                })}

                {fields.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      No judging criteria have been defined for this hackathon yet.
                    </p>
                  </div>
                )}

                {/* Actions */}
                {fields.length > 0 && (
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate(`/hackathons/${slug}/judge`)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitMutation.isPending}>
                      {submitMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Scores
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  )
}
