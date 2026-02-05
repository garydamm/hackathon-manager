package com.hackathon.manager.service

import com.hackathon.manager.dto.CreateTeamRequest
import com.hackathon.manager.dto.TeamResponse
import com.hackathon.manager.dto.UpdateTeamRequest
import com.hackathon.manager.entity.Team
import com.hackathon.manager.entity.TeamMember
import com.hackathon.manager.exception.*
import com.hackathon.manager.repository.*
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
            .map { team -> TeamResponse.fromEntity(team) }
    }

    @Transactional(readOnly = true)
    fun getTeamById(id: UUID): TeamResponse {
        val team = teamRepository.findById(id)
            .orElseThrow { NotFoundException("Team not found") }
        return TeamResponse.fromEntity(team, includeMembers = true)
    }

    @Transactional(readOnly = true)
    fun getUserTeamInHackathon(hackathonId: UUID, userId: UUID): TeamResponse? {
        val team = teamRepository.findByHackathonIdAndMemberUserId(hackathonId, userId)
        return team?.let { foundTeam -> TeamResponse.fromEntity(foundTeam, includeMembers = true) }
    }

    @Transactional
    fun createTeam(request: CreateTeamRequest, creatorId: UUID): TeamResponse {
        val hackathon = hackathonRepository.findById(request.hackathonId)
            .orElseThrow { NotFoundException("Hackathon not found") }

        if (hackathon.archived) {
            throw ValidationException("Cannot create a team in an archived hackathon")
        }

        if (!hackathonUserRepository.existsByHackathonIdAndUserId(request.hackathonId, creatorId)) {
            throw UnauthorizedException("Must be registered for the hackathon to create a team")
        }

        if (teamRepository.findByHackathonIdAndMemberUserId(request.hackathonId, creatorId) != null) {
            throw ConflictException("Already a member of a team in this hackathon")
        }

        if (teamRepository.existsByHackathonIdAndName(request.hackathonId, request.name)) {
            throw ConflictException("Team name already exists in this hackathon")
        }

        val creator = userRepository.findById(creatorId)
            .orElseThrow { NotFoundException("User not found") }

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
        val savedMember = teamMemberRepository.save(member)
        savedTeam.members.add(savedMember)

        return TeamResponse.fromEntity(savedTeam, includeMembers = true)
    }

    @Transactional
    fun updateTeam(id: UUID, request: UpdateTeamRequest, userId: UUID): TeamResponse {
        val team = teamRepository.findById(id)
            .orElseThrow { NotFoundException("Team not found") }

        val member = teamMemberRepository.findByTeamIdAndUserId(id, userId)
            ?: throw UnauthorizedException("Not a member of this team")

        if (!member.isLeader) {
            throw UnauthorizedException("Only team leader can update team")
        }

        request.name?.let { newName ->
            if (teamRepository.existsByHackathonIdAndName(team.hackathon.id!!, newName) && newName != team.name) {
                throw ConflictException("Team name already exists")
            }
            team.name = newName
        }
        request.description?.let { newDescription -> team.description = newDescription }
        request.isOpen?.let { openStatus -> team.isOpen = openStatus }

        val savedTeam = teamRepository.save(team)
        return TeamResponse.fromEntity(savedTeam, includeMembers = true)
    }

    @Transactional
    fun joinTeamByInviteCode(inviteCode: String, userId: UUID): TeamResponse {
        val team = teamRepository.findByInviteCode(inviteCode)
            ?: throw NotFoundException("Invalid invite code")

        if (!team.isOpen) {
            throw UnauthorizedException("Team is not accepting new members")
        }

        return addUserToTeam(team, userId)
    }

    @Transactional
    fun joinTeamById(teamId: UUID, userId: UUID): TeamResponse {
        val team = teamRepository.findById(teamId)
            .orElseThrow { NotFoundException("Team not found") }

        if (!team.isOpen) {
            throw UnauthorizedException("Team is not accepting new members")
        }

        return addUserToTeam(team, userId)
    }

    private fun addUserToTeam(team: Team, userId: UUID): TeamResponse {
        if (team.hackathon.archived) {
            throw ValidationException("Cannot join a team in an archived hackathon")
        }

        if (!hackathonUserRepository.existsByHackathonIdAndUserId(team.hackathon.id!!, userId)) {
            throw UnauthorizedException("Must be registered for the hackathon to join a team")
        }

        if (teamRepository.findByHackathonIdAndMemberUserId(team.hackathon.id!!, userId) != null) {
            throw ConflictException("Already a member of a team in this hackathon")
        }

        val memberCount = teamMemberRepository.countByTeamId(team.id!!)
        if (memberCount >= team.hackathon.maxTeamSize) {
            throw ValidationException("Team is full")
        }

        val user = userRepository.findById(userId)
            .orElseThrow { NotFoundException("User not found") }

        val member = TeamMember(
            team = team,
            user = user,
            isLeader = false
        )
        val savedMember = teamMemberRepository.save(member)
        team.members.add(savedMember)

        return TeamResponse.fromEntity(team, includeMembers = true)
    }

    @Transactional
    fun leaveTeam(teamId: UUID, userId: UUID) {
        val member = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
            ?: throw NotFoundException("Not a member of this team")

        if (member.isLeader) {
            val otherMembers = teamMemberRepository.findByTeamId(teamId).filter { teamMember -> teamMember.user.id != userId }
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
            .orElseThrow { NotFoundException("Team not found") }

        val member = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
            ?: throw UnauthorizedException("Not a member of this team")

        if (!member.isLeader) {
            throw UnauthorizedException("Only team leader can regenerate invite code")
        }

        team.inviteCode = generateInviteCode()
        teamRepository.save(team)
        return team.inviteCode!!
    }

    private fun generateInviteCode(): String {
        val chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        val random = SecureRandom()
        return (1..8).map { _ -> chars[random.nextInt(chars.length)] }.joinToString("")
    }
}
