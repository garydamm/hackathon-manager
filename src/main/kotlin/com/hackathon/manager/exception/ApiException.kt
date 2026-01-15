package com.hackathon.manager.exception

import org.springframework.http.HttpStatus

class ApiException(
    override val message: String,
    val status: HttpStatus = HttpStatus.BAD_REQUEST
) : RuntimeException(message)
