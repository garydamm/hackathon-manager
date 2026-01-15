package com.hackathon.manager.entity

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.OffsetDateTime
import java.util.*

@Entity
@Table(name = "users")
class User(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @Column(nullable = false, unique = true)
    var email: String,

    @Column(name = "password_hash", nullable = false)
    var passwordHash: String,

    @Column(name = "first_name", nullable = false)
    var firstName: String,

    @Column(name = "last_name", nullable = false)
    var lastName: String,

    @Column(name = "display_name")
    var displayName: String? = null,

    @Column(name = "avatar_url")
    var avatarUrl: String? = null,

    var bio: String? = null,

    @Column(columnDefinition = "text[]")
    var skills: Array<String>? = null,

    @Column(name = "github_url")
    var githubUrl: String? = null,

    @Column(name = "linkedin_url")
    var linkedinUrl: String? = null,

    @Column(name = "portfolio_url")
    var portfolioUrl: String? = null,

    @Column(name = "is_active")
    var isActive: Boolean = true,

    @Column(name = "email_verified")
    var emailVerified: Boolean = false,

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    val createdAt: OffsetDateTime? = null,

    @UpdateTimestamp
    @Column(name = "updated_at")
    val updatedAt: OffsetDateTime? = null
) {
    @OneToMany(mappedBy = "user", cascade = [CascadeType.ALL], orphanRemoval = true)
    val hackathonRoles: MutableList<HackathonUser> = mutableListOf()

    @OneToMany(mappedBy = "user", cascade = [CascadeType.ALL], orphanRemoval = true)
    val teamMemberships: MutableList<TeamMember> = mutableListOf()
}
