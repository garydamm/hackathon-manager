package com.hackathon.manager.entity

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.OffsetDateTime
import java.util.*

@Entity
@Table(
    name = "teams",
    uniqueConstraints = [UniqueConstraint(columnNames = ["hackathon_id", "name"])]
)
class Team(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hackathon_id", nullable = false)
    var hackathon: Hackathon,

    @Column(nullable = false)
    var name: String,

    var description: String? = null,

    @Column(name = "avatar_url")
    var avatarUrl: String? = null,

    @Column(name = "invite_code", unique = true)
    var inviteCode: String? = null,

    @Column(name = "is_open")
    var isOpen: Boolean = true,

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
    @OneToMany(mappedBy = "team", cascade = [CascadeType.ALL], orphanRemoval = true)
    val members: MutableList<TeamMember> = mutableListOf()

    @OneToOne(mappedBy = "team", cascade = [CascadeType.ALL], orphanRemoval = true)
    var project: Project? = null
}
