import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { judgingService } from "@/services/judging"
import { ApiError } from "@/services/api"
import type { JudgingCriteria } from "@/types"

const criteriaSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().optional(),
  maxScore: z.number().min(1, "Max score must be at least 1").max(100, "Max score cannot exceed 100"),
  weight: z.number().min(0.1, "Weight must be at least 0.1").max(10, "Weight cannot exceed 10"),
  displayOrder: z.number().min(0, "Display order must be positive"),
})

type CriteriaFormData = z.infer<typeof criteriaSchema>

interface CriteriaFormModalProps {
  isOpen: boolean
  onClose: () => void
  hackathonId: string
  criteria?: JudgingCriteria | null
  existingCriteriaCount: number
}

export function CriteriaFormModal({
  isOpen,
  onClose,
  hackathonId,
  criteria,
  existingCriteriaCount,
}: CriteriaFormModalProps) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const isEditing = !!criteria

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CriteriaFormData>({
    resolver: zodResolver(criteriaSchema),
    defaultValues: {
      name: "",
      description: "",
      maxScore: 10,
      weight: 1,
      displayOrder: existingCriteriaCount,
    },
  })

  useEffect(() => {
    if (isOpen) {
      if (criteria) {
        reset({
          name: criteria.name,
          description: criteria.description || "",
          maxScore: criteria.maxScore,
          weight: criteria.weight,
          displayOrder: criteria.displayOrder,
        })
      } else {
        reset({
          name: "",
          description: "",
          maxScore: 10,
          weight: 1,
          displayOrder: existingCriteriaCount,
        })
      }
    }
  }, [isOpen, criteria, existingCriteriaCount, reset])

  const createMutation = useMutation({
    mutationFn: (data: CriteriaFormData) =>
      judgingService.createCriteria(hackathonId, {
        name: data.name,
        description: data.description || undefined,
        maxScore: data.maxScore,
        weight: data.weight,
        displayOrder: data.displayOrder,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["judging-criteria", hackathonId] })
      reset()
      setError(null)
      onClose()
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to create criteria. Please try again.")
      }
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: CriteriaFormData) =>
      judgingService.updateCriteria(criteria!.id, {
        name: data.name,
        description: data.description || undefined,
        maxScore: data.maxScore,
        weight: data.weight,
        displayOrder: data.displayOrder,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["judging-criteria", hackathonId] })
      reset()
      setError(null)
      onClose()
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to update criteria. Please try again.")
      }
    },
  })

  const onSubmit = (data: CriteriaFormData) => {
    setError(null)
    if (isEditing) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  const handleClose = () => {
    reset()
    setError(null)
    onClose()
  }

  const isPending = createMutation.isPending || updateMutation.isPending

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
                <h2 className="text-xl font-semibold">
                  {isEditing ? "Edit Criteria" : "Add Criteria"}
                </h2>
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
                  <Label htmlFor="criteria-name">Name *</Label>
                  <Input
                    id="criteria-name"
                    placeholder="e.g., Innovation"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="criteria-description">Description</Label>
                  <Textarea
                    id="criteria-description"
                    placeholder="Describe what this criteria evaluates..."
                    {...register("description")}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="criteria-maxScore">Max Score *</Label>
                    <Input
                      id="criteria-maxScore"
                      type="number"
                      min={1}
                      max={100}
                      {...register("maxScore", { valueAsNumber: true })}
                    />
                    {errors.maxScore && (
                      <p className="text-sm text-destructive">{errors.maxScore.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="criteria-weight">Weight *</Label>
                    <Input
                      id="criteria-weight"
                      type="number"
                      min={0.1}
                      max={10}
                      step={0.1}
                      {...register("weight", { valueAsNumber: true })}
                    />
                    {errors.weight && (
                      <p className="text-sm text-destructive">{errors.weight.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="criteria-displayOrder">Display Order</Label>
                  <Input
                    id="criteria-displayOrder"
                    type="number"
                    min={0}
                    {...register("displayOrder", { valueAsNumber: true })}
                  />
                  {errors.displayOrder && (
                    <p className="text-sm text-destructive">{errors.displayOrder.message}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isEditing ? "Saving..." : "Creating..."}
                      </>
                    ) : isEditing ? (
                      "Save Changes"
                    ) : (
                      "Add Criteria"
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
