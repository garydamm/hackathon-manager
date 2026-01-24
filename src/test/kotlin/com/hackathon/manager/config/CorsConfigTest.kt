package com.hackathon.manager.config

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.mock.web.MockHttpServletRequest

class CorsConfigTest {

    @Test
    fun `CorsProperties should store configuration values`() {
        val props = CorsProperties(
            allowedOrigins = "http://localhost:3000,http://localhost:5173",
            allowedMethods = "GET,POST,PUT,DELETE",
            allowedHeaders = "*",
            allowCredentials = true
        )

        assertThat(props.allowedOrigins).isEqualTo("http://localhost:3000,http://localhost:5173")
        assertThat(props.allowedMethods).isEqualTo("GET,POST,PUT,DELETE")
        assertThat(props.allowedHeaders).isEqualTo("*")
        assertThat(props.allowCredentials).isTrue()
    }

    @Test
    fun `CorsProperties data class should support copy`() {
        val props = CorsProperties(
            allowedOrigins = "http://localhost:3000",
            allowedMethods = "GET",
            allowedHeaders = "*",
            allowCredentials = false
        )

        val copied = props.copy(allowCredentials = true)

        assertThat(copied.allowedOrigins).isEqualTo("http://localhost:3000")
        assertThat(copied.allowCredentials).isTrue()
    }

    @Test
    fun `CorsProperties should have correct equals and hashCode`() {
        val props1 = CorsProperties("origin", "GET", "*", true)
        val props2 = CorsProperties("origin", "GET", "*", true)
        val props3 = CorsProperties("different", "GET", "*", true)

        assertThat(props1).isEqualTo(props2)
        assertThat(props1.hashCode()).isEqualTo(props2.hashCode())
        assertThat(props1).isNotEqualTo(props3)
    }

    @Test
    fun `CorsProperties toString should contain all fields`() {
        val props = CorsProperties("http://test.com", "GET,POST", "*", true)
        val str = props.toString()

        assertThat(str).contains("http://test.com")
        assertThat(str).contains("GET,POST")
        assertThat(str).contains("true")
    }

    @Test
    fun `CorsConfig should create cors configuration source`() {
        val props = CorsProperties(
            allowedOrigins = "http://localhost:3000,http://localhost:5173",
            allowedMethods = "GET,POST,PUT,DELETE",
            allowedHeaders = "*",
            allowCredentials = true
        )

        val corsConfig = CorsConfig(props)
        val configSource = corsConfig.corsConfigurationSource()

        assertThat(configSource).isNotNull()

        val request = MockHttpServletRequest()
        request.requestURI = "/api/test"
        val config = configSource.getCorsConfiguration(request)

        assertThat(config).isNotNull()
        assertThat(config!!.allowedOrigins).containsExactly("http://localhost:3000", "http://localhost:5173")
        assertThat(config.allowedMethods).containsExactly("GET", "POST", "PUT", "DELETE")
        assertThat(config.allowCredentials).isTrue()
    }

    @Test
    fun `CorsConfig should not apply to non-api paths`() {
        val props = CorsProperties(
            allowedOrigins = "http://localhost:3000",
            allowedMethods = "GET",
            allowedHeaders = "*",
            allowCredentials = true
        )

        val corsConfig = CorsConfig(props)
        val configSource = corsConfig.corsConfigurationSource()

        val request = MockHttpServletRequest()
        request.requestURI = "/other/path"
        val config = configSource.getCorsConfiguration(request)

        assertThat(config).isNull()
    }
}
