package com.hackathon.manager.service

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service

@Service
class EmailServiceImpl(
    @Value("\${app.frontend.url}") private val frontendUrl: String
) : EmailService {

    override fun sendPasswordResetEmail(toEmail: String, resetToken: String, userFirstName: String) {
        val resetUrl = "$frontendUrl/reset-password?token=$resetToken"

        // MVP: Log email to console instead of sending via SMTP
        println("""
            |========================================
            |PASSWORD RESET EMAIL
            |========================================
            |To: $toEmail
            |Subject: Password Reset Request
            |
            |Hi $userFirstName,
            |
            |We received a request to reset your password. Click the link below to reset your password:
            |
            |$resetUrl
            |
            |This link will expire in 15 minutes.
            |
            |If you did not request a password reset, please ignore this email.
            |
            |========================================
        """.trimMargin())
    }
}
