# Production Setup Guide - User Login (US_2)

## Overview
This document provides instructions for deploying the **User Login** endpoint (`POST /auth/sign-in`) to a production environment.

## Architecture
```
Client (Web/Mobile)
       ↓
  Spring Boot App (Port 8080)
       ↓
  Spring Security + JWT
       ↓
  MongoDB (Kubernetes)
```

## Prerequisites

- **Java**: JDK 21+
- **Maven**: 3.9.x
- **MongoDB**: 7.x (running on port 27017)
- **Docker/Kubernetes**: For containerization

## Environment Setup

### 1. Database Configuration
Set these environment variables:

```bash
export MONGODB_URI=mongodb://localhost:27017/travel_agency
export MONGODB_DATABASE=travel_agency
export JWT_SECRET=<your-secret-key-base64>
export JWT_EXPIRATION_MS=86400000  # 24 hours
```

**In Kubernetes**, use ConfigMaps and Secrets:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: travel-agency-secrets
type: Opaque
stringData:
  jwt-secret: "your-secret-key-base64"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: travel-agency-config
data:
  mongodb-uri: "mongodb://mongo-service:27017/travel_agency"
  jwt-expiration: "86400000"
```

### 2. Build & Package

```bash
cd /path/to/api-handler

# Build with Maven
mvn clean package

# Output: target/java-maven-springboot-0.0.1-SNAPSHOT.jar
```

### 3. Docker Image Build

Create `Dockerfile` (already present in repo):

```dockerfile
FROM eclipse-temurin:21-jre-alpine
COPY target/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
EXPOSE 8080
```

Build image:
```bash
docker build -t travel-agency-api:1.0 .
```

### 4. Kubernetes Deployment

Deploy to cluster:

```bash
kubectl apply -f deploy-templates/
```

Verify deployment:
```bash
kubectl get pods -n default
kubectl port-forward service/travel-agency-api 8080:8080
```

## API Endpoint

### URL
```
POST http://localhost:8080/api/v1/auth/sign-in
```

### Request
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Response (200 OK)
```json
{
  "idToken": "eyJhbGciOiJIUzI1NiJ9...",
  "role": "CUSTOMER",
  "userName": "John Doe",
  "email": "user@example.com"
}
```

### Error Response (400 Bad Request)
```json
{
  "message": "Wrong password or email"
}
```

## Security Considerations

### 1. JWT Token
- **Algorithm**: HS256
- **Expiration**: 24 hours (configurable)
- **Secret**: Store in Kubernetes Secrets, not in code

### 2. Password Security
- **Hashing**: BCrypt (Spring Security)
- **Strength**: 10 rounds (configurable)
- **Never**: Store plain text passwords

### 3. HTTPS/TLS
In production, always use HTTPS:

```yaml
# Kubernetes Ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: travel-agency-ingress
spec:
  tls:
  - hosts:
    - api.example.com
    secretName: tls-secret
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /api/v1
        backend:
          service:
            name: travel-agency-api
            port:
              number: 8080
```

### 4. CORS (if needed)
Configure in `SecurityConfig`:

```java
@Bean
public WebMvcConfigurer corsConfigurer() {
    return new WebMvcConfigurer() {
        @Override
        public void addCorsMappings(CorsRegistry registry) {
            registry.addMapping("/api/**")
                .allowedOrigins("https://app.example.com")
                .allowedMethods("GET", "POST")
                .maxAge(3600);
        }
    };
}
```

## Monitoring & Logging

### Logs Location
- **Container**: `docker logs <container-id>`
- **Kubernetes**: `kubectl logs <pod-name>`

### Log Levels
- **Info**: User sign-in attempts and successes
- **Warn**: Failed authentication attempts
- **Error**: Unexpected exceptions

### Key Metrics to Monitor
```
- auth.signin.attempts (counter)
- auth.signin.successes (counter)
- auth.signin.failures (counter)
- jwt.generation.duration (timer)
- mongodb.query.duration (timer)
```

## Database Seeding

Insert test users into MongoDB:

```bash
docker exec travel-agency-mongodb mongosh travel_agency --eval '
db.createCollection("users");
db.users.createIndex({email: 1}, {unique: true});
db.users.insertOne({
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  password: "$2a$10$...", // BCrypt hash of password123
  role: "CUSTOMER"
});
'
```

## Testing in Production

### Health Check
```bash
curl -X GET http://localhost:8080/api/v1/auth/health
```

### Login Test
```bash
curl -X POST http://localhost:8080/api/v1/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'
```

### API Documentation
- **Swagger UI**: `http://localhost:8080/swagger-ui.html`
- **OpenAPI Spec**: `http://localhost:8080/v3/api-docs`

## HTTP Status Codes

| Code | Reason | Example |
|------|--------|---------|
| 200 | Successful login | Valid credentials |
| 400 | Bad Request | Invalid email format, wrong password, blank fields |
| 500 | Server Error | Database connection failure, unexpected exception |

## Troubleshooting

### "Wrong password or email"
- User does not exist
- Password incorrect
- Both cases return same error for security

### "Email format is invalid"
- Email missing `@` symbol
- Invalid domain

### "MongoDB connection refused"
- MongoDB not running
- Wrong connection string
- Network/firewall issue

### "JWT token generation failed"
- Secret key not set
- JwtUtil dependency issue

## Rollback Procedure

```bash
# Kubernetes
kubectl rollout undo deployment/travel-agency-api

# Docker
docker stop <container-id>
docker run -d -p 8080:8080 travel-agency-api:0.9
```

## Performance Tuning

### Connection Pool (MongoDB)
```yaml
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/travel_agency?maxPoolSize=50&minPoolSize=10
```

### Cache (JWT Validation)
```java
@Cacheable("users")
public Optional<User> findByEmail(String email) {
    return userRepository.findByEmail(email);
}
```

## Compliance & Standards

- **API Standard**: REST over HTTPS
- **Authentication**: JWT (RFC 7519)
- **Password**: BCrypt (OWASP recommended)
- **Status Codes**: RFC 7231
- **Input Validation**: Jakarta Validation (Bean Validation 3.0)

## Support & Escalation

- **Log Level**: Set to DEBUG for troubleshooting
- **Metrics**: Export to Prometheus/Grafana
- **Alerts**: Set up alerts for > 5% failed login rate
- **Contact**: DevOps team for Kubernetes issues

## Version
- **Release**: Sprint 1 (R23)
- **Feature**: User Login (US_2)
- **Status**: Production Ready ✓
