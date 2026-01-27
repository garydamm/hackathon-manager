import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, X, Search, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { judgingService } from "@/services/judging"
import { userService } from "@/services/users"
import { ApiError } from "@/services/api"
import type { User } from "@/types"

const searchSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
})

type SearchFormData = z.infer<typeof searchSchema>

interface AddJudgeModalProps {
  isOpen: boolean
  onClose: () => void
  hackathonId: string
}

export function AddJudgeModal({ isOpen, onClose, hackathonId }: AddJudgeModalProps) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [foundUser, setFoundUser] = useState<User | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      email: "",
    },
  })

  const addJudgeMutation = useMutation({
    mutationFn: (userId: string) => judgingService.addJudge(hackathonId, { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["judges", hackathonId] })
      handleClose()
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to add judge. Please try again.")
      }
    },
  })

  const onSearch = async (data: SearchFormData) => {
    setError(null)
    setFoundUser(null)
    setIsSearching(true)

    try {
      const user = await userService.getUserByEmail(data.email)
      setFoundUser(user)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          setError("No user found with this email address.")
        } else {
          setError(err.message)
        }
      } else {
        setError("Failed to search for user. Please try again.")
      }
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddJudge = () => {
    if (foundUser) {
      setError(null)
      addJudgeMutation.mutate(foundUser.id)
    }
  }

  const handleClose = () => {
    reset()
    setError(null)
    setFoundUser(null)
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
                <h2 className="text-xl font-semibold">Add Judge</h2>
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

              {/* Search Form */}
              <form onSubmit={handleSubmit(onSearch)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="judge-email">Search by Email</Label>
                  <div className="flex gap-2">
                    <Input
                      id="judge-email"
                      type="email"
                      placeholder="user@example.com"
                      {...register("email")}
                      className="flex-1"
                    />
                    <Button type="submit" variant="secondary" disabled={isSearching}>
                      {isSearching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>
              </form>

              {/* Found User */}
              {foundUser && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg border border-border bg-muted/30"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">
                        {foundUser.displayName || `${foundUser.firstName} ${foundUser.lastName}`}
                      </h4>
                      <p className="text-sm text-muted-foreground">{foundUser.email}</p>
                    </div>
                    <Button
                      onClick={handleAddJudge}
                      disabled={addJudgeMutation.isPending}
                      size="sm"
                    >
                      {addJudgeMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Add as Judge
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
