import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider } from "@/contexts/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { LoginPage } from "@/pages/Login"
import { RegisterPage } from "@/pages/Register"
import { DashboardPage } from "@/pages/Dashboard"
import { CreateHackathonPage } from "@/pages/CreateHackathon"
import { HackathonDetailPage } from "@/pages/HackathonDetail"
import { TeamsListPage } from "@/pages/TeamsListPage"
import { TeamDetailPage } from "@/pages/TeamDetailPage"

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
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

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

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
