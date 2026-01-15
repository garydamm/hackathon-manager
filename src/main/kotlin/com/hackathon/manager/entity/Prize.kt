package com.hackathon.manager.entity

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import java.time.OffsetDateTime
import java.util.*

@Entity
@Table(name = "prizes")
class Prize(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hackathon_id", nullable = false)
    var hackathon: Hackathon,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "track_id")
    var track: PrizeTrack? = null,

    @Column(nullable = false)
    var name: String,

    var description: String? = null,

    var value: String? = null,

    var quantity: Int = 1,

    @Column(name = "display_order")
    var displayOrder: Int = 0,

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    val createdAt: OffsetDateTime? = null
) {
    @OneToMany(mappedBy = "prize", cascade = [CascadeType.ALL], orphanRemoval = true)
    val winners: MutableList<PrizeWinner> = mutableListOf()
}
