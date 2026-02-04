package com.hackathon.manager.service

import com.hackathon.manager.dto.CreateHackathonRequest
import com.hackathon.manager.dto.HackathonResponse
import com.hackathon.manager.dto.ParticipantResponse
import com.hackathon.manager.dto.UpdateHackathonRequest
import com.hackathon.manager.entity.Hackathon
import com.hackathon.manager.entity.HackathonUser
import com.hackathon.manager.entity.enums.HackathonStatus
import com.hackathon.manager.entity.enums.UserRole
import com.hackathon.manager.exception.*
import com.hackathon.manager.repository.HackathonRepository
import com.hackathon.manager.repository.HackathonUserRepository
import com.hackathon.manager.repository.TeamMemberRepository
import com.hackathon.manager.repository.UserRepository
import com.hackathon.manager.util.applyIfNotNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

@Service
class HackathonService(
    private val hackathonRepository: HackathonRepository,
    private val hackathonUserRepository: HackathonUserRepository,
    private val userRepository: UserRepository,
    private val teamMemberRepository: TeamMemberRepository
) {

    @Transactional(readOnly = true)
    fun getAllHackathons(): List<HackathonResponse> {
        return hackathonRepository.findAll().map { hackathon ->
            val participantCount = getParticipantCount(hackathon.id!!)
            HackathonResponse.fromEntity(hackathon, participantCount)
        }
    }

    @Transactional(readOnly = true)
    fun getActiveHackathons(): List<HackathonResponse> {
        return hackathonRepository.findActiveHackathons().map { hackathon ->
            val participantCount = getParticipantCount(hackathon.id!!)
            HackathonResponse.fromEntity(hackathon, participantCount)
        }
    }

    @Transactional(readOnly = true)
    fun getHackathonById(id: UUID, userId: UUID? = null): HackathonResponse {
        val hackathon = hackathonRepository.findById(id)
            .orElseThrow { NotFoundException("Hackathon not found") }
        val participantCount = getParticipantCount(id)
        val userRole = userId?.let { uid -> hackathonUserRepository.findByHackathonIdAndUserId(id, uid)?.role }
        return HackathonResponse.fromEntity(hackathon, participantCount, userRole)
    }

    @Transactional(readOnly = true)
    fun getHackathonBySlug(slug: String, userId: UUID? = null): HackathonResponse {
        val hackathon = hackathonRepository.findBySlug(slug)
            ?: throw NotFoundException("Hackathon not found")
        val participantCount = getParticipantCount(hackathon.id!!)
        val userRole = userId?.let { uid -> hackathonUserRepository.findByHackathonIdAndUserId(hackathon.id!!, uid)?.role }
        return HackathonResponse.fromEntity(hackathon, participantCount, userRole)
    }

    @Transactional
    fun createHackathon(request: CreateHackathonRequest, creatorId: UUID): HackathonResponse {
        if (hackathonRepository.existsBySlug(request.slug)) {
            throw ConflictException("Slug already exists")
        }

        val creator = userRepository.findById(creatorId)
            .orElseThrow { NotFoundException("User not found") }

        val hackathon = Hackathon(
            name = request.name,
            slug = request.slug,
            description = request.description,
            rules = request.rules,
            status = request.status ?: HackathonStatus.draft,
            bannerUrl = request.bannerUrl,
            logoUrl = request.logoUrl,
            location = request.location,
            isVirtual = request.isVirtual,
            timezone = request.timezone,
            registrationOpensAt = request.registrationOpensAt,
            registrationClosesAt = request.registrationClosesAt,
            startsAt = request.startsAt,
            endsAt = request.endsAt,
            judgingStartsAt = request.judgingStartsAt,
            judgingEndsAt = request.judgingEndsAt,
            maxTeamSize = request.maxTeamSize,
            minTeamSize = request.minTeamSize,
            maxParticipants = request.maxParticipants,
            createdBy = creator
        )

        val savedHackathon = hackathonRepository.save(hackathon)

        // Add creator as organizer
        val hackathonUser = HackathonUser(
            hackathon = savedHackathon,
            user = creator,
            role = UserRole.organizer
        )
        hackathonUserRepository.save(hackathonUser)

        return HackathonResponse.fromEntity(savedHackathon, 0, UserRole.organizer)
    }

    @Transactional
    fun updateHackathon(id: UUID, request: UpdateHackathonRequest): HackathonResponse {
        val hackathon = hackathonRepository.findById(id)
            .orElseThrow { NotFoundException("Hackathon not found") }

        request.name.applyIfNotNull { hackathon.name = it }
        request.description.applyIfNotNull { hackathon.description = it }
        request.rules.applyIfNotNull { hackathon.rules = it }
        request.status.applyIfNotNull { hackathon.status = it }
        request.bannerUrl.applyIfNotNull { hackathon.bannerUrl = it }
        request.logoUrl.applyIfNotNull { hackathon.logoUrl = it }
        request.location.applyIfNotNull { hackathon.location = it }
        request.isVirtual.applyIfNotNull { hackathon.isVirtual = it }
        request.timezone.applyIfNotNull { hackathon.timezone = it }
        request.registrationOpensAt.applyIfNotNull { hackathon.registrationOpensAt = it }
        request.registrationClosesAt.applyIfNotNull { hackathon.registrationClosesAt = it }
        request.startsAt.applyIfNotNull { hackathon.startsAt = it }
        request.endsAt.applyIfNotNull { hackathon.endsAt = it }
        request.judgingStartsAt.applyIfNotNull { hackathon.judgingStartsAt = it }
        request.judgingEndsAt.applyIfNotNull { hackathon.judgingEndsAt = it }
        request.maxTeamSize.applyIfNotNull { hackathon.maxTeamSize = it }
        request.minTeamSize.applyIfNotNull { hackathon.minTeamSize = it }
        request.maxParticipants.applyIfNotNull { hackathon.maxParticipants = it }

        val savedHackathon = hackathonRepository.save(hackathon)
        val participantCount = getParticipantCount(id)
        return HackathonResponse.fromEntity(savedHackathon, participantCount)
    }

    @Transactional
    fun registerForHackathon(hackathonId: UUID, userId: UUID): HackathonResponse {
        val hackathon = hackathonRepository.findById(hackathonId)
            .orElseThrow { NotFoundException("Hackathon not found") }

        if (hackathon.status != HackathonStatus.registration_open) {
            throw ValidationException("Registration is not open")
        }

        // Check if user already has a role in this hackathon
        val existingRole = hackathonUserRepository.findByHackathonIdAndUserId(hackathonId, userId)
        if (existingRole != null) {
            // Organizers, judges, and admins are already part of the hackathon - return their current status
            if (existingRole.role != UserRole.participant) {
                val participantCount = getParticipantCount(hackathonId)
                return HackathonResponse.fromEntity(hackathon, participantCount, existingRole.role)
            }
            throw ConflictException("Already registered for this hackathon")
        }

        val participantCount = getParticipantCount(hackathonId)
        if (hackathon.maxParticipants != null && participantCount >= hackathon.maxParticipants!!) {
            throw ValidationException("Hackathon is full")
        }

        val user = userRepository.findById(userId)
            .orElseThrow { NotFoundException("User not found") }

        val hackathonUser = HackathonUser(
            hackathon = hackathon,
            user = user,
            role = UserRole.participant
        )
        hackathonUserRepository.save(hackathonUser)

        return HackathonResponse.fromEntity(hackathon, getParticipantCount(hackathonId), UserRole.participant)
    }

    @Transactional
    fun unregisterForHackathon(hackathonId: UUID, userId: UUID): HackathonResponse {
        val hackathon = hackathonRepository.findById(hackathonId)
            .orElseThrow { NotFoundException("Hackathon not found") }

        val hackathonUser = hackathonUserRepository.findByHackathonIdAndUserId(hackathonId, userId)
            ?: throw NotFoundException("Not registered for this hackathon")

        hackathonUserRepository.delete(hackathonUser)

        val participantCount = getParticipantCount(hackathonId)
        return HackathonResponse.fromEntity(hackathon, participantCount, null)
    }

    @Transactional(readOnly = true)
    fun getUserRoleInHackathon(hackathonId: UUID, userId: UUID): UserRole? {
        return hackathonUserRepository.findByHackathonIdAndUserId(hackathonId, userId)?.role
    }

    @Transactional(readOnly = true)
    fun isUserOrganizer(hackathonId: UUID, userId: UUID): Boolean {
        val role = getUserRoleInHackathon(hackathonId, userId)
        return role == UserRole.organizer || role == UserRole.admin
    }

    @Transactional(readOnly = true)
    fun isUserRegistered(hackathonId: UUID, userId: UUID): Boolean {
        return hackathonUserRepository.existsByHackathonIdAndUserId(hackathonId, userId)
    }

    @Transactional(readOnly = true)
    fun getUserDraftHackathons(userId: UUID): List<HackathonResponse> {
        return hackathonRepository.findByOrganizerAndStatus(userId, HackathonStatus.draft)
            .map { hackathon ->
                val participantCount = getParticipantCount(hackathon.id!!)
                HackathonResponse.fromEntity(hackathon, participantCount)
            }
    }

    @Transactional(readOnly = true)
    fun getHackathonOrganizers(hackathonId: UUID): List<com.hackathon.manager.dto.OrganizerInfo> {
        // Verify hackathon exists
        hackathonRepository.findById(hackathonId)
            .orElseThrow { NotFoundException("Hackathon not found") }

        val organizers = hackathonUserRepository.findByHackathonIdAndRole(hackathonId, UserRole.organizer)
        return organizers.map { hackathonUser ->
            com.hackathon.manager.dto.OrganizerInfo(
                userId = hackathonUser.user.id!!,
                email = hackathonUser.user.email,
                firstName = hackathonUser.user.firstName,
                lastName = hackathonUser.user.lastName,
                displayName = hackathonUser.user.displayName,
                avatarUrl = hackathonUser.user.avatarUrl
            )
        }
    }

    /**
     * Get all participants for a hackathon.
     * Returns participants sorted alphabetically by name.
     * Participants are all users registered for the hackathon with the participant role,
     * regardless of whether they have joined a team.
     */
    @Transactional(readOnly = true)
    fun getHackathonParticipants(hackathonId: UUID): List<ParticipantResponse> {
        // Verify hackathon exists
        hackathonRepository.findById(hackathonId)
            .orElseThrow { NotFoundException("Hackathon not found") }

        // Get all registered participants
        val hackathonUsers = hackathonUserRepository.findByHackathonIdAndRole(hackathonId, UserRole.participant)

        // Get all team members for the hackathon to map users to their teams
        val teamMembers = teamMemberRepository.findByHackathonId(hackathonId)
        val teamMembersByUserId = teamMembers.associateBy { it.user.id }

        // Create participant responses, including team info if available
        return hackathonUsers
            .map { hackathonUser ->
                val teamMember = teamMembersByUserId[hackathonUser.user.id]
                ParticipantResponse.fromHackathonUser(hackathonUser, teamMember)
            }
            .sortedBy { it.name }
    }

    /**
     * Get the participant count for a hackathon.
     * Counts all users registered for the hackathon with the participant role.
     */
    private fun getParticipantCount(hackathonId: UUID): Int {
        return hackathonUserRepository.findByHackathonIdAndRole(hackathonId, UserRole.participant).size
    }

    /**
     * Promote a participant to organizer.
     * Only existing organizers can promote participants.
     * The target user must be a registered participant.
     */
    @Transactional
    fun promoteToOrganizer(hackathonId: UUID, userId: UUID, requesterId: UUID): List<com.hackathon.manager.dto.OrganizerInfo> {
        // Verify requester has organizer or admin role
        if (!isUserOrganizer(hackathonId, requesterId)) {
            throw UnauthorizedException("Only organizers can promote participants")
        }

        // Verify hackathon exists
        hackathonRepository.findById(hackathonId)
            .orElseThrow { NotFoundException("Hackathon not found") }

        // Verify target user exists in hackathon_users
        val hackathonUser = hackathonUserRepository.findByHackathonIdAndUserId(hackathonId, userId)
            ?: throw NotFoundException("User not found in this hackathon")

        // Verify target user is a participant
        if (hackathonUser.role != UserRole.participant) {
            throw ValidationException("User is not a participant")
        }

        // Update role to organizer
        hackathonUser.role = UserRole.organizer
        hackathonUserRepository.save(hackathonUser)

        // Return updated list of organizers
        return getHackathonOrganizers(hackathonId)
    }
}
