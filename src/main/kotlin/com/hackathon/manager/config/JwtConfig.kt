package com.hackathon.manager.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "app.jwt")
data class JwtConfig(
    val secret: String,
    val expirationMs: Long,
    val refreshExpirationMs: Long
)
