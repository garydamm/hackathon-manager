import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, X, Ticket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { teamService } from "@/services/teams"
import { ApiError } from "@/services/api"

const joinTeamSchema = z.object({
  inviteCode: z.string().min(1, "Invite code is required"),
})

type JoinTeamFormData = z.infer<typeof joinTeamSchema>

interface JoinTeamModalProps {
  isOpen: boolean
  onClose: () => void
  hackathonId: string
  hackathonSlug: string
}

export function JoinTeamModal({
  isOpen,
  onClose,
  hackathonId,
  hackathonSlug,
}: JoinTeamModalProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<JoinTeamFormData>({
    resolver: zodResolver(joinTeamSchema),
    defaultValues: {
      inviteCode: "",
    },
  })

  const joinMutation = useMutation({
    mutationFn: (data: JoinTeamFormData) =>
      teamService.joinTeamByCode(data.inviteCode),
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
        setError("Failed to join team. Please try again.")
      }
    },
  })

  const onSubmit = (data: JoinTeamFormData) => {
    setError(null)
    joinMutation.mutate(data)
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
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Ticket className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">Join with Invite Code</h2>
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

              <p className="text-muted-foreground">
                Enter the invite code shared by your team leader to join their team.
              </p>

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
                  <Label htmlFor="invite-code">Invite Code *</Label>
                  <Input
                    id="invite-code"
                    placeholder="Enter invite code"
                    {...register("inviteCode")}
                  />
                  {errors.inviteCode && (
                    <p className="text-sm text-destructive">{errors.inviteCode.message}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={joinMutation.isPending}>
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
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
