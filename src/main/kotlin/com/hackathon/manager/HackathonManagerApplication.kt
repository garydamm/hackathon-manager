package com.hackathon.manager

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication
@EnableScheduling
class HackathonManagerApplication

fun main(args: Array<String>) {
    runApplication<HackathonManagerApplication>(*args)
}
