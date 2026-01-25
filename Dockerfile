# Stage 1: Build JAR with Gradle
FROM eclipse-temurin:17-jdk AS builder

WORKDIR /app

# Copy Gradle wrapper and build files
COPY gradlew .
COPY gradle gradle
COPY build.gradle.kts .
COPY settings.gradle.kts .

# Make gradlew executable
RUN chmod +x gradlew

# Copy source code
COPY src src

# Build the JAR (skip tests - they should be run in CI before building image)
RUN ./gradlew bootJar --no-daemon -x test

# Stage 2: Run JAR with minimal JRE image
FROM eclipse-temurin:17-jre

WORKDIR /app

# Copy the JAR from builder stage
COPY --from=builder /app/build/libs/*.jar app.jar

# Set production profile
ENV SPRING_PROFILES_ACTIVE=prod

# Expose port 8080
EXPOSE 8080

# Run the application with memory constraints for Render free tier (512MB)
ENTRYPOINT ["java", "-Xmx400m", "-Xms200m", "-XX:+UseContainerSupport", "-jar", "app.jar"]
