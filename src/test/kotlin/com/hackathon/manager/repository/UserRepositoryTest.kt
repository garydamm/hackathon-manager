package com.hackathon.manager.repository

import com.hackathon.manager.entity.User
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class UserRepositoryTest : AbstractRepositoryTest() {

    @Autowired
    lateinit var entityManager: TestEntityManager

    @Autowired
    lateinit var userRepository: UserRepository

    private lateinit var testUser: User

    @BeforeEach
    fun setUp() {
        testUser = User(
            email = "test@example.com",
            passwordHash = "hashedpassword",
            firstName = "Test",
            lastName = "User",
            displayName = "TestUser"
        )
    }

    @Test
    fun `findByEmail should return user when exists`() {
        entityManager.persist(testUser)
        entityManager.flush()

        val found = userRepository.findByEmail("test@example.com")

        assertThat(found).isNotNull
        assertThat(found!!.email).isEqualTo("test@example.com")
        assertThat(found.firstName).isEqualTo("Test")
    }

    @Test
    fun `findByEmail should return null when not exists`() {
        val found = userRepository.findByEmail("nonexistent@example.com")

        assertThat(found).isNull()
    }

    @Test
    fun `existsByEmail should return true when exists`() {
        entityManager.persist(testUser)
        entityManager.flush()

        val exists = userRepository.existsByEmail("test@example.com")

        assertThat(exists).isTrue()
    }

    @Test
    fun `existsByEmail should return false when not exists`() {
        val exists = userRepository.existsByEmail("nonexistent@example.com")

        assertThat(exists).isFalse()
    }

    @Test
    fun `save should persist user`() {
        val saved = userRepository.save(testUser)

        assertThat(saved.id).isNotNull()
        assertThat(saved.email).isEqualTo("test@example.com")

        val found = entityManager.find(User::class.java, saved.id)
        assertThat(found).isNotNull
        assertThat(found.email).isEqualTo("test@example.com")
    }

    @Test
    fun `findById should return user when exists`() {
        val persisted = entityManager.persist(testUser)
        entityManager.flush()

        val found = userRepository.findById(persisted.id!!)

        assertThat(found).isPresent
        assertThat(found.get().email).isEqualTo("test@example.com")
    }

    @Test
    fun `save should update existing user`() {
        val persisted = entityManager.persist(testUser)
        entityManager.flush()
        entityManager.clear()

        val toUpdate = userRepository.findById(persisted.id!!).get()
        toUpdate.firstName = "Updated"
        userRepository.save(toUpdate)
        entityManager.flush()
        entityManager.clear()

        val found = userRepository.findById(persisted.id!!).get()
        assertThat(found.firstName).isEqualTo("Updated")
    }
}
