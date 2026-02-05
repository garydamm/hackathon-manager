package com.hackathon.manager.entity

import com.hackathon.manager.entity.enums.HackathonStatus
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.annotations.UpdateTimestamp
import org.hibernate.type.SqlTypes
import java.time.OffsetDateTime
import java.util.*

@Entity
@Table(name = "hackathons")
class Hackathon(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @Column(nullable = false)
    var name: String,

    @Column(nullable = false, unique = true)
    var slug: String,

    var description: String? = null,

    var rules: String? = null,

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(columnDefinition = "hackathon_status")
    var status: HackathonStatus = HackathonStatus.draft,

    @Column(name = "banner_url")
    var bannerUrl: String? = null,

    @Column(name = "logo_url")
    var logoUrl: String? = null,

    var location: String? = null,

    @Column(name = "is_virtual")
    var isVirtual: Boolean = false,

    var timezone: String = "UTC",

    @Column(name = "registration_opens_at")
    var registrationOpensAt: OffsetDateTime? = null,

    @Column(name = "registration_closes_at")
    var registrationClosesAt: OffsetDateTime? = null,

    @Column(name = "starts_at", nullable = false)
    var startsAt: OffsetDateTime,

    @Column(name = "ends_at", nullable = false)
    var endsAt: OffsetDateTime,

    @Column(name = "judging_starts_at")
    var judgingStartsAt: OffsetDateTime? = null,

    @Column(name = "judging_ends_at")
    var judgingEndsAt: OffsetDateTime? = null,

    @Column(name = "max_team_size")
    var maxTeamSize: Int = 5,

    @Column(name = "min_team_size")
    var minTeamSize: Int = 1,

    @Column(name = "max_participants")
    var maxParticipants: Int? = null,

    @Column(nullable = false)
    var archived: Boolean = false,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    var createdBy: User,

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    val createdAt: OffsetDateTime? = null,

    @UpdateTimestamp
    @Column(name = "updated_at")
    val updatedAt: OffsetDateTime? = null
) {
    @OneToMany(mappedBy = "hackathon", cascade = [CascadeType.ALL], orphanRemoval = true)
    val participants: MutableList<HackathonUser> = mutableListOf()

    @OneToMany(mappedBy = "hackathon", cascade = [CascadeType.ALL], orphanRemoval = true)
    val teams: MutableList<Team> = mutableListOf()

    @OneToMany(mappedBy = "hackathon", cascade = [CascadeType.ALL], orphanRemoval = true)
    val projects: MutableList<Project> = mutableListOf()

    @OneToMany(mappedBy = "hackathon", cascade = [CascadeType.ALL], orphanRemoval = true)
    val judgingCriteria: MutableList<JudgingCriteria> = mutableListOf()

    @OneToMany(mappedBy = "hackathon", cascade = [CascadeType.ALL], orphanRemoval = true)
    val scheduleEvents: MutableList<ScheduleEvent> = mutableListOf()

    @OneToMany(mappedBy = "hackathon", cascade = [CascadeType.ALL], orphanRemoval = true)
    val announcements: MutableList<Announcement> = mutableListOf()

    @OneToMany(mappedBy = "hackathon", cascade = [CascadeType.ALL], orphanRemoval = true)
    val prizeTracks: MutableList<PrizeTrack> = mutableListOf()

    @OneToMany(mappedBy = "hackathon", cascade = [CascadeType.ALL], orphanRemoval = true)
    val prizes: MutableList<Prize> = mutableListOf()
}
