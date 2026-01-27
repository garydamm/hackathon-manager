import { useQuery } from "@tanstack/react-query"
import {
  Loader2,
  Trophy,
  Medal,
  Award,
  Star,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { judgingService } from "@/services/judging"
import { teamService } from "@/services/teams"
import type { HackathonStatus } from "@/types"

interface ResultsSectionProps {
  hackathonId: string
  hackathonStatus: HackathonStatus
}

export function ResultsSection({ hackathonId, hackathonStatus }: ResultsSectionProps) {
  const {
    data: leaderboard,
    isLoading: leaderboardLoading,
    error: leaderboardError,
  } = useQuery({
    queryKey: ["leaderboard", hackathonId],
    queryFn: () => judgingService.getLeaderboard(hackathonId),
    enabled: hackathonStatus === "completed",
  })

  const {
    data: myTeam,
    isLoading: myTeamLoading,
  } = useQuery({
    queryKey: ["myTeam", hackathonId],
    queryFn: () => teamService.getMyTeam(hackathonId),
    enabled: hackathonStatus === "completed",
  })

  const isLoading = leaderboardLoading || myTeamLoading

  // Show "Results not yet available" if hackathon is not completed
  if (hackathonStatus !== "completed") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Results Not Yet Available</h3>
            <p className="text-muted-foreground">
              Results will be displayed once the hackathon is completed and judging is finalized.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Results
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

  if (leaderboardError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Failed to load results. Please try again later.
          </p>
        </CardContent>
      </Card>
    )
  }

  const entries = leaderboard ?? []
  const topThree = entries.filter((entry) => entry.rank <= 3)
  const hasResults = entries.length > 0

  // Find the user's team in the results
  const myTeamEntry = myTeam
    ? entries.find((entry) => entry.teamId === myTeam.id)
    : null

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />
      case 3:
        return <Award className="h-6 w-6 text-orange-500" />
      default:
        return null
    }
  }

  const getRankBgColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200"
      case 2:
        return "bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200"
      case 3:
        return "bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200"
      default:
        return "bg-background border-muted"
    }
  }

  const getPlaceLabel = (rank: number) => {
    switch (rank) {
      case 1:
        return "1st Place"
      case 2:
        return "2nd Place"
      case 3:
        return "3rd Place"
      default:
        return `${rank}th Place`
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Results
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasResults ? (
          <p className="text-muted-foreground text-center py-4">
            No results available yet.
          </p>
        ) : (
          <>
            {/* Congratulations for Top 3 */}
            {topThree.length > 0 && (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
                    <Star className="h-5 w-5" />
                    <span className="font-medium">Congratulations to the Winners!</span>
                    <Star className="h-5 w-5" />
                  </div>
                </div>

                {/* Top 3 Winners Cards */}
                <div className="grid gap-4 sm:grid-cols-3">
                  {topThree.map((entry) => (
                    <div
                      key={entry.projectId}
                      className={`p-4 rounded-lg border-2 ${getRankBgColor(entry.rank)} ${
                        myTeamEntry?.projectId === entry.projectId
                          ? "ring-2 ring-primary ring-offset-2"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {getRankIcon(entry.rank)}
                        <span className="font-semibold">{getPlaceLabel(entry.rank)}</span>
                      </div>
                      <h4 className="font-medium text-lg truncate">{entry.projectName}</h4>
                      <p className="text-sm text-muted-foreground truncate">
                        by {entry.teamName}
                      </p>
                      <p className="text-lg font-bold mt-2">
                        {entry.totalScore.toFixed(2)} pts
                      </p>
                      {myTeamEntry?.projectId === entry.projectId && (
                        <span className="inline-block mt-2 text-xs font-medium px-2 py-1 rounded-full bg-primary text-primary-foreground">
                          Your Team
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* User's Team Result (if not in top 3) */}
            {myTeamEntry && myTeamEntry.rank > 3 && (
              <div className="p-4 rounded-lg border-2 border-primary bg-primary/5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                        {myTeamEntry.rank}
                      </span>
                      <span className="font-medium">Your Team's Result</span>
                    </div>
                    <h4 className="font-medium text-lg">{myTeamEntry.projectName}</h4>
                    <p className="text-sm text-muted-foreground">by {myTeamEntry.teamName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{myTeamEntry.totalScore.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">points</p>
                  </div>
                </div>
              </div>
            )}

            {/* Full Rankings List */}
            <div>
              <h3 className="font-medium mb-3">Full Rankings</h3>
              <div className="border rounded-lg overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 p-3 bg-muted/50 border-b font-medium text-sm">
                  <div className="col-span-2">Rank</div>
                  <div className="col-span-5">Project</div>
                  <div className="col-span-3">Team</div>
                  <div className="col-span-2 text-right">Score</div>
                </div>

                {/* Table Body */}
                <div className="divide-y">
                  {entries.map((entry) => {
                    const isMyTeam = myTeamEntry?.projectId === entry.projectId
                    return (
                      <div
                        key={entry.projectId}
                        className={`grid grid-cols-12 gap-4 p-3 items-center ${
                          isMyTeam ? "bg-primary/10 font-medium" : "hover:bg-muted/30"
                        }`}
                      >
                        <div className="col-span-2">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium ${
                              entry.rank === 1
                                ? "bg-yellow-100 text-yellow-700"
                                : entry.rank === 2
                                  ? "bg-gray-200 text-gray-700"
                                  : entry.rank === 3
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {entry.rank}
                          </span>
                        </div>
                        <div className="col-span-5 truncate">
                          {entry.projectName}
                          {isMyTeam && (
                            <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                              You
                            </span>
                          )}
                        </div>
                        <div className="col-span-3 text-muted-foreground truncate">
                          {entry.teamName}
                        </div>
                        <div className="col-span-2 text-right font-semibold">
                          {entry.totalScore.toFixed(2)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
