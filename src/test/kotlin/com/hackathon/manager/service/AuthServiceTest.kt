package com.hackathon.manager.service

import com.hackathon.manager.dto.auth.LoginRequest
import com.hackathon.manager.dto.auth.RefreshTokenRequest
import com.hackathon.manager.dto.auth.RegisterRequest
import com.hackathon.manager.entity.User
import com.hackathon.manager.exception.ApiException
import com.hackathon.manager.repository.UserRepository
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
import java.util.*

@ExtendWith(MockitoExtension::class)
class AuthServiceTest {

    @Mock
    lateinit var userRepository: UserRepository

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
        whenever(jwtTokenProvider.generateToken(eq(testUserId), eq("new@example.com")))
            .thenReturn("access-token")
        whenever(jwtTokenProvider.generateRefreshToken(testUserId))
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
        whenever(jwtTokenProvider.generateToken(authentication)).thenReturn("access-token")
        whenever(jwtTokenProvider.generateRefreshToken(testUserId)).thenReturn("refresh-token")

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
        whenever(jwtTokenProvider.generateToken(testUserId, "test@example.com"))
            .thenReturn("new-access-token")
        whenever(jwtTokenProvider.generateRefreshToken(testUserId))
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
}
