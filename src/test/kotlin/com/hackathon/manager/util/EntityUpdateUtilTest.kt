package com.hackathon.manager.util

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class EntityUpdateUtilTest {

    // Test entity to demonstrate usage
    data class TestEntity(
        var name: String = "",
        var description: String? = null,
        var age: Int = 0,
        var isActive: Boolean = false
    )

    @Test
    fun `applyIfNotNull should apply value when not null`() {
        val entity = TestEntity(name = "Original")
        val newValue: String? = "Updated"

        newValue.applyIfNotNull { entity.name = it }

        assertThat(entity.name).isEqualTo("Updated")
    }

    @Test
    fun `applyIfNotNull should not apply value when null`() {
        val entity = TestEntity(name = "Original")
        val newValue: String? = null

        newValue.applyIfNotNull { entity.name = it }

        assertThat(entity.name).isEqualTo("Original")
    }

    @Test
    fun `applyIfNotNull should work with nullable properties`() {
        val entity = TestEntity(description = "Original Description")
        val newValue: String? = "New Description"

        newValue.applyIfNotNull { entity.description = it }

        assertThat(entity.description).isEqualTo("New Description")
    }

    @Test
    fun `applyIfNotNull should not update nullable properties when value is null`() {
        val entity = TestEntity(description = "Original Description")
        val newValue: String? = null

        newValue.applyIfNotNull { entity.description = it }

        assertThat(entity.description).isEqualTo("Original Description")
    }

    @Test
    fun `applyIfNotNull should work with primitive types`() {
        val entity = TestEntity(age = 25)
        val newValue: Int? = 30

        newValue.applyIfNotNull { entity.age = it }

        assertThat(entity.age).isEqualTo(30)
    }

    @Test
    fun `applyIfNotNull should not update primitive types when null`() {
        val entity = TestEntity(age = 25)
        val newValue: Int? = null

        newValue.applyIfNotNull { entity.age = it }

        assertThat(entity.age).isEqualTo(25)
    }

    @Test
    fun `applyIfNotNull should work with boolean types`() {
        val entity = TestEntity(isActive = false)
        val newValue: Boolean? = true

        newValue.applyIfNotNull { entity.isActive = it }

        assertThat(entity.isActive).isTrue()
    }

    @Test
    fun `applyIfNotNull should not update boolean types when null`() {
        val entity = TestEntity(isActive = false)
        val newValue: Boolean? = null

        newValue.applyIfNotNull { entity.isActive = it }

        assertThat(entity.isActive).isFalse()
    }

    @Test
    fun `applyIfNotNull should handle multiple updates in sequence`() {
        val entity = TestEntity(name = "Original", age = 25)

        val newName: String? = "Updated"
        val newAge: Int? = 30
        val nullValue: String? = null

        newName.applyIfNotNull { entity.name = it }
        newAge.applyIfNotNull { entity.age = it }
        nullValue.applyIfNotNull { entity.description = it }

        assertThat(entity.name).isEqualTo("Updated")
        assertThat(entity.age).isEqualTo(30)
        assertThat(entity.description).isNull()
    }

    @Test
    fun `applyIfNotNull should work with complex expressions in block`() {
        val entity = TestEntity(name = "test")
        val values: List<String>? = listOf("a", "b", "c")

        values.applyIfNotNull { entity.name = it.joinToString(",") }

        assertThat(entity.name).isEqualTo("a,b,c")
    }

    @Test
    fun `applyIfNotNull should not execute block when value is null`() {
        val entity = TestEntity(name = "Original")
        val newValue: String? = null
        var blockExecuted = false

        newValue.applyIfNotNull {
            blockExecuted = true
            entity.name = it
        }

        assertThat(blockExecuted).isFalse()
        assertThat(entity.name).isEqualTo("Original")
    }
}
