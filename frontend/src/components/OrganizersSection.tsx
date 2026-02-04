import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, Mail, User, UserPlus, X, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { hackathonService } from "@/services/hackathons"
import { useAuth } from "@/contexts/AuthContext"
import { ApiError } from "@/services/api"
import type { Hackathon } from "@/types"

interface OrganizersSectionProps {
  hackathonId: string
  canEdit?: boolean
  hackathon?: Hackathon
}

export function OrganizersSection({ hackathonId, canEdit = false, hackathon }: OrganizersSectionProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  const { data: organizers, isLoading } = useQuery({
    queryKey: ["organizers", hackathonId],
    queryFn: () => hackathonService.getOrganizers(hackathonId),
  })

  const { data: participants, isLoading: participantsLoading } = useQuery({
    queryKey: ["participants", hackathonId],
    queryFn: () => hackathonService.getParticipants(hackathonId),
    enabled: canEdit,
  })

  const promoteMutation = useMutation({
    mutationFn: (userId: string) => hackathonService.promoteToOrganizer(hackathonId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizers", hackathonId] })
      queryClient.invalidateQueries({ queryKey: ["participants", hackathonId] })
      setSelectedParticipantId("")
      setError(null)
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to promote participant. Please try again.")
      }
    },
  })

  const demoteMutation = useMutation({
    mutationFn: (userId: string) => hackathonService.demoteOrganizer(hackathonId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizers", hackathonId] })
      queryClient.invalidateQueries({ queryKey: ["participants", hackathonId] })
      setError(null)
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to remove organizer. Please try again.")
      }
    },
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Organizers
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

  const organizersList = organizers ?? []
  const organizerIds = new Set(organizersList.map(org => org.userId))
  const availableParticipants = (participants ?? []).filter(p => !organizerIds.has(p.id))

  const handlePromote = () => {
    if (selectedParticipantId) {
      promoteMutation.mutate(selectedParticipantId)
    }
  }

  const handleDemote = (userId: string) => {
    demoteMutation.mutate(userId)
  }

  const isCreator = (userId: string) => hackathon?.createdBy?.id === userId
  const isCurrentUser = (userId: string) => user?.id === userId

  const canRemoveOrganizer = (userId: string) => {
    return !isCreator(userId) && !isCurrentUser(userId)
  }

  const getRemoveButtonTooltip = (userId: string) => {
    if (isCreator(userId)) return "Cannot remove creator"
    if (isCurrentUser(userId)) return "Cannot remove yourself"
    return ""
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Organizers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {organizersList.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No organizers found.
          </p>
        ) : (
          <div className="space-y-3">
            {organizersList.map((organizer) => {
              const canRemove = canRemoveOrganizer(organizer.userId)
              const tooltip = getRemoveButtonTooltip(organizer.userId)

              return (
                <div
                  key={organizer.userId}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border"
                >
                  {organizer.avatarUrl ? (
                    <img
                      src={organizer.avatarUrl}
                      alt={organizer.displayName || `${organizer.firstName} ${organizer.lastName}`}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {organizer.displayName || `${organizer.firstName} ${organizer.lastName}`}
                    </p>
                    <a
                      href={`mailto:${organizer.email}`}
                      className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 truncate"
                    >
                      <Mail className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{organizer.email}</span>
                    </a>
                  </div>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!canRemove || demoteMutation.isPending}
                      onClick={() => handleDemote(organizer.userId)}
                      title={tooltip}
                      className="flex-shrink-0"
                    >
                      {demoteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {canEdit && (
          <div className="pt-4 border-t space-y-3">
            <h4 className="font-medium text-sm">Manage Organizers</h4>

            {participantsLoading ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : availableParticipants.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No participants available to promote.
              </p>
            ) : (
              <div className="flex gap-2">
                <select
                  value={selectedParticipantId}
                  onChange={(e) => setSelectedParticipantId(e.target.value)}
                  className="flex-1 h-10 rounded-lg border border-input bg-background px-3 text-sm"
                  aria-label="Select participant to promote"
                >
                  <option value="">Select a participant...</option>
                  {availableParticipants.map((participant) => (
                    <option key={participant.id} value={participant.id}>
                      {participant.name} ({participant.email})
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  onClick={handlePromote}
                  disabled={!selectedParticipantId || promoteMutation.isPending}
                >
                  {promoteMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Promoting...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Promote
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
