import { motion } from "framer-motion"
import { Zap } from "lucide-react"

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle: string
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-12 flex-col justify-between">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">HackathonHub</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-6"
        >
          <h1 className="text-4xl font-bold text-white leading-tight">
            Build something amazing together
          </h1>
          <p className="text-lg text-white/80 max-w-md">
            Join thousands of developers, designers, and innovators competing in
            hackathons around the world.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex gap-8"
        >
          {[
            { number: "10K+", label: "Participants" },
            { number: "500+", label: "Hackathons" },
            { number: "50K+", label: "Projects" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-bold text-white">{stat.number}</div>
              <div className="text-sm text-white/70">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-8"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <span className="text-2xl font-bold">HackathonHub</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
            <p className="text-muted-foreground">{subtitle}</p>
          </div>

          {children}
        </motion.div>
      </div>
    </div>
  )
}
