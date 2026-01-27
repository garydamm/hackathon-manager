import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Loader2,
  Trophy,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { judgingService } from "@/services/judging"

interface LeaderboardSectionProps {
  hackathonId: string
}

type SortField = "rank" | "score"
type SortDirection = "asc" | "desc"

export function LeaderboardSection({ hackathonId }: LeaderboardSectionProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>("rank")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  const {
    data: leaderboard,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["leaderboard", hackathonId],
    queryFn: () => judgingService.getLeaderboard(hackathonId),
  })

  const toggleRowExpansion = (projectId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId)
    } else {
      newExpanded.add(projectId)
    }
    setExpandedRows(newExpanded)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection(field === "rank" ? "asc" : "desc")
    }
  }

  const sortedLeaderboard = leaderboard
    ? [...leaderboard].sort((a, b) => {
        const multiplier = sortDirection === "asc" ? 1 : -1
        if (sortField === "rank") {
          return (a.rank - b.rank) * multiplier
        }
        return (a.totalScore - b.totalScore) * multiplier
      })
    : []

  // Check if any project has a total score of 0 (meaning no scoring yet)
  const hasPartialScoring =
    leaderboard && leaderboard.some((entry) => entry.totalScore === 0)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Leaderboard
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

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Failed to load leaderboard. Please try again later.
          </p>
        </CardContent>
      </Card>
    )
  }

  const entries = sortedLeaderboard

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasPartialScoring && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-yellow-50 text-yellow-800 border border-yellow-200">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm">
              Judging in progress. Some projects may not have received all scores yet.
            </p>
          </div>
        )}

        {entries.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No projects have been scored yet.
          </p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 p-3 bg-muted/50 border-b font-medium text-sm">
              <div className="col-span-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-medium hover:bg-transparent"
                  onClick={() => handleSort("rank")}
                >
                  Rank
                  <ArrowUpDown className="h-3 w-3 ml-1" />
                </Button>
              </div>
              <div className="col-span-4">Project</div>
              <div className="col-span-4">Team</div>
              <div className="col-span-2 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-medium hover:bg-transparent"
                  onClick={() => handleSort("score")}
                >
                  Score
                  <ArrowUpDown className="h-3 w-3 ml-1" />
                </Button>
              </div>
              <div className="col-span-1"></div>
            </div>

            {/* Table Body */}
            <div className="divide-y">
              {entries.map((entry) => (
                <div key={entry.projectId}>
                  {/* Main Row */}
                  <div
                    className="grid grid-cols-12 gap-4 p-3 items-center hover:bg-muted/30 cursor-pointer"
                    onClick={() => toggleRowExpansion(entry.projectId)}
                  >
                    <div className="col-span-1">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium ${
                          entry.rank === 1
                            ? "bg-yellow-100 text-yellow-700"
                            : entry.rank === 2
                              ? "bg-gray-100 text-gray-700"
                              : entry.rank === 3
                                ? "bg-orange-100 text-orange-700"
                                : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {entry.rank}
                      </span>
                    </div>
                    <div className="col-span-4 font-medium truncate">
                      {entry.projectName}
                    </div>
                    <div className="col-span-4 text-muted-foreground truncate">
                      {entry.teamName}
                    </div>
                    <div className="col-span-2 text-right font-semibold">
                      {entry.totalScore.toFixed(2)}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      {expandedRows.has(entry.projectId) ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedRows.has(entry.projectId) && (
                    <div className="px-3 pb-3 bg-muted/20">
                      <div className="p-3 rounded-lg bg-background border">
                        <h5 className="text-sm font-medium mb-2">
                          Score Breakdown by Criteria
                        </h5>
                        {entry.criteriaAverages.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No scores recorded yet.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {entry.criteriaAverages.map((ca) => (
                              <div
                                key={ca.criteriaId}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="text-muted-foreground">
                                  {ca.criteriaName}
                                </span>
                                <span className="font-medium">
                                  {ca.averageScore.toFixed(2)} / {ca.maxScore}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
