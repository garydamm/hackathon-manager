package com.hackathon.manager.util

/**
 * Utility functions for entity field updates.
 */

/**
 * Applies a value to a property setter only if the value is not null.
 * This utility helps eliminate repetitive `.let { entity.field = it }` patterns.
 *
 * Example usage:
 * ```
 * request.name.applyIfNotNull { hackathon.name = it }
 * request.description.applyIfNotNull { hackathon.description = it }
 * ```
 *
 * @param T the type of the value
 * @param block the block that applies the value if it is not null
 */
inline fun <T> T?.applyIfNotNull(block: (T) -> Unit) {
    if (this != null) {
        block(this)
    }
}
