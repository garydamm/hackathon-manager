package com.hackathon.manager.service

import com.hackathon.manager.dto.CreateJudgingCriteriaRequest
import com.hackathon.manager.dto.UpdateJudgingCriteriaRequest
import com.hackathon.manager.entity.Hackathon
import com.hackathon.manager.entity.JudgingCriteria
import com.hackathon.manager.entity.User
import com.hackathon.manager.entity.enums.HackathonStatus
import com.hackathon.manager.exception.ApiException
import com.hackathon.manager.repository.HackathonRepository
import com.hackathon.manager.repository.JudgingCriteriaRepository
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.kotlin.*
import java.math.BigDecimal
import java.time.OffsetDateTime
import java.util.*

@ExtendWith(MockitoExtension::class)
class JudgingCriteriaServiceTest {

    @Mock
    lateinit var judgingCriteriaRepository: JudgingCriteriaRepository

    @Mock
    lateinit var hackathonRepository: HackathonRepository

    @Mock
    lateinit var hackathonService: HackathonService

    @InjectMocks
    lateinit var judgingCriteriaService: JudgingCriteriaService

    private lateinit var testUser: User
    private lateinit var testHackathon: Hackathon
    private lateinit var testCriteria: JudgingCriteria
    private val testUserId = UUID.randomUUID()
    private val testHackathonId = UUID.randomUUID()
    private val testCriteriaId = UUID.randomUUID()

    @BeforeEach
    fun setUp() {
        testUser = User(
            id = testUserId,
            email = "organizer@example.com",
            passwordHash = "hashedpassword",
            firstName = "Test",
            lastName = "Organizer"
        )

        testHackathon = Hackathon(
            id = testHackathonId,
            name = "Test Hackathon",
            slug = "test-hackathon",
            description = "A test hackathon",
            status = HackathonStatus.in_progress,
            startsAt = OffsetDateTime.now().plusDays(7),
            endsAt = OffsetDateTime.now().plusDays(9),
            createdBy = testUser
        )

        testCriteria = JudgingCriteria(
            id = testCriteriaId,
            hackathon = testHackathon,
            name = "Innovation",
            description = "How innovative is the project",
            maxScore = 10,
            weight = BigDecimal("1.00"),
            displayOrder = 1
        )
    }

    @Test
    fun `getCriteriaByHackathon should return criteria ordered by displayOrder`() {
        whenever(judgingCriteriaRepository.findByHackathonIdOrderByDisplayOrder(testHackathonId))
            .thenReturn(listOf(testCriteria))

        val result = judgingCriteriaService.getCriteriaByHackathon(testHackathonId)

        assertThat(result).hasSize(1)
        assertThat(result[0].name).isEqualTo("Innovation")
        assertThat(result[0].hackathonId).isEqualTo(testHackathonId)
    }

    @Test
    fun `createCriteria should create criteria when user is organizer`() {
        val request = CreateJudgingCriteriaRequest(
            name = "Technical Excellence",
            description = "Quality of code",
            maxScore = 10,
            weight = BigDecimal("1.50"),
            displayOrder = 2
        )

        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId)).thenReturn(true)
        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(judgingCriteriaRepository.save(any<JudgingCriteria>())).thenAnswer { invocation ->
            val criteria = invocation.arguments[0] as JudgingCriteria
            JudgingCriteria(
                id = UUID.randomUUID(),
                hackathon = criteria.hackathon,
                name = criteria.name,
                description = criteria.description,
                maxScore = criteria.maxScore,
                weight = criteria.weight,
                displayOrder = criteria.displayOrder
            )
        }

        val result = judgingCriteriaService.createCriteria(testHackathonId, request, testUserId)

        assertThat(result.name).isEqualTo("Technical Excellence")
        assertThat(result.weight).isEqualTo(BigDecimal("1.50"))
        verify(judgingCriteriaRepository).save(any<JudgingCriteria>())
    }

    @Test
    fun `createCriteria should throw forbidden when user is not organizer`() {
        val request = CreateJudgingCriteriaRequest(name = "Test")

        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId)).thenReturn(false)

        assertThatThrownBy { judgingCriteriaService.createCriteria(testHackathonId, request, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Only organizers can create judging criteria")
    }

    @Test
    fun `updateCriteria should update criteria when user is organizer`() {
        val request = UpdateJudgingCriteriaRequest(
            name = "Updated Name",
            maxScore = 20
        )

        whenever(judgingCriteriaRepository.findById(testCriteriaId)).thenReturn(Optional.of(testCriteria))
        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId)).thenReturn(true)
        whenever(judgingCriteriaRepository.save(any<JudgingCriteria>())).thenAnswer { it.arguments[0] }

        val result = judgingCriteriaService.updateCriteria(testCriteriaId, request, testUserId)

        assertThat(result.name).isEqualTo("Updated Name")
        assertThat(result.maxScore).isEqualTo(20)
    }

    @Test
    fun `updateCriteria should throw not found when criteria does not exist`() {
        val request = UpdateJudgingCriteriaRequest(name = "Test")

        whenever(judgingCriteriaRepository.findById(testCriteriaId)).thenReturn(Optional.empty())

        assertThatThrownBy { judgingCriteriaService.updateCriteria(testCriteriaId, request, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Judging criteria not found")
    }

    @Test
    fun `deleteCriteria should delete criteria when user is organizer`() {
        whenever(judgingCriteriaRepository.findById(testCriteriaId)).thenReturn(Optional.of(testCriteria))
        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId)).thenReturn(true)

        judgingCriteriaService.deleteCriteria(testCriteriaId, testUserId)

        verify(judgingCriteriaRepository).delete(testCriteria)
    }

    @Test
    fun `deleteCriteria should throw not found when criteria does not exist`() {
        whenever(judgingCriteriaRepository.findById(testCriteriaId)).thenReturn(Optional.empty())

        assertThatThrownBy { judgingCriteriaService.deleteCriteria(testCriteriaId, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Judging criteria not found")
    }

    @Test
    fun `deleteCriteria should throw forbidden when user is not organizer`() {
        whenever(judgingCriteriaRepository.findById(testCriteriaId)).thenReturn(Optional.of(testCriteria))
        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId)).thenReturn(false)

        assertThatThrownBy { judgingCriteriaService.deleteCriteria(testCriteriaId, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Only organizers can delete judging criteria")
    }
}
