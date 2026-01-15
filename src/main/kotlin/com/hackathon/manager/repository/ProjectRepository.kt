package com.hackathon.manager.repository

import com.hackathon.manager.entity.Project
import com.hackathon.manager.entity.enums.SubmissionStatus
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface ProjectRepository : JpaRepository<Project, UUID> {
    fun findByHackathonId(hackathonId: UUID): List<Project>
    fun findByTeamId(teamId: UUID): Project?
    fun findByHackathonIdAndStatus(hackathonId: UUID, status: SubmissionStatus): List<Project>
    fun existsByTeamIdAndHackathonId(teamId: UUID, hackathonId: UUID): Boolean
}
