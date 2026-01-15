package com.hackathon.manager.entity

import com.hackathon.manager.entity.enums.EventType
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.annotations.UpdateTimestamp
import org.hibernate.type.SqlTypes
import java.time.OffsetDateTime
import java.util.*

@Entity
@Table(name = "schedule_events")
class ScheduleEvent(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hackathon_id", nullable = false)
    var hackathon: Hackathon,

    @Column(nullable = false)
    var name: String,

    var description: String? = null,

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "event_type", columnDefinition = "event_type")
    var eventType: EventType = EventType.other,

    var location: String? = null,

    @Column(name = "virtual_link")
    var virtualLink: String? = null,

    @Column(name = "starts_at", nullable = false)
    var startsAt: OffsetDateTime,

    @Column(name = "ends_at", nullable = false)
    var endsAt: OffsetDateTime,

    @Column(name = "is_mandatory")
    var isMandatory: Boolean = false,

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    val createdAt: OffsetDateTime? = null,

    @UpdateTimestamp
    @Column(name = "updated_at")
    val updatedAt: OffsetDateTime? = null
) {
    @OneToMany(mappedBy = "event", cascade = [CascadeType.ALL], orphanRemoval = true)
    val attendees: MutableList<EventAttendee> = mutableListOf()
}
