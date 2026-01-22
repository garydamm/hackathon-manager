import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { teamService } from "@/services/teams"
import { ApiError } from "@/services/api"

const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required").max(100, "Team name is too long"),
  description: z.string().optional(),
  isOpen: z.boolean(),
})

type CreateTeamFormData = z.infer<typeof createTeamSchema>

interface CreateTeamModalProps {
  isOpen: boolean
  onClose: () => void
  hackathonId: string
  hackathonSlug: string
}

export function CreateTeamModal({
  isOpen,
  onClose,
  hackathonId,
  hackathonSlug,
}: CreateTeamModalProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateTeamFormData>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: "",
      description: "",
      isOpen: true,
    },
  })

  const isOpenForJoining = watch("isOpen")

  const createMutation = useMutation({
    mutationFn: (data: CreateTeamFormData) =>
      teamService.createTeam({
        hackathonId,
        name: data.name,
        description: data.description || undefined,
        isOpen: data.isOpen,
      }),
    onSuccess: (team) => {
      queryClient.invalidateQueries({ queryKey: ["teams", hackathonId] })
      queryClient.invalidateQueries({ queryKey: ["myTeam", hackathonId] })
      reset()
      setError(null)
      onClose()
      navigate(`/hackathons/${hackathonSlug}/teams/${team.id}`)
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to create team. Please try again.")
      }
    },
  })

  const onSubmit = (data: CreateTeamFormData) => {
    setError(null)
    createMutation.mutate(data)
  }

  const handleClose = () => {
    reset()
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
              className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Create Team</h2>
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
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="team-name">Team Name *</Label>
                  <Input
                    id="team-name"
                    placeholder="Enter team name"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="team-description">Description</Label>
                  <Textarea
                    id="team-description"
                    placeholder="Describe your team, what you're looking for in teammates..."
                    {...register("description")}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="space-y-0.5">
                    <Label>Open for Joining</Label>
                    <p className="text-sm text-muted-foreground">
                      {isOpenForJoining
                        ? "Anyone can browse and join your team"
                        : "Only people with invite code can join"}
                    </p>
                  </div>
                  <Switch
                    checked={isOpenForJoining}
                    onCheckedChange={(checked) => setValue("isOpen", checked)}
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Team"
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
