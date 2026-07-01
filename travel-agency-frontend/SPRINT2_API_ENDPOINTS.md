# Sprint 2 - Travel Agent Booking Management API Endpoints

## Overview
This document describes the new API endpoints added for Sprint 2 to support Travel Agent booking management functionality.

## Base URL
```
http://localhost:8080/api/v1
```

## Authentication
All endpoints require Bearer JWT token in Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Frontend Integration for Travel Agent Dashboard

If your React/Next/Vue frontend currently uses `MOCK_BOOKINGS`, replace it with a call to:

```http
GET /api/v1/bookings?agentId=6a032fb1e67d88683175ddf2
```

The backend returns:

```json
{
  "bookings": [
    {
      "id": "...",
      "state": "BOOKED",
      "tourImageUrl": "...",
      "name": "...",
      "destination": "...",
      "tourDetails": {
        "date": "Jun 3, 2026 (7 days)",
        "mealPlan": "Breakfast (BB)",
        "guests": "John Doe (2 adults)",
        "totalPrice": "$2700",
        "documents": "2 items"
      },
      "customerDetails": {
        "name": "John Doe (2 adults, 1 child)",
        "email": "customer@example.com",
        "phone": null,
        "documents": {
          "payments": [],
          "guestDocuments": []
        }
      },
      "freeCancelation": "2026-05-24"
    }
  ]
}
```

Suggested frontend mapping:

- `tourImageUrl` → card image
- `name` → tour title
- `destination` → subtitle/location
- `tourDetails.date` → displayed date and duration
- `tourDetails.mealPlan` → meal plan label
- `tourDetails.totalPrice` → total price badge
- `tourDetails.documents` → uploaded documents text
- `customerDetails.name` / `customerDetails.email` → customer section
- `freeCancelation` → free cancellation label
- `state` → booking status chip

Then filter in the UI by `state` if you want tabs like `BOOKED`, `CONFIRMED`, `STARTED`, `FINISHED`, and `CANCELLED`.

---

## New Endpoints

### 1. Get Bookings for Travel Agent

**GET** `/bookings?agentId={agentId}`

Retrieve all bookings assigned to a specific travel agent.

**Query Parameters:**
- `agentId` (string, required): The ID of the travel agent

**Response:** `200 OK`
```json
{
  "bookings": [
    {
      "id": "string",
      "tourId": "string",
      "state": "BOOKED",
      "tourImageUrl": "string",
      "name": "string",
      "destination": "string",
      "tourDetails": {
        "date": "Jun 3, 2026 (7 days)",
        "mealPlan": "Breakfast (BB)",
        "guests": "John Doe (2 adults)",
        "totalPrice": "$2700",
        "documents": "0 items"
      },
      "travelAgent": {
        "name": "Travel Agent Name",
        "email": "agent@example.com",
        "phone": null,
        "messenger": null
      },
      "customerDetails": {
        "name": "John Doe (2 adults, 1 child)",
        "email": "customer@example.com",
        "phone": null,
        "documents": {
          "payments": [],
          "guestDocuments": []
        }
      },
      "canceledBy": null,
      "cancelReason": null,
      "freeCancelation": "2026-05-24",
      "personalDetails": [
        {
          "firstName": "John",
          "lastName": "Doe"
        }
      ]
    }
  ]
}
```

---

### 2. Confirm Booking

**POST** `/bookings/{id}/confirm`

Travel agent confirms a booking after checking all documents. Changes state from BOOKED to CONFIRMED.

**Path Parameters:**
- `id` (string, required): Booking ID

**Response:** `200 OK`
```json
{
  "message": "Booking confirmed successfully."
}
```

**Business Rules:**
- Only assigned travel agent can confirm their bookings
- Can only confirm bookings in BOOKED state
- Once confirmed, booking moves to CONFIRMED state
- After confirmation, customers cannot modify guest quantity or meal plan

---

### 3. Cancel Booking (Travel Agent)

**DELETE** `/bookings/{id}/cancel`

Travel agent cancels a booking for significant reasons.

**Path Parameters:**
- `id` (string, required): Booking ID

**Request Body:**
```json
{
  "cancellationReason": "CUSTOMERS_EMERGENCY",
  "comment": "Customer requested cancellation due to family emergency"
}
```

**Cancellation Reasons:**
- `CUSTOMERS_EMERGENCY` - Customer or hotel emergency
- `HOTEL_EMERGENCY` - Hotel-related issues
- `SAFETY_CONCERNS` - Safety concerns
- `INSUFFICIENT_BOOKINGS` - Not enough bookings

