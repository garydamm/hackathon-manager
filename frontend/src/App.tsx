import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider } from "@/contexts/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { SessionExpiredBanner } from "@/components/SessionExpiredBanner"
import { LoginPage } from "@/pages/Login"
import { RegisterPage } from "@/pages/Register"
import { ForgotPasswordPage } from "@/pages/ForgotPassword"
import { ResetPasswordPage } from "@/pages/ResetPassword"
import { DashboardPage } from "@/pages/Dashboard"
import { CreateHackathonPage } from "@/pages/CreateHackathon"
import { HackathonDetailPage } from "@/pages/HackathonDetail"
import { TeamsListPage } from "@/pages/TeamsListPage"
import { TeamDetailPage } from "@/pages/TeamDetailPage"
import { JudgeDashboardPage } from "@/pages/JudgeDashboard"
import { ProjectScoringPage } from "@/pages/ProjectScoring"
import { SchedulePage } from "@/pages/Schedule"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <SessionExpiredBanner />
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hackathons/new"
              element={
                <ProtectedRoute>
                  <CreateHackathonPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hackathons/:slug"
              element={
                <ProtectedRoute>
                  <HackathonDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hackathons/:slug/schedule"
              element={
                <ProtectedRoute>
                  <SchedulePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hackathons/:slug/teams"
              element={
                <ProtectedRoute>
                  <TeamsListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hackathons/:slug/teams/:teamId"
              element={
                <ProtectedRoute>
                  <TeamDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hackathons/:slug/judge"
              element={
                <ProtectedRoute>
                  <JudgeDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hackathons/:slug/judge/:projectId"
              element={
                <ProtectedRoute>
                  <ProjectScoringPage />
                </ProtectedRoute>
              }
            />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
