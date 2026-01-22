import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, X, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { teamService } from "@/services/teams"
import { ApiError } from "@/services/api"
import type { Team } from "@/types"

const editTeamSchema = z.object({
  name: z.string().min(1, "Team name is required").max(100, "Team name is too long"),
  description: z.string().optional(),
  isOpen: z.boolean(),
})

type EditTeamFormData = z.infer<typeof editTeamSchema>

interface EditTeamModalProps {
  isOpen: boolean
  onClose: () => void
  team: Team
  hackathonId: string
}

export function EditTeamModal({
  isOpen,
  onClose,
  team,
  hackathonId,
}: EditTeamModalProps) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<EditTeamFormData>({
    resolver: zodResolver(editTeamSchema),
    defaultValues: {
      name: team.name,
      description: team.description ?? "",
      isOpen: team.isOpen,
    },
  })

  // Reset form values when team changes or modal opens
  useEffect(() => {
    if (isOpen) {
      reset({
        name: team.name,
        description: team.description ?? "",
        isOpen: team.isOpen,
      })
      setError(null)
    }
  }, [isOpen, team, reset])

  const isOpenForJoining = watch("isOpen")

  const updateMutation = useMutation({
    mutationFn: (data: EditTeamFormData) =>
      teamService.updateTeam(team.id, {
        name: data.name,
        description: data.description || undefined,
        isOpen: data.isOpen,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", team.id] })
      queryClient.invalidateQueries({ queryKey: ["teams", hackathonId] })
      queryClient.invalidateQueries({ queryKey: ["myTeam", hackathonId] })
      setError(null)
      onClose()
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to update team. Please try again.")
      }
    },
  })

  const onSubmit = (data: EditTeamFormData) => {
    setError(null)
    updateMutation.mutate(data)
  }

  const handleClose = () => {
    reset({
      name: team.name,
      description: team.description ?? "",
      isOpen: team.isOpen,
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
              className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Pencil className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">Edit Team</h2>
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
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-team-name">Team Name *</Label>
                  <Input
                    id="edit-team-name"
                    placeholder="Enter team name"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-team-description">Description</Label>
                  <Textarea
                    id="edit-team-description"
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
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
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
