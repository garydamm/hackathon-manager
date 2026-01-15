package com.hackathon.manager.config

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource

@ConfigurationProperties(prefix = "app.cors")
data class CorsProperties(
    val allowedOrigins: String,
    val allowedMethods: String,
    val allowedHeaders: String,
    val allowCredentials: Boolean
)

@Configuration
class CorsConfig(private val corsProperties: CorsProperties) {

    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val configuration = CorsConfiguration().apply {
            allowedOrigins = corsProperties.allowedOrigins.split(",")
            allowedMethods = corsProperties.allowedMethods.split(",")
            allowedHeaders = listOf(corsProperties.allowedHeaders)
            allowCredentials = corsProperties.allowCredentials
        }

        return UrlBasedCorsConfigurationSource().apply {
            registerCorsConfiguration("/api/**", configuration)
        }
    }
}
