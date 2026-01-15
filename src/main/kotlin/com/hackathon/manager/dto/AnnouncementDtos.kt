package com.hackathon.manager.dto

import com.hackathon.manager.entity.Announcement
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import java.time.OffsetDateTime
import java.util.*

data class AnnouncementResponse(
    val id: UUID,
    val hackathonId: UUID,
    val title: String,
    val content: String,
    val isPinned: Boolean,
    val isUrgent: Boolean,
    val publishedAt: OffsetDateTime,
    val createdById: UUID,
    val createdByName: String
) {
    companion object {
        fun fromEntity(announcement: Announcement): AnnouncementResponse {
            return AnnouncementResponse(
                id = announcement.id!!,
                hackathonId = announcement.hackathon.id!!,
                title = announcement.title,
                content = announcement.content,
                isPinned = announcement.isPinned,
                isUrgent = announcement.isUrgent,
                publishedAt = announcement.publishedAt,
                createdById = announcement.createdBy.id!!,
                createdByName = announcement.createdBy.displayName
                    ?: "${announcement.createdBy.firstName} ${announcement.createdBy.lastName}"
            )
        }
    }
}

data class CreateAnnouncementRequest(
    @field:NotNull(message = "Hackathon ID is required")
    val hackathonId: UUID,

    @field:NotBlank(message = "Title is required")
    val title: String,

    @field:NotBlank(message = "Content is required")
    val content: String,

    val isPinned: Boolean = false,
    val isUrgent: Boolean = false
)

data class UpdateAnnouncementRequest(
    val title: String? = null,
    val content: String? = null,
    val isPinned: Boolean? = null,
    val isUrgent: Boolean? = null
)
