package com.hackathon.manager.service

import com.hackathon.manager.dto.auth.UpdateUserRequest
import com.hackathon.manager.entity.User
import com.hackathon.manager.exception.ApiException
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
import java.util.*

@ExtendWith(MockitoExtension::class)
class UserServiceTest {

    @Mock
    lateinit var userRepository: UserRepository

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
}
