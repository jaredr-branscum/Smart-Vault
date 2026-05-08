# Smart Vault

Smart Vault is a cloud-native digital receipt repository. Users can upload receipt documents, which are securely stored in S3-compatible cloud storage. Extracted metadata is tracked through an analytics dashboard, and past receipts can be inspected at any time through the interactive **Vault Drawer** UI.

![Landing Page](Landing_Page.png)

## Technology Stack

- **Frontend**: Next.js 15 (App Router), React, Tailwind CSS v4, Recharts, Puter.js (for AI OCR).
- **Backend**: Python, FastAPI, SQLAlchemy, Alembic (migrations).
- **Database**: PostgreSQL (Docker), SQLite in-memory (tests).
- **Storage**: LocalStack S3 (development), AWS S3-compatible (production).

---

## Local Development Setup

Follow these steps exactly to get both the frontend and backend up and running locally.

### 1. Backend Setup (FastAPI)

1. Open your Command Prompt (`cmd`) and navigate to the backend directory:
   ```cmd
   cd c:\Coding\smart-vault\backend
   ```
2. Create and activate a Python virtual environment:
   ```cmd
   python -m venv venv
   venv\Scripts\activate.bat
   ```
3. Install the required dependencies:
   ```cmd
   pip install -r requirements.txt
   ```
4. Start the backend server:
   You can either run the server manually:
   ```cmd
   uvicorn main:app --reload
   ```
   **OR** use the provided helper script from the root of the project:
   ```cmd
   cd ..
   run_backend.bat
   ```

The backend API will be available at [http://127.0.0.1:8000](http://127.0.0.1:8000). 
You can view the interactive Swagger API documentation at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

### 2. Frontend Setup (Next.js)

1. Open a **new** Command Prompt window and navigate to the frontend directory:
   ```cmd
   cd c:\Coding\smart-vault\frontend
   ```
2. Install the Node dependencies:
   ```cmd
   npm install
   ```
3. Start the development server:
   ```cmd
   npm run dev
   ```

The frontend application will be available at [http://localhost:3000](http://localhost:3000).

---

## 🐳 Docker Setup (Production-Ready)

For a fully isolated and production-ready environment using **PostgreSQL** and **LocalStack S3**, use Docker Compose.

1. **Create Environment File**:
   Copy `.env.example` to `.env` and update the `DB_PASSWORD`.
2. **Build and Run**:
   ```cmd
   docker-compose up --build -d
   ```
3. **Verify**:
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend API: [http://localhost:8000](http://localhost:8000)
   - S3 Storage (LocalStack): [http://localhost:4566](http://localhost:4566)

**Security Controls in Docker:**
- **Non-Root Execution**: Both frontend and backend run as non-privileged users (`nextjs` and `smartuser`).
- **Network Isolation**: The PostgreSQL database is placed on an isolated Docker network, inaccessible from outside the cluster.
- **Multi-Stage Builds**: Frontend builds use multi-stage layers to ensure source code and build tools are not included in the final production image.
- **Migration Persistence**: The `backend/alembic/versions` directory is mounted as a Docker volume so database migrations are never lost when containers are recreated.

---

## ☁️ Cloud Storage Architecture

Receipt documents are stored in an **S3-compatible** object store (LocalStack in development, AWS S3 in production).

### How it works
1. Receipt is uploaded as `multipart/form-data` (metadata JSON + physical file in a single request).
2. The backend stores the file in S3 and saves the object key in the database.
3. When a user opens the **Vault Drawer**, the backend generates a **pre-signed URL** — a time-limited (1 hour), ephemeral secure link — that the browser uses to fetch the file directly from storage.

### Environment Variables (Backend)

| Variable | Description | Required in Production |
|---|---|---|
| `S3_ENDPOINT_URL` | Custom S3 endpoint (e.g. LocalStack). Omit for AWS. | No |
| `S3_PUBLIC_URL_OVERRIDE` | Replaces internal hostnames in pre-signed URLs for browser access. Fixes Docker split-horizon DNS. | No |
| `S3_BUCKET_NAME` | Name of the S3 bucket. | Yes |
| `AWS_ACCESS_KEY_ID` | AWS credentials (IAM role preferred in production). | Yes |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials. | Yes |
| `AWS_DEFAULT_REGION` | AWS region. | Yes |

> **Note on `S3_PUBLIC_URL_OVERRIDE`**: In Docker, the backend contacts LocalStack using its internal hostname (e.g. `localstack:4566`), but the browser must use `localhost:4566`. This variable transparently rewrites the hostname in generated pre-signed URLs so both can coexist.

---

## Testing (Test-Driven Development)

This project strictly adheres to Test-Driven Development (TDD) principles. All backend tests use an in-memory SQLite database via `StaticPool`, requiring **no Docker containers** to run.

### Running Backend Tests
```cmd
cd c:\Coding\smart-vault
set PYTHONPATH=backend
python -m pytest backend/tests
```

### Backend Test Coverage

| Suite | What it validates |
|---|---|
| `test_analytics.py` | Spending totals, category breakdowns, date range filtering |
| `test_deletion.py` | Receipt removal workflow and 404 handling |
| `test_storage.py` | S3 multipart upload, MIME type propagation, pre-signed URL retrieval |
| `test_s3_service.py` | S3Service unit tests: ContentType, inline disposition, split-horizon URL mapping |
| `test_security_hardened.py` | CSP/HSTS headers, CORS, XSS payload handling, SQL injection resilience, input validation |

### Running Frontend Tests
The frontend uses Jest and React Testing Library for component testing.
```cmd
cd c:\Coding\smart-vault\frontend
npm run test
```

---

## Key Features

- **Cloud-Native Document Storage**: Receipt files are securely persisted in S3-compatible object storage and never stored on the server filesystem.
- **Vault Drawer**: A slide-over inspection panel on the Analytics Dashboard allowing users to view any previously uploaded receipt with zoom, rotation, and download controls.
- **Secure Ephemeral Access**: Document links are generated as pre-signed S3 URLs that expire after 1 hour, preventing unauthorized access.
- **Privacy-First (Zero-Knowledge) Model**: All PII redaction happens entirely in the browser. No sensitive data like SSNs or Account Numbers ever leaves your machine.
- **Interactive Privacy Editor**: Review AI-suggested redactions or manually mask sensitive areas with a custom-built crosshair drawing tool.
- **Context-Aware PII Detection**: Smart heuristic engine that differentiates between sensitive data (SSNs, DOBs) and benign metadata (transaction dates, IDs) to prevent over-redaction.
- **Smart Upload Interface**: Drag and drop PDF and Image receipts with instant format-preserving sanitation.
- **AI-Powered Parsing**: Extracts relevant receipt metadata using Puter.js AI OCR after privacy protection is applied.
- **Analytics Dashboard**: Visualize spending over time and categorical breakdowns using animated Recharts.

---

## 🔒 Privacy & Security

Smart Vault is designed with a **Zero-Knowledge** architecture for personal data:
- **Local OCR**: Uses Tesseract.js to identify text locally.
- **Format-Preserving Redaction**: Redacts PDFs into sanitized PDFs and Images into sanitized Images before they are transmitted to any backend or AI API.
- **Keyword Gating**: Contextual patterns (like SSNs and DOBs) are only masked if relevant labels are detected, ensuring your receipt remains readable for business purposes while protecting your identity.
- **Client-Side Generation**: Final document assembly is performed via `jsPDF` entirely in the client's memory.
- **Strict Security Headers**: All API responses include CSP, HSTS, X-Frame-Options, and XSS protection headers.
