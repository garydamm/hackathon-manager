import { motion } from "framer-motion"
import { Users, User, Calendar, Globe, Video, Github, Presentation } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import type { Project, ProjectStatus } from "@/types"

interface ProjectCardProps {
  project: Project
  index: number
  onClick?: () => void
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
  })
}

export function ProjectCard({ project, index, onClick }: ProjectCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Card
        className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
        onClick={onClick}
      >
        {/* Header with project initial */}
        <div className="relative h-24 bg-gradient-to-br from-primary/20 via-primary/10 to-background overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <span className="text-2xl font-bold text-primary">
                {project.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>

          {/* Status badge */}
          <div className="absolute top-3 right-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                project.status
              )}`}
            >
              {formatStatus(project.status)}
            </span>
          </div>
        </div>

        <CardHeader className="pb-2">
          <CardTitle className="text-lg group-hover:text-primary transition-colors">
            {project.name}
          </CardTitle>
          {project.tagline && (
            <CardDescription className="line-clamp-2">
              {project.tagline}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Team name or creator */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {project.teamName ? (
              <>
                <Users className="h-4 w-4" />
                <span>{project.teamName}</span>
              </>
            ) : (
              <>
                <User className="h-4 w-4" />
                <span>By {project.createdByName}</span>
              </>
            )}
          </div>

          {/* Submitted date */}
          {project.submittedAt && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Submitted {formatDate(project.submittedAt)}</span>
            </div>
          )}

          {/* URL icons */}
          {(project.demoUrl || project.videoUrl || project.repositoryUrl || project.presentationUrl) && (
            <div className="flex items-center gap-3 pt-1">
              {project.demoUrl && (
                <a
                  href={project.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="Demo"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <Globe className="h-4 w-4" />
                </a>
              )}
              {project.videoUrl && (
                <a
                  href={project.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="Video"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <Video className="h-4 w-4" />
                </a>
              )}
              {project.repositoryUrl && (
                <a
                  href={project.repositoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="Repository"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <Github className="h-4 w-4" />
                </a>
              )}
              {project.presentationUrl && (
                <a
                  href={project.presentationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="Presentation"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <Presentation className="h-4 w-4" />
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
