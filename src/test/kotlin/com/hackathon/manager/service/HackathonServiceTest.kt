package com.hackathon.manager.service

import com.hackathon.manager.dto.CreateHackathonRequest
import com.hackathon.manager.dto.UpdateHackathonRequest
import com.hackathon.manager.entity.Hackathon
import com.hackathon.manager.entity.HackathonUser
import com.hackathon.manager.entity.Team
import com.hackathon.manager.entity.TeamMember
import com.hackathon.manager.entity.User
import com.hackathon.manager.entity.enums.HackathonStatus
import com.hackathon.manager.entity.enums.UserRole
import com.hackathon.manager.exception.*
import com.hackathon.manager.repository.HackathonRepository
import com.hackathon.manager.repository.HackathonUserRepository
import com.hackathon.manager.repository.TeamMemberRepository
import com.hackathon.manager.repository.UserRepository
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.kotlin.*
import org.springframework.http.HttpStatus
import java.time.OffsetDateTime
import java.util.*
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy

@ExtendWith(MockitoExtension::class)
class HackathonServiceTest {

    @Mock
    lateinit var hackathonRepository: HackathonRepository

    @Mock
    lateinit var hackathonUserRepository: HackathonUserRepository

    @Mock
    lateinit var userRepository: UserRepository

    @Mock
    lateinit var teamMemberRepository: TeamMemberRepository

    @InjectMocks
    lateinit var hackathonService: HackathonService

    private lateinit var testUser: User
    private lateinit var testHackathon: Hackathon
    private val testUserId = UUID.randomUUID()
    private val testHackathonId = UUID.randomUUID()

    @BeforeEach
    fun setUp() {
        testUser = User(
            id = testUserId,
            email = "test@example.com",
            passwordHash = "hashedpassword",
            firstName = "Test",
            lastName = "User"
        )

        testHackathon = Hackathon(
            id = testHackathonId,
            name = "Test Hackathon",
            slug = "test-hackathon",
            description = "A test hackathon",
            status = HackathonStatus.draft,
            startsAt = OffsetDateTime.now().plusDays(7),
            endsAt = OffsetDateTime.now().plusDays(9),
            createdBy = testUser
        )
    }

    @Test
    fun `getAllHackathons should return all hackathons with participant counts`() {
        whenever(hackathonRepository.findAll()).thenReturn(listOf(testHackathon))
        whenever(teamMemberRepository.countDistinctUsersByHackathonId(testHackathonId)).thenReturn(5)

        val result = hackathonService.getAllHackathons()

        assertThat(result).hasSize(1)
        assertThat(result[0].name).isEqualTo("Test Hackathon")
        assertThat(result[0].slug).isEqualTo("test-hackathon")
        assertThat(result[0].participantCount).isEqualTo(5)
        verify(hackathonRepository).findAll()
        verify(teamMemberRepository).countDistinctUsersByHackathonId(testHackathonId)
    }

    @Test
    fun `getAllHackathons should return hackathons with zero participants`() {
        whenever(hackathonRepository.findAll()).thenReturn(listOf(testHackathon))
        whenever(teamMemberRepository.countDistinctUsersByHackathonId(testHackathonId)).thenReturn(0)

        val result = hackathonService.getAllHackathons()

        assertThat(result).hasSize(1)
        assertThat(result[0].participantCount).isEqualTo(0)
        verify(teamMemberRepository).countDistinctUsersByHackathonId(testHackathonId)
    }

    @Test
    fun `getActiveHackathons should return active hackathons with participant counts`() {
        val activeHackathon = testHackathon.copy(status = HackathonStatus.registration_open)
        whenever(hackathonRepository.findActiveHackathons(any())).thenReturn(listOf(activeHackathon))
        whenever(teamMemberRepository.countDistinctUsersByHackathonId(testHackathonId)).thenReturn(10)

        val result = hackathonService.getActiveHackathons()

        assertThat(result).hasSize(1)
        assertThat(result[0].status).isEqualTo(HackathonStatus.registration_open)
        assertThat(result[0].participantCount).isEqualTo(10)
        verify(teamMemberRepository).countDistinctUsersByHackathonId(testHackathonId)
    }

