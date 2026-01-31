import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { fireEvent } from "@testing-library/react"
import { BrowserRouter } from "react-router-dom"
import { LoginPage } from "./Login"
import * as AuthContext from "@/contexts/AuthContext"

// Mock AuthContext
const mockLogin = vi.fn()
const mockUseAuth = vi.fn(() => ({
  login: mockLogin,
  user: null,
  isAuthenticated: false,
  isLoading: false,
  sessionExpired: false,
  register: vi.fn(),
  logout: vi.fn(),
  clearSessionExpiredFlag: vi.fn(),
}))

vi.spyOn(AuthContext, "useAuth").mockImplementation(mockUseAuth)

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom")
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null }),
  }
})

function renderLoginPage() {
  return render(
    <BrowserRouter>
      <LoginPage />
    </BrowserRouter>
  )
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Remember me checkbox", () => {
    it("should render remember me checkbox", () => {
      renderLoginPage()

      const checkbox = screen.getByRole("checkbox", { name: /remember me for 7 days/i })
      expect(checkbox).toBeDefined()
    })

    it("should render helper text for remember me", () => {
      renderLoginPage()

      const helperText = screen.getByText("Only use on personal devices")
      expect(helperText).toBeDefined()
    })

    it("should default to unchecked", () => {
      renderLoginPage()

      const checkbox = screen.getByRole("checkbox", { name: /remember me for 7 days/i })
      expect(checkbox.getAttribute("data-state")).toBe("unchecked")
    })

    it("should toggle checkbox when clicked", () => {
      renderLoginPage()

      const checkbox = screen.getByRole("checkbox", { name: /remember me for 7 days/i })
      expect(checkbox.getAttribute("data-state")).toBe("unchecked")

      // Click to check
      fireEvent.click(checkbox)
      expect(checkbox.getAttribute("data-state")).toBe("checked")

      // Click to uncheck
      fireEvent.click(checkbox)
      expect(checkbox.getAttribute("data-state")).toBe("unchecked")
    })

    it("should toggle checkbox when label is clicked", () => {
      renderLoginPage()

      const label = screen.getByText("Remember me for 7 days")
      const checkbox = screen.getByRole("checkbox", { name: /remember me for 7 days/i })

      expect(checkbox.getAttribute("data-state")).toBe("unchecked")

      // Click label to check
      fireEvent.click(label)
      expect(checkbox.getAttribute("data-state")).toBe("checked")
    })

    it("should pass rememberMe=false when unchecked", async () => {
      mockLogin.mockResolvedValue(undefined)
      renderLoginPage()

      // Fill in email and password
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      fireEvent.change(emailInput, { target: { value: "test@example.com" } })
      fireEvent.change(passwordInput, { target: { value: "password123" } })

      // Leave checkbox unchecked and submit
      const submitButton = screen.getByRole("button", { name: /sign in/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password123",
          rememberMe: false,
        })
      })
    })

    it("should pass rememberMe=true when checked", async () => {
      mockLogin.mockResolvedValue(undefined)
      renderLoginPage()

      // Fill in email and password
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      fireEvent.change(emailInput, { target: { value: "test@example.com" } })
      fireEvent.change(passwordInput, { target: { value: "password123" } })

      // Check the remember me checkbox
      const checkbox = screen.getByRole("checkbox", { name: /remember me for 7 days/i })
      fireEvent.click(checkbox)
      expect(checkbox.getAttribute("data-state")).toBe("checked")

      // Submit
      const submitButton = screen.getByRole("button", { name: /sign in/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password123",
          rememberMe: true,
        })
      })
    })

    it("should maintain checkbox state during form submission", async () => {
      mockLogin.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)))
      renderLoginPage()

      // Fill in form and check remember me
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const checkbox = screen.getByRole("checkbox", { name: /remember me for 7 days/i })

      fireEvent.change(emailInput, { target: { value: "test@example.com" } })
      fireEvent.change(passwordInput, { target: { value: "password123" } })
      fireEvent.click(checkbox)

      // Submit
      const submitButton = screen.getByRole("button", { name: /sign in/i })
      fireEvent.click(submitButton)

      // Checkbox should still be checked during submission
      expect(checkbox.getAttribute("data-state")).toBe("checked")
    })
  })

})
