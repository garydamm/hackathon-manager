package com.hackathon.manager.security

import jakarta.servlet.FilterChain
import jakarta.servlet.http.Cookie
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.kotlin.*
import org.springframework.mock.web.MockFilterChain
import org.springframework.mock.web.MockHttpServletRequest
import org.springframework.mock.web.MockHttpServletResponse
import org.springframework.security.core.context.SecurityContextHolder
import java.util.UUID

class JwtAuthenticationFilterTest {

    private lateinit var jwtTokenProvider: JwtTokenProvider
    private lateinit var customUserDetailsService: CustomUserDetailsService
    private lateinit var jwtAuthenticationFilter: JwtAuthenticationFilter

    private val userId = UUID.randomUUID()
    private val validToken = "valid.jwt.token"

    @BeforeEach
    fun setUp() {
        jwtTokenProvider = mock()
        customUserDetailsService = mock()
        jwtAuthenticationFilter = JwtAuthenticationFilter(jwtTokenProvider, customUserDetailsService)

        // Clear security context before each test
        SecurityContextHolder.clearContext()
    }

    @Test
    fun `should authenticate user from Authorization header`() {
        // Given
        val userPrincipal = createUserPrincipal()
        val request = MockHttpServletRequest()
        val response = MockHttpServletResponse()
        val filterChain = MockFilterChain()

        request.addHeader("Authorization", "Bearer $validToken")
        whenever(jwtTokenProvider.validateToken(validToken)).thenReturn(true)
        whenever(jwtTokenProvider.getUserIdFromToken(validToken)).thenReturn(userId)
        whenever(customUserDetailsService.loadUserById(userId)).thenReturn(userPrincipal)

        // When
        jwtAuthenticationFilter.doFilter(request, response, filterChain)

        // Then
        verify(jwtTokenProvider).validateToken(validToken)
        verify(customUserDetailsService).loadUserById(userId)
        assert(SecurityContextHolder.getContext().authentication != null)
        assert(SecurityContextHolder.getContext().authentication.principal == userPrincipal)
    }

    @Test
    fun `should authenticate user from accessToken cookie when no Authorization header`() {
        // Given
        val userPrincipal = createUserPrincipal()
        val request = MockHttpServletRequest()
        val response = MockHttpServletResponse()
        val filterChain = MockFilterChain()

        request.setCookies(Cookie("accessToken", validToken))
        whenever(jwtTokenProvider.validateToken(validToken)).thenReturn(true)
        whenever(jwtTokenProvider.getUserIdFromToken(validToken)).thenReturn(userId)
        whenever(customUserDetailsService.loadUserById(userId)).thenReturn(userPrincipal)

        // When
        jwtAuthenticationFilter.doFilter(request, response, filterChain)

        // Then
        verify(jwtTokenProvider).validateToken(validToken)
        verify(customUserDetailsService).loadUserById(userId)
        assert(SecurityContextHolder.getContext().authentication != null)
        assert(SecurityContextHolder.getContext().authentication.principal == userPrincipal)
    }

    @Test
    fun `should prioritize Authorization header over cookie`() {
        // Given
        val userPrincipal = createUserPrincipal()
        val request = MockHttpServletRequest()
        val response = MockHttpServletResponse()
        val filterChain = MockFilterChain()

        val headerToken = "header.jwt.token"
        val cookieToken = "cookie.jwt.token"

        request.addHeader("Authorization", "Bearer $headerToken")
        request.setCookies(Cookie("accessToken", cookieToken))
        whenever(jwtTokenProvider.validateToken(headerToken)).thenReturn(true)
        whenever(jwtTokenProvider.getUserIdFromToken(headerToken)).thenReturn(userId)
        whenever(customUserDetailsService.loadUserById(userId)).thenReturn(userPrincipal)

        // When
        jwtAuthenticationFilter.doFilter(request, response, filterChain)

        // Then
        verify(jwtTokenProvider).validateToken(headerToken) // Should use header token, not cookie
        verify(jwtTokenProvider, never()).validateToken(cookieToken)
    }

    @Test
    fun `should not authenticate when no token provided`() {
        // Given
        val request = MockHttpServletRequest()
        val response = MockHttpServletResponse()
        val filterChain = MockFilterChain()

        // When
        jwtAuthenticationFilter.doFilter(request, response, filterChain)

        // Then
        verify(jwtTokenProvider, never()).validateToken(any())
        verify(customUserDetailsService, never()).loadUserById(any())
        assert(SecurityContextHolder.getContext().authentication == null)
    }

    @Test
    fun `should not authenticate when token is invalid`() {
        // Given
        val request = MockHttpServletRequest()
        val response = MockHttpServletResponse()
        val filterChain = MockFilterChain()

        request.addHeader("Authorization", "Bearer $validToken")
        whenever(jwtTokenProvider.validateToken(validToken)).thenReturn(false)

        // When
        jwtAuthenticationFilter.doFilter(request, response, filterChain)

        // Then
        verify(jwtTokenProvider).validateToken(validToken)
        verify(customUserDetailsService, never()).loadUserById(any())
        assert(SecurityContextHolder.getContext().authentication == null)
    }

    @Test
    fun `should ignore other cookies when accessToken cookie not present`() {
        // Given
        val request = MockHttpServletRequest()
        val response = MockHttpServletResponse()
        val filterChain = MockFilterChain()

        request.setCookies(Cookie("sessionId", "some-session-id"))

        // When
        jwtAuthenticationFilter.doFilter(request, response, filterChain)

        // Then
        verify(jwtTokenProvider, never()).validateToken(any())
        verify(customUserDetailsService, never()).loadUserById(any())
        assert(SecurityContextHolder.getContext().authentication == null)
    }

    @Test
    fun `should handle empty accessToken cookie`() {
        // Given
        val request = MockHttpServletRequest()
        val response = MockHttpServletResponse()
        val filterChain = MockFilterChain()

        request.setCookies(Cookie("accessToken", ""))

        // When
        jwtAuthenticationFilter.doFilter(request, response, filterChain)

        // Then
        verify(jwtTokenProvider, never()).validateToken(any())
        verify(customUserDetailsService, never()).loadUserById(any())
        assert(SecurityContextHolder.getContext().authentication == null)
    }

    @Test
    fun `should handle exception gracefully and continue filter chain`() {
        // Given
        val request = MockHttpServletRequest()
        val response = MockHttpServletResponse()
        val filterChain = MockFilterChain()

        request.addHeader("Authorization", "Bearer $validToken")
        whenever(jwtTokenProvider.validateToken(validToken)).thenThrow(RuntimeException("Token validation error"))

        // When
        jwtAuthenticationFilter.doFilter(request, response, filterChain)

        // Then
        assert(SecurityContextHolder.getContext().authentication == null)
    }

    private fun createUserPrincipal() = UserPrincipal(
        id = userId,
        email = "test@example.com",
        passwordHash = "hashedpassword",
        authorities = emptyList(),
        isActive = true
    )
}
