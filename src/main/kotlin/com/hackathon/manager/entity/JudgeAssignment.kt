package com.hackathon.manager.entity

import jakarta.persistence.*
import java.time.OffsetDateTime
import java.util.*

@Entity
@Table(
    name = "judge_assignments",
    uniqueConstraints = [UniqueConstraint(columnNames = ["judge_id", "project_id"])]
)
class JudgeAssignment(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hackathon_id", nullable = false)
    var hackathon: Hackathon,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "judge_id", nullable = false)
    var judge: User,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    var project: Project,

    @Column(name = "assigned_at")
    val assignedAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "completed_at")
    var completedAt: OffsetDateTime? = null
) {
    @OneToMany(mappedBy = "judgeAssignment", cascade = [CascadeType.ALL], orphanRemoval = true)
    val scores: MutableList<Score> = mutableListOf()
}
