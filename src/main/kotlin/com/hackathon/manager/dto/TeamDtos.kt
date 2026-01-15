package com.hackathon.manager.dto

import com.hackathon.manager.dto.auth.UserResponse
import com.hackathon.manager.entity.Team
import com.hackathon.manager.entity.TeamMember
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import java.time.OffsetDateTime
import java.util.*

data class TeamResponse(
    val id: UUID,
    val hackathonId: UUID,
    val name: String,
    val description: String?,
    val avatarUrl: String?,
    val inviteCode: String?,
    val isOpen: Boolean,
    val memberCount: Int,
    val members: List<TeamMemberResponse>?,
    val createdAt: OffsetDateTime?
) {
    companion object {
        fun fromEntity(team: Team, includeMembers: Boolean = false): TeamResponse {
            return TeamResponse(
                id = team.id!!,
                hackathonId = team.hackathon.id!!,
                name = team.name,
                description = team.description,
                avatarUrl = team.avatarUrl,
                inviteCode = team.inviteCode,
                isOpen = team.isOpen,
                memberCount = team.members.size,
                members = if (includeMembers) team.members.map { TeamMemberResponse.fromEntity(it) } else null,
                createdAt = team.createdAt
            )
        }
    }
}

data class TeamMemberResponse(
    val id: UUID,
    val user: UserResponse,
    val isLeader: Boolean,
    val joinedAt: OffsetDateTime
) {
    companion object {
        fun fromEntity(member: TeamMember): TeamMemberResponse {
            return TeamMemberResponse(
                id = member.id!!,
                user = UserResponse.fromEntity(member.user),
                isLeader = member.isLeader,
                joinedAt = member.joinedAt
            )
        }
    }
}

data class CreateTeamRequest(
    @field:NotNull(message = "Hackathon ID is required")
    val hackathonId: UUID,

    @field:NotBlank(message = "Team name is required")
    val name: String,

    val description: String? = null,
    val isOpen: Boolean = true
)

data class UpdateTeamRequest(
    val name: String? = null,
    val description: String? = null,
    val isOpen: Boolean? = null
)

data class JoinTeamRequest(
    @field:NotBlank(message = "Invite code is required")
    val inviteCode: String
)
