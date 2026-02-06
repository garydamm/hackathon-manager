package com.hackathon.mcp

import io.ktor.client.*
import io.ktor.client.engine.mock.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.modelcontextprotocol.kotlin.sdk.types.CallToolRequest
import io.modelcontextprotocol.kotlin.sdk.types.CallToolRequestParams
import io.modelcontextprotocol.kotlin.sdk.types.TextContent
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlin.test.Test
import kotlin.test.assertContains
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class SearchToolTest {

    private val emptyResponse = """{"results":[],"page":0,"size":20,"totalElements":0,"totalPages":0}"""

    private val sampleResponse = """
        {
          "results": [{
            "id": "abc-123",
            "name": "Test Hack",
            "slug": "test-hack",
            "description": "A test",
            "status": "registration_open",
            "location": "Virtual",
            "isVirtual": true,
            "timezone": "UTC",
            "startsAt": "2025-02-01T00:00:00Z",
            "endsAt": "2025-02-02T00:00:00Z",
            "maxTeamSize": 4,
            "minTeamSize": 1,
            "participantCount": 10
          }],
          "page": 0,
          "size": 20,
          "totalElements": 1,
          "totalPages": 1
        }
    """.trimIndent()

    @Test
    fun `tool is registered with correct name and schema`() {
        val mockClient = createMockApiClient(emptyResponse)
        val server = createServer(mockClient)

        val tool = server.tools["search_hackathons"]
        assertNotNull(tool)
        assertEquals("search_hackathons", tool.tool.name)

        val props = tool.tool.inputSchema.properties!!
        assertNotNull(props["query"])
        assertNotNull(props["timeFrame"])
        assertNotNull(props["status"])
        assertNotNull(props["startDate"])
        assertNotNull(props["endDate"])
        assertNotNull(props["page"])
        assertNotNull(props["size"])
    }

    @Test
    fun `tool handler returns formatted results`() = runTest {
        val mockClient = createMockApiClient(sampleResponse)
        val server = createServer(mockClient)

        val registeredTool = server.tools["search_hackathons"]!!
        val request = CallToolRequest(
            CallToolRequestParams(
                name = "search_hackathons",
                arguments = buildJsonObject { put("query", "test") }
            )
        )

        val result = registeredTool.handler(request)

        assertEquals(1, result.content.size)
        val text = (result.content[0] as TextContent).text
        assertContains(text, "Test Hack")
        assertContains(text, "registration_open")
        assertTrue(result.isError != true)
    }

    @Test
    fun `tool handler returns error on API failure`() = runTest {
        val mockEngine = MockEngine {
            respond(
                content = "Service unavailable",
                status = HttpStatusCode.ServiceUnavailable
            )
        }
        val httpClient = HttpClient(mockEngine) {
            install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
        }
        val apiClient = HackathonApiClient("http://localhost:8080", httpClient)
        val server = createServer(apiClient)

        val registeredTool = server.tools["search_hackathons"]!!
        val request = CallToolRequest(
            CallToolRequestParams(
                name = "search_hackathons",
                arguments = buildJsonObject { }
            )
        )

        val result = registeredTool.handler(request)

        assertEquals(true, result.isError)
        val text = (result.content[0] as TextContent).text
        assertContains(text, "Error from hackathon API (HTTP 503)")
    }

    @Test
    fun `tool handler passes parameters to API client`() = runTest {
        var capturedUrl: String? = null
        val mockEngine = MockEngine { request ->
            capturedUrl = request.url.toString()
            respond(
                content = emptyResponse,
                status = HttpStatusCode.OK,
                headers = headersOf(HttpHeaders.ContentType, "application/json")
            )
        }
        val httpClient = HttpClient(mockEngine) {
            install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
        }
        val apiClient = HackathonApiClient("http://localhost:8080", httpClient)
        val server = createServer(apiClient)

        val registeredTool = server.tools["search_hackathons"]!!
        val request = CallToolRequest(
            CallToolRequestParams(
                name = "search_hackathons",
                arguments = buildJsonObject {
                    put("query", "AI")
                    put("timeFrame", "upcoming")
                    put("status", "registration_open")
                    put("page", 2)
                    put("size", 10)
                }
            )
        )

        registeredTool.handler(request)

        val url = capturedUrl!!
        assertTrue(url.contains("query=AI"))
        assertTrue(url.contains("timeFrame=upcoming"))
        assertTrue(url.contains("status=registration_open"))
        assertTrue(url.contains("page=2"))
        assertTrue(url.contains("size=10"))
    }

    private fun createMockApiClient(responseBody: String): HackathonApiClient {
        val mockEngine = MockEngine {
            respond(
                content = responseBody,
                status = HttpStatusCode.OK,
                headers = headersOf(HttpHeaders.ContentType, "application/json")
            )
        }
        val httpClient = HttpClient(mockEngine) {
            install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
        }
        return HackathonApiClient("http://localhost:8080", httpClient)
    }
}
