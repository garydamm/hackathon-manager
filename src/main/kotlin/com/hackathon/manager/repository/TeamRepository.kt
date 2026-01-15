package com.hackathon.manager.repository

import com.hackathon.manager.entity.Team
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface TeamRepository : JpaRepository<Team, UUID> {
    fun findByHackathonId(hackathonId: UUID): List<Team>
    fun findByInviteCode(inviteCode: String): Team?
    fun existsByHackathonIdAndName(hackathonId: UUID, name: String): Boolean

    @Query("SELECT t FROM Team t JOIN t.members m WHERE m.user.id = :userId AND t.hackathon.id = :hackathonId")
    fun findByHackathonIdAndMemberUserId(hackathonId: UUID, userId: UUID): Team?
}
