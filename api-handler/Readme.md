# Travel Agency POC – API Handler Service

> A Proof of Concept for a Travel Agency platform demonstrating core system capabilities using a microservices-based architecture.

---

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Initial Setup](#initial-setup)
- [Branching Strategy](#branching-strategy)
- [Development Workflow](#development-workflow)
- [CI/CD Workflow](#cicd-workflow)
- [Functional Requirements](#functional-requirements)
- [API Specification](#api-specification)
- [Testing & QA](#testing--qa)
- [Infrastructure](#infrastructure)
- [Roles & Responsibilities](#roles--responsibilities)
- [Definition of Done](#definition-of-done)
- [Reference Documentation](#reference-documentation)

---

## Overview

This project focuses on implementing essential functionalities such as **user management** and **travel booking workflows**, built with a modern cloud-native approach leveraging containerization, Kubernetes, and CI/CD automation.

---

## System Architecture

```
┌─────────────────┐        ┌──────────────────────┐        ┌─────────────┐
│   Frontend      │──────▶ │   API Handler        │──────▶ │   MongoDB   │
│   (AWS S3)      │        │   (Spring Boot 3)    │        │ (Kubernetes)│
└─────────────────┘        └──────────────────────┘        └─────────────┘
```

| Component | Description |
|-----------|-------------|
| **Frontend (S3)** | Hosts static assets (HTML, CSS, JS), accessed directly by users via browser |
| **API Handler** | Manages business logic, processes client requests, exposes RESTful APIs |
| **MongoDB** | Stores user profiles, booking data, and related entities |

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Backend | Spring Boot 3 (Java) |
| Frontend | React (Typescript) |
| Database | MongoDB |
| CI/CD | KubeRocketCI (Tekton, ArgoCD) |
| Containerization | Docker |
| Cloud & Hosting | AWS S3, Kubernetes |

---

## Initial Setup

### 1. SSH Key Configuration *(Required)*

```bash
ssh-keygen -t ed25519 -C "your_email@epam.com"
```

Add the generated public key (`id_ed25519.pub`) to GitLab:
> **Profile → Settings → SSH Keys**

### 2. Clone Repository

```bash
git clone git@git.epam.com:<group>/<project>.git
cd api-handler
```

---

## Branching Strategy

The project follows the **Main–Develop–Feature (MDF)** branching model to ensure controlled and stable development.

```
main
 └── develop
      └── feature/<feature-name>
```

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready branch (connected to CI/CD pipeline) |
| `develop` | Integration branch *(protected)* |
| `feature/*` | Developer-created branches for individual tasks |

> **Direct push to `develop` is not allowed.** All changes must go through Merge Requests.

---

## Development Workflow

### Step 1 – Sync with Develop

```bash
git checkout develop
git pull origin develop
```

### Step 2 – Create Feature Branch

```bash
git checkout -b feature/<feature-name>
# Example:
git checkout -b feature/user-registration
```

### Step 3 – Implement Changes

```bash
git add .
git commit -m "Implement user registration (US_1)"
```

### Step 4 – Push Changes

```bash
git push origin feature/<feature-name>
```

### Step 5 – Create Merge Request

1. Raise a **Merge Request (MR)** to `develop`
2. Await review and approval from **Team Lead**

---

## CI/CD Workflow

```
Push to Git ──▶ Merge Request Approved ──▶ KubeRocketCI Pipeline Triggered
                                                       │
                                              Tekton: Build Docker Image
                                                       │
                                              ArgoCD: Deploy to Kubernetes
                                                       │
                                            Service Exposed via Ingress 
```

---

## Functional Requirements

### User Management

- User registration
- User authentication (login)
- Role assignment: `Customer`, `Agent`, `Admin`

### Travel Booking

- View available tours
- View tour details
- Book tours

---

## API Specification

OpenAPI specification is provided in both **JSON** and **HTML** formats.

Can be imported into tools such as:
- [Postman](https://www.postman.com/)
- [Swagger Editor](https://editor.swagger.io/)

---

## Testing & QA

| Requirement | Details |
|-------------|---------|
| Unit Testing | Mandatory (Spring Boot) |
| API Test Cases | Must be created for all endpoints |
| Automation Framework | Must be implemented |
| Documentation | Test Plan and Test Strategy documents required |

---

## Infrastructure

### Backend
- Deployed via **KubeRocketCI**
- Runs inside **Kubernetes** cluster

### Database
- **MongoDB** deployed via KubeRocketCI
- Accessible through **Mongo Express UI**

### Frontend
- Hosted as a **static website** on **AWS S3**

---

## Roles & Responsibilities

| Role | Responsibilities |
|------|-----------------|
| **Team Lead** | Manage repository, CI/CD pipeline, and secrets; review and approve MRs; ensure project alignment |
| **Backend Developers** | Implement API logic; maintain backend codebase |
| **Frontend Developers** | Develop UI components; integrate frontend with APIs |
| **QA Engineers** | Validate APIs; create and execute test cases; report and track defects |

---

## Definition of Done

- [ ] Feature implementation is complete
- [ ] Unit tests are written and passing
- [ ] Code is reviewed and approved
- [ ] Deployment through CI/CD is successful

---

## Reference Documentation

| Resource | Link |
|----------|------|
| API Specifications and Sprint Guidelines | [Sprint-1 R23](https://kb.epam.com/spaces/EPMEDAI/pages/2806058026/Sprint-1+R23) |
| REST API Test Plan, Reporting, and Best Practices | [REST API Test Plan](https://kb.epam.com/spaces/EPMEDAI/pages/2369184892/REST+API+test+plan+creation+report+and+best+practices) |
| Processes and Requirements (Roles, Responsibilities, Workflow) | [Processes & Requirements](https://kb.epam.com/spaces/EPMEDAI/pages/2363851888/Processes+and+Requirements) |