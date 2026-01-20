package com.hackathon.manager.service

import com.hackathon.manager.dto.CreateTeamRequest
import com.hackathon.manager.dto.UpdateTeamRequest
import com.hackathon.manager.entity.Hackathon
import com.hackathon.manager.entity.Team
import com.hackathon.manager.entity.TeamMember
import com.hackathon.manager.entity.User
import com.hackathon.manager.entity.enums.HackathonStatus
import com.hackathon.manager.exception.ApiException
import com.hackathon.manager.repository.*
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.kotlin.*
import java.time.OffsetDateTime
import java.util.*

@ExtendWith(MockitoExtension::class)
class TeamServiceTest {

    @Mock
    lateinit var teamRepository: TeamRepository

    @Mock
    lateinit var teamMemberRepository: TeamMemberRepository

    @Mock
    lateinit var hackathonRepository: HackathonRepository

    @Mock
    lateinit var hackathonUserRepository: HackathonUserRepository

    @Mock
    lateinit var userRepository: UserRepository

    @InjectMocks
    lateinit var teamService: TeamService

    private lateinit var testUser: User
    private lateinit var testHackathon: Hackathon
    private lateinit var testTeam: Team
    private lateinit var testTeamMember: TeamMember
    private val testUserId = UUID.randomUUID()
    private val testHackathonId = UUID.randomUUID()
    private val testTeamId = UUID.randomUUID()

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
            status = HackathonStatus.registration_open,
            startsAt = OffsetDateTime.now().plusDays(7),
            endsAt = OffsetDateTime.now().plusDays(9),
            createdBy = testUser,
            maxTeamSize = 5
        )

        testTeam = Team(
            id = testTeamId,
            hackathon = testHackathon,
            name = "Test Team",
            description = "A test team",
            inviteCode = "ABC12345",
            isOpen = true,
            createdBy = testUser
        )

        testTeamMember = TeamMember(
            id = UUID.randomUUID(),
            team = testTeam,
            user = testUser,
            isLeader = true
        )
        testTeam.members.add(testTeamMember)
    }

    @Test
    fun `getTeamsByHackathon should return teams for hackathon`() {
        whenever(teamRepository.findByHackathonId(testHackathonId)).thenReturn(listOf(testTeam))

        val result = teamService.getTeamsByHackathon(testHackathonId)

        assertThat(result).hasSize(1)
        assertThat(result[0].name).isEqualTo("Test Team")
        assertThat(result[0].hackathonId).isEqualTo(testHackathonId)
    }

    @Test
    fun `getTeamById should return team when found`() {
        whenever(teamRepository.findById(testTeamId)).thenReturn(Optional.of(testTeam))

        val result = teamService.getTeamById(testTeamId)

        assertThat(result.id).isEqualTo(testTeamId)
        assertThat(result.name).isEqualTo("Test Team")
        assertThat(result.members).isNotNull
        assertThat(result.members).hasSize(1)
    }

    @Test
    fun `getTeamById should throw exception when not found`() {
        whenever(teamRepository.findById(testTeamId)).thenReturn(Optional.empty())

        assertThatThrownBy { teamService.getTeamById(testTeamId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Team not found")
    }

    @Test
    fun `getUserTeamInHackathon should return team when user is member`() {
        whenever(teamRepository.findByHackathonIdAndMemberUserId(testHackathonId, testUserId))
            .thenReturn(testTeam)

        val result = teamService.getUserTeamInHackathon(testHackathonId, testUserId)

        assertThat(result).isNotNull
        assertThat(result!!.name).isEqualTo("Test Team")
    }

    @Test
    fun `getUserTeamInHackathon should return null when user is not member`() {
        whenever(teamRepository.findByHackathonIdAndMemberUserId(testHackathonId, testUserId))
            .thenReturn(null)

        val result = teamService.getUserTeamInHackathon(testHackathonId, testUserId)

        assertThat(result).isNull()
    }

    @Test
    fun `createTeam should create team successfully`() {
        val request = CreateTeamRequest(
            hackathonId = testHackathonId,
            name = "New Team",
            description = "A new team",
            isOpen = true
        )

        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(hackathonUserRepository.existsByHackathonIdAndUserId(testHackathonId, testUserId)).thenReturn(true)
        whenever(teamRepository.findByHackathonIdAndMemberUserId(testHackathonId, testUserId)).thenReturn(null)
        whenever(teamRepository.existsByHackathonIdAndName(testHackathonId, "New Team")).thenReturn(false)
        whenever(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser))
        whenever(teamRepository.save(any<Team>())).thenAnswer { invocation ->
            val team = invocation.arguments[0] as Team
            Team(
                id = UUID.randomUUID(),
                hackathon = team.hackathon,
                name = team.name,
                description = team.description,
                inviteCode = team.inviteCode,
                isOpen = team.isOpen,
                createdBy = team.createdBy
            )
        }
        whenever(teamMemberRepository.save(any<TeamMember>())).thenAnswer { invocation ->
            val member = invocation.arguments[0] as TeamMember
            TeamMember(
                id = UUID.randomUUID(),
                team = member.team,
                user = member.user,
                isLeader = member.isLeader
            )
        }

        val result = teamService.createTeam(request, testUserId)

        assertThat(result.name).isEqualTo("New Team")
        assertThat(result.description).isEqualTo("A new team")
        assertThat(result.isOpen).isTrue()
        assertThat(result.inviteCode).isNotNull()

        verify(teamRepository).save(any<Team>())
        verify(teamMemberRepository).save(any<TeamMember>())
    }

    @Test
    fun `createTeam should throw exception when hackathon not found`() {
        val request = CreateTeamRequest(
            hackathonId = testHackathonId,
            name = "New Team"
        )

        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.empty())

        assertThatThrownBy { teamService.createTeam(request, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Hackathon not found")
    }

    @Test
    fun `createTeam should throw exception when not registered for hackathon`() {
        val request = CreateTeamRequest(
            hackathonId = testHackathonId,
            name = "New Team"
        )

        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(hackathonUserRepository.existsByHackathonIdAndUserId(testHackathonId, testUserId)).thenReturn(false)

        assertThatThrownBy { teamService.createTeam(request, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Must be registered for the hackathon to create a team")
    }

    @Test
    fun `createTeam should throw exception when already in a team`() {
        val request = CreateTeamRequest(
            hackathonId = testHackathonId,
            name = "New Team"
        )

        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(hackathonUserRepository.existsByHackathonIdAndUserId(testHackathonId, testUserId)).thenReturn(true)
        whenever(teamRepository.findByHackathonIdAndMemberUserId(testHackathonId, testUserId)).thenReturn(testTeam)

        assertThatThrownBy { teamService.createTeam(request, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Already a member of a team in this hackathon")
    }

    @Test
    fun `createTeam should throw exception when team name exists`() {
        val request = CreateTeamRequest(
            hackathonId = testHackathonId,
            name = "Existing Team"
        )

        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(hackathonUserRepository.existsByHackathonIdAndUserId(testHackathonId, testUserId)).thenReturn(true)
        whenever(teamRepository.findByHackathonIdAndMemberUserId(testHackathonId, testUserId)).thenReturn(null)
        whenever(teamRepository.existsByHackathonIdAndName(testHackathonId, "Existing Team")).thenReturn(true)

        assertThatThrownBy { teamService.createTeam(request, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Team name already exists in this hackathon")
    }

    @Test
    fun `updateTeam should update team when user is leader`() {
        val request = UpdateTeamRequest(
            name = "Updated Team",
            description = "Updated description",
            isOpen = false
        )

        whenever(teamRepository.findById(testTeamId)).thenReturn(Optional.of(testTeam))
        whenever(teamMemberRepository.findByTeamIdAndUserId(testTeamId, testUserId)).thenReturn(testTeamMember)
        whenever(teamRepository.existsByHackathonIdAndName(testHackathonId, "Updated Team")).thenReturn(false)
        whenever(teamRepository.save(any<Team>())).thenAnswer { it.arguments[0] }

        val result = teamService.updateTeam(testTeamId, request, testUserId)

        assertThat(result.name).isEqualTo("Updated Team")
        assertThat(result.description).isEqualTo("Updated description")
        assertThat(result.isOpen).isFalse()
    }

    @Test
    fun `updateTeam should throw exception when not a member`() {
        val request = UpdateTeamRequest(name = "Updated")

        whenever(teamRepository.findById(testTeamId)).thenReturn(Optional.of(testTeam))
        whenever(teamMemberRepository.findByTeamIdAndUserId(testTeamId, testUserId)).thenReturn(null)

        assertThatThrownBy { teamService.updateTeam(testTeamId, request, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Not a member of this team")
    }

    @Test
    fun `updateTeam should throw exception when not leader`() {
        val request = UpdateTeamRequest(name = "Updated")
        val regularMember = TeamMember(
            id = UUID.randomUUID(),
            team = testTeam,
            user = testUser,
            isLeader = false
        )

        whenever(teamRepository.findById(testTeamId)).thenReturn(Optional.of(testTeam))
        whenever(teamMemberRepository.findByTeamIdAndUserId(testTeamId, testUserId)).thenReturn(regularMember)

        assertThatThrownBy { teamService.updateTeam(testTeamId, request, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Only team leader can update team")
    }

    @Test
    fun `joinTeamByInviteCode should join team successfully`() {
        val newUserId = UUID.randomUUID()
        val newUser = User(
            id = newUserId,
            email = "new@example.com",
            passwordHash = "hash",
            firstName = "New",
            lastName = "User"
        )

        whenever(teamRepository.findByInviteCode("ABC12345")).thenReturn(testTeam)
        whenever(hackathonUserRepository.existsByHackathonIdAndUserId(testHackathonId, newUserId)).thenReturn(true)
        whenever(teamRepository.findByHackathonIdAndMemberUserId(testHackathonId, newUserId)).thenReturn(null)
        whenever(teamMemberRepository.countByTeamId(testTeamId)).thenReturn(1)
        whenever(userRepository.findById(newUserId)).thenReturn(Optional.of(newUser))
        whenever(teamMemberRepository.save(any<TeamMember>())).thenAnswer { invocation ->
            val member = invocation.arguments[0] as TeamMember
            TeamMember(
                id = UUID.randomUUID(),
                team = member.team,
                user = member.user,
                isLeader = member.isLeader
            )
        }

        val result = teamService.joinTeamByInviteCode("ABC12345", newUserId)

        assertThat(result.name).isEqualTo("Test Team")
        verify(teamMemberRepository).save(any<TeamMember>())
    }

    @Test
    fun `joinTeamByInviteCode should throw exception for invalid code`() {
        whenever(teamRepository.findByInviteCode("INVALID")).thenReturn(null)

        assertThatThrownBy { teamService.joinTeamByInviteCode("INVALID", testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Invalid invite code")
    }

    @Test
    fun `joinTeamByInviteCode should throw exception when team is closed`() {
        val closedTeam = Team(
            id = testTeamId,
            hackathon = testHackathon,
            name = "Closed Team",
            inviteCode = "CLOSED01",
            isOpen = false,
            createdBy = testUser
        )

        whenever(teamRepository.findByInviteCode("CLOSED01")).thenReturn(closedTeam)

        assertThatThrownBy { teamService.joinTeamByInviteCode("CLOSED01", testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Team is not accepting new members")
    }

    @Test
    fun `joinTeamByInviteCode should throw exception when not registered`() {
        whenever(teamRepository.findByInviteCode("ABC12345")).thenReturn(testTeam)
        whenever(hackathonUserRepository.existsByHackathonIdAndUserId(testHackathonId, testUserId)).thenReturn(false)

        assertThatThrownBy { teamService.joinTeamByInviteCode("ABC12345", testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Must be registered for the hackathon to join a team")
    }

    @Test
    fun `joinTeamByInviteCode should throw exception when already in a team`() {
        whenever(teamRepository.findByInviteCode("ABC12345")).thenReturn(testTeam)
        whenever(hackathonUserRepository.existsByHackathonIdAndUserId(testHackathonId, testUserId)).thenReturn(true)
        whenever(teamRepository.findByHackathonIdAndMemberUserId(testHackathonId, testUserId)).thenReturn(testTeam)

        assertThatThrownBy { teamService.joinTeamByInviteCode("ABC12345", testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Already a member of a team in this hackathon")
    }

    @Test
    fun `joinTeamByInviteCode should throw exception when team is full`() {
        val newUserId = UUID.randomUUID()

        whenever(teamRepository.findByInviteCode("ABC12345")).thenReturn(testTeam)
        whenever(hackathonUserRepository.existsByHackathonIdAndUserId(testHackathonId, newUserId)).thenReturn(true)
        whenever(teamRepository.findByHackathonIdAndMemberUserId(testHackathonId, newUserId)).thenReturn(null)
        whenever(teamMemberRepository.countByTeamId(testTeamId)).thenReturn(5)

        assertThatThrownBy { teamService.joinTeamByInviteCode("ABC12345", newUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Team is full")
    }

    @Test
    fun `leaveTeam should remove member successfully`() {
        val regularMember = TeamMember(
            id = UUID.randomUUID(),
            team = testTeam,
            user = testUser,
            isLeader = false
        )

        whenever(teamMemberRepository.findByTeamIdAndUserId(testTeamId, testUserId)).thenReturn(regularMember)

        teamService.leaveTeam(testTeamId, testUserId)

        verify(teamMemberRepository).delete(regularMember)
    }

    @Test
    fun `leaveTeam should transfer leadership when leader leaves`() {
        val leaderId = testUserId
        val otherMemberId = UUID.randomUUID()
        val otherUser = User(
            id = otherMemberId,
            email = "other@example.com",
            passwordHash = "hash",
            firstName = "Other",
            lastName = "User"
        )
        val otherMember = TeamMember(
            id = UUID.randomUUID(),
            team = testTeam,
            user = otherUser,
            isLeader = false
        )

        whenever(teamMemberRepository.findByTeamIdAndUserId(testTeamId, leaderId)).thenReturn(testTeamMember)
        whenever(teamMemberRepository.findByTeamId(testTeamId)).thenReturn(listOf(testTeamMember, otherMember))
        whenever(teamMemberRepository.save(any<TeamMember>())).thenAnswer { it.arguments[0] }

        teamService.leaveTeam(testTeamId, leaderId)

        verify(teamMemberRepository).save(argThat { isLeader })
        verify(teamMemberRepository).delete(testTeamMember)
    }

    @Test
    fun `leaveTeam should throw exception when not a member`() {
        whenever(teamMemberRepository.findByTeamIdAndUserId(testTeamId, testUserId)).thenReturn(null)

        assertThatThrownBy { teamService.leaveTeam(testTeamId, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Not a member of this team")
    }

    @Test
    fun `regenerateInviteCode should generate new code when leader`() {
        whenever(teamRepository.findById(testTeamId)).thenReturn(Optional.of(testTeam))
        whenever(teamMemberRepository.findByTeamIdAndUserId(testTeamId, testUserId)).thenReturn(testTeamMember)
        whenever(teamRepository.save(any<Team>())).thenAnswer { it.arguments[0] }

        val result = teamService.regenerateInviteCode(testTeamId, testUserId)

        assertThat(result).isNotNull()
        assertThat(result).hasSize(8)
        verify(teamRepository).save(any<Team>())
    }

    @Test
    fun `regenerateInviteCode should throw exception when not leader`() {
        val regularMember = TeamMember(
            id = UUID.randomUUID(),
            team = testTeam,
            user = testUser,
            isLeader = false
        )

        whenever(teamRepository.findById(testTeamId)).thenReturn(Optional.of(testTeam))
        whenever(teamMemberRepository.findByTeamIdAndUserId(testTeamId, testUserId)).thenReturn(regularMember)

        assertThatThrownBy { teamService.regenerateInviteCode(testTeamId, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Only team leader can regenerate invite code")
    }
}
