package com.hackathon.manager.repository

import com.hackathon.manager.entity.EventAttendee
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface EventAttendeeRepository : JpaRepository<EventAttendee, UUID> {
    fun findByEventIdAndUserId(eventId: UUID, userId: UUID): EventAttendee?
    fun findByEventIdOrderByUserLastNameAscUserFirstNameAsc(eventId: UUID): List<EventAttendee>
    fun existsByEventIdAndUserId(eventId: UUID, userId: UUID): Boolean
    fun countByEventIdAndRsvpStatus(eventId: UUID, rsvpStatus: String): Long
    fun deleteByEventIdAndUserId(eventId: UUID, userId: UUID)
}
