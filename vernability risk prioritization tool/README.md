# 🛡️ Vulnerability Risk Prioritization Tool (VRPT)

> **Enterprise Cybersecurity Risk Scoring, Threat Intelligence, and Mitigation Platform**

![VRPT Security Banner](https://img.shields.io/badge/Security-Enterprise%20Grade-0284c7?style=for-the-badge&logo=shield)
![FastAPI](https://img.shields.io/badge/FastAPI-0.135.3-009688?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React-18.3-61dafb?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?style=for-the-badge&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?style=for-the-badge&logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## 📑 Table of Contents
1. [Project Overview](#-project-overview)
2. [Why Not Just CVSS?](#-why-not-just-cvss)
3. [Architecture & System Design](#-architecture--system-design)
4. [Technology Stack](#-technology-stack)
5. [Intelligent Risk Scoring Formula](#-intelligent-risk-scoring-formula)
6. [Database Schema](#-database-schema)
7. [API Endpoints Reference](#-api-endpoints-reference)
8. [Demo Accounts & Credentials](#-demo-accounts--credentials)
9. [Installation & Quickstart Guide](#-installation--quickstart-guide)
10. [Sample Vulnerability CSV Import](#-sample-vulnerability-csv-import)
11. [Running Automated Tests](#-running-automated-tests)
12. [Docker Deployment](#-docker-deployment)

---

## 🔍 Project Overview

Modern enterprise cybersecurity teams discover thousands of vulnerabilities across their digital attack surfaces. However:
- A **Critical CVSS 9.8** vulnerability on an isolated development virtual machine may represent minimal immediate danger.
- A **Medium CVSS 6.5** vulnerability that is actively weaponized in the wild on an **Internet-Facing Production API Gateway** handling customer payment traffic is an **urgent emergency**.

**VRPT (Vulnerability Risk Prioritization Tool)** solves this alert fatigue by replacing static CVSS sorting with an **algorithmic multi-factor risk engine**. It dynamically synthesizes base severity, empirical exploit probability (FIRST EPSS), threat intelligence (CISA KEV catalog), and organizational asset business criticality to tell security leaders:

1. **Which vulnerabilities are genuinely dangerous?**
2. **Which vulnerabilities must be fixed first?**
3. **What is the current, quantifiable security posture of the organization?**

---

## 💡 Why Not Just CVSS?

| Parameter | Traditional CVSS v3.1 | VRPT Intelligent Scoring |
| :--- | :--- | :--- |
| **Asset Business Context** | ❌ Ignored | ✅ Evaluates Asset Criticality (Critical, High, Medium, Low) |
| **Attack Surface Exposure** | ❌ Static (assumes direct access) | ✅ Analyzes Internet-Facing vs Internal vs Isolated network |
| **Exploitation in the Wild** | ❌ Static theoretical severity | ✅ Real-time FIRST EPSS probability + CISA KEV catalog |
| **Deployment Tier** | ❌ Identical for Dev and Prod | ✅ Production (100%) vs Staging (70%) vs Dev (40%) |
| **Prioritization Clarity** | ❌ "Everything is Critical" | ✅ Defensible 0–100 Risk Score with mathematical breakdown |

---

## 🏛️ Architecture & System Design

```
                     ┌───────────────────────────────────────────────┐
                     │          React + TypeScript Frontend          │
                     │  (Tailwind CSS + Recharts + Lucide Icons)     │
                     └───────────────────────┬───────────────────────┘
                                             │ REST API / JWT
                                             ▼
                     ┌───────────────────────────────────────────────┐
                     │            FastAPI Backend Service            │
                     │  - OAuth2 Password Request / JWT Validation   │
                     │  - Role-Based Access Control (RBAC)           │
                     │  - Threat Intelligence Ingestion (EPSS / KEV) │
                     │  - CSV Import Validator & Engine              │
                     │  - PDF Executive Reporter (ReportLab)         │
                     │  - Audit Logger & In-App Notification Hub     │
                     └───────────────────────┬───────────────────────┘
                                             │
                      ┌──────────────────────┴──────────────────────┐
                      ▼                                             ▼
         ┌─────────────────────────┐                   ┌─────────────────────────┐
         │  Risk Engine Service    │                   │   Relational Database   │
         │  - Multi-Factor Weights │                   │   - SQLite (Local Dev)  │
         │  - Normalized Vectors   │                   │   - PostgreSQL (Prod)   │
         │  - Historical Snapshot  │                   │   - SQLAlchemy ORM      │
         └─────────────────────────┘                   └─────────────────────────┘
```

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Bundler & Dev Server**: Vite 6
- **Styling**: Tailwind CSS with custom Cybersecurity Theme
- **Data Visualizations**: Recharts (PieChart, AreaChart, BarChart)
- **Icons**: Lucide React
- **Client Routing**: React Router v6
- **HTTP Client**: Axios with automatic JWT injection interceptors

### Backend
- **Framework**: Python 3.11+ / FastAPI
- **Data Validation & Schemas**: Pydantic v2
- **ORM & Database Layer**: SQLAlchemy 2.0 with connection pooling
- **Security & Cryptography**: Direct `bcrypt` hashing + `PyJWT` tokens
- **PDF Generation**: ReportLab 5.1
- **Testing**: Pytest

---

## 🧮 Intelligent Risk Scoring Formula

The core algorithm normalizes all input vectors into a uniform **0–100 scale** and computes a weighted composite risk score:

### 1. Factor Normalization
- **CVSS Base Score**: `CVSS_Normalized = (CVSS / 10.0) × 100`
- **EPSS Probability**: `EPSS_Normalized = EPSS × 100`
- **Asset Criticality**:
  - `Critical` = 100.0
  - `High` = 80.0
  - `Medium` = 50.0
  - `Low` = 20.0
- **Internet Exposure**:
  - `Internet Facing` = 100.0
  - `Internal` = 50.0
  - `Isolated` = 10.0
- **Exploitation Intelligence**:
  - `CISA KEV Listed` = 100.0
  - `Public Exploit Available` = 75.0
  - `No Known Exploit` = 0.0
- **Environment Tier**:
  - `Production` = 100.0
  - `Staging` = 70.0
  - `Development` = 40.0
  - `Testing` = 20.0

### 2. Weighted Calculation
$$\text{Risk Score} = (CVSS_{\text{norm}} \times 0.30) + (EPSS_{\text{norm}} \times 0.20) + (\text{Crit}_{\text{norm}} \times 0.15) + (\text{Exposure}_{\text{norm}} \times 0.15) + (\text{Exploit}_{\text{norm}} \times 0.10) + (\text{Env}_{\text{norm}} \times 0.10)$$

*All weights are fully customizable in real time via the Settings page.*

### 3. Risk Level Classification
- **Critical Risk**: $80.00 \le \text{Score} \le 100.00$
- **High Risk**: $60.00 \le \text{Score} < 80.00$
- **Medium Risk**: $40.00 \le \text{Score} < 60.00$
- **Low Risk**: $0.00 \le \text{Score} < 40.00$

---

## 🗄️ Database Schema

The relational database is normalized and enforces constraints, foreign keys, and indexes:

1. **`users`**: User identities, hashed bcrypt credentials, and RBAC roles (`ADMIN`, `SECURITY_ANALYST`, `VIEWER`).
2. **`assets`**: Target hosts, IP addresses, OS, criticality rating, environment tier, and exposure classification.
3. **`vulnerabilities`**: CVE records, CVSS scores, EPSS probabilities, KEV status, calculated risk score, priority level, and remediation status.
4. **`risk_assessments`**: Historical snapshots storing the mathematical contribution breakdown for every calculation.
5. **`remediation_tasks`**: Actionable remediation tickets with SLA deadlines, analyst assignments, and verification status.
6. **`notifications`**: In-app alerts for newly discovered critical findings, KEV additions, and overdue SLA tasks.
7. **`audit_logs`**: Immutable security trail recording logins, asset changes, risk recalculations, and CSV imports.
8. **`risk_configs`**: Active model weighting parameters and version tracking.

---

## 📡 API Endpoints Reference

### Authentication
- `POST /api/auth/register` - Create user profile
- `POST /api/auth/login` - Authenticate & obtain JWT token
- `GET /api/auth/me` - Retrieve current session details

### Dashboard Analytics
- `GET /api/dashboard/summary` - Real-time KPI counters
- `GET /api/dashboard/severity-distribution` - Risk classification pie data
- `GET /api/dashboard/risk-trends` - 7-day chronological progression
- `GET /api/dashboard/top-risks` - Top 10 riskiest findings
- `GET /api/dashboard/asset-distribution` - Vulnerability counts per asset
- `GET /api/dashboard/remediation-progress` - Remediation SLA percentages
- `GET /api/dashboard/recent-activities` - Audit event stream

### Vulnerabilities
- `GET /api/vulnerabilities` - Search, filter by severity/asset/status, paginate, sort
- `POST /api/vulnerabilities` - Ingest single vulnerability & auto-calculate risk
- `GET /api/vulnerabilities/{id}` - Full detail view with mathematical breakdown
- `PUT /api/vulnerabilities/{id}` - Update vulnerability properties & recalculate
- `DELETE /api/vulnerabilities/{id}` - Remove vulnerability and associated tasks

### Assets
- `GET /api/assets` - List inventory with filters
- `POST /api/assets` - Enroll new asset
- `GET /api/assets/{id}` - Retrieve asset and all linked vulnerabilities
- `PUT /api/assets/{id}` - Update asset criticality/exposure (triggers auto-recalculation)
- `DELETE /api/assets/{id}` - Decommission asset

### Risk Prioritization Engine
- `GET /api/risk/prioritized` - Ranked vulnerability matrix & Top 5 immediate attention findings
- `POST /api/risk/calculate/{id}` - Recalculate single finding score
- `GET /api/risk/breakdown/{id}` - Factor contribution breakdown
- `POST /api/risk/recalculate-all` - Batch re-evaluate entire inventory
- `GET /api/risk/config` - View active scoring weights
- `PUT /api/risk/config` - Update scoring weights

### Remediation & Reports
- `GET /api/remediation` - List mitigation tasks
- `GET /api/remediation/overdue` - Overdue SLA tasks
- `POST /api/remediation` - Create remediation ticket
- `PUT /api/remediation/{id}` - Update status
- `POST /api/remediation/{id}/verify` - **Verification step: officially mark finding as RESOLVED**
- `POST /api/import/preview` - CSV upload validation & preview
- `POST /api/import/csv` - Commit CSV import and score findings
- `GET /api/reports/export/csv` - Download raw CSV report
- `GET /api/reports/export/pdf` - Download Executive Security Report (PDF)

---

## 🔑 Demo Accounts & Credentials

The seed script pre-loads three demonstration accounts covering all role-based permissions:

| Role | Username | Password | Access Privileges |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin` | `admin123` | Full control: configure scoring weights, manage assets, delete records, import scans |
| **Security Analyst** | `analyst` | `analyst123` | Prioritize risks, create findings, assign remediation tasks, verify fixes |
| **Auditor / Viewer** | `viewer` | `viewer123` | Read-only access to dashboards, risk breakdowns, and compliance reports |

---

## 🚀 Installation & Quickstart Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. One-Click Launch (Windows)
Double-click `run_dev.bat` or run:
```powershell
.\run_dev.ps1
```
This automatically initializes the database, seeds realistic enterprise data, and launches both backend and frontend servers!

### 2. Manual Startup

#### Backend:
```bash
cd backend
python -m pip install -r requirements.txt
python seed_data.py
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Base: `http://127.0.0.1:8000`
- Interactive Swagger Docs: `http://127.0.0.1:8000/docs`

#### Frontend:
```bash
cd frontend
npm install
npm run dev
```
- Application Portal: `http://localhost:5173`

---

## 📄 Sample Vulnerability CSV Import

A sample scanner export is included at:
`backend/sample_vulnerabilities.csv`

You can test the CSV import workflow directly in the UI:
1. Navigate to **Vulnerabilities**
2. Click **Import CSV**
3. Upload `backend/sample_vulnerabilities.csv`
4. Inspect the instant validation preview and error checks
5. Click **Confirm Import** to auto-link assets, query threat intelligence, and score risks!

---

## 🧪 Running Automated Tests

Run backend unit and integration tests using Pytest:

```bash
cd backend
python -m pytest app/tests/ -v
```

### Verified Test Cases:
- **Case 1**: Critical CVSS + high EPSS on internet-facing production server receives $\ge 80.0$ risk score.
- **Case 2**: Low CVSS + low EPSS on isolated test machine receives $< 40.0$ risk score.
- **Case 3**: KEV-listed vulnerabilities receive mathematically higher risk scores than non-exploited counterparts.
- **Case 4**: Invalid CVSS scores outside $[0.0, 10.0]$ are strictly rejected with validation errors.
- **Case 5**: Risk scores across all possible combinations remain strictly bounded in $[0.00, 100.00]$.
- **Auth & CRUD**: Login validation, JWT expiration, asset and vulnerability lifecycle tests.

---

## 🐳 Docker Deployment

To launch the complete platform with production PostgreSQL:

```bash
docker-compose up --build
```

- Web UI: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- PostgreSQL: Port `5432`
