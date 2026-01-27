import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2, Plus, Pencil, Trash2, Scale } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CriteriaFormModal } from "@/components/CriteriaFormModal"
import { DeleteCriteriaModal } from "@/components/DeleteCriteriaModal"
import { judgingService } from "@/services/judging"
import type { JudgingCriteria } from "@/types"

interface JudgingCriteriaSectionProps {
  hackathonId: string
}

export function JudgingCriteriaSection({ hackathonId }: JudgingCriteriaSectionProps) {
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedCriteria, setSelectedCriteria] = useState<JudgingCriteria | null>(null)

  const { data: criteria, isLoading } = useQuery({
    queryKey: ["judging-criteria", hackathonId],
    queryFn: () => judgingService.getCriteria(hackathonId),
  })

  const handleAddClick = () => {
    setSelectedCriteria(null)
    setIsFormModalOpen(true)
  }

  const handleEditClick = (item: JudgingCriteria) => {
    setSelectedCriteria(item)
    setIsFormModalOpen(true)
  }

  const handleDeleteClick = (item: JudgingCriteria) => {
    setSelectedCriteria(item)
    setIsDeleteModalOpen(true)
  }

  const handleFormModalClose = () => {
    setIsFormModalOpen(false)
    setSelectedCriteria(null)
  }

  const handleDeleteModalClose = () => {
    setIsDeleteModalOpen(false)
    setSelectedCriteria(null)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Judging Criteria
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

  const criteriaList = criteria ?? []

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Judging Criteria
            </CardTitle>
            <Button size="sm" onClick={handleAddClick}>
              <Plus className="h-4 w-4 mr-2" />
              Add Criteria
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {criteriaList.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No judging criteria defined yet. Add criteria to enable project scoring.
            </p>
          ) : (
            <div className="space-y-3">
              {criteriaList.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between p-4 rounded-lg border border-border"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{item.name}</h4>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        Max: {item.maxScore}
                      </span>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        Weight: {item.weight}x
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(item)}
                      title="Edit criteria"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(item)}
                      title="Delete criteria"
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

      {/* Add/Edit Criteria Modal */}
      <CriteriaFormModal
        isOpen={isFormModalOpen}
        onClose={handleFormModalClose}
        hackathonId={hackathonId}
        criteria={selectedCriteria}
        existingCriteriaCount={criteriaList.length}
      />

      {/* Delete Confirmation Modal */}
      <DeleteCriteriaModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteModalClose}
        criteria={selectedCriteria}
        hackathonId={hackathonId}
      />
    </>
  )
}
