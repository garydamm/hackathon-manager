package com.hackathon.manager.entity

import com.hackathon.manager.entity.enums.UserRole
import jakarta.persistence.*
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.OffsetDateTime
import java.util.*

@Entity
@Table(
    name = "hackathon_users",
    uniqueConstraints = [UniqueConstraint(columnNames = ["hackathon_id", "user_id"])]
)
class HackathonUser(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hackathon_id", nullable = false)
    var hackathon: Hackathon,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    var user: User,

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(columnDefinition = "user_role")
    var role: UserRole = UserRole.participant,

    @Column(name = "registered_at")
    val registeredAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "checked_in_at")
    var checkedInAt: OffsetDateTime? = null
)
