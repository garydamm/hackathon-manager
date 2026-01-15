package com.hackathon.manager.entity

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import java.math.BigDecimal
import java.time.OffsetDateTime
import java.util.*

@Entity
@Table(name = "judging_criteria")
class JudgingCriteria(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hackathon_id", nullable = false)
    var hackathon: Hackathon,

    @Column(nullable = false)
    var name: String,

    var description: String? = null,

    @Column(name = "max_score")
    var maxScore: Int = 10,

    @Column(precision = 3, scale = 2)
    var weight: BigDecimal = BigDecimal("1.00"),

    @Column(name = "display_order")
    var displayOrder: Int = 0,

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    val createdAt: OffsetDateTime? = null
) {
    @OneToMany(mappedBy = "criteria", cascade = [CascadeType.ALL], orphanRemoval = true)
    val scores: MutableList<Score> = mutableListOf()
}
