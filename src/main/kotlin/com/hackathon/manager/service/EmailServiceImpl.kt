package com.hackathon.manager.service

import com.resend.Resend
import com.resend.services.emails.model.CreateEmailOptions
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service

@Service
class EmailServiceImpl(
    @Value("\${app.frontend.url}") private val frontendUrl: String,
    @Value("\${app.email.from}") private val fromEmail: String,
    @Value("\${app.email.from-name:Hackathon Manager}") private val fromName: String,
    @Value("\${app.email.resend.api-key:}") private val resendApiKey: String,
    @Value("\${app.email.enabled:false}") private val emailEnabled: Boolean
) : EmailService {

    private val logger = LoggerFactory.getLogger(EmailServiceImpl::class.java)
    private val resend: Resend? = if (emailEnabled && resendApiKey.isNotBlank()) {
        Resend(resendApiKey)
    } else {
        null
    }

    init {
        if (emailEnabled && resendApiKey.isBlank()) {
            logger.warn("Email sending is enabled but Resend API key is not configured")
        }
        if (emailEnabled) {
            logger.info("Email service initialized with Resend (from: $fromName <$fromEmail>)")
        } else {
            logger.info("Email service initialized in console-only mode")
        }
    }

    override fun sendPasswordResetEmail(toEmail: String, resetToken: String, userFirstName: String): Boolean {
        val resetUrl = "$frontendUrl/reset-password?token=$resetToken"
        val subject = "Password Reset Request"
        val htmlContent = buildPasswordResetEmailHtml(userFirstName, resetUrl)
        val textContent = buildPasswordResetEmailText(userFirstName, resetUrl)

        return sendEmail(
            to = toEmail,
            subject = subject,
            htmlContent = htmlContent,
            textContent = textContent
        )
    }

    override fun sendPasswordChangeConfirmation(toEmail: String, userFirstName: String): Boolean {
        val subject = "Your Password Has Been Changed"
        val htmlContent = buildPasswordChangeEmailHtml(userFirstName)
        val textContent = buildPasswordChangeEmailText(userFirstName)

        return sendEmail(
            to = toEmail,
            subject = subject,
            htmlContent = htmlContent,
            textContent = textContent
        )
    }

    private fun sendEmail(to: String, subject: String, htmlContent: String, textContent: String): Boolean {
        if (emailEnabled && resend != null) {
            try {
                val email = CreateEmailOptions.builder()
                    .from("$fromName <$fromEmail>")
                    .to(to)
                    .subject(subject)
                    .html(htmlContent)
                    .text(textContent)
                    .build()

                val response = resend.emails().send(email)
                logger.info("Email sent successfully to $to (ID: ${response.id})")
                return true
            } catch (e: Exception) {
                logger.error("Failed to send email to $to: ${e.message}", e)
                // Fallback to console logging
                logEmailToConsole(to, subject, textContent)
                return false
            }
        } else {
            // Log to console when email is disabled
            logEmailToConsole(to, subject, textContent)
            return true // Console logging is considered successful
        }
    }

    private fun logEmailToConsole(to: String, subject: String, content: String) {
        logger.info("""
            |========================================
            |EMAIL (Console Mode)
            |========================================
            |To: $to
            |Subject: $subject
            |
            |$content
            |========================================
        """.trimMargin())
    }

    private fun buildPasswordResetEmailHtml(firstName: String, resetUrl: String): String {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
                    <h2 style="color: #0066cc;">Password Reset Request</h2>
                    <p>Hi $firstName,</p>
                    <p>We received a request to reset your password. Click the button below to reset your password:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="$resetUrl" style="background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
                    </div>
                    <p style="color: #666; font-size: 14px;">Or copy and paste this link in your browser:</p>
                    <p style="color: #0066cc; word-break: break-all; font-size: 14px;">$resetUrl</p>
                    <p style="color: #666; font-size: 14px; margin-top: 30px;">This link will expire in 15 minutes.</p>
                    <p style="color: #666; font-size: 14px;">If you did not request a password reset, please ignore this email.</p>
                </div>
            </body>
            </html>
        """.trimIndent()
    }

    private fun buildPasswordResetEmailText(firstName: String, resetUrl: String): String {
        return """
            Password Reset Request

            Hi $firstName,

            We received a request to reset your password. Click the link below to reset your password:

            $resetUrl

            This link will expire in 15 minutes.

            If you did not request a password reset, please ignore this email.
        """.trimIndent()
    }

    private fun buildPasswordChangeEmailHtml(firstName: String): String {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
                    <h2 style="color: #28a745;">Password Changed Successfully</h2>
                    <p>Hi $firstName,</p>
                    <p>Your password has been successfully changed.</p>
                    <p style="color: #666; font-size: 14px; margin-top: 30px;">If you did not make this change, please contact our support team immediately.</p>
                </div>
            </body>
            </html>
        """.trimIndent()
    }

    private fun buildPasswordChangeEmailText(firstName: String): String {
        return """
            Password Changed Successfully

            Hi $firstName,

            Your password has been successfully changed.

            If you did not make this change, please contact our support team immediately.
        """.trimIndent()
    }
}
