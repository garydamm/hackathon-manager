package com.hackathon.manager.config

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class JwtConfigTest {

    @Test
    fun `JwtConfig should store configuration values`() {
        val config = JwtConfig(
            secret = "test-secret-key",
            expirationMs = 3600000L,
            refreshExpirationMs = 86400000L
        )

        assertThat(config.secret).isEqualTo("test-secret-key")
        assertThat(config.expirationMs).isEqualTo(3600000L)
        assertThat(config.refreshExpirationMs).isEqualTo(86400000L)
    }

    @Test
    fun `JwtConfig data class should support copy`() {
        val config = JwtConfig(
            secret = "original-secret",
            expirationMs = 1000L,
            refreshExpirationMs = 2000L
        )

        val copied = config.copy(secret = "new-secret")

        assertThat(copied.secret).isEqualTo("new-secret")
        assertThat(copied.expirationMs).isEqualTo(1000L)
        assertThat(copied.refreshExpirationMs).isEqualTo(2000L)
    }

    @Test
    fun `JwtConfig should have correct equals and hashCode`() {
        val config1 = JwtConfig("secret", 1000L, 2000L)
        val config2 = JwtConfig("secret", 1000L, 2000L)
        val config3 = JwtConfig("different", 1000L, 2000L)

        assertThat(config1).isEqualTo(config2)
        assertThat(config1.hashCode()).isEqualTo(config2.hashCode())
        assertThat(config1).isNotEqualTo(config3)
    }

    @Test
    fun `JwtConfig toString should contain all fields`() {
        val config = JwtConfig("my-secret", 5000L, 10000L)
        val str = config.toString()

        assertThat(str).contains("my-secret")
        assertThat(str).contains("5000")
        assertThat(str).contains("10000")
    }
}
