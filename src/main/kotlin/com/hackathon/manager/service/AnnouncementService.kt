package com.hackathon.manager.service

import com.hackathon.manager.dto.AnnouncementResponse
import com.hackathon.manager.dto.CreateAnnouncementRequest
import com.hackathon.manager.dto.UpdateAnnouncementRequest
import com.hackathon.manager.entity.Announcement
import com.hackathon.manager.exception.ApiException
import com.hackathon.manager.repository.AnnouncementRepository
import com.hackathon.manager.repository.HackathonRepository
import com.hackathon.manager.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

@Service
class AnnouncementService(
    private val announcementRepository: AnnouncementRepository,
    private val hackathonRepository: HackathonRepository,
    private val userRepository: UserRepository
) {

    @Transactional(readOnly = true)
    fun getAnnouncementsByHackathon(hackathonId: UUID): List<AnnouncementResponse> {
        return announcementRepository.findByHackathonIdOrderByIsPinnedDescPublishedAtDesc(hackathonId)
            .map { AnnouncementResponse.fromEntity(it) }
    }

    @Transactional(readOnly = true)
    fun getAnnouncementById(id: UUID): AnnouncementResponse {
        val announcement = announcementRepository.findById(id)
            .orElseThrow { ApiException("Announcement not found", HttpStatus.NOT_FOUND) }
        return AnnouncementResponse.fromEntity(announcement)
    }

    @Transactional
    fun createAnnouncement(request: CreateAnnouncementRequest, creatorId: UUID): AnnouncementResponse {
        val hackathon = hackathonRepository.findById(request.hackathonId)
            .orElseThrow { ApiException("Hackathon not found", HttpStatus.NOT_FOUND) }

        val creator = userRepository.findById(creatorId)
            .orElseThrow { ApiException("User not found", HttpStatus.NOT_FOUND) }

        val announcement = Announcement(
            hackathon = hackathon,
            title = request.title,
            content = request.content,
            isPinned = request.isPinned,
            isUrgent = request.isUrgent,
            createdBy = creator
        )

        val savedAnnouncement = announcementRepository.save(announcement)
        return AnnouncementResponse.fromEntity(savedAnnouncement)
    }

    @Transactional
    fun updateAnnouncement(id: UUID, request: UpdateAnnouncementRequest): AnnouncementResponse {
        val announcement = announcementRepository.findById(id)
            .orElseThrow { ApiException("Announcement not found", HttpStatus.NOT_FOUND) }

        request.title?.let { announcement.title = it }
        request.content?.let { announcement.content = it }
        request.isPinned?.let { announcement.isPinned = it }
        request.isUrgent?.let { announcement.isUrgent = it }

        val savedAnnouncement = announcementRepository.save(announcement)
        return AnnouncementResponse.fromEntity(savedAnnouncement)
    }

    @Transactional
    fun deleteAnnouncement(id: UUID) {
        if (!announcementRepository.existsById(id)) {
            throw ApiException("Announcement not found", HttpStatus.NOT_FOUND)
        }
        announcementRepository.deleteById(id)
    }
}
