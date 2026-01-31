import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { api } from "./api"

// Mock fetch globally
globalThis.fetch = vi.fn()

describe("ApiClient - Activity Tracking", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    // Clear activity tracking state between tests
    api.clearActivityTracking()

    // Set up a default successful response
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: "test" }),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("getLastActivityTime", () => {
    it("should return null initially", () => {
      expect(api.getLastActivityTime()).toBeNull()
    })

    it("should track timestamp after POST request", async () => {
      const beforeTime = Date.now()
      await api.post("/test", { data: "test" }, { skipAuth: true })
      const afterTime = Date.now()

      const activityTime = api.getLastActivityTime()
      expect(activityTime).not.toBeNull()
      expect(activityTime).toBeGreaterThanOrEqual(beforeTime)
      expect(activityTime).toBeLessThanOrEqual(afterTime)
    })

    it("should track timestamp after PUT request", async () => {
      const beforeTime = Date.now()
      await api.put("/test", { data: "test" }, { skipAuth: true })
      const afterTime = Date.now()

      const activityTime = api.getLastActivityTime()
      expect(activityTime).not.toBeNull()
      expect(activityTime).toBeGreaterThanOrEqual(beforeTime)
      expect(activityTime).toBeLessThanOrEqual(afterTime)
    })

    it("should track timestamp after DELETE request", async () => {
      const beforeTime = Date.now()
      await api.delete("/test", { skipAuth: true })
      const afterTime = Date.now()

      const activityTime = api.getLastActivityTime()
      expect(activityTime).not.toBeNull()
      expect(activityTime).toBeGreaterThanOrEqual(beforeTime)
      expect(activityTime).toBeLessThanOrEqual(afterTime)
    })

    it("should track timestamp after PATCH request", async () => {
      const beforeTime = Date.now()
      await api.patch("/test", { data: "test" }, { skipAuth: true })
      const afterTime = Date.now()

      const activityTime = api.getLastActivityTime()
      expect(activityTime).not.toBeNull()
      expect(activityTime).toBeGreaterThanOrEqual(beforeTime)
      expect(activityTime).toBeLessThanOrEqual(afterTime)
    })

    it("should NOT track timestamp after GET request", async () => {
      await api.get("/test", { skipAuth: true })

      expect(api.getLastActivityTime()).toBeNull()
    })

    it("should update timestamp for subsequent POST requests", async () => {
      // First POST
      await api.post("/test1", { data: "test1" }, { skipAuth: true })
      const firstActivityTime = api.getLastActivityTime()

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      // Second POST
      await api.post("/test2", { data: "test2" }, { skipAuth: true })
      const secondActivityTime = api.getLastActivityTime()

      expect(firstActivityTime).not.toBeNull()
      expect(secondActivityTime).not.toBeNull()
      expect(secondActivityTime).toBeGreaterThan(firstActivityTime!)
    })

    it("should track activity even when request fails", async () => {
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: "Server error" }),
      })

      const beforeTime = Date.now()

      try {
        await api.post("/test", { data: "test" }, { skipAuth: true })
      } catch {
        // Expected to throw
      }

      const afterTime = Date.now()
      const activityTime = api.getLastActivityTime()

      expect(activityTime).not.toBeNull()
      expect(activityTime).toBeGreaterThanOrEqual(beforeTime)
      expect(activityTime).toBeLessThanOrEqual(afterTime)
    })

    it("should handle mixed GET and POST requests correctly", async () => {
      // Initial GET - should not track
      await api.get("/test", { skipAuth: true })
      expect(api.getLastActivityTime()).toBeNull()

      // POST - should track
      await api.post("/test", { data: "test" }, { skipAuth: true })
      const activityTimeAfterPost = api.getLastActivityTime()
      expect(activityTimeAfterPost).not.toBeNull()

      // Another GET - should not update activity time
      await new Promise(resolve => setTimeout(resolve, 10))
      await api.get("/test2", { skipAuth: true })
      const activityTimeAfterGet = api.getLastActivityTime()
      expect(activityTimeAfterGet).toBe(activityTimeAfterPost)
    })

    it("should track activity for all meaningful methods in order", async () => {
      const timestamps: number[] = []

      await api.post("/test", { data: "test" }, { skipAuth: true })
      timestamps.push(api.getLastActivityTime()!)
      await new Promise(resolve => setTimeout(resolve, 5))

      await api.put("/test", { data: "test" }, { skipAuth: true })
      timestamps.push(api.getLastActivityTime()!)
      await new Promise(resolve => setTimeout(resolve, 5))

      await api.patch("/test", { data: "test" }, { skipAuth: true })
      timestamps.push(api.getLastActivityTime()!)
      await new Promise(resolve => setTimeout(resolve, 5))

      await api.delete("/test", { skipAuth: true })
      timestamps.push(api.getLastActivityTime()!)

      // Each timestamp should be greater than the previous
      expect(timestamps[0]).toBeLessThan(timestamps[1])
      expect(timestamps[1]).toBeLessThan(timestamps[2])
      expect(timestamps[2]).toBeLessThan(timestamps[3])
    })
  })
})
