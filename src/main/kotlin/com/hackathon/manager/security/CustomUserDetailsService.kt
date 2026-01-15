package com.hackathon.manager.security

import com.hackathon.manager.repository.UserRepository
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

@Service
class CustomUserDetailsService(
    private val userRepository: UserRepository
) : UserDetailsService {

    @Transactional(readOnly = true)
    override fun loadUserByUsername(email: String): UserDetails {
        val user = userRepository.findByEmail(email)
            ?: throw UsernameNotFoundException("User not found with email: $email")

        val authorities = listOf(SimpleGrantedAuthority("ROLE_USER"))

        return UserPrincipal.fromUser(user, authorities)
    }

    @Transactional(readOnly = true)
    fun loadUserById(id: UUID): UserDetails {
        val user = userRepository.findById(id)
            .orElseThrow { UsernameNotFoundException("User not found with id: $id") }

        val authorities = listOf(SimpleGrantedAuthority("ROLE_USER"))

        return UserPrincipal.fromUser(user, authorities)
    }
}
