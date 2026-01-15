package com.hackathon.manager.security

import com.hackathon.manager.entity.User
import org.springframework.security.core.GrantedAuthority
import org.springframework.security.core.userdetails.UserDetails
import java.util.*

class UserPrincipal(
    val id: UUID,
    val email: String,
    private val passwordHash: String,
    private val authorities: Collection<GrantedAuthority>,
    private val isActive: Boolean
) : UserDetails {

    override fun getAuthorities(): Collection<GrantedAuthority> = authorities

    override fun getPassword(): String = passwordHash

    override fun getUsername(): String = email

    override fun isAccountNonExpired(): Boolean = true

    override fun isAccountNonLocked(): Boolean = isActive

    override fun isCredentialsNonExpired(): Boolean = true

    override fun isEnabled(): Boolean = isActive

    companion object {
        fun fromUser(user: User, authorities: Collection<GrantedAuthority>): UserPrincipal {
            return UserPrincipal(
                id = user.id!!,
                email = user.email,
                passwordHash = user.passwordHash,
                authorities = authorities,
                isActive = user.isActive
            )
        }
    }
}
