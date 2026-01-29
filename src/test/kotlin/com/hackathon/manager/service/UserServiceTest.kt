package com.hackathon.manager.service

import com.hackathon.manager.config.AppConstants.SecurityConstants
import com.hackathon.manager.dto.auth.UpdateUserRequest
import com.hackathon.manager.entity.PasswordResetToken
import com.hackathon.manager.entity.User
import com.hackathon.manager.exception.ApiException
import com.hackathon.manager.repository.PasswordResetTokenRepository
import com.hackathon.manager.repository.UserRepository
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.kotlin.*
import org.springframework.security.crypto.password.PasswordEncoder
import java.time.OffsetDateTime
import java.util.*

@ExtendWith(MockitoExtension::class)
class UserServiceTest {

    @Mock
    lateinit var userRepository: UserRepository

    @Mock
    lateinit var passwordResetTokenRepository: PasswordResetTokenRepository

    @Mock
    lateinit var emailService: EmailService

    @Mock
    lateinit var passwordEncoder: PasswordEncoder

    @InjectMocks
    lateinit var userService: UserService

    private lateinit var testUser: User
    private val testUserId = UUID.randomUUID()

    @BeforeEach
    fun setUp() {
        testUser = User(
            id = testUserId,
            email = "test@example.com",
            passwordHash = "hashedpassword",
            firstName = "Test",
            lastName = "User",
            displayName = "TestUser",
            bio = "A test user",
            skills = arrayOf("Kotlin", "Java"),
            githubUrl = "https://github.com/testuser",
            linkedinUrl = "https://linkedin.com/in/testuser",
            portfolioUrl = "https://testuser.dev"
        )
    }

    @Test
    fun `getUserById should return user when found`() {
        whenever(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser))

        val result = userService.getUserById(testUserId)

