package com.hackathon.manager.repository

import com.hackathon.manager.entity.PasswordResetToken
import com.hackathon.manager.entity.User
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager
import java.time.OffsetDateTime
import java.util.UUID

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class PasswordResetTokenRepositoryTest : AbstractRepositoryTest() {

    @Autowired
    lateinit var entityManager: TestEntityManager

    @Autowired
    lateinit var passwordResetTokenRepository: PasswordResetTokenRepository

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
    fun `findByToken should return token when exists`() {
        val token = PasswordResetToken(
            user = testUser,
            token = "test-token-123",
            expiresAt = OffsetDateTime.now().plusMinutes(15)
        )
        entityManager.persist(token)
        entityManager.flush()

        val found = passwordResetTokenRepository.findByToken("test-token-123")

        assertThat(found).isPresent
        assertThat(found.get().token).isEqualTo("test-token-123")
        assertThat(found.get().user.id).isEqualTo(testUser.id)
    }

    @Test
    fun `findByToken should return empty when token doesn't exist`() {
        val found = passwordResetTokenRepository.findByToken("nonexistent-token")

        assertThat(found).isEmpty
    }

    @Test
    fun `findByUserIdAndUsedAtIsNullAndExpiresAtAfter should return all valid tokens for user`() {
        val now = OffsetDateTime.now()

        // Valid unused token
        val validToken = PasswordResetToken(
            user = testUser,
            token = "valid-token",
            expiresAt = now.plusMinutes(15)
        )
        entityManager.persist(validToken)

        // Expired token (should not be returned)
        val expiredToken = PasswordResetToken(
            user = testUser,
            token = "expired-token",
            expiresAt = now.minusMinutes(1)
        )
        entityManager.persist(expiredToken)

        // Used token (should not be returned)
        val usedToken = PasswordResetToken(
            user = testUser,
            token = "used-token",
            expiresAt = now.plusMinutes(15),
            usedAt = now.minusMinutes(5)
        )
        entityManager.persist(usedToken)

        entityManager.flush()

        val found = passwordResetTokenRepository.findByUserIdAndUsedAtIsNullAndExpiresAtAfter(
            testUser.id!!,
            now
        )

        assertThat(found).hasSize(1)
        assertThat(found[0].token).isEqualTo("valid-token")
    }

    @Test
    fun `findByUserIdAndUsedAtIsNullAndExpiresAtAfter should return empty when no valid tokens exist`() {
        val now = OffsetDateTime.now()

        val found = passwordResetTokenRepository.findByUserIdAndUsedAtIsNullAndExpiresAtAfter(
            testUser.id!!,
            now
        )

        assertThat(found).isEmpty()
    }

    @Test
    fun `deleteByExpiresAtBefore should delete only expired tokens`() {
        val now = OffsetDateTime.now()

        // Expired token (should be deleted)
        val expiredToken1 = PasswordResetToken(
            user = testUser,
            token = "expired-1",
            expiresAt = now.minusDays(8)
        )
        entityManager.persist(expiredToken1)

        // Expired token (should be deleted)
        val expiredToken2 = PasswordResetToken(
            user = testUser,
            token = "expired-2",
            expiresAt = now.minusDays(10)
        )
        entityManager.persist(expiredToken2)

        // Valid token (should NOT be deleted)
        val validToken = PasswordResetToken(
            user = testUser,
            token = "valid-token",
            expiresAt = now.plusMinutes(15)
        )
        entityManager.persist(validToken)

        entityManager.flush()
        entityManager.clear()

        val deletedCount = passwordResetTokenRepository.deleteByExpiresAtBefore(now.minusDays(7))

        assertThat(deletedCount).isEqualTo(2)

        val remaining = passwordResetTokenRepository.findAll()
        assertThat(remaining).hasSize(1)
        assertThat(remaining[0].token).isEqualTo("valid-token")
    }

    @Test
    fun `deleteByExpiresAtBefore should return 0 when no expired tokens exist`() {
        val now = OffsetDateTime.now()

        val validToken = PasswordResetToken(
            user = testUser,
            token = "valid-token",
            expiresAt = now.plusMinutes(15)
        )
        entityManager.persist(validToken)
        entityManager.flush()

        val deletedCount = passwordResetTokenRepository.deleteByExpiresAtBefore(now.minusDays(7))

        assertThat(deletedCount).isEqualTo(0)
    }

    @Test
    fun `token creation and persistence should work correctly`() {
        val now = OffsetDateTime.now()

        val token = PasswordResetToken(
            user = testUser,
            token = "new-token-123",
            expiresAt = now.plusMinutes(15)
        )

        val saved = passwordResetTokenRepository.save(token)
        entityManager.flush()
        entityManager.clear()

        assertThat(saved.id).isNotNull()
        assertThat(saved.token).isEqualTo("new-token-123")
        assertThat(saved.user.id).isEqualTo(testUser.id)
        assertThat(saved.createdAt).isNotNull()
        assertThat(saved.usedAt).isNull()
        assertThat(saved.expiresAt).isAfter(now)
    }

    @Test
    fun `cascade deletion should delete tokens when user is deleted`() {
        val token = PasswordResetToken(
            user = testUser,
            token = "cascade-test-token",
            expiresAt = OffsetDateTime.now().plusMinutes(15)
        )
        entityManager.persist(token)
        entityManager.flush()

        val tokenId = token.id
        assertThat(tokenId).isNotNull()

        // Delete the user
        userRepository.delete(testUser)
        entityManager.flush()
        entityManager.clear()

        // Token should be deleted due to cascade
        val foundToken = passwordResetTokenRepository.findById(tokenId!!)
        assertThat(foundToken).isEmpty
    }
}
