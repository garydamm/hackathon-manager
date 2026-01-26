package com.hackathon.manager.service

import com.hackathon.manager.dto.CreateHackathonRequest
import com.hackathon.manager.dto.HackathonResponse
import com.hackathon.manager.dto.UpdateHackathonRequest
import com.hackathon.manager.entity.Hackathon
import com.hackathon.manager.entity.HackathonUser
import com.hackathon.manager.entity.enums.HackathonStatus
import com.hackathon.manager.entity.enums.UserRole
import com.hackathon.manager.exception.ApiException
import com.hackathon.manager.repository.HackathonRepository
import com.hackathon.manager.repository.HackathonUserRepository
import com.hackathon.manager.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

@Service
class HackathonService(
    private val hackathonRepository: HackathonRepository,
    private val hackathonUserRepository: HackathonUserRepository,
    private val userRepository: UserRepository
) {

    @Transactional(readOnly = true)
    fun getAllHackathons(): List<HackathonResponse> {
        return hackathonRepository.findAll().map { HackathonResponse.fromEntity(it) }
    }

    @Transactional(readOnly = true)
    fun getActiveHackathons(): List<HackathonResponse> {
        return hackathonRepository.findActiveHackathons().map { HackathonResponse.fromEntity(it) }
    }

    @Transactional(readOnly = true)
    fun getHackathonById(id: UUID, userId: UUID? = null): HackathonResponse {
        val hackathon = hackathonRepository.findById(id)
            .orElseThrow { ApiException("Hackathon not found", HttpStatus.NOT_FOUND) }
        val participantCount = hackathonUserRepository.findByHackathonIdAndRole(id, UserRole.participant).size
        val userRole = userId?.let { hackathonUserRepository.findByHackathonIdAndUserId(id, it)?.role }
        return HackathonResponse.fromEntity(hackathon, participantCount, userRole)
    }

    @Transactional(readOnly = true)
    fun getHackathonBySlug(slug: String, userId: UUID? = null): HackathonResponse {
        val hackathon = hackathonRepository.findBySlug(slug)
            ?: throw ApiException("Hackathon not found", HttpStatus.NOT_FOUND)
        val participantCount = hackathonUserRepository.findByHackathonIdAndRole(hackathon.id!!, UserRole.participant).size
        val userRole = userId?.let { hackathonUserRepository.findByHackathonIdAndUserId(hackathon.id!!, it)?.role }
        return HackathonResponse.fromEntity(hackathon, participantCount, userRole)
    }

    @Transactional
    fun createHackathon(request: CreateHackathonRequest, creatorId: UUID): HackathonResponse {
        if (hackathonRepository.existsBySlug(request.slug)) {
            throw ApiException("Slug already exists", HttpStatus.CONFLICT)
        }

        val creator = userRepository.findById(creatorId)
            .orElseThrow { ApiException("User not found", HttpStatus.NOT_FOUND) }

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
            .orElseThrow { ApiException("Hackathon not found", HttpStatus.NOT_FOUND) }

        request.name?.let { hackathon.name = it }
        request.description?.let { hackathon.description = it }
        request.rules?.let { hackathon.rules = it }
        request.status?.let { hackathon.status = it }
        request.bannerUrl?.let { hackathon.bannerUrl = it }
        request.logoUrl?.let { hackathon.logoUrl = it }
        request.location?.let { hackathon.location = it }
        request.isVirtual?.let { hackathon.isVirtual = it }
        request.timezone?.let { hackathon.timezone = it }
        request.registrationOpensAt?.let { hackathon.registrationOpensAt = it }
        request.registrationClosesAt?.let { hackathon.registrationClosesAt = it }
        request.startsAt?.let { hackathon.startsAt = it }
        request.endsAt?.let { hackathon.endsAt = it }
        request.judgingStartsAt?.let { hackathon.judgingStartsAt = it }
        request.judgingEndsAt?.let { hackathon.judgingEndsAt = it }
        request.maxTeamSize?.let { hackathon.maxTeamSize = it }
        request.minTeamSize?.let { hackathon.minTeamSize = it }
        request.maxParticipants?.let { hackathon.maxParticipants = it }

        val savedHackathon = hackathonRepository.save(hackathon)
        return HackathonResponse.fromEntity(savedHackathon)
    }

    @Transactional
    fun registerForHackathon(hackathonId: UUID, userId: UUID): HackathonResponse {
        val hackathon = hackathonRepository.findById(hackathonId)
            .orElseThrow { ApiException("Hackathon not found", HttpStatus.NOT_FOUND) }

        if (hackathon.status != HackathonStatus.registration_open) {
            throw ApiException("Registration is not open", HttpStatus.BAD_REQUEST)
        }

        // Check if user already has a role in this hackathon
        val existingRole = hackathonUserRepository.findByHackathonIdAndUserId(hackathonId, userId)
        if (existingRole != null) {
            // Organizers, judges, and admins are already part of the hackathon - return their current status
            if (existingRole.role != UserRole.participant) {
                val participantCount = hackathonUserRepository.findByHackathonIdAndRole(hackathonId, UserRole.participant).size
                return HackathonResponse.fromEntity(hackathon, participantCount, existingRole.role)
            }
            throw ApiException("Already registered for this hackathon", HttpStatus.CONFLICT)
        }

        val participantCount = hackathonUserRepository.findByHackathonIdAndRole(hackathonId, UserRole.participant).size
        if (hackathon.maxParticipants != null && participantCount >= hackathon.maxParticipants!!) {
            throw ApiException("Hackathon is full", HttpStatus.BAD_REQUEST)
        }

        val user = userRepository.findById(userId)
            .orElseThrow { ApiException("User not found", HttpStatus.NOT_FOUND) }

        val hackathonUser = HackathonUser(
            hackathon = hackathon,
            user = user,
            role = UserRole.participant
        )
        hackathonUserRepository.save(hackathonUser)

        return HackathonResponse.fromEntity(hackathon, participantCount + 1, UserRole.participant)
    }

    @Transactional
    fun unregisterForHackathon(hackathonId: UUID, userId: UUID): HackathonResponse {
        val hackathon = hackathonRepository.findById(hackathonId)
            .orElseThrow { ApiException("Hackathon not found", HttpStatus.NOT_FOUND) }

        val hackathonUser = hackathonUserRepository.findByHackathonIdAndUserId(hackathonId, userId)
            ?: throw ApiException("Not registered for this hackathon", HttpStatus.NOT_FOUND)

        hackathonUserRepository.delete(hackathonUser)

        val participantCount = hackathonUserRepository.findByHackathonIdAndRole(hackathonId, UserRole.participant).size
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
    fun getUserDraftHackathons(userId: UUID): List<HackathonResponse> {
        return hackathonRepository.findByOrganizerAndStatus(userId, HackathonStatus.draft)
            .map { HackathonResponse.fromEntity(it) }
    }
}
