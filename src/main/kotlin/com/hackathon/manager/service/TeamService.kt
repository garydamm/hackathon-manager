package com.hackathon.manager.service

import com.hackathon.manager.dto.CreateTeamRequest
import com.hackathon.manager.dto.TeamResponse
import com.hackathon.manager.dto.UpdateTeamRequest
import com.hackathon.manager.entity.Team
import com.hackathon.manager.entity.TeamMember
import com.hackathon.manager.exception.ApiException
import com.hackathon.manager.repository.*
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.security.SecureRandom
import java.util.*

@Service
class TeamService(
    private val teamRepository: TeamRepository,
    private val teamMemberRepository: TeamMemberRepository,
    private val hackathonRepository: HackathonRepository,
    private val hackathonUserRepository: HackathonUserRepository,
    private val userRepository: UserRepository
) {

    @Transactional(readOnly = true)
    fun getTeamsByHackathon(hackathonId: UUID): List<TeamResponse> {
        return teamRepository.findByHackathonId(hackathonId)
            .map { TeamResponse.fromEntity(it) }
    }

    @Transactional(readOnly = true)
    fun getTeamById(id: UUID): TeamResponse {
        val team = teamRepository.findById(id)
            .orElseThrow { ApiException("Team not found", HttpStatus.NOT_FOUND) }
        return TeamResponse.fromEntity(team, includeMembers = true)
    }

    @Transactional(readOnly = true)
    fun getUserTeamInHackathon(hackathonId: UUID, userId: UUID): TeamResponse? {
        val team = teamRepository.findByHackathonIdAndMemberUserId(hackathonId, userId)
        return team?.let { TeamResponse.fromEntity(it, includeMembers = true) }
    }

    @Transactional
    fun createTeam(request: CreateTeamRequest, creatorId: UUID): TeamResponse {
        val hackathon = hackathonRepository.findById(request.hackathonId)
            .orElseThrow { ApiException("Hackathon not found", HttpStatus.NOT_FOUND) }

        if (!hackathonUserRepository.existsByHackathonIdAndUserId(request.hackathonId, creatorId)) {
            throw ApiException("Must be registered for the hackathon to create a team", HttpStatus.FORBIDDEN)
        }

        if (teamRepository.findByHackathonIdAndMemberUserId(request.hackathonId, creatorId) != null) {
            throw ApiException("Already a member of a team in this hackathon", HttpStatus.CONFLICT)
        }

        if (teamRepository.existsByHackathonIdAndName(request.hackathonId, request.name)) {
            throw ApiException("Team name already exists in this hackathon", HttpStatus.CONFLICT)
        }

        val creator = userRepository.findById(creatorId)
            .orElseThrow { ApiException("User not found", HttpStatus.NOT_FOUND) }

        val team = Team(
            hackathon = hackathon,
            name = request.name,
            description = request.description,
            inviteCode = generateInviteCode(),
            isOpen = request.isOpen,
            createdBy = creator
        )

        val savedTeam = teamRepository.save(team)

        // Add creator as team leader
        val member = TeamMember(
            team = savedTeam,
            user = creator,
            isLeader = true
        )
        teamMemberRepository.save(member)
        savedTeam.members.add(member)

        return TeamResponse.fromEntity(savedTeam, includeMembers = true)
    }

    @Transactional
    fun updateTeam(id: UUID, request: UpdateTeamRequest, userId: UUID): TeamResponse {
        val team = teamRepository.findById(id)
            .orElseThrow { ApiException("Team not found", HttpStatus.NOT_FOUND) }

        val member = teamMemberRepository.findByTeamIdAndUserId(id, userId)
            ?: throw ApiException("Not a member of this team", HttpStatus.FORBIDDEN)

        if (!member.isLeader) {
            throw ApiException("Only team leader can update team", HttpStatus.FORBIDDEN)
        }

        request.name?.let {
            if (teamRepository.existsByHackathonIdAndName(team.hackathon.id!!, it) && it != team.name) {
                throw ApiException("Team name already exists", HttpStatus.CONFLICT)
            }
            team.name = it
        }
        request.description?.let { team.description = it }
        request.isOpen?.let { team.isOpen = it }

        val savedTeam = teamRepository.save(team)
        return TeamResponse.fromEntity(savedTeam, includeMembers = true)
    }

    @Transactional
    fun joinTeamByInviteCode(inviteCode: String, userId: UUID): TeamResponse {
        val team = teamRepository.findByInviteCode(inviteCode)
            ?: throw ApiException("Invalid invite code", HttpStatus.NOT_FOUND)

        if (!team.isOpen) {
            throw ApiException("Team is not accepting new members", HttpStatus.FORBIDDEN)
        }

        if (!hackathonUserRepository.existsByHackathonIdAndUserId(team.hackathon.id!!, userId)) {
            throw ApiException("Must be registered for the hackathon to join a team", HttpStatus.FORBIDDEN)
        }

        if (teamRepository.findByHackathonIdAndMemberUserId(team.hackathon.id!!, userId) != null) {
            throw ApiException("Already a member of a team in this hackathon", HttpStatus.CONFLICT)
        }

        val memberCount = teamMemberRepository.countByTeamId(team.id!!)
        if (memberCount >= team.hackathon.maxTeamSize) {
            throw ApiException("Team is full", HttpStatus.BAD_REQUEST)
        }

        val user = userRepository.findById(userId)
            .orElseThrow { ApiException("User not found", HttpStatus.NOT_FOUND) }

        val member = TeamMember(
            team = team,
            user = user,
            isLeader = false
        )
        teamMemberRepository.save(member)
        team.members.add(member)

        return TeamResponse.fromEntity(team, includeMembers = true)
    }

    @Transactional
    fun leaveTeam(teamId: UUID, userId: UUID) {
        val member = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
            ?: throw ApiException("Not a member of this team", HttpStatus.NOT_FOUND)

        if (member.isLeader) {
            val otherMembers = teamMemberRepository.findByTeamId(teamId).filter { it.user.id != userId }
            if (otherMembers.isNotEmpty()) {
                // Transfer leadership to another member
                val newLeader = otherMembers.first()
                newLeader.isLeader = true
                teamMemberRepository.save(newLeader)
            }
        }

        teamMemberRepository.delete(member)
    }

    @Transactional
    fun regenerateInviteCode(teamId: UUID, userId: UUID): String {
        val team = teamRepository.findById(teamId)
            .orElseThrow { ApiException("Team not found", HttpStatus.NOT_FOUND) }

        val member = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
            ?: throw ApiException("Not a member of this team", HttpStatus.FORBIDDEN)

        if (!member.isLeader) {
            throw ApiException("Only team leader can regenerate invite code", HttpStatus.FORBIDDEN)
        }

        team.inviteCode = generateInviteCode()
        teamRepository.save(team)
        return team.inviteCode!!
    }

    private fun generateInviteCode(): String {
        val chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        val random = SecureRandom()
        return (1..8).map { chars[random.nextInt(chars.length)] }.joinToString("")
    }
}
