package com.hackathon.manager.repository

import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers

abstract class AbstractRepositoryTest {

    companion object {
        @JvmStatic
        val postgres: PostgreSQLContainer<*> = PostgreSQLContainer("postgres:16-alpine")
            .withDatabaseName("hackathon_test")
            .withUsername("test")
            .withPassword("test")

        init {
            postgres.start()
        }

        @JvmStatic
        @DynamicPropertySource
        fun configureProperties(registry: DynamicPropertyRegistry) {
            registry.add("spring.datasource.url", postgres::getJdbcUrl)
            registry.add("spring.datasource.username", postgres::getUsername)
            registry.add("spring.datasource.password", postgres::getPassword)
            registry.add("spring.jpa.hibernate.ddl-auto") { "validate" }
            registry.add("spring.jpa.properties.hibernate.dialect") { "org.hibernate.dialect.PostgreSQLDialect" }
            registry.add("spring.flyway.enabled") { "true" }
            registry.add("spring.flyway.clean-on-validation-error") { "true" }
        }
    }
}
