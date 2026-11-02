# 🛡️ Vulnerability Risk Prioritization Tool (VRPT)

Yeh ek **Enterprise Cybersecurity Risk Scoring aur Threat Intelligence Platform** hai. Iska main kaam organizations ke digital assets aur systems me aane wali vulnerabilities (CVEs) ko analyze karke yeh batana hai ki **kaunsi vulnerability sabse pehle fix karni chahiye** (Risk-based Prioritization), taaki security teams ka time aur resources sahi jagah use ho sake.

---

## 📂 1. Backend Overview (Files & Folders Structure)

Backend **FastAPI (Python)** pe bana hua hai. Har folder aur important file ka clear high-level overview neeche diya gaya hai:

```
backend/
├── app/
│   ├── api/          # Sare API endpoints / route handlers
│   ├── core/         # Core configuration, database connection & security
│   ├── models/       # Database tables (SQLAlchemy models)
│   ├── schemas/      # Request & Response validation (Pydantic models)
│   ├── services/     # Business logic & algorithms (Risk calculation, reports, etc.)
│   └── main.py       # FastAPI app ka main starting point
├── seed_data.py      # Database ko sample data aur demo users se bharne ke liye script
├── requirements.txt  # Python dependencies aur libraries ki list
└── vrpt.db           # Local SQLite database file
```

### 🔹 `app/api/` (API Routes)
Frontend ya external clients ke liye sare REST endpoints yahan defined hain:
- **`auth.py`**: User login, registration, token generation aur profile management.
- **`dashboard.py`**: Security dashboard ke statistics, charts aur risk distribution metrics.
- **`vulnerabilities.py`**: Vulnerabilities ko list karna, filter karna, add ya update karna.
- **`assets.py`**: Company ke assets (servers, databases, web apps) ka CRUD management.
- **`risk.py`**: Dynamic risk calculation trigger karna aur risk configurations update karna.
- **`remediation.py`**: Vulnerabilities ko fix karne ke tasks assign aur track karna.
- **`import_export.py`**: Vulnerability data ko CSV ke through bulk upload ya export karna.
- **`reports.py`**: Executive summary aur security audit PDF reports generate karna.
- **`notifications.py`**: Critical alerts aur status notifications manage karna.
- **`audit.py`**: System ke audit trail logs provide karna.
- **`deps.py`**: Database session aur JWT current user validation ke helper dependencies.

### 🔹 `app/core/` (Core Configurations)
- **`config.py`**: Project settings, JWT secret keys, API versioning aur environment variables.
- **`database.py`**: SQLAlchemy database engine aur sessionmaker setup.
- **`security.py`**: Password hashing (Bcrypt) aur JWT access token encode/decode logic.

### 🔹 `app/models/` (Database Models)
Database tables ke schema yahan define hain:
- **`user.py`**: Users aur unke roles (Admin, Security Analyst, Viewer).
- **`asset.py`**: IT assets aur unki business criticality (Critical, High, Medium, Low).
- **`vulnerability.py`**: CVE details, CVSS scores, exploit availability aur status.
- **`risk_assessment.py`**: Calculated risk scores aur assessment history.
- **`remediation.py`**: Remediation actions, SLA deadlines aur status tracking.
- **`audit_log.py`**: Har critical action ka audit log (kaun, kab, kya change kiya).
- **`notification.py`**: User alerts aur system notifications.

### 🔹 `app/schemas/` (Data Validation Schemas)
Pydantic schemas jo request payloads aur response data ko strictly validate karte hain (e.g., login request format, vulnerability creation payload, response models).

### 🔹 `app/services/` (Business Logic & Core Engines)
- **`risk_engine.py`**: **Sabse important file** — Yeh multi-factor algorithm run karti hai jo CVSS score, EPSS (exploit probability), CISA KEV (known exploited catalog), aur asset business criticality ko combine karke final Prioritized Risk Score (0-100) calculate karta hai.
- **`external_intelligence.py`**: Threat intelligence feeds (EPSS, CISA) ke sath data enrich karti hai.
- **`csv_importer.py`**: CSV files ko parse aur validate karke bulk vulnerabilities create karta hai.
- **`report_generator.py`**: ReportLab use karke clean PDF executive reports create karta hai.
- **`audit_service.py` & `notification_service.py`**: Background audit logging aur user notification creation handle karte hain.

### 🔹 Root Backend Files
- **`main.py`**: Main application setup — yahan CORS configure hota hai aur sare API routers register hote hain.
- **`seed_data.py`**: Demo users (`admin`, `analyst`, `viewer`) aur initial vulnerability/asset data inject karne ke liye.
- **`requirements.txt`**: FastAPI, Uvicorn, SQLAlchemy, Pydantic, ReportLab jaisi packages list.

---

## 🎨 2. Frontend Overview (Halka Sa / High-Level)

Frontend **React 18 + TypeScript + Vite + TailwindCSS** ke sath bana ek modern, clean cybersecurity dashboard hai:

```
frontend/
├── src/
│   ├── pages/        # Main screens (Dashboard, Vulnerabilities, Assets, Risk, Auth)
│   ├── components/   # Reusable UI elements (Navbar, Sidebar, Cards, Charts)
│   ├── contexts/     # Global state (AuthContext user login/session ke liye)
│   ├── services/     # Axios API service jo backend API se connect karti hai
│   ├── types/        # TypeScript interfaces aur models
│   ├── App.tsx       # Main app layout aur React Router setup
│   └── main.tsx      # React DOM root entrypoint
├── package.json      # Frontend libraries aur build scripts
└── vite.config.ts    # Vite bundler config aur `/api` proxy setup
```

### 🌟 Key Pages:
1. **`Dashboard.tsx`**: Executive summary jisme risk scores, critical vulnerability trends, open remediation tasks aur severity charts dikhte hain.
2. **`Vulnerabilities.tsx` & `VulnerabilityDetail.tsx`**: Sabhi detected CVEs ki filtered list, unke technical details, exploit status aur CVSS/EPSS scores.
3. **`Assets.tsx` & `AssetDetail.tsx`**: Servers, cloud resources aur endpoints ki inventory aur unki criticality mapping.
4. **`RiskPrioritization.tsx`**: Interactive risk engine interface jahan top prioritized vulnerabilities highlight hoti hain.
5. **`Login.tsx` / `Register.tsx`**: Role-based authentication screens.

---

## 🚀 Quick Run Guide

### 1. Backend Start Karna
```powershell
# Backend folder me jayein
python seed_data.py
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API URL: `http://127.0.0.1:8000`
- Swagger Docs: `http://127.0.0.1:8000/docs`

### 2. Frontend Start Karna
```powershell
# Frontend folder me jayein
npm install
npm run dev
```
- Web UI URL: `http://localhost:5173`

### 👤 Demo Login Credentials
- **Admin**: `admin` / `admin123`
- **Security Analyst**: `analyst` / `analyst123`
- **Viewer**: `viewer` / `viewer123`
