package com.hackathon.manager.exception

/**
 * Base sealed class for domain exceptions.
 * These exceptions represent business logic errors and are independent of the HTTP layer.
 */
sealed class DomainException(override val message: String) : RuntimeException(message)

/**
 * Thrown when a requested resource is not found.
 */
class NotFoundException(message: String) : DomainException(message)

/**
 * Thrown when a user is not authorized to perform an action.
 */
class UnauthorizedException(message: String) : DomainException(message)

/**
 * Thrown when input validation fails or business rules are violated.
 */
class ValidationException(message: String) : DomainException(message)

/**
 * Thrown when an operation would create a conflict (e.g., duplicate resource).
 */
class ConflictException(message: String) : DomainException(message)
