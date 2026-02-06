package com.hackathon.mcp

import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
data class HackathonSearchResult(
    val id: String,
    val name: String,
    val slug: String,
    val description: String? = null,
    val status: String,
    val location: String? = null,
    val isVirtual: Boolean,
    val timezone: String,
    val registrationOpensAt: String? = null,
    val registrationClosesAt: String? = null,
    val startsAt: String,
    val endsAt: String,
    val judgingStartsAt: String? = null,
    val judgingEndsAt: String? = null,
    val maxTeamSize: Int,
    val minTeamSize: Int,
    val maxParticipants: Int? = null,
    val participantCount: Long,
    val bannerUrl: String? = null,
    val logoUrl: String? = null,
    val relevanceScore: Double? = null
)

@Serializable
data class HackathonSearchResponse(
    val results: List<HackathonSearchResult>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int
)

class HackathonApiClient(
    private val apiBaseUrl: String,
    private val httpClient: HttpClient = createDefaultClient()
) {
    companion object {
        private val json = Json { ignoreUnknownKeys = true }

        fun createDefaultClient(): HttpClient = HttpClient(CIO) {
            install(ContentNegotiation) {
                json(json)
            }
        }
    }

    suspend fun searchHackathons(
        query: String? = null,
        timeFrame: String? = null,
        status: String? = null,
        startDate: String? = null,
        endDate: String? = null,
        page: Int? = null,
        size: Int? = null
    ): HackathonSearchResponse {
        val response = httpClient.get("$apiBaseUrl/api/hackathons/search") {
            query?.let { parameter("query", it) }
            timeFrame?.let { parameter("timeFrame", it) }
            status?.let { parameter("status", it) }
            startDate?.let { parameter("startDate", it) }
            endDate?.let { parameter("endDate", it) }
            page?.let { parameter("page", it) }
            size?.let { parameter("size", it) }
        }

        if (!response.status.isSuccess()) {
            throw ApiException(response.status.value, response.bodyAsText())
        }

        return json.decodeFromString(response.bodyAsText())
    }

    fun close() {
        httpClient.close()
    }
}

class ApiException(val statusCode: Int, override val message: String) : RuntimeException(message)
