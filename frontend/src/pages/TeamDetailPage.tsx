import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { ArrowLeft, Loader2, Users, Crown } from "lucide-react"
import { AppLayout } from "@/components/layouts/AppLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { hackathonService } from "@/services/hackathons"
import { teamService } from "@/services/teams"
import { ApiError } from "@/services/api"

export function TeamDetailPage() {
  const { slug, teamId } = useParams<{ slug: string; teamId: string }>()

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
  } = useQuery({
    queryKey: ["team", teamId],
    queryFn: () => teamService.getTeam(teamId!),
    enabled: !!teamId,
  })

  const isLoading = isLoadingHackathon || isLoadingTeam
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
        </motion.div>
      </div>
    </AppLayout>
  )
}
