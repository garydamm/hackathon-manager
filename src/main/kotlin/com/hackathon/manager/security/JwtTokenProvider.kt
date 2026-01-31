package com.hackathon.manager.security

import com.hackathon.manager.config.AppConstants.SecurityConstants
import com.hackathon.manager.config.JwtConfig
import io.jsonwebtoken.*
import io.jsonwebtoken.security.Keys
import io.jsonwebtoken.security.MacAlgorithm
import io.jsonwebtoken.security.WeakKeyException
import org.slf4j.LoggerFactory
import org.springframework.security.core.Authentication
import org.springframework.stereotype.Component
import java.util.*
import javax.crypto.SecretKey

@Component
class JwtTokenProvider(private val jwtConfig: JwtConfig) {

    private val logger = LoggerFactory.getLogger(JwtTokenProvider::class.java)

    private val algorithm: MacAlgorithm = Jwts.SIG.HS256

    private val key: SecretKey by lazy {
        val secretBytes = jwtConfig.secret.toByteArray()
        // Use first 32 bytes for HS256 (256 bits minimum)
        val keyBytes = if (secretBytes.size > SecurityConstants.JWT_KEY_SIZE) secretBytes.copyOf(SecurityConstants.JWT_KEY_SIZE) else secretBytes
        Keys.hmacShaKeyFor(keyBytes)
    }

    private val jwtParser: JwtParser by lazy {
        Jwts.parser()
            .verifyWith(key)
            .build()
    }

    fun generateToken(authentication: Authentication): String {
        val userPrincipal = authentication.principal as UserPrincipal
        return generateToken(userPrincipal.id, userPrincipal.email)
    }

    fun generateToken(userId: UUID, email: String, rememberMe: Boolean = false): String {
        val now = Date()
        val expirationMs = if (rememberMe) {
            7 * 24 * 60 * 60 * 1000L  // 7 days
        } else {
            jwtConfig.expirationMs  // 24 hours (default)
        }
        val expiryDate = Date(now.time + expirationMs)

        return Jwts.builder()
            .subject(userId.toString())
            .claim("email", email)
            .claim("rememberMe", rememberMe)
            .issuedAt(now)
            .expiration(expiryDate)
            .signWith(key, algorithm)
            .compact()
    }

    fun generateRefreshToken(userId: UUID, rememberMe: Boolean = false): String {
        val now = Date()
        val expirationMs = if (rememberMe) {
            30 * 24 * 60 * 60 * 1000L  // 30 days
        } else {
            jwtConfig.refreshExpirationMs  // 7 days (default)
        }
        val expiryDate = Date(now.time + expirationMs)

        return Jwts.builder()
            .subject(userId.toString())
            .claim("type", "refresh")
            .claim("rememberMe", rememberMe)
            .issuedAt(now)
            .expiration(expiryDate)
            .signWith(key, algorithm)
            .compact()
    }

    fun getUserIdFromToken(token: String): UUID {
        val claims = jwtParser
            .parseSignedClaims(token)
            .payload

        return UUID.fromString(claims.subject)
    }

    fun validateToken(token: String): Boolean {
        try {
            jwtParser.parseSignedClaims(token)
            return true
        } catch (ex: WeakKeyException) {
            // Token was signed with a different algorithm (e.g., HS384) that requires a larger key
            logger.error("JWT signed with incompatible algorithm - token may be from old session")
        } catch (ex: SecurityException) {
            logger.error("Invalid JWT signature")
        } catch (ex: MalformedJwtException) {
            logger.error("Invalid JWT token")
        } catch (ex: ExpiredJwtException) {
            logger.error("Expired JWT token")
        } catch (ex: UnsupportedJwtException) {
            logger.error("Unsupported JWT token")
        } catch (ex: IllegalArgumentException) {
            logger.error("JWT claims string is empty")
        }
        return false
    }
}
