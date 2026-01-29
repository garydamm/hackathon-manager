package com.hackathon.manager.service

interface EmailService {
    fun sendPasswordResetEmail(toEmail: String, resetToken: String, userFirstName: String): Boolean
    fun sendPasswordChangeConfirmation(toEmail: String, userFirstName: String): Boolean
}
