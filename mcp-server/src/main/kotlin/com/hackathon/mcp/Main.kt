package com.hackathon.mcp

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.sse.*
import io.modelcontextprotocol.kotlin.sdk.server.Server
import io.modelcontextprotocol.kotlin.sdk.server.ServerOptions
import io.modelcontextprotocol.kotlin.sdk.server.mcp
import io.modelcontextprotocol.kotlin.sdk.types.CallToolResult
import io.modelcontextprotocol.kotlin.sdk.types.Implementation
import io.modelcontextprotocol.kotlin.sdk.types.ServerCapabilities
import io.modelcontextprotocol.kotlin.sdk.types.TextContent
import io.modelcontextprotocol.kotlin.sdk.types.Tool
import io.modelcontextprotocol.kotlin.sdk.types.ToolSchema
import kotlinx.serialization.json.*

val searchHackathonsTool = Tool(
    name = "search_hackathons",
    description = "Search for hackathons by keyword, time frame, status, or date range. Returns a paginated list of matching hackathons with their details.",
    inputSchema = ToolSchema(
        properties = buildJsonObject {
            put("query", buildJsonObject {
                put("type", JsonPrimitive("string"))
                put("description", JsonPrimitive("Full-text search on hackathon name and description"))
            })
            put("timeFrame", buildJsonObject {
                put("type", JsonPrimitive("string"))
                put("description", JsonPrimitive("Filter by time frame"))
                putJsonArray("enum") {
                    add("upcoming"); add("ongoing"); add("past")
                }
            })
            put("status", buildJsonObject {
                put("type", JsonPrimitive("string"))
                put("description", JsonPrimitive("Filter by hackathon status"))
                putJsonArray("enum") {
                    add("registration_open"); add("registration_closed")
                    add("in_progress"); add("judging")
                    add("completed"); add("cancelled")
                }
            })
            put("startDate", buildJsonObject {
                put("type", JsonPrimitive("string"))
                put("description", JsonPrimitive("Filter hackathons starting on or after this date (ISO format: YYYY-MM-DD)"))
            })
            put("endDate", buildJsonObject {
                put("type", JsonPrimitive("string"))
                put("description", JsonPrimitive("Filter hackathons ending on or before this date (ISO format: YYYY-MM-DD)"))
            })
            put("page", buildJsonObject {
                put("type", JsonPrimitive("integer"))
                put("description", JsonPrimitive("Page number (0-indexed, default: 0)"))
            })
            put("size", buildJsonObject {
                put("type", JsonPrimitive("integer"))
                put("description", JsonPrimitive("Results per page (default: 20, max: 100)"))
            })
        },
        required = emptyList()
    )
)

fun createServer(apiClient: HackathonApiClient): Server {
    val server = Server(
        Implementation(
            name = "hackathon-search",
            version = "1.0.0"
        ),
        ServerOptions(
            capabilities = ServerCapabilities(tools = ServerCapabilities.Tools(listChanged = true))
        )
    )

    server.addTool(searchHackathonsTool) { request ->
        val args = request.arguments ?: buildJsonObject { }
        try {
            val response = apiClient.searchHackathons(
                query = args["query"]?.jsonPrimitive?.contentOrNull,
                timeFrame = args["timeFrame"]?.jsonPrimitive?.contentOrNull,
                status = args["status"]?.jsonPrimitive?.contentOrNull,
                startDate = args["startDate"]?.jsonPrimitive?.contentOrNull,
                endDate = args["endDate"]?.jsonPrimitive?.contentOrNull,
                page = args["page"]?.jsonPrimitive?.intOrNull,
                size = args["size"]?.jsonPrimitive?.intOrNull
            )
            CallToolResult(
                content = listOf(TextContent(text = ResponseFormatter.formatSearchResponse(response)))
            )
        } catch (e: ApiException) {
            CallToolResult(
                content = listOf(TextContent(text = "Error from hackathon API (HTTP ${e.statusCode}): ${e.message}")),
                isError = true
            )
        } catch (e: Exception) {
            CallToolResult(
                content = listOf(TextContent(text = "Failed to search hackathons: ${e.message}")),
                isError = true
            )
        }
    }

    return server
}

fun main() {
    val apiBaseUrl = System.getenv("API_BASE_URL") ?: "http://localhost:8080"
    val port = System.getenv("PORT")?.toIntOrNull() ?: 3001
    val apiClient = HackathonApiClient(apiBaseUrl)

    println("Starting MCP server on port $port")

    embeddedServer(Netty, port = port) {
        install(SSE)

        routing {
            get("/health") {
                call.respondText("OK", ContentType.Text.Plain, HttpStatusCode.OK)
            }

            mcp("/sse") {
                createServer(apiClient)
            }
        }
    }.start(wait = true)
}
