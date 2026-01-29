package com.hackathon.manager.service

import com.resend.Resend
import com.resend.core.exception.ResendException
import com.resend.services.emails.Emails
import com.resend.services.emails.model.CreateEmailOptions
import com.resend.services.emails.model.CreateEmailResponse
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.ArgumentCaptor
import org.mockito.Captor
import org.mockito.Mock
import org.mockito.Mockito.lenient
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.kotlin.*
import org.springframework.test.util.ReflectionTestUtils

@ExtendWith(MockitoExtension::class)
class EmailServiceImplTest {

    @Mock
    private lateinit var mockResend: Resend

    @Mock
    private lateinit var mockEmailsService: Emails

    @Captor
    private lateinit var emailOptionsCaptor: ArgumentCaptor<CreateEmailOptions>

    private lateinit var emailService: EmailServiceImpl

    private val frontendUrl = "http://localhost:3000"
    private val fromEmail = "noreply@hackathon.test"
    private val fromName = "Hackathon Manager"
    private val testEmail = "user@example.com"
    private val testFirstName = "John"
    private val testResetToken = "test-reset-token-12345"

    @BeforeEach
    fun setUp() {
        // Create email service with email enabled
        emailService = EmailServiceImpl(
            frontendUrl = frontendUrl,
            fromEmail = fromEmail,
            fromName = fromName,
            resendApiKey = "test-api-key",
            emailEnabled = true
        )

        // Inject mock Resend client
        ReflectionTestUtils.setField(emailService, "resend", mockResend)

        // Setup mock behavior with lenient stubbing to avoid UnnecessaryStubbingException
        lenient().whenever(mockResend.emails()).thenReturn(mockEmailsService)
    }

    @Test
    fun `sendPasswordResetEmail should send email with correct reset URL and user details`() {
        // Given
        val mockResponse = mock<CreateEmailResponse> {
            on { id } doReturn "test-email-id-123"
        }
        whenever(mockEmailsService.send(any())).thenReturn(mockResponse)

        // When
        emailService.sendPasswordResetEmail(testEmail, testResetToken, testFirstName)

        // Then
        verify(mockEmailsService).send(emailOptionsCaptor.capture())
        val capturedEmail = emailOptionsCaptor.value

        assertThat(capturedEmail.from).isEqualTo("$fromName <$fromEmail>")
        assertThat(capturedEmail.to).containsExactly(testEmail)
        assertThat(capturedEmail.subject).isEqualTo("Password Reset Request")

        // Verify HTML content
        val htmlContent = capturedEmail.html
        assertThat(htmlContent).contains(testFirstName)
        assertThat(htmlContent).contains("$frontendUrl/reset-password?token=$testResetToken")
        assertThat(htmlContent).contains("Password Reset Request")
        assertThat(htmlContent).contains("15 minutes")

        // Verify text content
        val textContent = capturedEmail.text
        assertThat(textContent).contains(testFirstName)
        assertThat(textContent).contains("$frontendUrl/reset-password?token=$testResetToken")
        assertThat(textContent).contains("Password Reset Request")
        assertThat(textContent).contains("15 minutes")
    }

    @Test
    fun `sendPasswordChangeConfirmation should send email with correct content`() {
        // Given
        val mockResponse = mock<CreateEmailResponse> {
            on { id } doReturn "test-email-id-456"
        }
        whenever(mockEmailsService.send(any())).thenReturn(mockResponse)

        // When
        emailService.sendPasswordChangeConfirmation(testEmail, testFirstName)

        // Then
        verify(mockEmailsService).send(emailOptionsCaptor.capture())
        val capturedEmail = emailOptionsCaptor.value

        assertThat(capturedEmail.from).isEqualTo("$fromName <$fromEmail>")
        assertThat(capturedEmail.to).containsExactly(testEmail)
        assertThat(capturedEmail.subject).isEqualTo("Your Password Has Been Changed")

        // Verify HTML content
        val htmlContent = capturedEmail.html
        assertThat(htmlContent).contains(testFirstName)
        assertThat(htmlContent).contains("Password Changed Successfully")
        assertThat(htmlContent).contains("successfully changed")

        // Verify text content
        val textContent = capturedEmail.text
        assertThat(textContent).contains(testFirstName)
        assertThat(textContent).contains("Password Changed Successfully")
        assertThat(textContent).contains("successfully changed")
    }

