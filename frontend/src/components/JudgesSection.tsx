import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2, Plus, Trash2, Gavel } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AddJudgeModal } from "@/components/AddJudgeModal"
import { RemoveJudgeModal } from "@/components/RemoveJudgeModal"
import { judgingService } from "@/services/judging"
import type { JudgeInfo } from "@/types"

interface JudgesSectionProps {
  hackathonId: string
}

export function JudgesSection({ hackathonId }: JudgesSectionProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false)
  const [selectedJudge, setSelectedJudge] = useState<JudgeInfo | null>(null)

  const { data: judges, isLoading } = useQuery({
    queryKey: ["judges", hackathonId],
    queryFn: () => judgingService.getJudges(hackathonId),
  })

  const handleAddClick = () => {
    setIsAddModalOpen(true)
  }

  const handleRemoveClick = (judge: JudgeInfo) => {
    setSelectedJudge(judge)
    setIsRemoveModalOpen(true)
  }

  const handleAddModalClose = () => {
    setIsAddModalOpen(false)
  }

  const handleRemoveModalClose = () => {
    setIsRemoveModalOpen(false)
    setSelectedJudge(null)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5" />
            Judges
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

  const judgesList = judges ?? []

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5" />
              Judges
            </CardTitle>
            <Button size="sm" onClick={handleAddClick}>
              <Plus className="h-4 w-4 mr-2" />
              Add Judge
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {judgesList.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No judges assigned yet. Add judges to enable project scoring.
            </p>
          ) : (
            <div className="space-y-3">
              {judgesList.map((judge) => (
                <div
                  key={judge.userId}
                  className="flex items-center justify-between p-4 rounded-lg border border-border"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">
                        {judge.displayName || `${judge.firstName} ${judge.lastName}`}
                      </h4>
                    </div>
                    <p className="text-sm text-muted-foreground">{judge.email}</p>
                    <p className="text-sm text-muted-foreground">
                      Scored {judge.projectsScored} of {judge.totalProjects} projects
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <div className="text-sm text-muted-foreground mr-2">
                      {judge.totalProjects > 0
                        ? `${Math.round((judge.projectsScored / judge.totalProjects) * 100)}%`
                        : "0%"}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveClick(judge)}
                      title="Remove judge"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Judge Modal */}
      <AddJudgeModal
        isOpen={isAddModalOpen}
        onClose={handleAddModalClose}
        hackathonId={hackathonId}
      />

      {/* Remove Judge Confirmation Modal */}
      <RemoveJudgeModal
        isOpen={isRemoveModalOpen}
        onClose={handleRemoveModalClose}
        judge={selectedJudge}
        hackathonId={hackathonId}
      />
    </>
  )
}
