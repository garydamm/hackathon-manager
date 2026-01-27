import { api } from "./api"
import type { User } from "@/types"

export const userService = {
  async getUserByEmail(email: string): Promise<User> {
    return api.get<User>(`/users/by-email?email=${encodeURIComponent(email)}`)
  },
}
