# Stage 1: Build fat JAR with Gradle
FROM eclipse-temurin:17-jdk AS builder

WORKDIR /app

# Copy Gradle wrapper and build files
COPY gradlew .
COPY gradle gradle
COPY build.gradle.kts .
COPY settings.gradle.kts .

# Make gradlew executable
RUN chmod +x gradlew

# Copy MCP server subproject source
COPY mcp-server mcp-server

# Build the shadow JAR (skip tests - they should be run in CI before building image)
RUN ./gradlew :mcp-server:shadowJar --no-daemon

# Stage 2: Run JAR with minimal JRE image
FROM eclipse-temurin:17-jre

WORKDIR /app

# Copy the fat JAR from builder stage
COPY --from=builder /app/mcp-server/build/libs/hackathon-mcp-server.jar app.jar

# Expose default port (Render overrides via PORT env var)
EXPOSE 3001

# Run with memory constraints sized for Render free tier
ENTRYPOINT ["java", "-Xmx256m", "-Xms128m", "-XX:+UseContainerSupport", "-jar", "app.jar"]
