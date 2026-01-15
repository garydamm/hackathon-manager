package com.hackathon.manager.controller

import com.hackathon.manager.dto.auth.UpdateUserRequest
import com.hackathon.manager.dto.auth.UserResponse
import com.hackathon.manager.security.UserPrincipal
import com.hackathon.manager.service.UserService
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import java.util.*

@RestController
@RequestMapping("/api/users")
class UserController(
    private val userService: UserService
) {

    @GetMapping("/me")
    fun getCurrentUser(@AuthenticationPrincipal principal: UserPrincipal): ResponseEntity<UserResponse> {
        val user = userService.getUserById(principal.id)
        return ResponseEntity.ok(user)
    }

    @PutMapping("/me")
    fun updateCurrentUser(
        @AuthenticationPrincipal principal: UserPrincipal,
        @RequestBody request: UpdateUserRequest
    ): ResponseEntity<UserResponse> {
        val user = userService.updateUser(principal.id, request)
        return ResponseEntity.ok(user)
    }

    @GetMapping("/{id}")
    fun getUserById(@PathVariable id: UUID): ResponseEntity<UserResponse> {
        val user = userService.getUserById(id)
        return ResponseEntity.ok(user)
    }
}
