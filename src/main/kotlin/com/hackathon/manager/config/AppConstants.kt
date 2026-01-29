package com.hackathon.manager.config

/**
 * Application-wide constants for the Hackathon Manager backend.
 * Centralizes magic numbers and configuration values for maintainability.
 */
object AppConstants {

    /**
     * Security-related constants including password requirements and token expiry.
     */
    object SecurityConstants {
        /**
         * Minimum password length required for user accounts.
         */
        const val MIN_PASSWORD_LENGTH = 8

        /**
         * Expiry time in minutes for password reset tokens.
         */
        const val PASSWORD_RESET_TOKEN_EXPIRY_MINUTES = 15L

        /**
         * JWT key size in bytes for HS256 algorithm (256 bits minimum).
         */
        const val JWT_KEY_SIZE = 32
    }
}
