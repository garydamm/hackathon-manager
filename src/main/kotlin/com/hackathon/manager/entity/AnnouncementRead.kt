package com.hackathon.manager.entity

import jakarta.persistence.*
import java.time.OffsetDateTime
import java.util.*

@Entity
@Table(
    name = "announcement_reads",
    uniqueConstraints = [UniqueConstraint(columnNames = ["announcement_id", "user_id"])]
)
class AnnouncementRead(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "announcement_id", nullable = false)
    var announcement: Announcement,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    var user: User,

    @Column(name = "read_at")
    val readAt: OffsetDateTime = OffsetDateTime.now()
)
