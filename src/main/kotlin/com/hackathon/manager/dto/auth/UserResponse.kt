package com.hackathon.manager.dto.auth

import com.hackathon.manager.entity.User
import java.time.OffsetDateTime
import java.util.*

data class UserResponse(
    val id: UUID,
    val email: String,
    val firstName: String,
    val lastName: String,
    val displayName: String?,
    val avatarUrl: String?,
    val bio: String?,
    val skills: List<String>?,
    val githubUrl: String?,
    val linkedinUrl: String?,
    val portfolioUrl: String?,
    val createdAt: OffsetDateTime?
) {
    companion object {
        fun fromEntity(user: User): UserResponse {
            return UserResponse(
                id = user.id!!,
                email = user.email,
                firstName = user.firstName,
                lastName = user.lastName,
                displayName = user.displayName,
                avatarUrl = user.avatarUrl,
                bio = user.bio,
                skills = user.skills?.toList(),
                githubUrl = user.githubUrl,
                linkedinUrl = user.linkedinUrl,
                portfolioUrl = user.portfolioUrl,
                createdAt = user.createdAt
            )
        }
    }
}

data class UpdateUserRequest(
    val firstName: String? = null,
    val lastName: String? = null,
    val displayName: String? = null,
    val bio: String? = null,
    val skills: List<String>? = null,
    val githubUrl: String? = null,
    val linkedinUrl: String? = null,
    val portfolioUrl: String? = null
)
