import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { motion } from "framer-motion"
import { Loader2, Lock } from "lucide-react"
import { AuthLayout } from "@/components/layouts/AuthLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authService } from "@/services/auth"
import { ApiError } from "@/services/api"

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  // If no token, show error immediately
  if (!token) {
    return (
      <AuthLayout
        title="Invalid Reset Link"
        subtitle="The password reset link is invalid or has expired"
      >
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm"
          >
            The password reset link is invalid or missing. Please request a new password reset.
          </motion.div>

          <Link to="/forgot-password">
            <Button className="w-full" size="lg">
              Request New Link
            </Button>
          </Link>

          <p className="text-center text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Back to Login
            </Link>
          </p>
        </div>
      </AuthLayout>
    )
  }

  const onSubmit = async (data: ResetPasswordFormData) => {
    setError(null)
    try {
      await authService.resetPassword(token, data.newPassword, data.confirmPassword)
      // Navigate to login with success message
      navigate("/login", {
        state: { message: "Password reset successful. Please log in with your new password." },
      })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("An unexpected error occurred. Please try again.")
      }
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your new password below"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm"
          >
            {error}
          </motion.div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                className="pl-10"
                {...register("newPassword")}
              />
            </div>
            {errors.newPassword && (
              <p className="text-sm text-destructive">{errors.newPassword.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                className="pl-10"
                {...register("confirmPassword")}
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium">Password must contain:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>At least 8 characters</li>
              <li>At least one uppercase letter (A-Z)</li>
              <li>At least one lowercase letter (a-z)</li>
              <li>At least one number (0-9)</li>
            </ul>
          </div>
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Resetting Password...
            </>
          ) : (
            "Reset Password"
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Back to Login
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
