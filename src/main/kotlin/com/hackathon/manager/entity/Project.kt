package com.hackathon.manager.entity

import com.hackathon.manager.entity.enums.SubmissionStatus
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.annotations.UpdateTimestamp
import org.hibernate.type.SqlTypes
import java.time.OffsetDateTime
import java.util.*

@Entity
@Table(name = "projects")
class Project(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    var team: Team? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hackathon_id", nullable = false)
    var hackathon: Hackathon,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    var createdBy: User,

    @Column(nullable = false)
    var name: String,

    var tagline: String? = null,

    var description: String? = null,

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(columnDefinition = "submission_status")
    var status: SubmissionStatus = SubmissionStatus.draft,

    @Column(name = "demo_url")
    var demoUrl: String? = null,

    @Column(name = "video_url")
    var videoUrl: String? = null,

    @Column(name = "repository_url")
    var repositoryUrl: String? = null,

    @Column(name = "presentation_url")
    var presentationUrl: String? = null,

    @Column(name = "thumbnail_url")
    var thumbnailUrl: String? = null,

    @Column(columnDefinition = "text[]")
    var technologies: Array<String>? = null,

    @Column(name = "submitted_at")
    var submittedAt: OffsetDateTime? = null,

    @Column(name = "archived_at")
    var archivedAt: OffsetDateTime? = null,

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    val createdAt: OffsetDateTime? = null,

    @UpdateTimestamp
    @Column(name = "updated_at")
    val updatedAt: OffsetDateTime? = null
) {
    @OneToMany(mappedBy = "project", cascade = [CascadeType.ALL], orphanRemoval = true)
    val media: MutableList<ProjectMedia> = mutableListOf()

    @OneToMany(mappedBy = "project", cascade = [CascadeType.ALL], orphanRemoval = true)
    val judgeAssignments: MutableList<JudgeAssignment> = mutableListOf()

    @OneToMany(mappedBy = "project", cascade = [CascadeType.ALL], orphanRemoval = true)
    val prizeWins: MutableList<PrizeWinner> = mutableListOf()
}
