package com.hackathon.manager.repository

import com.hackathon.manager.entity.Project
import com.hackathon.manager.entity.enums.SubmissionStatus
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface ProjectRepository : JpaRepository<Project, UUID> {
    fun findByHackathonIdAndArchivedAtIsNull(hackathonId: UUID): List<Project>
    fun findByTeamIdAndArchivedAtIsNull(teamId: UUID): Project?
    fun findByHackathonIdAndStatusAndArchivedAtIsNull(hackathonId: UUID, status: SubmissionStatus): List<Project>
    fun existsByTeamIdAndHackathonIdAndArchivedAtIsNull(teamId: UUID, hackathonId: UUID): Boolean
    fun findByHackathonIdAndCreatedByIdAndArchivedAtIsNull(hackathonId: UUID, userId: UUID): List<Project>
    fun findByHackathonIdAndTeamIsNullAndArchivedAtIsNull(hackathonId: UUID): List<Project>
}
