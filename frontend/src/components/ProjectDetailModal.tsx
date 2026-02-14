import { motion, AnimatePresence } from "framer-motion"
import { X, Users, User, Calendar, Globe, Video, Github, Presentation, ExternalLink, Pencil } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import type { Project, ProjectStatus } from "@/types"

interface ProjectDetailModalProps {
  isOpen: boolean
  onClose: () => void
  project: Project
  hackathonSlug?: string
  canEdit?: boolean
  onEdit?: () => void
}

function getStatusColor(status: ProjectStatus): string {
  const colors: Record<ProjectStatus, string> = {
    draft: "bg-gray-100 text-gray-700",
    submitted: "bg-blue-100 text-blue-700",
    under_review: "bg-yellow-100 text-yellow-700",
    accepted: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  }
  return colors[status]
}

function formatStatus(status: ProjectStatus): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function ProjectDetailModal({ isOpen, onClose, project, hackathonSlug, canEdit, onEdit }: ProjectDetailModalProps) {
  const urlLinks = [
    { url: project.demoUrl, label: "Demo", icon: Globe },
    { url: project.videoUrl, label: "Video", icon: Video },
    { url: project.repositoryUrl, label: "Repository", icon: Github },
    { url: project.presentationUrl, label: "Presentation", icon: Presentation },
  ].filter((link) => link.url)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
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
              className="bg-background rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-2xl font-semibold">{project.name}</h2>
                  {project.tagline && (
                    <p className="text-muted-foreground">{project.tagline}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {canEdit && onEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onEdit}
                      title="Edit project"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Status Badge */}
              <div>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    project.status
                  )}`}
                >
                  {formatStatus(project.status)}
                </span>
              </div>

              {/* Team/Creator and Submission Info */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {project.teamName ? (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {hackathonSlug && project.teamId ? (
                      <Link
                        to={`/hackathons/${hackathonSlug}/teams/${project.teamId}`}
                        className="text-primary hover:underline"
                        onClick={onClose}
                      >
                        {project.teamName}
                      </Link>
                    ) : (
                      <span>{project.teamName}</span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>By {project.createdByName}</span>
                  </div>
                )}
                {project.submittedAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Submitted {formatDate(project.submittedAt)}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              {project.description && (
                <div className="space-y-2">
                  <h3 className="font-medium">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {project.description}
                  </p>
                </div>
              )}

              {/* URL Links */}
              {urlLinks.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium">Links</h3>
                  <div className="flex flex-col gap-2">
                    {urlLinks.map(({ url, label, icon: Icon }) => (
                      <a
                        key={label}
                        href={url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <Icon className="h-4 w-4" />
                        <span>{label}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-end pt-2">
                <Button onClick={onClose}>Close</Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
