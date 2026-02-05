package com.hackathon.manager.security

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource
import org.springframework.stereotype.Component
import org.springframework.util.StringUtils
import org.springframework.web.filter.OncePerRequestFilter

@Component
class JwtAuthenticationFilter(
    private val jwtTokenProvider: JwtTokenProvider,
    private val customUserDetailsService: CustomUserDetailsService
) : OncePerRequestFilter() {

    private val log = LoggerFactory.getLogger(JwtAuthenticationFilter::class.java)

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        try {
            val jwt = getJwtFromRequest(request)

            if (jwt != null) {
                if (jwtTokenProvider.validateToken(jwt)) {
                    val userId = jwtTokenProvider.getUserIdFromToken(jwt)
                    val userDetails = customUserDetailsService.loadUserById(userId)

                    val authentication = UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.authorities
                    )
                    authentication.details = WebAuthenticationDetailsSource().buildDetails(request)

                    SecurityContextHolder.getContext().authentication = authentication
                } else {
                    // JWT token is present but invalid
                    log.warn("Invalid JWT token provided for request: ${request.requestURI}")
                    response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid or expired authentication token. Please log in again.")
                    return
                }
            }
        } catch (ex: Exception) {
            log.error("Could not set user authentication in security context", ex)
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Authentication failed. Please log in again.")
            return
        }

        filterChain.doFilter(request, response)
    }

    private fun getJwtFromRequest(request: HttpServletRequest): String? {
        // First, check Authorization header
        val bearerToken = request.getHeader("Authorization")
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7)
        }

        // Fallback to accessToken cookie
        val cookies = request.cookies
        if (cookies != null) {
            val accessTokenCookie = cookies.find { it.name == "accessToken" }
            if (accessTokenCookie != null && StringUtils.hasText(accessTokenCookie.value)) {
                return accessTokenCookie.value
            }
        }

        return null
    }
}
