# Travel Agency — Frontend / Backend Integration Audit

**Audit date:** 2026-05-06
**Backend:** `api-handler/` (Spring Boot 3.4.5, Java 17, MongoDB)
**Frontend:** `travel-agency-frontend/` (React 18 + TypeScript + Vite)
**Contract:** `openapi_travel_agency_sprint1_v1.json`

---

## 1. Architecture Overview

| Layer | Stack | Port | Location |
|---|---|---|---|
| Frontend | React 18.2, TypeScript 5.3, Vite 5.1, Tailwind 3.4, React Router 7.15 | 5173 (dev) | `travel-agency-frontend/` |
| Backend | Spring Boot 3.4.5, Java 17, Spring Security, jjwt 0.11.5 | 8080 | `api-handler/` |
| Database | MongoDB 7 | 27017 | `docker-compose.yml` |
| Context path | `/api/v1` | — | `application.yml` |

---

## 2. Backend Endpoints (effective paths with context-path)

### Auth (`AuthController`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/auth/sign-up` | Public | Returns `{ message, nextRoute }` |
| POST | `/api/v1/auth/sign-in` | Public | Returns `{ idToken, refreshToken, role, userName, email }` |
| POST | `/api/v1/auth/refresh` | Public (token in body) | Returns `{ accessToken, role }` |
| POST | `/api/v1/auth/logout` | Public (token in body) | Returns `{ message }` |

### Tours (`TourController`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/v1/tours/destinations` | Public | `@RequestParam String destination` |
| GET | `/api/v1/tours/available` | Public | Filters + pagination + `sortBy` |
| GET | `/api/v1/tours/{id}` | Public | Returns `TourDetailsDTO` |
| GET | `/api/v1/tours/{id}/reviews` | Public | Paginated review list |

### Admin (`AdminController`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/admin/travel-agents` | Public (permitAll) | Should be admin-only |
| GET | `/api/v1/admin/travel-agents` | Public (permitAll) | Should be admin-only |
| DELETE | `/api/v1/admin/travel-agents/{id}` | Public (permitAll) | Should be admin-only |

### Missing — Bookings
`SecurityConfig` references `/bookings` routes but **no `BookingController` exists**. The OpenAPI spec and frontend both expect this feature.

---

## 3. Frontend API Calls

### Auth
| File | Endpoint used | Method |
|---|---|---|
| `src/features/auth/api.ts` | `${apiBaseUrl}/auth/sign-in` | POST |
| `src/services/authApi.ts` | `${apiBaseUrl}/auth/sign-up` | POST |

### Tours
| File | Endpoint used | Method |
|---|---|---|
| `src/features/tours/services/tourService.ts` | `${BASE_URL}/tours/destinations?query=...` | GET |
| `src/features/tours/services/tourService.ts` | `${BASE_URL}/tours/available?...` | GET |
| `src/api.ts` | `${API_BASE_URL}/tours/{tourId}` | GET |
| `src/api.ts` | `${API_BASE_URL}/tours/{tourId}/reviews` | GET |

### Booking
| File | Endpoint used | Method | Auth |
|---|---|---|---|
| `src/api.ts` (via `BookingContext`) | `${API_BASE_URL}/bookings` | POST | Bearer |

---

## 4. Critical Integration Issues

### Blocking — Application will not work end-to-end

#### 4.1 `BookingController` does not exist
The backend has zero handlers for `/bookings`. The frontend's checkout flow (`BookingContext.tsx`) will receive 403/404 for every booking attempt.
- **Fix:** Implement `BookingController` + `BookingService` + `Booking` entity + `BookingRepository` matching the OpenAPI `POST /bookings` and `GET /bookings` contracts.

#### 4.2 `/tours/destinations` — param name mismatch
- Backend expects `?destination=<text>`
- Frontend sends `?query=<text>` (`tourService.ts:46`)
- **Symptom:** Destination autocomplete silently returns all destinations; filter is ineffective.
- **Fix:** Rename frontend param to `destination`, OR add a `query` alias in the backend.

#### 4.3 `/tours/available` — sort params mismatch
- Backend expects `sortBy=RATING_DESC|RATING_ASC|PRICE_DESC|PRICE_ASC`
- Frontend sends separate `sortField=rating&sortOrder=desc` (`tourService.ts:63-64`)
- **Symptom:** Sort controls in the UI have no effect; backend always defaults to `RATING_DESC`.
- **Fix:** Frontend should combine field + order into a single `sortBy` value.

