import { useQuery } from "@tanstack/react-query"
import { Loader2, Mail, User } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { hackathonService } from "@/services/hackathons"

interface OrganizersSectionProps {
  hackathonId: string
}

export function OrganizersSection({ hackathonId }: OrganizersSectionProps) {
  const { data: organizers, isLoading } = useQuery({
    queryKey: ["organizers", hackathonId],
    queryFn: () => hackathonService.getOrganizers(hackathonId),
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Organizers
        </CardTitle>
      </CardHeader>
      <CardContent>
        {organizersList.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No organizers found.
          </p>
        ) : (
          <div className="space-y-3">
            {organizersList.map((organizer) => (
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
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
