# Secure Health Payments Gateway
Author: JOHN NZAU
Company/Solution: Secure Health Payments Gateway

> **"Protecting every healthcare payment — from transaction to trust."**

Privacy-first healthcare payment security gateway that sits between patients, healthcare providers (hospitals/clinics), insurers, and financial networks (M-Pesa, card networks). Designed with IBM Security & Data Architecture principles, real-time risk intelligence (IBM watsonx.ai ready), and Kenya Data Protection Act (DPA 2019) compliance.

---

## 1. Overview & Problem Statement

Healthcare payments combine the two assets attackers target most:
1. **Financial capital** (rapid transaction settlement, mobile money, cards)
2. **Sensitive Protected Health Information (PHI)** and patient identity

Small and medium healthcare clinics lack the multi-million-dollar cybersecurity infrastructure needed to guard against fraudulent chargebacks, SIM-swap attacks, unauthorized fee diversions, and data breaches.

**Secure Health Payments Gateway** delivers enterprise-grade security intelligence in a turnkey platform:
- **Zero-Trust Frontline Gateway:** Token-bucket rate limiting, payload inspection for SQLi/XSS, and TLS policies (IBM DataPower / API Connect model).
- **Explainable Anomaly & Risk Engine:** Real-time scoring (0–100) evaluating amount deviations, device signatures, failed credential velocity, and time-of-day telemetry (IBM watsonx.ai integration).
- **Data Minimization & Tokenization:** Full PII redaction and zero raw PAN/PIN storage (IBM Guardium model).
- **Tamper-Evident Chained Audit Ledger:** Every login, payment attempt, risk score, and consent change is cryptographically linked with SHA-256 parent hashes.

---

## 2. IBM Integration Architecture

```
Patient / Client Browser / Mobile
                │
                ▼
   IBM API Connect / DataPower Gateway
   (Rate Limiting 60 req/min, SQLi & XSS WAF, Bearer Auth)
                │
                ▼
     Express Security API Proxy
                │
   ┌────────────┴─────────────┬──────────────────────────┐
   ▼                          ▼                          ▼
Payment Service          Risk Engine               IBM Guardium
(M-Pesa Daraja/Card)   (watsonx.ai Granite)      (Data Minimization &
                         Transparent Rules        Chained SHA-256 Logs)
   │                          │                          │
   └────────────┬─────────────┴──────────────────────────┘
                ▼
      Multi-Tenant Database
      (Tenant-Isolated Tables: AFYA-01, MEDI-02, MAKU-03)
```

### Connected vs. Simulated Adapters
- **IBM API Connect / DataPower:** Implemented via runtime threat-protection middleware (`/src/server/services/ibmApiConnect.ts`) inspecting requests for SQLi, XSS, rate-limit buckets, and routing to live `API_CONNECT_URL` if configured.
- **IBM watsonx.ai:** Modular service (`/src/server/services/riskEngine.ts`). When `IBM_API_KEY` and `IBM_PROJECT_ID` are set, queries IBM Cloud Granite foundation models; in local sandbox, uses a deterministic explainable rules engine with identical risk telemetry weights.
- **IBM Guardium:** Data sanitization filters and cryptographic SHA-256 chained audit logs (`/src/server/services/ibmGuardium.ts`) with live audit chain verification in the SOC dashboard.

---

## 3. Demo Accounts & Credentials

Safe demo credentials configured for hackathon demonstration:

| Role | Email | Password | Primary Context |
|---|---|---|---|
| **Patient** | `demo.patient@example.com` | `DemoSecurePassword2026!` | Faith Wanjiku Kimani (`PAT-8492-4821`) |
| **Healthcare Provider** | `demo.provider@example.com` | `DemoSecurePassword2026!` | Dr. Kevin Ochieng (AfyaCare Clinic) |
| **Security Admin / CISO** | `demo.admin@example.com` | `DemoSecurePassword2026!` | Amina Noor (System CISO) |

*A one-click role switcher is provided in the top navigation bar for rapid testing during judging.*

---

## 4. 3-Minute Hackathon Demo Flow

