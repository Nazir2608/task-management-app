# ── Stage 1: Build ──────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /workspace

COPY pom.xml .
COPY src ./src

# Download deps first (layer caching)
RUN apk add --no-cache maven && \
    mvn dependency:go-offline -q

RUN mvn package -DskipTests -q

# ── Stage 2: Runtime ────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /workspace/target/*.jar app.jar

# Upload dir
RUN mkdir -p /app/uploads && chown appuser:appgroup /app/uploads

USER appuser

EXPOSE 8080

ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
