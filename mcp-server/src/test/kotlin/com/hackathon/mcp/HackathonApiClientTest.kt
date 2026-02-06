package com.hackathon.mcp

import io.ktor.client.*
import io.ktor.client.engine.mock.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class HackathonApiClientTest {

    private val sampleResponse = """
        {
          "results": [
            {
              "id": "550e8400-e29b-41d4-a716-446655440000",
              "name": "AI Hackathon",
              "slug": "ai-hackathon",
              "description": "Build AI apps",
              "status": "registration_open",
              "location": "SF",
              "isVirtual": false,
              "timezone": "UTC",
              "registrationOpensAt": "2025-01-01T00:00:00Z",
              "registrationClosesAt": "2025-01-15T00:00:00Z",
              "startsAt": "2025-02-01T09:00:00Z",
              "endsAt": "2025-02-03T18:00:00Z",
              "judgingStartsAt": null,
              "judgingEndsAt": null,
              "maxTeamSize": 5,
              "minTeamSize": 1,
              "maxParticipants": 200,
              "participantCount": 42,
              "bannerUrl": null,
              "logoUrl": null,
              "relevanceScore": 0.85
            }
          ],
          "page": 0,
          "size": 20,
          "totalElements": 1,
          "totalPages": 1
        }
    """.trimIndent()

    @Test
    fun `sends all query parameters to backend`() = runTest {
        var capturedUrl: String? = null

        val mockEngine = MockEngine { request ->
            capturedUrl = request.url.toString()
            respond(
                content = sampleResponse,
                status = HttpStatusCode.OK,
                headers = headersOf(HttpHeaders.ContentType, "application/json")
            )
        }

        val client = HackathonApiClient(
            apiBaseUrl = "http://localhost:8080",
            httpClient = HttpClient(mockEngine) {
                install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
            }
        )

        client.searchHackathons(
            query = "AI",
            timeFrame = "upcoming",
            status = "registration_open",
            startDate = "2025-01-01",
            endDate = "2025-12-31",
            page = 1,
            size = 10
        )

        val url = capturedUrl!!
        assertTrue(url.contains("query=AI"))
        assertTrue(url.contains("timeFrame=upcoming"))
        assertTrue(url.contains("status=registration_open"))
        assertTrue(url.contains("startDate=2025-01-01"))
        assertTrue(url.contains("endDate=2025-12-31"))
        assertTrue(url.contains("page=1"))
        assertTrue(url.contains("size=10"))
        assertTrue(url.startsWith("http://localhost:8080/api/hackathons/search"))
    }

    @Test
    fun `omits null parameters from request`() = runTest {
        var capturedUrl: String? = null

        val mockEngine = MockEngine { request ->
            capturedUrl = request.url.toString()
            respond(
                content = """{"results":[],"page":0,"size":20,"totalElements":0,"totalPages":0}""",
                status = HttpStatusCode.OK,
                headers = headersOf(HttpHeaders.ContentType, "application/json")
            )
        }

        val client = HackathonApiClient(
            apiBaseUrl = "http://localhost:8080",
            httpClient = HttpClient(mockEngine) {
                install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
            }
        )

        client.searchHackathons(query = "test")

        val url = capturedUrl!!
        assertTrue(url.contains("query=test"))
        assertTrue(!url.contains("timeFrame"))
        assertTrue(!url.contains("status"))
        assertTrue(!url.contains("startDate"))
        assertTrue(!url.contains("endDate"))
        assertTrue(!url.contains("page"))
        assertTrue(!url.contains("size"))
    }

    @Test
    fun `parses successful response correctly`() = runTest {
        val mockEngine = MockEngine {
            respond(
                content = sampleResponse,
                status = HttpStatusCode.OK,
                headers = headersOf(HttpHeaders.ContentType, "application/json")
            )
        }

        val client = HackathonApiClient(
            apiBaseUrl = "http://localhost:8080",
            httpClient = HttpClient(mockEngine) {
                install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
            }
        )

        val response = client.searchHackathons()

        assertEquals(1, response.results.size)
        assertEquals("AI Hackathon", response.results[0].name)
        assertEquals("registration_open", response.results[0].status)
        assertEquals(42, response.results[0].participantCount)
        assertEquals(0, response.page)
        assertEquals(1, response.totalPages)
        assertEquals(1, response.totalElements)
    }

    @Test
    fun `throws ApiException on error response`() = runTest {
        val mockEngine = MockEngine {
            respond(
                content = "Bad Request: invalid status value",
                status = HttpStatusCode.BadRequest
            )
        }

        val client = HackathonApiClient(
            apiBaseUrl = "http://localhost:8080",
            httpClient = HttpClient(mockEngine) {
                install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
            }
        )

        val exception = assertFailsWith<ApiException> {
            client.searchHackathons(status = "invalid_status")
        }

        assertEquals(400, exception.statusCode)
        assertEquals("Bad Request: invalid status value", exception.message)
    }

    @Test
    fun `throws ApiException on server error`() = runTest {
        val mockEngine = MockEngine {
            respond(
                content = "Internal Server Error",
                status = HttpStatusCode.InternalServerError
            )
        }

        val client = HackathonApiClient(
            apiBaseUrl = "http://localhost:8080",
            httpClient = HttpClient(mockEngine) {
                install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
            }
        )

        val exception = assertFailsWith<ApiException> {
            client.searchHackathons()
        }

        assertEquals(500, exception.statusCode)
    }
}
