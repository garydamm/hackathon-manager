package com.hackathon.manager.service

import com.hackathon.manager.dto.auth.UpdateUserRequest
import com.hackathon.manager.dto.auth.UserResponse
import com.hackathon.manager.entity.PasswordResetToken
import com.hackathon.manager.exception.ApiException
import com.hackathon.manager.repository.PasswordResetTokenRepository
import com.hackathon.manager.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.OffsetDateTime
import java.util.*

@Service
class UserService(
    private val userRepository: UserRepository,
    private val passwordResetTokenRepository: PasswordResetTokenRepository,
    private val emailService: EmailService,
    private val passwordEncoder: PasswordEncoder
) {

    @Transactional(readOnly = true)
    fun getUserById(id: UUID): UserResponse {
        val user = userRepository.findById(id)
            .orElseThrow { ApiException("User not found", HttpStatus.NOT_FOUND) }
        return UserResponse.fromEntity(user)
    }

    @Transactional(readOnly = true)
    fun getUserByEmail(email: String): UserResponse {
        val user = userRepository.findByEmail(email)
            ?: throw ApiException("User not found", HttpStatus.NOT_FOUND)
        return UserResponse.fromEntity(user)
    }

    @Transactional
    fun updateUser(id: UUID, request: UpdateUserRequest): UserResponse {
        val user = userRepository.findById(id)
            .orElseThrow { ApiException("User not found", HttpStatus.NOT_FOUND) }

        request.firstName?.let { user.firstName = it }
        request.lastName?.let { user.lastName = it }
        request.displayName?.let { user.displayName = it }
        request.bio?.let { user.bio = it }
        request.skills?.let { user.skills = it.toTypedArray() }
        request.githubUrl?.let { user.githubUrl = it }
        request.linkedinUrl?.let { user.linkedinUrl = it }
        request.portfolioUrl?.let { user.portfolioUrl = it }

        val savedUser = userRepository.save(user)
        return UserResponse.fromEntity(savedUser)
    }

    @Transactional
    fun requestPasswordReset(email: String) {
        // Silently succeed if email doesn't exist (security: don't reveal user existence)
        val user = userRepository.findByEmail(email) ?: return

        // Invalidate any existing unused tokens for the user
        val existingTokens = passwordResetTokenRepository.findByUserIdAndUsedAtIsNullAndExpiresAtAfter(
            user.id!!,
            OffsetDateTime.now()
        )
        existingTokens.forEach { token ->
            token.usedAt = OffsetDateTime.now()
            passwordResetTokenRepository.save(token)
        }

        // Generate new token with 15-minute expiry
        val token = UUID.randomUUID().toString()
        val expiresAt = OffsetDateTime.now().plusMinutes(15)

        val resetToken = PasswordResetToken(
            id = UUID.randomUUID(),
            user = user,
            token = token,
            expiresAt = expiresAt,
            createdAt = OffsetDateTime.now(),
            usedAt = null
        )
        passwordResetTokenRepository.save(resetToken)

        // Send password reset email
        emailService.sendPasswordResetEmail(user.email, token, user.firstName)
    }

    @Transactional(readOnly = true)
    fun validateResetToken(token: String): PasswordResetToken {
        val resetToken = passwordResetTokenRepository.findByToken(token)
            .orElseThrow { ApiException("Invalid or expired reset token", HttpStatus.BAD_REQUEST) }

        if (resetToken.isUsed()) {
            throw ApiException("This reset token has already been used", HttpStatus.BAD_REQUEST)
        }

        if (resetToken.isExpired()) {
            throw ApiException("This reset token has expired", HttpStatus.BAD_REQUEST)
        }

        return resetToken
    }

    @Transactional
    fun resetPassword(token: String, newPassword: String) {
        val resetToken = validateResetToken(token)

        // Validate password requirements
        validatePassword(newPassword)

        // Update user password
        val user = resetToken.user
        user.passwordHash = passwordEncoder.encode(newPassword)
        userRepository.save(user)

        // Mark token as used
        resetToken.usedAt = OffsetDateTime.now()
        passwordResetTokenRepository.save(resetToken)

        // Send password change confirmation email
        emailService.sendPasswordChangeConfirmation(user.email, user.firstName)
    }

    private fun validatePassword(password: String) {
        if (password.length < 8) {
            throw ApiException("Password must be at least 8 characters long", HttpStatus.BAD_REQUEST)
        }

        if (!password.contains(Regex("[A-Z]"))) {
            throw ApiException("Password must contain at least one uppercase letter", HttpStatus.BAD_REQUEST)
        }

        if (!password.contains(Regex("[a-z]"))) {
            throw ApiException("Password must contain at least one lowercase letter", HttpStatus.BAD_REQUEST)
        }

        if (!password.contains(Regex("[0-9]"))) {
            throw ApiException("Password must contain at least one number", HttpStatus.BAD_REQUEST)
        }
    }
}