        assertThat(result.id).isEqualTo(testUserId)
        assertThat(result.email).isEqualTo("test@example.com")
        assertThat(result.firstName).isEqualTo("Test")
        assertThat(result.lastName).isEqualTo("User")
        assertThat(result.displayName).isEqualTo("TestUser")
        assertThat(result.bio).isEqualTo("A test user")
        assertThat(result.skills).containsExactly("Kotlin", "Java")
    }

    @Test
    fun `getUserById should throw exception when not found`() {
        whenever(userRepository.findById(testUserId)).thenReturn(Optional.empty())

        assertThatThrownBy { userService.getUserById(testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("User not found")
    }

    @Test
    fun `getUserByEmail should return user when found`() {
        whenever(userRepository.findByEmail("test@example.com")).thenReturn(testUser)

        val result = userService.getUserByEmail("test@example.com")

        assertThat(result.email).isEqualTo("test@example.com")
        assertThat(result.firstName).isEqualTo("Test")
    }

    @Test
    fun `getUserByEmail should throw exception when not found`() {
        whenever(userRepository.findByEmail("nonexistent@example.com")).thenReturn(null)

        assertThatThrownBy { userService.getUserByEmail("nonexistent@example.com") }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("User not found")
    }

    @Test
    fun `updateUser should update all provided fields`() {
        val request = UpdateUserRequest(
            firstName = "Updated",
            lastName = "Name",
            displayName = "UpdatedUser",
            bio = "Updated bio",
            skills = listOf("Python", "Go", "Rust"),
            githubUrl = "https://github.com/updated",
            linkedinUrl = "https://linkedin.com/in/updated",
            portfolioUrl = "https://updated.dev"
        )

        whenever(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser))
        whenever(userRepository.save(any<User>())).thenAnswer { it.arguments[0] }

        val result = userService.updateUser(testUserId, request)

        assertThat(result.firstName).isEqualTo("Updated")
        assertThat(result.lastName).isEqualTo("Name")
        assertThat(result.displayName).isEqualTo("UpdatedUser")
        assertThat(result.bio).isEqualTo("Updated bio")
        assertThat(result.skills).containsExactly("Python", "Go", "Rust")
        assertThat(result.githubUrl).isEqualTo("https://github.com/updated")
        assertThat(result.linkedinUrl).isEqualTo("https://linkedin.com/in/updated")
        assertThat(result.portfolioUrl).isEqualTo("https://updated.dev")
    }

    @Test
    fun `updateUser should update only provided fields`() {
        val request = UpdateUserRequest(
            firstName = "OnlyFirst"
        )

        whenever(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser))
        whenever(userRepository.save(any<User>())).thenAnswer { it.arguments[0] }

        val result = userService.updateUser(testUserId, request)

        assertThat(result.firstName).isEqualTo("OnlyFirst")
        assertThat(result.lastName).isEqualTo("User")
        assertThat(result.displayName).isEqualTo("TestUser")
        assertThat(result.bio).isEqualTo("A test user")
    }

    @Test
    fun `updateUser should throw exception when user not found`() {
        val request = UpdateUserRequest(firstName = "Updated")

        whenever(userRepository.findById(testUserId)).thenReturn(Optional.empty())

        assertThatThrownBy { userService.updateUser(testUserId, request) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("User not found")

        verify(userRepository, never()).save(any<User>())
    }

    @Test
    fun `updateUser should handle empty skills list`() {
        val request = UpdateUserRequest(
            skills = emptyList()
        )

        whenever(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser))
        whenever(userRepository.save(any<User>())).thenAnswer { it.arguments[0] }

        val result = userService.updateUser(testUserId, request)

        assertThat(result.skills).isEmpty()
    }

    @Test
    fun `updateUser should handle null optional fields`() {
        val userWithNullFields = User(
            id = testUserId,
            email = "test@example.com",
            passwordHash = "hashedpassword",
            firstName = "Test",
            lastName = "User",
            displayName = null,
            bio = null,
            skills = null,
            githubUrl = null,
            linkedinUrl = null,
            portfolioUrl = null
        )

        val request = UpdateUserRequest(
            displayName = "NewDisplay",
            bio = "New bio"
        )

        whenever(userRepository.findById(testUserId)).thenReturn(Optional.of(userWithNullFields))
        whenever(userRepository.save(any<User>())).thenAnswer { it.arguments[0] }

        val result = userService.updateUser(testUserId, request)

        assertThat(result.displayName).isEqualTo("NewDisplay")
        assertThat(result.bio).isEqualTo("New bio")
        assertThat(result.skills).isNull()
        assertThat(result.githubUrl).isNull()
    }

    // ========== Password Reset Workflow Tests ==========

    @Test
    fun `requestPasswordReset should generate token with 15-minute expiry for valid email`() {
        val email = "test@example.com"
        whenever(userRepository.findByEmail(email)).thenReturn(testUser)
        whenever(passwordResetTokenRepository.findByUserIdAndUsedAtIsNullAndExpiresAtAfter(any(), any())).thenReturn(emptyList())
        whenever(passwordResetTokenRepository.save(any<PasswordResetToken>())).thenAnswer { it.arguments[0] }

        userService.requestPasswordReset(email)

        verify(passwordResetTokenRepository).save(argThat { token ->
            token.user == testUser &&
            token.token.isNotEmpty() &&
            token.expiresAt.isAfter(OffsetDateTime.now().plusMinutes(SecurityConstants.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES - 1)) &&
            token.expiresAt.isBefore(OffsetDateTime.now().plusMinutes(SecurityConstants.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES + 1)) &&
            token.usedAt == null
        })
        verify(emailService).sendPasswordResetEmail(eq(email), any(), eq("Test"))
    }

    @Test
    fun `requestPasswordReset should silently succeed for non-existent email`() {
        val nonExistentEmail = "nonexistent@example.com"
        whenever(userRepository.findByEmail(nonExistentEmail)).thenReturn(null)

        userService.requestPasswordReset(nonExistentEmail)

        verify(passwordResetTokenRepository, never()).save(any())
        verify(emailService, never()).sendPasswordResetEmail(any(), any(), any())
    }

    @Test
    fun `requestPasswordReset should invalidate previous unused tokens`() {
        val email = "test@example.com"
        val oldToken1 = PasswordResetToken(
            id = UUID.randomUUID(),
            user = testUser,
            token = "old-token-1",
            expiresAt = OffsetDateTime.now().plusMinutes(10),
            usedAt = null
        )
        val oldToken2 = PasswordResetToken(
            id = UUID.randomUUID(),
            user = testUser,
            token = "old-token-2",
            expiresAt = OffsetDateTime.now().plusMinutes(5),
            usedAt = null
        )

        whenever(userRepository.findByEmail(email)).thenReturn(testUser)
        whenever(passwordResetTokenRepository.findByUserIdAndUsedAtIsNullAndExpiresAtAfter(any(), any()))
            .thenReturn(listOf(oldToken1, oldToken2))
        whenever(passwordResetTokenRepository.save(any<PasswordResetToken>())).thenAnswer { it.arguments[0] }

        userService.requestPasswordReset(email)

        verify(passwordResetTokenRepository, times(3)).save(any<PasswordResetToken>())
        assertThat(oldToken1.usedAt).isNotNull()
        assertThat(oldToken2.usedAt).isNotNull()
    }

    @Test
    fun `validateResetToken should return token when valid and unused`() {
        val tokenString = "valid-token"
        val resetToken = PasswordResetToken(
            id = UUID.randomUUID(),
            user = testUser,
            token = tokenString,
            expiresAt = OffsetDateTime.now().plusMinutes(10),
            usedAt = null
        )

        whenever(passwordResetTokenRepository.findByToken(tokenString)).thenReturn(Optional.of(resetToken))

        val result = userService.validateResetToken(tokenString)

        assertThat(result).isEqualTo(resetToken)
    }

    @Test
    fun `validateResetToken should throw exception when token does not exist`() {
        val tokenString = "invalid-token"
        whenever(passwordResetTokenRepository.findByToken(tokenString)).thenReturn(Optional.empty())

        assertThatThrownBy { userService.validateResetToken(tokenString) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Invalid or expired reset token")
    }

    @Test
    fun `validateResetToken should throw exception when token is expired`() {
        val tokenString = "expired-token"
        val expiredToken = PasswordResetToken(
            id = UUID.randomUUID(),
            user = testUser,
            token = tokenString,
            expiresAt = OffsetDateTime.now().minusMinutes(1),
            usedAt = null
        )

        whenever(passwordResetTokenRepository.findByToken(tokenString)).thenReturn(Optional.of(expiredToken))

        assertThatThrownBy { userService.validateResetToken(tokenString) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("This reset token has expired")
    }

    @Test
    fun `validateResetToken should throw exception when token is already used`() {
        val tokenString = "used-token"
        val usedToken = PasswordResetToken(
            id = UUID.randomUUID(),
            user = testUser,
            token = tokenString,
            expiresAt = OffsetDateTime.now().plusMinutes(10),
            usedAt = OffsetDateTime.now().minusMinutes(5)
        )

        whenever(passwordResetTokenRepository.findByToken(tokenString)).thenReturn(Optional.of(usedToken))

        assertThatThrownBy { userService.validateResetToken(tokenString) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("This reset token has already been used")
    }

    @Test
    fun `resetPassword should update password and mark token as used with valid token`() {
        val tokenString = "valid-token"
        val newPassword = "NewPassword123"
        val resetToken = PasswordResetToken(
            id = UUID.randomUUID(),
            user = testUser,
            token = tokenString,
            expiresAt = OffsetDateTime.now().plusMinutes(10),
            usedAt = null
        )

        whenever(passwordResetTokenRepository.findByToken(tokenString)).thenReturn(Optional.of(resetToken))
        whenever(passwordEncoder.encode(newPassword)).thenReturn("encoded-password")
        whenever(userRepository.save(any<User>())).thenAnswer { it.arguments[0] }
        whenever(passwordResetTokenRepository.save(any<PasswordResetToken>())).thenAnswer { it.arguments[0] }

        userService.resetPassword(tokenString, newPassword)

        assertThat(testUser.passwordHash).isEqualTo("encoded-password")
        assertThat(resetToken.usedAt).isNotNull()
        verify(userRepository).save(testUser)
        verify(passwordResetTokenRepository).save(resetToken)
        verify(emailService).sendPasswordChangeConfirmation("test@example.com", "Test")
    }

    @Test
    fun `resetPassword should throw exception when password is too short`() {
        val tokenString = "valid-token"
        val shortPassword = "Short1"
        val resetToken = PasswordResetToken(
            id = UUID.randomUUID(),
            user = testUser,
            token = tokenString,
            expiresAt = OffsetDateTime.now().plusMinutes(10),
            usedAt = null
        )

        whenever(passwordResetTokenRepository.findByToken(tokenString)).thenReturn(Optional.of(resetToken))

        assertThatThrownBy { userService.resetPassword(tokenString, shortPassword) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Password must be at least ${SecurityConstants.MIN_PASSWORD_LENGTH} characters long")

        verify(userRepository, never()).save(any())
        verify(emailService, never()).sendPasswordChangeConfirmation(any(), any())
    }

    @Test
    fun `resetPassword should throw exception when password lacks uppercase letter`() {
        val tokenString = "valid-token"
        val noUpperPassword = "password123"
        val resetToken = PasswordResetToken(
            id = UUID.randomUUID(),
            user = testUser,
            token = tokenString,
            expiresAt = OffsetDateTime.now().plusMinutes(10),
            usedAt = null
        )

        whenever(passwordResetTokenRepository.findByToken(tokenString)).thenReturn(Optional.of(resetToken))

        assertThatThrownBy { userService.resetPassword(tokenString, noUpperPassword) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Password must contain at least one uppercase letter")

        verify(userRepository, never()).save(any())
        verify(emailService, never()).sendPasswordChangeConfirmation(any(), any())
    }

    @Test
    fun `resetPassword should throw exception when password lacks lowercase letter`() {
        val tokenString = "valid-token"
        val noLowerPassword = "PASSWORD123"
        val resetToken = PasswordResetToken(
            id = UUID.randomUUID(),
            user = testUser,
            token = tokenString,
            expiresAt = OffsetDateTime.now().plusMinutes(10),
            usedAt = null
        )

        whenever(passwordResetTokenRepository.findByToken(tokenString)).thenReturn(Optional.of(resetToken))

        assertThatThrownBy { userService.resetPassword(tokenString, noLowerPassword) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Password must contain at least one lowercase letter")

        verify(userRepository, never()).save(any())
        verify(emailService, never()).sendPasswordChangeConfirmation(any(), any())
    }

    @Test
    fun `resetPassword should throw exception when password lacks number`() {
        val tokenString = "valid-token"
        val noNumberPassword = "PasswordABC"
        val resetToken = PasswordResetToken(
            id = UUID.randomUUID(),
            user = testUser,
            token = tokenString,
            expiresAt = OffsetDateTime.now().plusMinutes(10),
            usedAt = null
        )

        whenever(passwordResetTokenRepository.findByToken(tokenString)).thenReturn(Optional.of(resetToken))

        assertThatThrownBy { userService.resetPassword(tokenString, noNumberPassword) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Password must contain at least one number")

        verify(userRepository, never()).save(any())
        verify(emailService, never()).sendPasswordChangeConfirmation(any(), any())
    }

    @Test
    fun `resetPassword should send confirmation email after successful password reset`() {
        val tokenString = "valid-token"
        val newPassword = "ValidPassword123"
        val resetToken = PasswordResetToken(
            id = UUID.randomUUID(),
            user = testUser,
            token = tokenString,
            expiresAt = OffsetDateTime.now().plusMinutes(10),
            usedAt = null
        )

        whenever(passwordResetTokenRepository.findByToken(tokenString)).thenReturn(Optional.of(resetToken))
        whenever(passwordEncoder.encode(newPassword)).thenReturn("encoded-password")
        whenever(userRepository.save(any<User>())).thenAnswer { it.arguments[0] }
        whenever(passwordResetTokenRepository.save(any<PasswordResetToken>())).thenAnswer { it.arguments[0] }

        userService.resetPassword(tokenString, newPassword)

        verify(emailService).sendPasswordChangeConfirmation("test@example.com", "Test")
    }
}
