# Bytesalt — Autonomous AI QA Testing Platform (Web-Only MVP)

Bytesalt reduces weeks of manual QA testing to minutes by autonomously discovering interactive DOM elements, using AI to design positive/edge-case/multi-page integration test suites, and executing them in parallel across isolated Playwright browser contexts while intercepting all network (`XHR`/`fetch`) payloads and JS console errors.

---

## ⚡ Quick Start

### 1. Backend Setup

```bash
cd bytesalt-mvp/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install Playwright browser binaries
playwright install chromium

# (Optional) Add your OpenAI API key for gpt-4o test generation
# If omitted, Bytesalt automatically uses its built-in rule-based generator
cp .env.example .env
# Edit .env and set OPENAI_API_KEY=sk-...

# Launch FastAPI Backend + Built-in Realistic Buggy Demo Target App
python main.py
```
*Backend will start at: `http://localhost:8000`*
*Interactive Swagger Docs at: `http://localhost:8000/docs`*
*Built-in Realistic Target App at: `http://localhost:8000/demo-app`*

---

### 2. Frontend Setup

In a new terminal window:

```bash
cd bytesalt-mvp/frontend

# Install dependencies
npm install

# Start Vite React Dashboard
npm run dev
```
*Frontend will start at: `http://localhost:5173`*

---

## 🧪 Testing Workflows

### Testing the Built-in Realistic Target App
1. Open `http://localhost:5173` in your browser.
2. Click **"Load Demo Target App"** (sets target to `http://localhost:8000/demo-app`).
3. Leave **"Show Live Parallel Browsers"** checked to watch 4 Chromium browsers launch in parallel!
4. Click **"1. Scan & Generate Plan"**:
   - Playwright scans the live DOM and tags elements (`el_1`, `el_2`, etc.).
   - AI generates 4 rigorous tests (Positive, Negative SQLi Edge, Empty Validation, Link Check).
5. Click **"2. Execute Parallel Tests 🚀"** (or use **"⚡ One-Click Full Auto-Run"**).
6. Inspect the results:
   - **Bug Caught (500 Error):** Catching the unhandled SQL syntax exception in `POST /demo-api/users`.
   - **Bug Caught (400 Bad Request):** Detecting invalid work email domain payload.
   - **Network Inspector:** View exact JSON request and response bodies.
   - **Screenshot Proof:** Click on the screenshot preview to zoom in on the final UI state.

### Testing the Vivahika Web Application
1. In the target URL input, enter your Vivahika web application URL (or click **"Vivahika Target App"** preset).
2. If your app requires authentication, paste your JWT or session token in the **Auth Token** field.
3. Switch strategy mode:
   - **⚡ Single Page QA:** Tests registration, search filters, login, and validation resilience.
   - **🔗 Chained Flow:** Tests end-to-end multi-step flows (Profile creation -> Search -> View Details -> Edit).
4. Run tests and review the full QA report with network payloads and visual screenshots.

---

## 📂 Architecture

```text
bytesalt-mvp/
├── backend/
│   ├── requirements.txt
│   ├── .env.example
│   ├── models.py              # Pydantic v2 schemas for Scan, TestCase, NetworkLog, ExecutionResult
│   ├── scanner.py             # Playwright Smart DOM Extractor & deterministic selector generator
│   ├── ai_generator.py        # OpenAI Structured JSON test case generator (Single & Integration modes)
│   ├── executor.py            # Parallel BrowserContext runner, Network Tab spy, & Screenshot capture
│   ├── demo_target.py         # Built-in realistic buggy Web App (List -> Details -> Edit + 500 API Bug)
│   └── main.py                # FastAPI app, CORS, and endpoints (/api/scan-and-plan, /api/execute, /demo-app)
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── index.css
        └── App.jsx            # Dark-Mode SaaS QA Dashboard
```
