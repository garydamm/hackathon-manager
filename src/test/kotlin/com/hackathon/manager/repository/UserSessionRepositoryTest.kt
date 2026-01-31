package com.hackathon.manager.repository

import com.hackathon.manager.entity.User
import com.hackathon.manager.entity.UserSession
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager
import java.time.OffsetDateTime

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class UserSessionRepositoryTest : AbstractRepositoryTest() {

    @Autowired
    lateinit var entityManager: TestEntityManager

    @Autowired
    lateinit var userSessionRepository: UserSessionRepository

    @Autowired
    lateinit var userRepository: UserRepository

    private lateinit var testUser: User

    @BeforeEach
    fun setUp() {
        testUser = User(
            email = "test@example.com",
            passwordHash = "hashedpassword",
            firstName = "Test",
            lastName = "User",
            displayName = "TestUser"
        )
        entityManager.persist(testUser)
        entityManager.flush()
    }

    @Test
    fun `findByRefreshTokenHash should return session when exists`() {
        val session = UserSession(
            user = testUser,
            refreshTokenHash = "hash123",
            deviceInfo = "Chrome on MacOS",
            ipAddress = "192.168.1.1",
            lastActivityAt = OffsetDateTime.now()
        )
        entityManager.persist(session)
        entityManager.flush()

        val found = userSessionRepository.findByRefreshTokenHash("hash123")

        assertThat(found).isPresent
        assertThat(found.get().refreshTokenHash).isEqualTo("hash123")
        assertThat(found.get().user.id).isEqualTo(testUser.id)
        assertThat(found.get().deviceInfo).isEqualTo("Chrome on MacOS")
    }

    @Test
    fun `findByRefreshTokenHash should return empty when session doesn't exist`() {
        val found = userSessionRepository.findByRefreshTokenHash("nonexistent")

        assertThat(found).isEmpty
    }

    @Test
    fun `findByUserId should return all sessions for user`() {
        val session1 = UserSession(
            user = testUser,
            refreshTokenHash = "hash1",
            deviceInfo = "Chrome on MacOS",
            ipAddress = "192.168.1.1",
            lastActivityAt = OffsetDateTime.now()
        )
        entityManager.persist(session1)

        val session2 = UserSession(
            user = testUser,
            refreshTokenHash = "hash2",
            deviceInfo = "Firefox on Windows",
            ipAddress = "192.168.1.2",
            lastActivityAt = OffsetDateTime.now()
        )
        entityManager.persist(session2)

        entityManager.flush()

        val found = userSessionRepository.findByUserId(testUser.id!!)

        assertThat(found).hasSize(2)
        assertThat(found.map { it.refreshTokenHash }).containsExactlyInAnyOrder("hash1", "hash2")
    }

    @Test
    fun `findByUserId should return empty list when no sessions exist`() {
        val found = userSessionRepository.findByUserId(testUser.id!!)

        assertThat(found).isEmpty()
    }

    @Test
    fun `session creation and persistence should work correctly`() {
        val now = OffsetDateTime.now()

        val session = UserSession(
            user = testUser,
            refreshTokenHash = "newhash123",
            deviceInfo = "Safari on iPhone",
            ipAddress = "10.0.0.1",
            lastActivityAt = now
        )

        val saved = userSessionRepository.save(session)
        entityManager.flush()
        entityManager.clear()

        assertThat(saved.id).isNotNull()
        assertThat(saved.refreshTokenHash).isEqualTo("newhash123")
        assertThat(saved.deviceInfo).isEqualTo("Safari on iPhone")
        assertThat(saved.ipAddress).isEqualTo("10.0.0.1")
        assertThat(saved.user.id).isEqualTo(testUser.id)
        assertThat(saved.createdAt).isNotNull()
        assertThat(saved.lastActivityAt).isNotNull()
    }

    @Test
    fun `unique constraint on refresh_token_hash should be enforced`() {
        val session1 = UserSession(
            user = testUser,
            refreshTokenHash = "uniquehash",
            deviceInfo = "Device 1",
            ipAddress = "192.168.1.1",
            lastActivityAt = OffsetDateTime.now()
        )
        entityManager.persist(session1)
        entityManager.flush()

        // Try to create another session with the same hash
        val session2 = UserSession(
            user = testUser,
            refreshTokenHash = "uniquehash",
            deviceInfo = "Device 2",
            ipAddress = "192.168.1.2",
            lastActivityAt = OffsetDateTime.now()
        )

        try {
            entityManager.persist(session2)
            entityManager.flush()
            // Should fail
            assertThat(true).isFalse()
        } catch (e: Exception) {
            // Expected - unique constraint violation
            assertThat(e).isNotNull()
        }
    }

    @Test
    fun `cascade deletion should delete sessions when user is deleted`() {
        val session = UserSession(
            user = testUser,
            refreshTokenHash = "cascadehash",
            deviceInfo = "Test Device",
            ipAddress = "192.168.1.1",
            lastActivityAt = OffsetDateTime.now()
        )
        entityManager.persist(session)
        entityManager.flush()

        val sessionId = session.id
        assertThat(sessionId).isNotNull()

        // Delete the user
        userRepository.delete(testUser)
        entityManager.flush()
        entityManager.clear()

        // Session should be deleted due to cascade
        val foundSession = userSessionRepository.findById(sessionId!!)
        assertThat(foundSession).isEmpty
    }

    @Test
    fun `lastActivityAt can be updated`() {
        val initialTime = OffsetDateTime.now().minusHours(1)
        val session = UserSession(
            user = testUser,
            refreshTokenHash = "activityhash",
            deviceInfo = "Test Device",
            ipAddress = "192.168.1.1",
            lastActivityAt = initialTime
        )
        entityManager.persist(session)
        entityManager.flush()
        entityManager.clear()

        // Update activity time
        val found = userSessionRepository.findByRefreshTokenHash("activityhash").get()
        val newTime = OffsetDateTime.now()
        found.lastActivityAt = newTime
        userSessionRepository.save(found)
        entityManager.flush()
        entityManager.clear()

        // Verify update
        val updated = userSessionRepository.findByRefreshTokenHash("activityhash").get()
        assertThat(updated.lastActivityAt).isAfterOrEqualTo(initialTime)
    }
}
