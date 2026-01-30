import { useQuery } from "@tanstack/react-query"
import { Loader2, Users, Mail, Calendar, Shield } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { hackathonService } from "@/services/hackathons"

interface ParticipantsSectionProps {
  hackathonId: string
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function ParticipantsSection({ hackathonId }: ParticipantsSectionProps) {
  const { data: participants, isLoading } = useQuery({
    queryKey: ["participants", hackathonId],
    queryFn: () => hackathonService.getParticipants(hackathonId),
  })

  const participantCount = participants?.length ?? 0

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Participants
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
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Participants ({participantCount})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {participantCount === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No participants registered yet.
          </p>
        ) : (
          <div className="space-y-3">
            {participants!.map((participant, index) => (
              <div
                key={`${participant.email}-${index}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{participant.name}</p>
                    {participant.isTeamLeader && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary">
                        <Shield className="h-3 w-3" />
                        Team Leader
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <a
                      href={`mailto:${participant.email}`}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      <Mail className="h-3 w-3" />
                      {participant.email}
                    </a>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Registered {formatDate(participant.registeredAt)}
                    </span>
                  </div>
                </div>
                {participant.teamName && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Team: </span>
                    <span className="font-medium">{participant.teamName}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
