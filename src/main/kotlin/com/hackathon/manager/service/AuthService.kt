package com.hackathon.manager.service

import com.hackathon.manager.dto.auth.*
import com.hackathon.manager.entity.User
import com.hackathon.manager.exception.ApiException
import com.hackathon.manager.repository.UserRepository
import com.hackathon.manager.security.JwtTokenProvider
import org.springframework.http.HttpStatus
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val jwtTokenProvider: JwtTokenProvider,
    private val authenticationManager: AuthenticationManager
) {

    @Transactional
    fun register(request: RegisterRequest): AuthResponse {
        if (userRepository.existsByEmail(request.email)) {
            throw ApiException("Email already registered", HttpStatus.CONFLICT)
        }

        val user = User(
            email = request.email,
            passwordHash = passwordEncoder.encode(request.password),
            firstName = request.firstName,
            lastName = request.lastName,
            displayName = request.displayName
        )

        val savedUser = userRepository.save(user)
        val savedUserId = savedUser.id!!

        val accessToken = jwtTokenProvider.generateToken(savedUserId, savedUser.email)
        val refreshToken = jwtTokenProvider.generateRefreshToken(savedUserId)

        return AuthResponse(
            accessToken = accessToken,
            refreshToken = refreshToken,
            user = UserResponse.fromEntity(savedUser)
        )
    }

    fun login(request: LoginRequest): AuthResponse {
        val authentication = authenticationManager.authenticate(
            UsernamePasswordAuthenticationToken(request.email, request.password)
        )

        SecurityContextHolder.getContext().authentication = authentication

        val user = userRepository.findByEmail(request.email)
            ?: throw ApiException("User not found", HttpStatus.NOT_FOUND)

        val accessToken = jwtTokenProvider.generateToken(authentication)
        val refreshToken = jwtTokenProvider.generateRefreshToken(user.id!!)

        return AuthResponse(
            accessToken = accessToken,
            refreshToken = refreshToken,
            user = UserResponse.fromEntity(user)
        )
    }

    fun refreshToken(request: RefreshTokenRequest): AuthResponse {
        if (!jwtTokenProvider.validateToken(request.refreshToken)) {
            throw ApiException("Invalid refresh token", HttpStatus.UNAUTHORIZED)
        }

        val userId = jwtTokenProvider.getUserIdFromToken(request.refreshToken)
        val user = userRepository.findById(userId)
            .orElseThrow { ApiException("User not found", HttpStatus.NOT_FOUND) }
        val foundUserId = user.id!!

        val accessToken = jwtTokenProvider.generateToken(foundUserId, user.email)
        val refreshToken = jwtTokenProvider.generateRefreshToken(foundUserId)

        return AuthResponse(
            accessToken = accessToken,
            refreshToken = refreshToken,
            user = UserResponse.fromEntity(user)
        )
    }
}