**Response:** `200 OK`
```json
{
  "message": "Booking canceled successfully."
}
```

**Business Rules:**
- Only assigned travel agent can cancel their bookings
- Cancellation free of charge up to 10 days before tour start date
- Sets state to CANCELLED
- Records who cancelled (agentId) and reason

---

## Booking States

| State | Description | Allowed Actions |
|-------|-------------|----------------|
| `BOOKED` | Tour is booked, documents not yet checked | Customer: Cancel, Upload docs<br>Agent: Confirm, Cancel |
| `CONFIRMED` | Documents checked and approved by agent | Customer: Cancel<br>Agent: Cancel |
| `STARTED` | Tour start date has arrived | No modifications allowed |
| `FINISHED` | Tour end date has passed | No modifications allowed |
| `CANCELLED` | Booking was cancelled | No modifications allowed |

---

## Tour Assignment

Tours now include a `travelAgentId` field. When a customer creates a booking:
1. The system automatically assigns the tour's travel agent to the booking
2. The travel agent receives the booking in their dashboard
3. The agent can then manage the booking (confirm/cancel)

---

## Example Workflow

### 1. Customer creates booking
```bash
POST /api/v1/bookings
{
  "tourId": "abc123",
  "date": "2026-07-08",
  "duration": "7 days",
  "mealPlan": "BB",
  "guests": {
    "adult": 2,
    "children": 0
  },
  "personalDetails": [
    {"firstName": "John", "lastName": "Doe"},
    {"firstName": "Jane", "lastName": "Doe"}
  ]
}
```
→ Booking created with state `BOOKED`, automatically assigned to tour's travel agent

### 2. Customer uploads documents
```bash
POST /api/v1/bookings/{bookingId}/documents
multipart/form-data with file
```
→ Documents uploaded for agent review

### 3. Travel agent views their bookings
```bash
GET /api/v1/bookings?agentId=6a0178029a9e5e04243eb4f0
```
→ Returns all bookings assigned to this agent

### 4. Travel agent confirms booking
```bash
POST /api/v1/bookings/{bookingId}/confirm
```
→ State changes from `BOOKED` to `CONFIRMED`

### 5. (Optional) Travel agent cancels booking
```bash
DELETE /api/v1/bookings/{bookingId}/cancel
{
  "cancellationReason": "HOTEL_EMERGENCY",
  "comment": "Hotel closed due to renovation"
}
```
→ State changes to `CANCELLED`, reason recorded

---

## Testing with Seeded Data

The application seeds the following test data:

### Users
- **Customer:** `avinaba_das@epam.com` (password: default seeded)
- **Travel Agent:** `mohit@gmail.com` (ID: determined by seeding, or use `6a0178029a9e5e04243eb4f0`)
- **Admin:** `lohit@gmail.com`

### Tours with Travel Agent
The following tours are assigned to travel agent `6a0178029a9e5e04243eb4f0`:
- Kyoto Sakura Dreams
- Serengeti Safari Odyssey
- Amalfi Coast Dolce Vita

### Bookings
10 sample bookings are seeded for travel agent `6a032fb1e67d88683175ddf2`:
1. **BOOKED** - Pending document review
2. **CONFIRMED** - Documents approved
3. **STARTED** - Tour already in progress
4. **FINISHED** - Tour completed
5. **CANCELLED** - Previously cancelled
6. **BOOKED** - Another open booking
7. **CONFIRMED** - Approved booking
8. **STARTED** - In-progress booking
9. **FINISHED** - Completed booking
10. **CANCELLED** - Agent-cancelled booking

---

## Error Responses

### 401 Unauthorized
```json
{
  "timestamp": "2026-05-13T00:00:00Z",
  "status": 401,
  "error": "You are not authorized to confirm this booking"
}
```

### 400 Bad Request
```json
{
  "timestamp": "2026-05-13T00:00:00Z",
  "status": 400,
  "error": "Can only confirm bookings in BOOKED state. Current state: CONFIRMED"
}
```

### 404 Not Found
```json
{
  "timestamp": "2026-05-13T00:00:00Z",
  "status": 404,
  "error": "Booking not found: xyz789"
}
```

---

## Notes

- All dates use ISO-8601 format (YYYY-MM-DD)
- Prices are in USD
- Travel agent assignment is automatic based on tour configuration
- Customer details are only visible to assigned travel agents
- The system automatically transitions bookings to STARTED and FINISHED states via scheduled jobs

