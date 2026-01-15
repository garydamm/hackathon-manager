package com.hackathon.manager.entity

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import java.time.OffsetDateTime
import java.util.*

@Entity
@Table(name = "prize_tracks")
class PrizeTrack(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hackathon_id", nullable = false)
    var hackathon: Hackathon,

    @Column(nullable = false)
    var name: String,

    var description: String? = null,

    @Column(name = "sponsor_name")
    var sponsorName: String? = null,

    @Column(name = "sponsor_logo_url")
    var sponsorLogoUrl: String? = null,

    @Column(name = "display_order")
    var displayOrder: Int = 0,

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    val createdAt: OffsetDateTime? = null
) {
    @OneToMany(mappedBy = "track", cascade = [CascadeType.ALL], orphanRemoval = true)
    val prizes: MutableList<Prize> = mutableListOf()
}