    @Test
    fun `getHackathonById should return hackathon with participant count when found`() {
        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(teamMemberRepository.countDistinctUsersByHackathonId(testHackathonId)).thenReturn(3)

        val result = hackathonService.getHackathonById(testHackathonId)

        assertThat(result.id).isEqualTo(testHackathonId)
        assertThat(result.name).isEqualTo("Test Hackathon")
        assertThat(result.participantCount).isEqualTo(3)
        verify(teamMemberRepository).countDistinctUsersByHackathonId(testHackathonId)
    }

    @Test
    fun `getHackathonById should return hackathon with user role when userId provided`() {
        val hackathonUser = HackathonUser(
            hackathon = testHackathon,
            user = testUser,
            role = UserRole.organizer
        )
        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(teamMemberRepository.countDistinctUsersByHackathonId(testHackathonId)).thenReturn(2)
        whenever(hackathonUserRepository.findByHackathonIdAndUserId(testHackathonId, testUserId))
            .thenReturn(hackathonUser)

        val result = hackathonService.getHackathonById(testHackathonId, testUserId)

        assertThat(result.userRole).isEqualTo(UserRole.organizer)
        assertThat(result.participantCount).isEqualTo(2)
    }

    @Test
    fun `getHackathonById should throw exception when not found`() {
        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.empty())

