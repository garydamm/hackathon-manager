package com.hackathon.manager.entity

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import java.time.OffsetDateTime
import java.util.*

@Entity
@Table(name = "project_media")
class ProjectMedia(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    var project: Project,

    @Column(name = "media_url", nullable = false)
    var mediaUrl: String,

    @Column(name = "media_type")
    var mediaType: String = "image",

    var caption: String? = null,

    @Column(name = "display_order")
    var displayOrder: Int = 0,

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    val createdAt: OffsetDateTime? = null
)