1. **Step 1 (Patient):** Open app as Patient (Faith Kimani).
2. **Step 2 (Checkout):** Select **AfyaCare Clinic**, choose **General Consultation** (KES 1,500), select **M-Pesa**, and click **Pay KES 1,500**.
3. **Step 3 (Receipt):** Verify immediate approval, transaction ID `TXN-2026-XXXXXX`, and Low Risk score (12/100).
4. **Step 4 (Provider):** Switch role to **Healthcare Provider** (AfyaCare Clinic). Observe the new transaction in the revenue ledger and telemetry metrics.
5. **Step 5 (Attack Simulation):** Click **"Simulate Suspicious Transaction"** in the top navigation.
6. **Step 6 (High Risk Detection):** System initiates a high-value anomaly (KES 75,000, new device, 4 failed attempts). Risk score spikes to **87/100 (HIGH RISK)** and status is **QUARANTINED**.
7. **Step 7 (CISO Investigation):** Switch to **Security Admin / SOC**. Inspect the incident reasons, verify the tamper-evident IBM Guardium SHA-256 audit chain, and review active DataPower WAF policies.
8. **Step 8 (Privacy):** Return to Patient tab and inspect the Kenya DPA 2019 Privacy Center & consent directives.

---

## 5. Technology Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide Icons, Recharts
- **Backend:** Node.js, Express, tsx
- **Security:** JWT authentication, bcryptjs password hashing, crypto SHA-256 hash chaining, token-bucket rate limiting
- **AI / Risk:** IBM watsonx.ai Granite REST adapter + deterministic fallback feature engine
- **Standards:** Kenya Data Protection Act 2019, OWASP ASVS v4.0 Level 2, ISO 27701

---

## 6. Environment Variables

See `.env.example`:
```bash
# Database
DATABASE_URL="postgres://postgres:password@localhost:5432/health_pay_gateway"

# Security & Secrets
JWT_SECRET="demo-secret-key-change-in-production-min32chars"
DEMO_PASSWORD="DemoSecurePassword2026!"

# IBM watsonx.ai Integration (Intelligent transaction risk scoring)
# Provide your IBM Cloud API Key as an environment variable or secret.
# NEVER commit or hard-code the actual API key.
IBM_CLOUD_API_KEY=""
WATSONX_PROJECT_ID="d37637eb-bcc7-47f6-afa3-dc94e9febae0"
WATSONX_URL="https://eu-de.ml.cloud.ibm.com"
# Backward-compatibility aliases:
IBM_API_KEY=""
IBM_PROJECT_ID="d37637eb-bcc7-47f6-afa3-dc94e9febae0"
IBM_API_URL="https://eu-de.ml.cloud.ibm.com"

# IBM API Connect / DataPower
API_CONNECT_URL="https://api-gateway.ibmcloud.com/v1"

# IBM Guardium
GUARDIUM_URL="https://guardium-collector.ibmcloud.com/api/v1"
```

---

## 7. Running Locally & Testing

```bash
# Install dependencies
npm install

# Run the automated watsonx risk engine test suite (26 assertions)
npm test

# Run linting check
npm run lint

# Start development full-stack server (runs on port 3000)
npm run dev

# Build production bundle
npm run build
```

---

## 8. IBM watsonx.ai Architecture & Security Guarantees

1. **Server-Side Only Authentication:** All IBM IAM token requests (`https://iam.cloud.ibm.com/identity/token`) and watsonx REST generation requests (`https://eu-de.ml.cloud.ibm.com/ml/v1/text/generation`) execute purely server-side. The IBM Cloud API Key is never sent to the browser, stored in client storage, or logged.
2. **Safe Bearer Token Caching:** IAM access tokens are cached in memory on the server and automatically refreshed 5 minutes prior to expiration.
3. **Data Minimization (Kenya DPA 2019):** Before any telemetry reaches watsonx.ai, patient names, raw phone numbers, and payment credentials (PAN/CVV) are stripped or replaced with tokenized pseudonyms (`PAT-XXXX-XXXX`).
4. **Deterministic Precedence:** Deterministic security rules retain absolute authority: high-risk transactions cannot be downgraded or cleared by the AI model. If the AI service is unavailable, payments continue safely using deterministic fraud rules.