#### 4.4 `/tours/available` — mealPlan naming and multiplicity
- Backend expects a single `mealPlan=BB`
- Frontend sends `mealPlans=BB,HB` (plural, comma-separated)
- **Symptom:** Meal-plan filter is ignored.
- **Fix:** Either accept a list on the backend (`List<String> mealPlans`) or have the frontend send a single value.

#### 4.5 `MONGODB_URI` has no fallback
`application.yml` reads `${MONGODB_URI}` with no default. The app crashes on startup without this env var.
- **Fix:** Provide a sensible local fallback (e.g., `mongodb://localhost:27017/travel_agency`).

### High — Features silently degraded

#### 4.6 No refresh-token flow in frontend
Backend returns `refreshToken` on sign-in but the frontend's `SignInResponse` type omits the field and `storage.ts` never persists it. `/auth/refresh` and `/auth/logout` are never invoked.
- **Symptom:** After the JWT expires (default 24h), protected calls like `POST /bookings` fail with 401 and the user must manually re-login.
- **Fix:** Add `refreshToken` to the frontend type, persist it, and implement a refresh interceptor.

#### 4.7 Pagination param naming
- Backend expects `pageSize`; frontend sends `size` (`tourService.ts:67`).
- Frontend masks this by requesting `size=10000` and paginating client-side.
- **Fix:** Use `pageSize` on the frontend and paginate server-side.

#### 4.8 `GET /bookings` / "My Tours" not implemented
Neither frontend nor backend implements the booking-list endpoint. OpenAPI defines it.

### Medium — Inconsistencies and deployment risks

#### 4.9 API base URL fallback is inconsistent
Four files read `VITE_API_BASE_URL` with different fallbacks:
| File | Fallback |
|---|---|
| `src/api.ts` | `http://localhost:8080/api/v1` |
| `src/features/tours/services/tourService.ts` | `http://localhost:8080/api/v1` |
| `src/config/env.ts` | `/api/v1` |
| `src/features/auth/constants.ts` | `/api/v1` |

No `.env` file exists in the frontend directory. In dev, the relative paths work via Vite's `/api` proxy; the absolute paths bypass it. These will diverge in production.
- **Fix:** Create `.env.development` and `.env.production`, and consolidate to a single `getApiBaseUrl()` helper.

#### 4.10 Duplicate `AuthContext`
Two files exist: `src/context/AuthContext.tsx` (full JWT auth) and `src/features/tours/context/AuthContext.tsx` (stores only `{name,email}` from localStorage). Maintenance hazard.

#### 4.11 Name validation inconsistency
- Backend `@Pattern("^[\\p{L}]+$")` — letters only (no hyphens, apostrophes, spaces)
- Frontend `nameRegex = /^[a-zA-Z\s'-]*/` — allows spaces, hyphens, apostrophes
- **Symptom:** Users like "O'Brien" or "Smith-Jones" pass frontend validation but are rejected with 400 by the backend.

#### 4.12 CORS only permits localhost
Both `SecurityConfig.java` and `WebConfig.java` hard-code `http://localhost:5173` and `http://localhost:5174`. A deployed frontend origin will be blocked.
- **Fix:** Externalize origins via a `cors.allowed-origins` property.

#### 4.13 Two CORS configs disagree
- `SecurityConfig`: allows `PATCH`, `*` headers
- `WebConfig`: no `PATCH`, explicit `[Content-Type, Authorization]` headers
- **Fix:** Delete `WebConfig`'s CORS mapping — Spring Security's `CorsFilter` is authoritative.

#### 4.14 `HelloEdpController` double-prefixed
Mapped as `@GetMapping("/api/hello")` without a class-level `@RequestMapping`. With context-path `/api/v1`, the effective URL becomes `/api/v1/api/hello`.

#### 4.15 Dockerfile issues
- Uses preview JDK `openjdk:22-ea-17-slim-bookworm` for a Java 17 build.
- No `EXPOSE 8080`.
- No default env vars for `MONGODB_URI`, `JWT_SECRET`.

