package com.hackathon.manager.repository

import com.hackathon.manager.entity.Hackathon
import com.hackathon.manager.entity.Team
import com.hackathon.manager.entity.TeamMember
import com.hackathon.manager.entity.User
import com.hackathon.manager.entity.enums.HackathonStatus
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
class TeamRepositoryTest : AbstractRepositoryTest() {

    @Autowired
    lateinit var entityManager: TestEntityManager

    @Autowired
    lateinit var teamRepository: TeamRepository

    private lateinit var testUser: User
    private lateinit var testHackathon: Hackathon
    private lateinit var testTeam: Team

    @BeforeEach
    fun setUp() {
        testUser = User(
            email = "test@example.com",
            passwordHash = "hashedpassword",
            firstName = "Test",
            lastName = "User"
        )
        entityManager.persist(testUser)

        testHackathon = Hackathon(
            name = "Test Hackathon",
            slug = "test-hackathon",
            status = HackathonStatus.registration_open,
            startsAt = OffsetDateTime.now().plusDays(7),
            endsAt = OffsetDateTime.now().plusDays(9),
            createdBy = testUser
        )
        entityManager.persist(testHackathon)

        testTeam = Team(
            hackathon = testHackathon,
            name = "Test Team",
            description = "A test team",
            inviteCode = "ABC12345",
            isOpen = true,
            createdBy = testUser
        )
    }

    @Test
    fun `findByHackathonId should return teams for hackathon`() {
        entityManager.persist(testTeam)
        entityManager.flush()

        val found = teamRepository.findByHackathonId(testHackathon.id!!)

        assertThat(found).hasSize(1)
        assertThat(found[0].name).isEqualTo("Test Team")
    }

    @Test
    fun `findByHackathonId should return empty for hackathon with no teams`() {
        entityManager.flush()

        val found = teamRepository.findByHackathonId(testHackathon.id!!)

        assertThat(found).isEmpty()
    }

    @Test
    fun `findByInviteCode should return team when exists`() {
        entityManager.persist(testTeam)
        entityManager.flush()

        val found = teamRepository.findByInviteCode("ABC12345")

        assertThat(found).isNotNull
        assertThat(found!!.name).isEqualTo("Test Team")
    }

    @Test
    fun `findByInviteCode should return null for invalid code`() {
        entityManager.persist(testTeam)
        entityManager.flush()

        val found = teamRepository.findByInviteCode("INVALID")

        assertThat(found).isNull()
    }

    @Test
    fun `existsByHackathonIdAndName should return true when team exists`() {
        entityManager.persist(testTeam)
        entityManager.flush()

        val exists = teamRepository.existsByHackathonIdAndName(testHackathon.id!!, "Test Team")

        assertThat(exists).isTrue()
    }

    @Test
    fun `existsByHackathonIdAndName should return false for different name`() {
        entityManager.persist(testTeam)
        entityManager.flush()

        val exists = teamRepository.existsByHackathonIdAndName(testHackathon.id!!, "Other Team")

        assertThat(exists).isFalse()
    }

    @Test
    fun `findByHackathonIdAndMemberUserId should return team when user is member`() {
        entityManager.persist(testTeam)

        val member = TeamMember(
            team = testTeam,
            user = testUser,
            isLeader = true
        )
        entityManager.persist(member)
        entityManager.flush()

        val found = teamRepository.findByHackathonIdAndMemberUserId(testHackathon.id!!, testUser.id!!)

        assertThat(found).isNotNull
        assertThat(found!!.name).isEqualTo("Test Team")
    }

    @Test
    fun `findByHackathonIdAndMemberUserId should return null when user not member`() {
        val otherUser = User(
            email = "other@example.com",
            passwordHash = "hashedpassword",
            firstName = "Other",
            lastName = "User"
        )
        entityManager.persist(otherUser)
        entityManager.persist(testTeam)
        entityManager.flush()

        val found = teamRepository.findByHackathonIdAndMemberUserId(testHackathon.id!!, otherUser.id!!)

        assertThat(found).isNull()
    }

    @Test
    fun `save should persist team with all fields`() {
        val saved = teamRepository.save(testTeam)

        assertThat(saved.id).isNotNull()

        val found = entityManager.find(Team::class.java, saved.id)
        assertThat(found.name).isEqualTo("Test Team")
        assertThat(found.description).isEqualTo("A test team")
        assertThat(found.inviteCode).isEqualTo("ABC12345")
        assertThat(found.isOpen).isTrue()
    }

    @Test
    fun `findByHackathonId should return multiple teams`() {
        entityManager.persist(testTeam)

        val team2 = Team(
            hackathon = testHackathon,
            name = "Team 2",
            inviteCode = "XYZ98765",
            isOpen = true,
            createdBy = testUser
        )
        entityManager.persist(team2)
        entityManager.flush()

        val found = teamRepository.findByHackathonId(testHackathon.id!!)

        assertThat(found).hasSize(2)
        assertThat(found.map { it.name }).containsExactlyInAnyOrder("Test Team", "Team 2")
    }
}