        assertThatThrownBy { hackathonService.getHackathonById(testHackathonId) }
            .isInstanceOf(NotFoundException::class.java)
            .hasMessage("Hackathon not found")
    }

    @Test
    fun `getHackathonBySlug should return hackathon with participant count when found`() {
        whenever(hackathonRepository.findBySlug("test-hackathon")).thenReturn(testHackathon)
        whenever(teamMemberRepository.countDistinctUsersByHackathonId(testHackathonId)).thenReturn(7)

        val result = hackathonService.getHackathonBySlug("test-hackathon")

        assertThat(result.slug).isEqualTo("test-hackathon")
        assertThat(result.participantCount).isEqualTo(7)
        verify(teamMemberRepository).countDistinctUsersByHackathonId(testHackathonId)
    }

    @Test
    fun `getHackathonBySlug should throw exception when not found`() {
        whenever(hackathonRepository.findBySlug("non-existent")).thenReturn(null)

        assertThatThrownBy { hackathonService.getHackathonBySlug("non-existent") }
            .isInstanceOf(NotFoundException::class.java)
            .hasMessage("Hackathon not found")
    }

    @Test
    fun `createHackathon should create hackathon successfully`() {
        val request = CreateHackathonRequest(
            name = "New Hackathon",
            slug = "new-hackathon",
            description = "A new hackathon",
            startsAt = OffsetDateTime.now().plusDays(7),
            endsAt = OffsetDateTime.now().plusDays(9)
        )

        whenever(hackathonRepository.existsBySlug("new-hackathon")).thenReturn(false)
        whenever(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser))
        whenever(hackathonRepository.save(any<Hackathon>())).thenAnswer { invocation ->
            val hackathon = invocation.arguments[0] as Hackathon
            Hackathon(
                id = UUID.randomUUID(),
                name = hackathon.name,
                slug = hackathon.slug,
                description = hackathon.description,
                status = hackathon.status,
                startsAt = hackathon.startsAt,
                endsAt = hackathon.endsAt,
                createdBy = hackathon.createdBy
            )
        }
        whenever(hackathonUserRepository.save(any<HackathonUser>())).thenAnswer { it.arguments[0] }

        val result = hackathonService.createHackathon(request, testUserId)

        assertThat(result.name).isEqualTo("New Hackathon")
        assertThat(result.slug).isEqualTo("new-hackathon")
        assertThat(result.status).isEqualTo(HackathonStatus.draft)
        assertThat(result.userRole).isEqualTo(UserRole.organizer)

        verify(hackathonRepository).save(any<Hackathon>())
        verify(hackathonUserRepository).save(any<HackathonUser>())
    }

    @Test
    fun `createHackathon should throw exception when slug already exists`() {
        val request = CreateHackathonRequest(
            name = "New Hackathon",
            slug = "existing-slug",
            startsAt = OffsetDateTime.now().plusDays(7),
            endsAt = OffsetDateTime.now().plusDays(9)
        )

        whenever(hackathonRepository.existsBySlug("existing-slug")).thenReturn(true)

        assertThatThrownBy { hackathonService.createHackathon(request, testUserId) }
            .isInstanceOf(ConflictException::class.java)
            .hasMessage("Slug already exists")
    }

    @Test
    fun `createHackathon should throw exception when creator not found`() {
        val request = CreateHackathonRequest(
            name = "New Hackathon",
            slug = "new-hackathon",
            startsAt = OffsetDateTime.now().plusDays(7),
            endsAt = OffsetDateTime.now().plusDays(9)
        )

        whenever(hackathonRepository.existsBySlug("new-hackathon")).thenReturn(false)
        whenever(userRepository.findById(testUserId)).thenReturn(Optional.empty())

        assertThatThrownBy { hackathonService.createHackathon(request, testUserId) }
            .isInstanceOf(NotFoundException::class.java)
            .hasMessage("User not found")
    }

    @Test
    fun `updateHackathon should update hackathon fields`() {
        val request = UpdateHackathonRequest(
            name = "Updated Hackathon",
            description = "Updated description",
            status = HackathonStatus.registration_open
        )

        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(hackathonRepository.save(any<Hackathon>())).thenAnswer { it.arguments[0] }
        whenever(teamMemberRepository.countDistinctUsersByHackathonId(testHackathonId)).thenReturn(4)

        val result = hackathonService.updateHackathon(testHackathonId, request)

        assertThat(result.name).isEqualTo("Updated Hackathon")
        assertThat(result.description).isEqualTo("Updated description")
        assertThat(result.status).isEqualTo(HackathonStatus.registration_open)
        assertThat(result.participantCount).isEqualTo(4)
    }

    @Test
    fun `updateHackathon should throw exception when not found`() {
        val request = UpdateHackathonRequest(name = "Updated")

        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.empty())

        assertThatThrownBy { hackathonService.updateHackathon(testHackathonId, request) }
            .isInstanceOf(NotFoundException::class.java)
            .hasMessage("Hackathon not found")
    }

    @Test
    fun `registerForHackathon should register user successfully`() {
        val openHackathon = Hackathon(
            id = testHackathonId,
            name = "Test Hackathon",
            slug = "test-hackathon",
            status = HackathonStatus.registration_open,
            startsAt = OffsetDateTime.now().plusDays(7),
            endsAt = OffsetDateTime.now().plusDays(9),
            createdBy = testUser,
            maxParticipants = 100
        )

        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(openHackathon))
        whenever(hackathonUserRepository.findByHackathonIdAndUserId(testHackathonId, testUserId)).thenReturn(null)
        whenever(teamMemberRepository.countDistinctUsersByHackathonId(testHackathonId))
            .thenReturn(0)  // Before registration
            .thenReturn(1)  // After registration
        whenever(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser))
        whenever(hackathonUserRepository.save(any<HackathonUser>())).thenAnswer { it.arguments[0] }

        val result = hackathonService.registerForHackathon(testHackathonId, testUserId)

        assertThat(result.participantCount).isEqualTo(1)
        assertThat(result.userRole).isEqualTo(UserRole.participant)
    }

    @Test
    fun `registerForHackathon should throw exception when registration not open`() {
        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))

        assertThatThrownBy { hackathonService.registerForHackathon(testHackathonId, testUserId) }
            .isInstanceOf(ValidationException::class.java)
            .hasMessage("Registration is not open")
    }

    @Test
    fun `registerForHackathon should throw exception when already registered as participant`() {
        val openHackathon = testHackathon.copy(status = HackathonStatus.registration_open)
        val existingParticipant = HackathonUser(
            hackathon = openHackathon,
            user = testUser,
            role = UserRole.participant
        )

        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(openHackathon))
        whenever(hackathonUserRepository.findByHackathonIdAndUserId(testHackathonId, testUserId)).thenReturn(existingParticipant)

        assertThatThrownBy { hackathonService.registerForHackathon(testHackathonId, testUserId) }
            .isInstanceOf(ConflictException::class.java)
            .hasMessage("Already registered for this hackathon")
    }

    @Test
    fun `registerForHackathon should return current status when user is organizer`() {
        val openHackathon = testHackathon.copy(status = HackathonStatus.registration_open)
        val existingOrganizer = HackathonUser(
            hackathon = openHackathon,
            user = testUser,
            role = UserRole.organizer
        )

        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(openHackathon))
        whenever(hackathonUserRepository.findByHackathonIdAndUserId(testHackathonId, testUserId)).thenReturn(existingOrganizer)
        whenever(teamMemberRepository.countDistinctUsersByHackathonId(testHackathonId)).thenReturn(5)

        val result = hackathonService.registerForHackathon(testHackathonId, testUserId)

        assertThat(result.userRole).isEqualTo(UserRole.organizer)
        assertThat(result.participantCount).isEqualTo(5)
    }

    @Test
    fun `registerForHackathon should throw exception when hackathon is full`() {
        val otherUser = User(
            id = UUID.randomUUID(),
            email = "other@example.com",
            passwordHash = "hash",
            firstName = "Other",
            lastName = "User"
        )
        val fullHackathon = Hackathon(
            id = testHackathonId,
            name = "Test Hackathon",
            slug = "test-hackathon",
            status = HackathonStatus.registration_open,
            startsAt = OffsetDateTime.now().plusDays(7),
            endsAt = OffsetDateTime.now().plusDays(9),
            createdBy = testUser,
            maxParticipants = 1
        )

        val existingParticipant = HackathonUser(
            hackathon = fullHackathon,
            user = otherUser,
            role = UserRole.participant
        )

        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(fullHackathon))
        whenever(hackathonUserRepository.findByHackathonIdAndUserId(testHackathonId, testUserId)).thenReturn(null)
        whenever(teamMemberRepository.countDistinctUsersByHackathonId(testHackathonId)).thenReturn(1)

        assertThatThrownBy { hackathonService.registerForHackathon(testHackathonId, testUserId) }
            .isInstanceOf(ValidationException::class.java)
            .hasMessage("Hackathon is full")
    }

    @Test
    fun `getUserRoleInHackathon should return user role`() {
        val hackathonUser = HackathonUser(
            hackathon = testHackathon,
            user = testUser,
            role = UserRole.organizer
        )

        whenever(hackathonUserRepository.findByHackathonIdAndUserId(testHackathonId, testUserId))
            .thenReturn(hackathonUser)

        val result = hackathonService.getUserRoleInHackathon(testHackathonId, testUserId)

        assertThat(result).isEqualTo(UserRole.organizer)
    }

    @Test
    fun `getUserRoleInHackathon should return null when not found`() {
        whenever(hackathonUserRepository.findByHackathonIdAndUserId(testHackathonId, testUserId))
            .thenReturn(null)

        val result = hackathonService.getUserRoleInHackathon(testHackathonId, testUserId)

        assertThat(result).isNull()
    }

    @Test
    fun `isUserOrganizer should return true for organizer`() {
        val hackathonUser = HackathonUser(
            hackathon = testHackathon,
            user = testUser,
            role = UserRole.organizer
        )

        whenever(hackathonUserRepository.findByHackathonIdAndUserId(testHackathonId, testUserId))
            .thenReturn(hackathonUser)

        val result = hackathonService.isUserOrganizer(testHackathonId, testUserId)

        assertThat(result).isTrue()
    }

    @Test
    fun `isUserOrganizer should return true for admin`() {
        val hackathonUser = HackathonUser(
            hackathon = testHackathon,
            user = testUser,
            role = UserRole.admin
        )

        whenever(hackathonUserRepository.findByHackathonIdAndUserId(testHackathonId, testUserId))
            .thenReturn(hackathonUser)

        val result = hackathonService.isUserOrganizer(testHackathonId, testUserId)

        assertThat(result).isTrue()
    }

    @Test
    fun `isUserOrganizer should return false for participant`() {
        val hackathonUser = HackathonUser(
            hackathon = testHackathon,
            user = testUser,
            role = UserRole.participant
        )

        whenever(hackathonUserRepository.findByHackathonIdAndUserId(testHackathonId, testUserId))
            .thenReturn(hackathonUser)

        val result = hackathonService.isUserOrganizer(testHackathonId, testUserId)

        assertThat(result).isFalse()
    }

    @Test
    fun `getUserDraftHackathons should return draft hackathons for user with participant counts`() {
        whenever(hackathonRepository.findByOrganizerAndStatus(testUserId, HackathonStatus.draft))
            .thenReturn(listOf(testHackathon))
        whenever(teamMemberRepository.countDistinctUsersByHackathonId(testHackathonId)).thenReturn(2)

        val result = hackathonService.getUserDraftHackathons(testUserId)

        assertThat(result).hasSize(1)
        assertThat(result[0].status).isEqualTo(HackathonStatus.draft)
        assertThat(result[0].participantCount).isEqualTo(2)
        verify(teamMemberRepository).countDistinctUsersByHackathonId(testHackathonId)
    }

    @Test
    fun `getHackathonParticipants should return all participants sorted by name`() {
        // Create test users
        val user1 = User(
            id = UUID.randomUUID(),
            email = "alice@example.com",
            passwordHash = "hash",
            firstName = "Alice",
            lastName = "Smith"
        )
        val user2 = User(
            id = UUID.randomUUID(),
            email = "bob@example.com",
            passwordHash = "hash",
            firstName = "Bob",
            lastName = "Johnson"
        )
        val user3 = User(
            id = UUID.randomUUID(),
            email = "charlie@example.com",
            passwordHash = "hash",
            firstName = "Charlie",
            lastName = "Davis"
        )

        // Create test teams
        val team1 = Team(
            id = UUID.randomUUID(),
            hackathon = testHackathon,
            name = "Team Alpha",
            createdBy = user1
        )
        val team2 = Team(
            id = UUID.randomUUID(),
            hackathon = testHackathon,
            name = "Team Beta",
            createdBy = user2
        )

        // Create team members (note: intentionally out of alphabetical order)
        val member1 = TeamMember(
            id = UUID.randomUUID(),
            team = team1,
            user = user3,
            isLeader = false,
            joinedAt = OffsetDateTime.now().minusDays(2)
        )
        val member2 = TeamMember(
            id = UUID.randomUUID(),
            team = team1,
            user = user1,
            isLeader = true,
            joinedAt = OffsetDateTime.now().minusDays(3)
        )
        val member3 = TeamMember(
            id = UUID.randomUUID(),
            team = team2,
            user = user2,
            isLeader = true,
            joinedAt = OffsetDateTime.now().minusDays(1)
        )

        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(teamMemberRepository.findByHackathonId(testHackathonId))
            .thenReturn(listOf(member1, member2, member3))

        val result = hackathonService.getHackathonParticipants(testHackathonId)

        assertThat(result).hasSize(3)
        // Should be sorted alphabetically by name
        assertThat(result[0].name).isEqualTo("Alice Smith")
        assertThat(result[0].email).isEqualTo("alice@example.com")
        assertThat(result[0].teamName).isEqualTo("Team Alpha")
        assertThat(result[0].isTeamLeader).isTrue()

        assertThat(result[1].name).isEqualTo("Bob Johnson")
        assertThat(result[1].email).isEqualTo("bob@example.com")
        assertThat(result[1].teamName).isEqualTo("Team Beta")
        assertThat(result[1].isTeamLeader).isTrue()

        assertThat(result[2].name).isEqualTo("Charlie Davis")
        assertThat(result[2].email).isEqualTo("charlie@example.com")
        assertThat(result[2].teamName).isEqualTo("Team Alpha")
        assertThat(result[2].isTeamLeader).isFalse()

        verify(hackathonRepository).findById(testHackathonId)
        verify(teamMemberRepository).findByHackathonId(testHackathonId)
    }

    @Test
    fun `getHackathonParticipants should return empty list when no participants`() {
        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(teamMemberRepository.findByHackathonId(testHackathonId)).thenReturn(emptyList())

        val result = hackathonService.getHackathonParticipants(testHackathonId)

        assertThat(result).isEmpty()
        verify(hackathonRepository).findById(testHackathonId)
        verify(teamMemberRepository).findByHackathonId(testHackathonId)
    }

    @Test
    fun `getHackathonParticipants should throw NotFoundException when hackathon does not exist`() {
        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.empty())

        assertThatThrownBy {
            hackathonService.getHackathonParticipants(testHackathonId)
        }
            .isInstanceOf(NotFoundException::class.java)
            .hasMessage("Hackathon not found")

        verify(hackathonRepository).findById(testHackathonId)
        verify(teamMemberRepository, never()).findByHackathonId(any())
    }

    private fun Hackathon.copy(
        id: UUID? = this.id,
        name: String = this.name,
        slug: String = this.slug,
        description: String? = this.description,
        status: HackathonStatus = this.status,
        startsAt: OffsetDateTime = this.startsAt,
        endsAt: OffsetDateTime = this.endsAt,
        createdBy: User = this.createdBy
    ): Hackathon = Hackathon(
        id = id,
        name = name,
        slug = slug,
        description = description,
        status = status,
        startsAt = startsAt,
        endsAt = endsAt,
        createdBy = createdBy
    )
}