#### 4.16 `docker-compose.yml` only contains MongoDB
Backend and frontend services are not defined. Full-stack local bring-up requires running each piece manually.

---

## 5. Field-Level Payload Mismatches

### Sign-in response
| Field | Backend | Frontend type | OpenAPI |
|---|---|---|---|
| `idToken` | Yes | Yes | Yes |
| `refreshToken` | Yes (returned) | No (missing from type) | No (not in spec) |
| `role` | Yes | Yes | Yes |
| `userName` | Yes | Yes | Yes |
| `email` | Yes | Yes | Yes |

### Sign-up response
| Field | Backend | Frontend use | OpenAPI |
|---|---|---|---|
| `message` | Yes | Yes | Yes |
| `nextRoute` | Yes (returned) | No (ignored) | No (not in spec) |

### `TourListResponseDTO.TourDTO`
Backend includes `imageUrls` (used by frontend); OpenAPI spec omits it. Spec is stale.

---

## 6. Endpoint-to-Call Traceability Matrix

| OpenAPI endpoint | Backend impl | Frontend call | Status |
|---|---|---|---|
| POST `/auth/sign-up` | Yes | Yes | OK (see 4.11 name validator) |
| POST `/auth/sign-in` | Yes | Yes | OK (see 4.6 refresh token lost) |
| POST `/auth/refresh` | Yes | No (not called) | Feature gap |
| POST `/auth/logout` | Yes | No (not called) | Feature gap |
| GET `/tours/destinations` | Yes | Wrong param | Broken (4.2) |
| GET `/tours/available` | Yes | Wrong params | Broken (4.3, 4.4) |
| GET `/tours/{id}` | Yes | Yes | OK |
| GET `/tours/{id}/reviews` | Yes | Yes | OK |
| POST `/bookings` | No (no controller) | Yes | Broken (4.1) |
| GET `/bookings` | No (no controller) | No (not implemented) | Feature gap (4.8) |

---

## 7. Recommended Fix Order

1. **Implement `BookingController`** — unblocks the full checkout flow.
2. **Align `/tours/destinations` param** (`destination` vs `query`).
3. **Align `/tours/available` sort/filter params** (`sortBy`, `mealPlan`, `pageSize`).
4. **Add `MONGODB_URI` fallback** in `application.yml`.
5. **Persist and use `refreshToken`** in the frontend, add a 401-retry interceptor.
6. **Consolidate frontend API base URL config** into one helper + `.env.*` files.
7. **Remove duplicate `AuthContext`**.
8. **Externalize CORS allowed origins**; drop `WebConfig`'s CORS block.
9. **Synchronize name-validation regex** between FE and BE.
10. **Complete Docker setup** — add backend + frontend services to `docker-compose.yml`, fix the Dockerfile base image, expose port, provide env vars.
11. **Remove double-prefixed `/api/hello`**.
12. **Lock down `/admin/travel-agents`** behind an admin role.

---

## 8. Test Status

| Suite | Count | Pass | Fail | Errors |
|---|---|---|---|---|
| Tour service + edge cases | 20 + 14 | 34 | 0 | 0 |
| Tour mapper + edge cases | 9 + 11 | 20 | 0 | 0 |
| Tour controller (WebMvcTest) | 3 | 3 | 0 | 0 |
| Auth + security unit tests | 30+ | all | 0 | 0 |
| `AuthControllerTest` (SpringBootTest) | 8 | 0 | 0 | 8 (pre-existing — requires live MongoDB) |
| Other `@SpringBootTest` classes | 1 | 0 | 0 | 1 (same cause) |
| **Total** | **110** | **101** | **0** | **9** |

All 9 errors are pre-existing on `develop` and are caused by `@SpringBootTest` classes trying to connect to MongoDB without mocking `UserRepository`. They are unrelated to the integration issues above.

---

## 9. Summary

The backend and frontend are **functionally misaligned on the three core tour-listing parameters** (`destination`, `sortBy`, `mealPlan`) and the **entire booking feature is missing on the backend**. The auth path works for sign-in/sign-up but has no refresh/logout wiring on the client. Configuration (CORS, env vars, Docker) is wired only for local dev and will not deploy cleanly.

Fixing items 1–5 in section 7 restores end-to-end functionality for the primary user journey (browse → select → book).
