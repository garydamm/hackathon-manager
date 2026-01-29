package com.hackathon.manager.controller

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*

@SpringBootTest
@AutoConfigureMockMvc
class HealthControllerTest {

    @Autowired
    lateinit var mockMvc: MockMvc

    @Test
    fun `should return 200 OK with healthy status`() {
        mockMvc.perform(get("/api/health"))
            .andExpect(status().isOk)
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.status").value("healthy"))
    }

    @Test
    fun `should return expected JSON structure`() {
        mockMvc.perform(get("/api/health"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$").isMap)
            .andExpect(jsonPath("$.status").exists())
            .andExpect(jsonPath("$.status").isString)
    }

    @Test
    fun `should be accessible without authentication`() {
        // No authentication header or user principal needed - health endpoint is configured as permitAll
        mockMvc.perform(get("/api/health"))
            .andExpect(status().isOk)
    }
}
