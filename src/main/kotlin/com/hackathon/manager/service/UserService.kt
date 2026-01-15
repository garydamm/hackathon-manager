package com.hackathon.manager.service

import com.hackathon.manager.dto.auth.UpdateUserRequest
import com.hackathon.manager.dto.auth.UserResponse
import com.hackathon.manager.exception.ApiException
import com.hackathon.manager.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

@Service
class UserService(
    private val userRepository: UserRepository
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
}
