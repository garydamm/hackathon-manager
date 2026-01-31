package com.hackathon.manager.service

import com.hackathon.manager.dto.auth.LoginRequest
import com.hackathon.manager.dto.auth.RefreshTokenRequest
import com.hackathon.manager.dto.auth.RegisterRequest
import com.hackathon.manager.entity.User
import com.hackathon.manager.entity.UserSession
import com.hackathon.manager.exception.ApiException
import com.hackathon.manager.repository.UserRepository
import com.hackathon.manager.repository.UserSessionRepository
import com.hackathon.manager.security.JwtTokenProvider
import com.hackathon.manager.security.UserPrincipal
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.kotlin.*
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.Authentication
import org.springframework.security.crypto.password.PasswordEncoder
import java.security.MessageDigest
import java.time.OffsetDateTime
import java.util.*

@ExtendWith(MockitoExtension::class)
class AuthServiceTest {

    @Mock
    lateinit var userRepository: UserRepository

    @Mock
    lateinit var userSessionRepository: UserSessionRepository

    @Mock
    lateinit var passwordEncoder: PasswordEncoder

    @Mock
    lateinit var jwtTokenProvider: JwtTokenProvider

    @Mock
    lateinit var authenticationManager: AuthenticationManager

    @InjectMocks
    lateinit var authService: AuthService

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
            displayName = "TestUser"
        )
    }

    @Test
    fun `register should create new user successfully`() {
        val request = RegisterRequest(
            email = "new@example.com",
            password = "password123",
            firstName = "New",
            lastName = "User",
            displayName = "NewUser"
        )

        whenever(userRepository.existsByEmail("new@example.com")).thenReturn(false)
        whenever(passwordEncoder.encode("password123")).thenReturn("encodedpassword")
        whenever(userRepository.save(any<User>())).thenAnswer { invocation ->
            val user = invocation.arguments[0] as User
            User(
                id = testUserId,
                email = user.email,
                passwordHash = user.passwordHash,
                firstName = user.firstName,
                lastName = user.lastName,
                displayName = user.displayName
            )
        }
        whenever(jwtTokenProvider.generateToken(eq(testUserId), eq("new@example.com"), eq(false)))
            .thenReturn("access-token")
        whenever(jwtTokenProvider.generateRefreshToken(testUserId, false))
            .thenReturn("refresh-token")

        val result = authService.register(request)

        assertThat(result.accessToken).isEqualTo("access-token")
        assertThat(result.refreshToken).isEqualTo("refresh-token")
        assertThat(result.user.email).isEqualTo("new@example.com")
        assertThat(result.user.firstName).isEqualTo("New")
        assertThat(result.tokenType).isEqualTo("Bearer")

        verify(userRepository).save(any<User>())
        verify(passwordEncoder).encode("password123")
    }

    @Test
    fun `register should throw exception when email already exists`() {
        val request = RegisterRequest(
            email = "existing@example.com",
            password = "password123",
            firstName = "New",
            lastName = "User"
        )

        whenever(userRepository.existsByEmail("existing@example.com")).thenReturn(true)

        assertThatThrownBy { authService.register(request) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Email already registered")

        verify(userRepository, never()).save(any<User>())
    }

    @Test
    fun `login should authenticate user successfully`() {
        val request = LoginRequest(
            email = "test@example.com",
            password = "password123"
        )

        val authentication = mock<Authentication>()

        whenever(authenticationManager.authenticate(any<UsernamePasswordAuthenticationToken>()))
            .thenReturn(authentication)
        whenever(userRepository.findByEmail("test@example.com")).thenReturn(testUser)
        whenever(jwtTokenProvider.generateToken(testUserId, "test@example.com", false)).thenReturn("access-token")
        whenever(jwtTokenProvider.generateRefreshToken(testUserId, false)).thenReturn("refresh-token")

        val result = authService.login(request)

        assertThat(result.accessToken).isEqualTo("access-token")
        assertThat(result.refreshToken).isEqualTo("refresh-token")
        assertThat(result.user.email).isEqualTo("test@example.com")
    }

    @Test
    fun `login should throw exception when user not found after authentication`() {
        val request = LoginRequest(
            email = "test@example.com",
            password = "password123"
        )

        val authentication = mock<Authentication>()

        whenever(authenticationManager.authenticate(any<UsernamePasswordAuthenticationToken>()))
            .thenReturn(authentication)
        whenever(userRepository.findByEmail("test@example.com")).thenReturn(null)

        assertThatThrownBy { authService.login(request) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("User not found")
    }

    @Test
    fun `refreshToken should generate new tokens successfully`() {
        val request = RefreshTokenRequest(refreshToken = "valid-refresh-token")

        whenever(jwtTokenProvider.validateToken("valid-refresh-token")).thenReturn(true)
        whenever(jwtTokenProvider.getUserIdFromToken("valid-refresh-token")).thenReturn(testUserId)
        whenever(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser))
        whenever(jwtTokenProvider.generateToken(testUserId, "test@example.com", false))
            .thenReturn("new-access-token")
        whenever(jwtTokenProvider.generateRefreshToken(testUserId, false))
            .thenReturn("new-refresh-token")

        val result = authService.refreshToken(request)

        assertThat(result.accessToken).isEqualTo("new-access-token")
        assertThat(result.refreshToken).isEqualTo("new-refresh-token")
        assertThat(result.user.email).isEqualTo("test@example.com")
    }

    @Test
    fun `refreshToken should throw exception for invalid token`() {
        val request = RefreshTokenRequest(refreshToken = "invalid-token")

        whenever(jwtTokenProvider.validateToken("invalid-token")).thenReturn(false)

        assertThatThrownBy { authService.refreshToken(request) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Invalid refresh token")
    }

    @Test
    fun `refreshToken should throw exception when user not found`() {
        val request = RefreshTokenRequest(refreshToken = "valid-refresh-token")

        whenever(jwtTokenProvider.validateToken("valid-refresh-token")).thenReturn(true)
        whenever(jwtTokenProvider.getUserIdFromToken("valid-refresh-token")).thenReturn(testUserId)
        whenever(userRepository.findById(testUserId)).thenReturn(Optional.empty())

        assertThatThrownBy { authService.refreshToken(request) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("User not found")
    }

    @Test
    fun `listActiveSessions should return sessions sorted by last activity`() {
        val session1Id = UUID.randomUUID()
        val session2Id = UUID.randomUUID()
        val now = OffsetDateTime.now()

        val session1 = UserSession(
            id = session1Id,
            user = testUser,
            refreshTokenHash = "hash1",
            deviceInfo = "Chrome on MacOS",
            ipAddress = "192.168.1.1",
            lastActivityAt = now.minusHours(2),
            createdAt = now.minusDays(1)
        )

        val session2 = UserSession(
            id = session2Id,
            user = testUser,
            refreshTokenHash = "hash2",
            deviceInfo = "Firefox on Windows",
            ipAddress = "192.168.1.2",
            lastActivityAt = now,
            createdAt = now.minusDays(3)
        )

        whenever(userSessionRepository.findByUserId(testUserId)).thenReturn(listOf(session1, session2))

        val result = authService.listActiveSessions(testUserId, null)

        assertThat(result).hasSize(2)
        // Should be sorted by lastActivityAt descending (most recent first)
        assertThat(result[0].id).isEqualTo(session2Id.toString())
        assertThat(result[0].deviceInfo).isEqualTo("Firefox on Windows")
        assertThat(result[0].isCurrent).isFalse()
        assertThat(result[1].id).isEqualTo(session1Id.toString())
        assertThat(result[1].deviceInfo).isEqualTo("Chrome on MacOS")
        assertThat(result[1].isCurrent).isFalse()
    }

    @Test
    fun `listActiveSessions should identify current session by refresh token hash`() {
        val currentSessionId = UUID.randomUUID()
        val otherSessionId = UUID.randomUUID()
        val now = OffsetDateTime.now()
        val currentRefreshToken = "current-refresh-token"

        // Hash the current token to match what the service will compute
        val digest = MessageDigest.getInstance("SHA-256")
        val hashBytes = digest.digest(currentRefreshToken.toByteArray())
        val currentTokenHash = hashBytes.joinToString("") { "%02x".format(it) }

        val currentSession = UserSession(
            id = currentSessionId,
            user = testUser,
            refreshTokenHash = currentTokenHash,
            deviceInfo = "Chrome on MacOS",
            ipAddress = "192.168.1.1",
            lastActivityAt = now,
            createdAt = now.minusDays(1)
        )

        val otherSession = UserSession(
            id = otherSessionId,
            user = testUser,
            refreshTokenHash = "different-hash",
            deviceInfo = "Firefox on Windows",
            ipAddress = "192.168.1.2",
            lastActivityAt = now.minusHours(1),
            createdAt = now.minusDays(2)
        )

        whenever(userSessionRepository.findByUserId(testUserId)).thenReturn(listOf(currentSession, otherSession))

        val result = authService.listActiveSessions(testUserId, currentRefreshToken)

        assertThat(result).hasSize(2)
        assertThat(result[0].id).isEqualTo(currentSessionId.toString())
        assertThat(result[0].isCurrent).isTrue()
        assertThat(result[1].id).isEqualTo(otherSessionId.toString())
        assertThat(result[1].isCurrent).isFalse()
    }

    @Test
    fun `listActiveSessions should return empty list when no sessions found`() {
        whenever(userSessionRepository.findByUserId(testUserId)).thenReturn(emptyList())

        val result = authService.listActiveSessions(testUserId, null)

        assertThat(result).isEmpty()
    }

    @Test
    fun `listActiveSessions should handle null device info and ip address`() {
        val sessionId = UUID.randomUUID()
        val now = OffsetDateTime.now()

        val session = UserSession(
            id = sessionId,
            user = testUser,
            refreshTokenHash = "hash1",
            deviceInfo = null,
            ipAddress = null,
            lastActivityAt = now,
            createdAt = now.minusDays(1)
        )

        whenever(userSessionRepository.findByUserId(testUserId)).thenReturn(listOf(session))

        val result = authService.listActiveSessions(testUserId, null)

        assertThat(result).hasSize(1)
        assertThat(result[0].deviceInfo).isNull()
        assertThat(result[0].ipAddress).isNull()
        assertThat(result[0].isCurrent).isFalse()
    }

    @Test
    fun `listActiveSessions should handle null refresh token parameter`() {
        val sessionId = UUID.randomUUID()
        val now = OffsetDateTime.now()

        val session = UserSession(
            id = sessionId,
            user = testUser,
            refreshTokenHash = "hash1",
            deviceInfo = "Chrome on MacOS",
            ipAddress = "192.168.1.1",
            lastActivityAt = now,
            createdAt = now.minusDays(1)
        )

        whenever(userSessionRepository.findByUserId(testUserId)).thenReturn(listOf(session))

        val result = authService.listActiveSessions(testUserId, null)

        assertThat(result).hasSize(1)
        assertThat(result[0].isCurrent).isFalse()
    }

    @Test
    fun `revokeSession should delete session successfully`() {
        val sessionId = UUID.randomUUID()
        val now = OffsetDateTime.now()

        val session = UserSession(
            id = sessionId,
            user = testUser,
            refreshTokenHash = "hash1",
            deviceInfo = "Chrome on MacOS",
            ipAddress = "192.168.1.1",
            lastActivityAt = now,
            createdAt = now.minusDays(1)
        )

        whenever(userSessionRepository.findById(sessionId)).thenReturn(Optional.of(session))

        authService.revokeSession(sessionId, testUserId, null)

        verify(userSessionRepository).delete(session)
    }

    @Test
    fun `revokeSession should throw exception when session not found`() {
        val sessionId = UUID.randomUUID()

        whenever(userSessionRepository.findById(sessionId)).thenReturn(Optional.empty())

        assertThatThrownBy { authService.revokeSession(sessionId, testUserId, null) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Session not found")

        verify(userSessionRepository, never()).delete(any())
    }

    @Test
    fun `revokeSession should throw exception when session belongs to different user`() {
        val sessionId = UUID.randomUUID()
        val otherUserId = UUID.randomUUID()
        val now = OffsetDateTime.now()

        val otherUser = User(
            id = otherUserId,
            email = "other@example.com",
            passwordHash = "hashedpassword",
            firstName = "Other",
            lastName = "User",
            displayName = "OtherUser"
        )

        val session = UserSession(
            id = sessionId,
            user = otherUser,
            refreshTokenHash = "hash1",
            deviceInfo = "Chrome on MacOS",
            ipAddress = "192.168.1.1",
            lastActivityAt = now,
            createdAt = now.minusDays(1)
        )

        whenever(userSessionRepository.findById(sessionId)).thenReturn(Optional.of(session))

        assertThatThrownBy { authService.revokeSession(sessionId, testUserId, null) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Session not found")

        verify(userSessionRepository, never()).delete(any())
    }

    @Test
    fun `revokeSession should throw exception when trying to revoke current session`() {
        val sessionId = UUID.randomUUID()
        val now = OffsetDateTime.now()
        val currentRefreshToken = "current-refresh-token"

        // Hash the current token to match what the service will compute
        val digest = MessageDigest.getInstance("SHA-256")
        val hashBytes = digest.digest(currentRefreshToken.toByteArray())
        val currentTokenHash = hashBytes.joinToString("") { "%02x".format(it) }

        val currentSession = UserSession(
            id = sessionId,
            user = testUser,
            refreshTokenHash = currentTokenHash,
            deviceInfo = "Chrome on MacOS",
            ipAddress = "192.168.1.1",
            lastActivityAt = now,
            createdAt = now.minusDays(1)
        )

        whenever(userSessionRepository.findById(sessionId)).thenReturn(Optional.of(currentSession))

        assertThatThrownBy { authService.revokeSession(sessionId, testUserId, currentRefreshToken) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Cannot revoke current session. Use logout instead.")

        verify(userSessionRepository, never()).delete(any())
    }
}
