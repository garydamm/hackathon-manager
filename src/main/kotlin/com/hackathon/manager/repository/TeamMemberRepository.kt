package com.hackathon.manager.repository

import com.hackathon.manager.entity.TeamMember
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface TeamMemberRepository : JpaRepository<TeamMember, UUID> {
    fun findByTeamId(teamId: UUID): List<TeamMember>
    fun findByUserId(userId: UUID): List<TeamMember>
    fun findByTeamIdAndUserId(teamId: UUID, userId: UUID): TeamMember?
    fun existsByTeamIdAndUserId(teamId: UUID, userId: UUID): Boolean
    fun countByTeamId(teamId: UUID): Int

    @Query("SELECT COUNT(DISTINCT tm.user.id) FROM TeamMember tm WHERE tm.team.hackathon.id = :hackathonId")
    fun countDistinctUsersByHackathonId(hackathonId: UUID): Int

    @Query("SELECT tm FROM TeamMember tm WHERE tm.team.hackathon.id = :hackathonId")
    fun findByHackathonId(hackathonId: UUID): List<TeamMember>
}
