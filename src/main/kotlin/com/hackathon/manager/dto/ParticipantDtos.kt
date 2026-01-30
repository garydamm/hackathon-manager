package com.hackathon.manager.dto

import com.hackathon.manager.entity.HackathonUser
import com.hackathon.manager.entity.TeamMember
import java.time.OffsetDateTime
import java.util.*

data class ParticipantResponse(
    val id: UUID,
    val name: String,
    val email: String,
    val registeredAt: OffsetDateTime,
    val teamName: String?,
    val isTeamLeader: Boolean
) {
    companion object {
        fun fromTeamMember(teamMember: TeamMember): ParticipantResponse {
            val user = teamMember.user
            val name = "${user.firstName} ${user.lastName}"

            return ParticipantResponse(
                id = user.id!!,
                name = name,
                email = user.email,
                registeredAt = teamMember.joinedAt,
                teamName = teamMember.team.name,
                isTeamLeader = teamMember.isLeader
            )
        }

        fun fromHackathonUser(hackathonUser: HackathonUser, teamMember: TeamMember?): ParticipantResponse {
            val user = hackathonUser.user
            val name = "${user.firstName} ${user.lastName}"

            return ParticipantResponse(
                id = user.id!!,
                name = name,
                email = user.email,
                registeredAt = hackathonUser.registeredAt,
                teamName = teamMember?.team?.name,
                isTeamLeader = teamMember?.isLeader ?: false
            )
        }
    }
}
