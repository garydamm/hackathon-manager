package com.hackathon.manager.security

import com.hackathon.manager.config.JwtConfig
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.util.*
import javax.crypto.SecretKey

class JwtTokenProviderTest {

    private lateinit var jwtTokenProvider: JwtTokenProvider
    private lateinit var key: SecretKey

    private val testUserId = UUID.randomUUID()
    private val testEmail = "test@example.com"

    @BeforeEach
    fun setup() {
        val jwtConfig = JwtConfig(
            secret = "test-secret-key-that-is-long-enough-for-hs256-algorithm",
            expirationMs = 24 * 60 * 60 * 1000L,  // 24 hours
            refreshExpirationMs = 7 * 24 * 60 * 60 * 1000L  // 7 days
        )
        jwtTokenProvider = JwtTokenProvider(jwtConfig)

        // Create key for parsing tokens in tests
        val secretBytes = jwtConfig.secret.toByteArray()
        val keyBytes = secretBytes.copyOf(32)  // 32 bytes for HS256
        key = Keys.hmacShaKeyFor(keyBytes)
    }

    @Test
    fun `generateToken should create valid token with default expiration`() {
        val token = jwtTokenProvider.generateToken(testUserId, testEmail)

        assertNotNull(token)
        assertTrue(token.isNotEmpty())

        // Parse token to verify claims
        val claims = Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .payload

        assertEquals(testUserId.toString(), claims.subject)
        assertEquals(testEmail, claims["email"])
        assertEquals(false, claims["rememberMe"])
        assertNotNull(claims.expiration)
        assertNotNull(claims.issuedAt)

        // Verify expiration is ~24 hours (allow 1 minute tolerance)
        val expirationMs = claims.expiration.time - claims.issuedAt.time
        val expectedMs = 24 * 60 * 60 * 1000L
        assertTrue(expirationMs >= expectedMs - 60000 && expirationMs <= expectedMs + 60000)
    }

    @Test
    fun `generateToken with rememberMe true should create token with 7-day expiration`() {
        val token = jwtTokenProvider.generateToken(testUserId, testEmail, rememberMe = true)

        assertNotNull(token)
        assertTrue(token.isNotEmpty())

        // Parse token to verify claims
        val claims = Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .payload

        assertEquals(testUserId.toString(), claims.subject)
        assertEquals(testEmail, claims["email"])
        assertEquals(true, claims["rememberMe"])
        assertNotNull(claims.expiration)
        assertNotNull(claims.issuedAt)

        // Verify expiration is ~7 days (allow 1 minute tolerance)
        val expirationMs = claims.expiration.time - claims.issuedAt.time
        val expectedMs = 7 * 24 * 60 * 60 * 1000L
        assertTrue(expirationMs >= expectedMs - 60000 && expirationMs <= expectedMs + 60000)
    }

    @Test
    fun `generateRefreshToken should create valid token with default expiration`() {
        val token = jwtTokenProvider.generateRefreshToken(testUserId)

        assertNotNull(token)
        assertTrue(token.isNotEmpty())

        // Parse token to verify claims
        val claims = Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .payload

        assertEquals(testUserId.toString(), claims.subject)
        assertEquals("refresh", claims["type"])
        assertEquals(false, claims["rememberMe"])
        assertNotNull(claims.expiration)
        assertNotNull(claims.issuedAt)

        // Verify expiration is ~7 days (allow 1 minute tolerance)
        val expirationMs = claims.expiration.time - claims.issuedAt.time
        val expectedMs = 7 * 24 * 60 * 60 * 1000L
        assertTrue(expirationMs >= expectedMs - 60000 && expirationMs <= expectedMs + 60000)
    }

    @Test
    fun `generateRefreshToken with rememberMe true should create token with 30-day expiration`() {
        val token = jwtTokenProvider.generateRefreshToken(testUserId, rememberMe = true)

        assertNotNull(token)
        assertTrue(token.isNotEmpty())

        // Parse token to verify claims
        val claims = Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .payload

        assertEquals(testUserId.toString(), claims.subject)
        assertEquals("refresh", claims["type"])
        assertEquals(true, claims["rememberMe"])
        assertNotNull(claims.expiration)
        assertNotNull(claims.issuedAt)

        // Verify expiration is ~30 days (allow 1 minute tolerance)
        val expirationMs = claims.expiration.time - claims.issuedAt.time
        val expectedMs = 30 * 24 * 60 * 60 * 1000L
        assertTrue(expirationMs >= expectedMs - 60000 && expirationMs <= expectedMs + 60000)
    }

    @Test
    fun `validateToken should return true for valid token`() {
        val token = jwtTokenProvider.generateToken(testUserId, testEmail)

        assertTrue(jwtTokenProvider.validateToken(token))
    }

    @Test
    fun `validateToken should return false for invalid token`() {
        val invalidToken = "invalid.token.here"

        assertFalse(jwtTokenProvider.validateToken(invalidToken))
    }

    @Test
    fun `getUserIdFromToken should extract correct user ID`() {
        val token = jwtTokenProvider.generateToken(testUserId, testEmail)

        val extractedUserId = jwtTokenProvider.getUserIdFromToken(token)

        assertEquals(testUserId, extractedUserId)
    }
}
