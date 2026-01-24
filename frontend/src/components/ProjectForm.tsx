import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, X, FolderPlus, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Project } from "@/types"

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100, "Project name is too long"),
  tagline: z.string().max(200, "Tagline is too long").optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  demoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  videoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  repositoryUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  presentationUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
})

type ProjectFormData = z.infer<typeof projectSchema>

interface ProjectFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: ProjectFormData) => Promise<void>
  project?: Project | null
  isLoading?: boolean
}

export function ProjectForm({
  isOpen,
  onClose,
  onSubmit,
  project,
  isLoading = false,
}: ProjectFormProps) {
  const [error, setError] = useState<string | null>(null)
  const isEditMode = !!project

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name ?? "",
      tagline: project?.tagline ?? "",
      description: project?.description ?? "",
      demoUrl: project?.demoUrl ?? "",
      videoUrl: project?.videoUrl ?? "",
      repositoryUrl: project?.repositoryUrl ?? "",
      presentationUrl: project?.presentationUrl ?? "",
    },
  })

  // Reset form values when project changes or modal opens
  useEffect(() => {
    if (isOpen) {
      reset({
        name: project?.name ?? "",
        tagline: project?.tagline ?? "",
        description: project?.description ?? "",
        demoUrl: project?.demoUrl ?? "",
        videoUrl: project?.videoUrl ?? "",
        repositoryUrl: project?.repositoryUrl ?? "",
        presentationUrl: project?.presentationUrl ?? "",
      })
      setError(null)
    }
  }, [isOpen, project, reset])

  const handleFormSubmit = async (data: ProjectFormData) => {
    setError(null)
    try {
      await onSubmit(data)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Failed to save project. Please try again.")
      }
    }
  }

  const handleClose = () => {
    reset({
      name: project?.name ?? "",
      tagline: project?.tagline ?? "",
      description: project?.description ?? "",
      demoUrl: project?.demoUrl ?? "",
      videoUrl: project?.videoUrl ?? "",
      repositoryUrl: project?.repositoryUrl ?? "",
      presentationUrl: project?.presentationUrl ?? "",
    })
    setError(null)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="bg-background rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    {isEditMode ? (
                      <Pencil className="h-5 w-5 text-primary" />
                    ) : (
                      <FolderPlus className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <h2 className="text-xl font-semibold">
                    {isEditMode ? "Edit Project" : "Create Project"}
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
                >
                  {error}
                </motion.div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="project-name">Project Name *</Label>
                  <Input
                    id="project-name"
                    placeholder="Enter project name"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project-tagline">Tagline</Label>
                  <Input
                    id="project-tagline"
                    placeholder="A short description of your project"
                    {...register("tagline")}
                  />
                  {errors.tagline && (
                    <p className="text-sm text-destructive">{errors.tagline.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project-description">Description</Label>
                  <Textarea
                    id="project-description"
                    placeholder="Describe your project in detail..."
                    rows={4}
                    {...register("description")}
                  />
                  {errors.description && (
                    <p className="text-sm text-destructive">{errors.description.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project-demo-url">Demo URL</Label>
                  <Input
                    id="project-demo-url"
                    type="url"
                    placeholder="https://your-demo.com"
                    {...register("demoUrl")}
                  />
                  {errors.demoUrl && (
                    <p className="text-sm text-destructive">{errors.demoUrl.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project-video-url">Video URL</Label>
                  <Input
                    id="project-video-url"
                    type="url"
                    placeholder="https://youtube.com/watch?v=..."
                    {...register("videoUrl")}
                  />
                  {errors.videoUrl && (
                    <p className="text-sm text-destructive">{errors.videoUrl.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project-repository-url">Repository URL</Label>
                  <Input
                    id="project-repository-url"
                    type="url"
                    placeholder="https://github.com/..."
                    {...register("repositoryUrl")}
                  />
                  {errors.repositoryUrl && (
                    <p className="text-sm text-destructive">{errors.repositoryUrl.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project-presentation-url">Presentation URL</Label>
                  <Input
                    id="project-presentation-url"
                    type="url"
                    placeholder="https://docs.google.com/presentation/..."
                    {...register("presentationUrl")}
                  />
                  {errors.presentationUrl && (
                    <p className="text-sm text-destructive">{errors.presentationUrl.message}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      isEditMode ? "Save Changes" : "Create Project"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
