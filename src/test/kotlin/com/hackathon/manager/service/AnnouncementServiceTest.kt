package com.hackathon.manager.service

import com.hackathon.manager.dto.CreateAnnouncementRequest
import com.hackathon.manager.dto.UpdateAnnouncementRequest
import com.hackathon.manager.entity.Announcement
import com.hackathon.manager.entity.Hackathon
import com.hackathon.manager.entity.User
import com.hackathon.manager.entity.enums.HackathonStatus
import com.hackathon.manager.exception.ApiException
import com.hackathon.manager.repository.AnnouncementRepository
import com.hackathon.manager.repository.HackathonRepository
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
import java.time.OffsetDateTime
import java.util.*

@ExtendWith(MockitoExtension::class)
class AnnouncementServiceTest {

    @Mock
    lateinit var announcementRepository: AnnouncementRepository

    @Mock
    lateinit var hackathonRepository: HackathonRepository

    @Mock
    lateinit var userRepository: UserRepository

    @InjectMocks
    lateinit var announcementService: AnnouncementService

    private lateinit var testUser: User
    private lateinit var testHackathon: Hackathon
    private lateinit var testAnnouncement: Announcement
    private val testUserId = UUID.randomUUID()
    private val testHackathonId = UUID.randomUUID()
    private val testAnnouncementId = UUID.randomUUID()

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

        testHackathon = Hackathon(
            id = testHackathonId,
            name = "Test Hackathon",
            slug = "test-hackathon",
            status = HackathonStatus.in_progress,
            startsAt = OffsetDateTime.now().minusDays(1),
            endsAt = OffsetDateTime.now().plusDays(1),
            createdBy = testUser
        )

        testAnnouncement = Announcement(
            id = testAnnouncementId,
            hackathon = testHackathon,
            title = "Test Announcement",
            content = "This is a test announcement",
            isPinned = false,
            isUrgent = false,
            createdBy = testUser
        )
    }

    @Test
    fun `getAnnouncementsByHackathon should return announcements`() {
        val pinnedAnnouncement = Announcement(
            id = UUID.randomUUID(),
            hackathon = testHackathon,
            title = "Pinned Announcement",
            content = "Important",
            isPinned = true,
            isUrgent = false,
            createdBy = testUser
        )

        whenever(announcementRepository.findByHackathonIdOrderByIsPinnedDescPublishedAtDesc(testHackathonId))
            .thenReturn(listOf(pinnedAnnouncement, testAnnouncement))

        val result = announcementService.getAnnouncementsByHackathon(testHackathonId)

        assertThat(result).hasSize(2)
        assertThat(result[0].isPinned).isTrue()
        assertThat(result[1].isPinned).isFalse()
    }

    @Test
    fun `getAnnouncementById should return announcement when found`() {
        whenever(announcementRepository.findById(testAnnouncementId)).thenReturn(Optional.of(testAnnouncement))

        val result = announcementService.getAnnouncementById(testAnnouncementId)

        assertThat(result.id).isEqualTo(testAnnouncementId)
        assertThat(result.title).isEqualTo("Test Announcement")
        assertThat(result.content).isEqualTo("This is a test announcement")
    }

    @Test
    fun `getAnnouncementById should throw exception when not found`() {
        whenever(announcementRepository.findById(testAnnouncementId)).thenReturn(Optional.empty())

        assertThatThrownBy { announcementService.getAnnouncementById(testAnnouncementId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Announcement not found")
    }

    @Test
    fun `createAnnouncement should create announcement successfully`() {
        val request = CreateAnnouncementRequest(
            hackathonId = testHackathonId,
            title = "New Announcement",
            content = "New announcement content",
            isPinned = true,
            isUrgent = true
        )

        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser))
        whenever(announcementRepository.save(any<Announcement>())).thenAnswer { invocation ->
            val announcement = invocation.arguments[0] as Announcement
            Announcement(
                id = UUID.randomUUID(),
                hackathon = announcement.hackathon,
                title = announcement.title,
                content = announcement.content,
                isPinned = announcement.isPinned,
                isUrgent = announcement.isUrgent,
                createdBy = announcement.createdBy
            )
        }

        val result = announcementService.createAnnouncement(request, testUserId)

        assertThat(result.title).isEqualTo("New Announcement")
        assertThat(result.content).isEqualTo("New announcement content")
        assertThat(result.isPinned).isTrue()
        assertThat(result.isUrgent).isTrue()
        assertThat(result.hackathonId).isEqualTo(testHackathonId)

        verify(announcementRepository).save(any<Announcement>())
    }

    @Test
    fun `createAnnouncement should throw exception when hackathon not found`() {
        val request = CreateAnnouncementRequest(
            hackathonId = testHackathonId,
            title = "New Announcement",
            content = "Content"
        )

        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.empty())

        assertThatThrownBy { announcementService.createAnnouncement(request, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Hackathon not found")
    }

    @Test
    fun `createAnnouncement should throw exception when user not found`() {
        val request = CreateAnnouncementRequest(
            hackathonId = testHackathonId,
            title = "New Announcement",
            content = "Content"
        )

        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(userRepository.findById(testUserId)).thenReturn(Optional.empty())

        assertThatThrownBy { announcementService.createAnnouncement(request, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("User not found")
    }

    @Test
    fun `updateAnnouncement should update announcement fields`() {
        val request = UpdateAnnouncementRequest(
            title = "Updated Title",
            content = "Updated content",
            isPinned = true,
            isUrgent = true
        )

        whenever(announcementRepository.findById(testAnnouncementId)).thenReturn(Optional.of(testAnnouncement))
        whenever(announcementRepository.save(any<Announcement>())).thenAnswer { it.arguments[0] }

        val result = announcementService.updateAnnouncement(testAnnouncementId, request)

        assertThat(result.title).isEqualTo("Updated Title")
        assertThat(result.content).isEqualTo("Updated content")
        assertThat(result.isPinned).isTrue()
        assertThat(result.isUrgent).isTrue()
    }

    @Test
    fun `updateAnnouncement should update only provided fields`() {
        val request = UpdateAnnouncementRequest(
            title = "Only Title Updated"
        )

        whenever(announcementRepository.findById(testAnnouncementId)).thenReturn(Optional.of(testAnnouncement))
        whenever(announcementRepository.save(any<Announcement>())).thenAnswer { it.arguments[0] }

        val result = announcementService.updateAnnouncement(testAnnouncementId, request)

        assertThat(result.title).isEqualTo("Only Title Updated")
        assertThat(result.content).isEqualTo("This is a test announcement")
        assertThat(result.isPinned).isFalse()
    }

    @Test
    fun `updateAnnouncement should throw exception when not found`() {
        val request = UpdateAnnouncementRequest(title = "Updated")

        whenever(announcementRepository.findById(testAnnouncementId)).thenReturn(Optional.empty())

        assertThatThrownBy { announcementService.updateAnnouncement(testAnnouncementId, request) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Announcement not found")
    }

    @Test
    fun `deleteAnnouncement should delete announcement successfully`() {
        whenever(announcementRepository.existsById(testAnnouncementId)).thenReturn(true)

        announcementService.deleteAnnouncement(testAnnouncementId)

        verify(announcementRepository).deleteById(testAnnouncementId)
    }

    @Test
    fun `deleteAnnouncement should throw exception when not found`() {
        whenever(announcementRepository.existsById(testAnnouncementId)).thenReturn(false)

        assertThatThrownBy { announcementService.deleteAnnouncement(testAnnouncementId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Announcement not found")

        verify(announcementRepository, never()).deleteById(any())
    }
}