    @Test
    fun `sendPasswordResetEmail should fallback to console when Resend API fails`() {
        // Given
        whenever(mockEmailsService.send(any())).thenThrow(ResendException("API error"))

        // When - should not throw exception
        emailService.sendPasswordResetEmail(testEmail, testResetToken, testFirstName)

        // Then - verify email was attempted
        verify(mockEmailsService).send(any())
        // Email should fall back to console logging (no exception thrown)
    }

    @Test
    fun `sendPasswordChangeConfirmation should fallback to console when Resend API fails`() {
        // Given
        whenever(mockEmailsService.send(any())).thenThrow(RuntimeException("Network error"))

        // When - should not throw exception
        emailService.sendPasswordChangeConfirmation(testEmail, testFirstName)

        // Then - verify email was attempted
        verify(mockEmailsService).send(any())
        // Email should fall back to console logging (no exception thrown)
    }

    @Test
    fun `should use console mode when email is disabled`() {
        // Given - create service with email disabled
        val consoleEmailService = EmailServiceImpl(
            frontendUrl = frontendUrl,
            fromEmail = fromEmail,
            fromName = fromName,
            resendApiKey = "test-api-key",
            emailEnabled = false
        )

        // When
        consoleEmailService.sendPasswordResetEmail(testEmail, testResetToken, testFirstName)

        // Then - no API calls should be made (console mode only)
        verifyNoInteractions(mockResend)
    }

    @Test
    fun `should use console mode when Resend API key is blank`() {
        // Given - create service with blank API key
        val consoleEmailService = EmailServiceImpl(
            frontendUrl = frontendUrl,
            fromEmail = fromEmail,
            fromName = fromName,
            resendApiKey = "",
            emailEnabled = true
        )

        // When
        consoleEmailService.sendPasswordResetEmail(testEmail, testResetToken, testFirstName)

        // Then - no API calls should be made (console mode only)
        verifyNoInteractions(mockResend)
    }

    @Test
    fun `should use console mode when Resend is unavailable`() {
        // Given - create service with null resend
        val consoleEmailService = EmailServiceImpl(
            frontendUrl = frontendUrl,
            fromEmail = fromEmail,
            fromName = fromName,
            resendApiKey = "",
            emailEnabled = false
        )

        // When
        consoleEmailService.sendPasswordResetEmail(testEmail, testResetToken, testFirstName)
        consoleEmailService.sendPasswordChangeConfirmation(testEmail, testFirstName)

        // Then - should complete without errors (console logging only)
        verifyNoInteractions(mockResend)
    }

    @Test
    fun `password reset email should contain all required security information`() {
        // Given
        val mockResponse = mock<CreateEmailResponse> {
            on { id } doReturn "test-email-id-789"
        }
        whenever(mockEmailsService.send(any())).thenReturn(mockResponse)

        // When
        emailService.sendPasswordResetEmail(testEmail, testResetToken, testFirstName)

        // Then
        verify(mockEmailsService).send(emailOptionsCaptor.capture())
        val capturedEmail = emailOptionsCaptor.value

        val textContent = capturedEmail.text
        // Verify security warnings
        assertThat(textContent).contains("15 minutes")
        assertThat(textContent).contains("If you did not request a password reset, please ignore this email")
    }

    @Test
    fun `password change confirmation should contain security warning`() {
        // Given
        val mockResponse = mock<CreateEmailResponse> {
            on { id } doReturn "test-email-id-101"
        }
        whenever(mockEmailsService.send(any())).thenReturn(mockResponse)

        // When
        emailService.sendPasswordChangeConfirmation(testEmail, testFirstName)

        // Then
        verify(mockEmailsService).send(emailOptionsCaptor.capture())
        val capturedEmail = emailOptionsCaptor.value

        val textContent = capturedEmail.text
        // Verify security warning
        assertThat(textContent).contains("If you did not make this change, please contact our support team")
    }
}
