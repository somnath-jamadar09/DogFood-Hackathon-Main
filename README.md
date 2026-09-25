# Dogfood 2026 — Self-Hosted Air-Gapped Hackathon Platform

> Built for **Hackathon Raptors 2026** by Somnath, Falguni, and Om Apar.  
> An offline-first, single-command hackathon submission, judging, and community platform featuring statistical score normalization and route-level authorization isolation.

---

## ⚡ Quickstart Deployment

Run a single command from the project root:

```bash
docker compose up --build
```

### Access URLs & Ports
- **Frontend Web Portal:** [http://localhost:3000](http://localhost:3000)
- **Backend REST API:** [http://localhost:5000/api/v1](http://localhost:5000/api/v1)
- **Judging Analytics Service:** `http://localhost:8000` *(Internal container network)*
- **MongoDB Database:** `mongodb://localhost:27017/dogfood`

---

## 🔑 Pre-Seeded Default Accounts

All default accounts use the password: `Raptor2026!`

| Role | Email | Permissions / Focus |
|---|---|---|
| **Organizer** | `organizer@raptors.local` | Full platform admin, judge assignment, score normalization, CSV export |
| **Judge (AI/ML)** | `judge.ai@raptors.local` | Scoring AI/ML track submissions with weighted rubric |
| **Judge (Web3)** | `judge.web3@raptors.local` | Scoring Web3 & Blockchain track submissions |
| **Participant** | `hacker@raptors.local` | Team captain of "CyberDinos", project submitter |

---

## 🏗️ Repository Architecture

```text
dogfood-2026/
├── docker-compose.yml          # Unified multi-container orchestration
├── .env.example                # Local environment template
├── .dogfood.toml               # Hackathon test harness specification
├── README.md                   # Quickstart and operations guide
├── acceptance-report.txt       # Qualification test execution report
│
├── frontend/                   # React 18 SPA (Vite + Tailwind CSS)
│   ├── public/                 # Static assets and vendored offline fonts
│   ├── src/
│   │   ├── components/         # Navbar, ProjectCard, RubricSlider, LeaderboardTable, etc.
│   │   ├── context/            # AuthContext, NotificationContext
│   │   ├── hooks/              # Custom React hooks (useAuth, useSubmissions, etc.)
│   │   ├── pages/              # Gallery, SubmissionEditor, JudgePortal, AdminDashboard, etc.
│   │   ├── services/           # Axios HTTP client configuration
│   │   └── App.jsx             # React Router v6 navigation
│   └── Dockerfile              # Multi-stage Nginx build
│
├── backend/                    # Node.js 20 & Express 4 REST Core
│   ├── src/
│   │   ├── config/             # DB, JWT, Multer configuration
│   │   ├── controllers/        # Auth, Team, Submission, Judging, Admin, Vote
│   │   ├── middleware/         # JWT auth, roleGuard, isolationGuard, rateLimiter
│   │   ├── models/             # Mongoose schemas (User, Team, Submission, Score, etc.)
│   │   ├── routes/             # Express route declarations
│   │   └── services/           # Assignment solver, FastAPI client, CSV exporter
│   └── Dockerfile              # Node.js 20 Alpine container
│
├── judging-service/            # Python 3.11 & FastAPI Analytics Microservice
│   ├── app/
│   │   ├── algorithms/         # Z-Score normalization, Bayesian shrinkage, Bradley-Terry
│   │   ├── models/             # Pydantic request/response schemas
│   │   └── routes/             # /normalize, /pairwise-rank, /health
│   └── Dockerfile              # Python 3.11 Slim container
│
├── seed/                       # Fixture data
│   └── init-mongo.js           # Automated MongoDB seed script
│
└── documentation/              # Complete PRD, SRS, SDD, Architecture & UI/UX specs
```

---

## 🧪 Testing & Verification

```bash
# Run backend tests
cd backend && npm test

# Run judging service algorithms tests
cd judging-service && pytest

# Verify offline egress isolation
docker exec dogfood-api sh -c "nc -zv -w 2 8.8.8.8 53 || echo 'Egress Successfully Blocked'"
```
