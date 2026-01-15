package com.hackathon.manager.entity

import jakarta.persistence.*
import java.time.OffsetDateTime
import java.util.*

@Entity
@Table(
    name = "team_members",
    uniqueConstraints = [UniqueConstraint(columnNames = ["team_id", "user_id"])]
)
class TeamMember(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = false)
    var team: Team,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    var user: User,

    @Column(name = "is_leader")
    var isLeader: Boolean = false,

    @Column(name = "joined_at")
    val joinedAt: OffsetDateTime = OffsetDateTime.now()
)
