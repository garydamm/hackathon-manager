package com.hackathon.manager.entity

import jakarta.persistence.*
import java.time.OffsetDateTime
import java.util.*

@Entity
@Table(
    name = "prize_winners",
    uniqueConstraints = [UniqueConstraint(columnNames = ["prize_id", "project_id"])]
)
class PrizeWinner(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prize_id", nullable = false)
    var prize: Prize,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    var project: Project,

    var placement: Int = 1,

    @Column(name = "awarded_at")
    val awardedAt: OffsetDateTime = OffsetDateTime.now()
)
