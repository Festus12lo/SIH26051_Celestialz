<div align="center">

<img src="./public/images/thermoshelter_logo_transparent.png" alt="ThermoShelter by Celestialz" width="460"/>

### *Physics-Grounded Generative AI Architecture for Extreme Climate & Disaster Relief Shelters*

[![React 19](https://img.shields.io/badge/React-19.0-61dafb?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178c6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-000000?style=for-the-badge&logo=three.js)](https://threejs.org/)
[![NBC 2016](https://img.shields.io/badge/Code-NBC%202016%20Compliant-orange?style=for-the-badge)](https://bis.gov.in/)
[![SIH Submission](https://img.shields.io/badge/Smart%20India%20Hackathon-Submission%20Ready-emerald?style=for-the-badge)](https://sih.gov.in/)

<p align="center">
  <strong>Grounded in thermal physics, bioclimatic principles, and real-time climate telemetry — generating buildable, resilient shelters that keep people safe in Earth's harshest environments.</strong>
</p>

</div>

---

## 📌 1. Problem Statement & Mission

In extreme climate zones (such as sub-zero Himalayan cold in **Leh/Ladakh (-20°C)** or severe desert heatwaves in **Rajasthan (+48°C)**) and post-disaster humanitarian emergencies, conventional temporary shelters fail catastrophically:
- **Thermal Inadequacy**: Uninsulated tin sheets and standard emergency tents cause hypothermia in winter and acute heat exhaustion in summer.
- **Unbuildable Generative AI**: Traditional text-to-image AI tools generate pretty architectural concepts that completely ignore structural gravity loads, wall assembly physics, window solar azimuths, and National Building Codes.
- **Logistical & Cost Surprises**: Remote disaster zones lack access to standard construction supplies, with high-altitude pass closures (e.g., Zojila Pass) dramatically driving up procurement costs.

### 🎯 Our Mission
**ThermoShelter** bridges generative AI with rigorous engineering physics. In under 15 seconds, it synthesizes complete, site-specific bioclimatic shelter blueprints:
1. **Interactive 1:50 vector CAD floorplans** with room zoning and true-solar compass alignment.
2. **48-hour transient thermal Euler ODE simulations** using live meteorological data.
3. **Multi-layer wall & roof assemblies** with Fourier 1D conductive heat drop gradients.
4. **Itemized Bill of Materials (BOM/BOQ)** with regional logistics freight factors and local market rates.
5. **Photorealistic 3D perspectives** and interactive Three.js volumetric CAD inspection.

---

## 🏛️ 2. System Architecture & Engineering Flow

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 THERMOSHELTER PLATFORM                                │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
          ┌────────────────────────────────┴────────────────────────────────┐
          ▼                                                                 ▼
┌───────────────────────────────┐                       ┌───────────────────────────────┐
│     CLIENT APPLICATION        │                       │      FASTAPI BACKEND          │
│   (React 19 + TypeScript)     │                       │    (Python 3.11+ / Uvicorn)   │
├───────────────────────────────┤                       ├───────────────────────────────┤
│ • Responsive Glass UI         │   REST / JSON / SSE   │ • Decision & Reasoning Engine │
│ • 1:50 Vector CAD Sheet       │ ◄───────────────────► │ • Multi-LLM Reasoning Bridge │
│ • Three.js 3D Volumetric Mesh │                       │ • Open-Meteo Climate Adapter  │
│ • Interactive Thermal Graphs  │                       │ • CPWD / DSR Cost Estimator   │
│ • Client-Side PDF Compiler    │                       │ • GeoCode & Altitude Resolver │
└───────────────────────────────┘                       └───────────────────────────────┘
          │                                                                 │
          ▼                                                                 ▼
┌───────────────────────────────┐                       ┌───────────────────────────────┐
│     EXTERNAL CLIENT APIS      │                       │     AI & INTELLIGENCE APIs    │
├───────────────────────────────┤                       ├───────────────────────────────┤
│ • Firebase Auth & Security    │                       │ • Google Gemini 2.5 / 1.5 Pro │
│ • Open-Meteo Live Weather     │                       │ • Groq Llama-3.3-70B Versatile│
│ • OpenStreetMap Geocoding     │                       │ • NVIDIA NIM NIMs             │
└───────────────────────────────┘                       └───────────────────────────────┘
```

---

## ⚡ 3. Key Technological Innovations

### 1. Vector CAD Engine & True-South Solar Alignment
- Generates millimetric CAD floorplans adhering to **NBC 2016 Part 8** standards.
- Dynamically calculates window surface areas and room orientation so that principal living zones face **True South (180° Azimuth)** to capture winter passive solar heat while shading summer noon angles.

### 2. 48-Hour Transient Thermal ODE Simulation
- Solves numerical differential equations for heat flux ($q = -k \nabla T$) taking into account:
  - Outside diurnal temperature fluctuations (via real-time Open-Meteo API).
  - Volumetric thermal mass flywheel storage of walls (Rammed Earth, CSEB, AAC, Aerogel).
  - Occupant sensible heat gains (11.5 W/m²) and equipment loads.
  - Wall conductive resistance ($R$-value) and window solar heat gain coefficients (SHGC).

### 3. Comprehensive Material & Carbon Lifecycle Matrix
- Automatically compares alternative wall and roof assemblies.
- Calculates **embodied carbon reductions (up to 78.5% savings)** versus conventional fired-brick benchmarks.
- Computes thermal lag hours ($\approx 9.2\text{ hrs}$) to guarantee comfortable nighttime indoor temperatures without active electric heating.

### 4. Parametric Costing (BOM & Local Procurement)
- Itemized Bill of Quantities (BOQ) covering structural masonry, modular framing, thermal insulation, and glazing.
- Incorporates regional logistics premiums (e.g., $+65\%$ freight surcharge for high-altitude mountainous passes).
- Provides three flexible build roadmaps: *Contractor Turnkey*, *Vernacular Self-Build*, and *Phase 1 Weatherproof Shell*.

### 5. Plain-Language Universal Design
- Designed so that any non-technical user, emergency relief officer, or community leader can intuitively understand insulation ratings, sunlight alignments, and cost breakdowns in plain English without confusion.

---

## 📂 4. Project Repository Structure

```
ThermoShelter/
├── backend/                  # FastAPI High-Performance Backend
│   ├── scripts/              # Data utilities, product image scrapers, DB scripts
│   ├── tests/                # Automated backend test suites
│   ├── blueprint_llm.py      # Architectural prompt engineering & synthesis
│   ├── decision_engine.py    # Typology & material constraint rules
│   ├── engine.py             # Transient thermal differential equation solver
│   ├── engineering_gates.py  # NBC 2016 building code validation gates
│   ├── geocode_service.py    # Coordinate & altitude lookup
│   ├── image_service.py      # Photorealistic 3D render generation
│   ├── main.py               # FastAPI application entry point & routing
│   ├── materials.json        # Certified material specifications & market rates
│   ├── procurement_engine.py # CPWD / DSR cost estimation engine
│   ├── spec_generator.py     # Structural & thermal specification builder
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Backend environment template
│
├── src/                      # React 19 + TypeScript Frontend
│   ├── api/                  # LLM client & simulation API bridges
│   ├── assets/               # Brand logos and iconography
│   ├── components/           # Reusable architectural & UI components
│   │   ├── BlueprintDashboard.tsx
│   │   ├── FloorPlanViewer.tsx
│   │   ├── BioclimaticDossier.tsx
│   │   ├── WallAssemblyVisualizer.tsx
│   │   ├── MaterialImpactMatrix.tsx
│   │   ├── MaterialImprovementBreakdown.tsx
│   │   ├── MinimalSidebar.tsx
│   │   ├── ModelViewer3D.tsx
│   │   ├── RadiantPromptInput.tsx
│   │   ├── SettingsPanel.tsx
│   │   └── simulation/       # Three.js 3D viewport & telemetry HUD
│   ├── constants/            # Material bundles (Emergency vs. Permanent)
│   ├── data/                 # Architectural facts & fallback datasets
│   ├── pages/                # Route-level modular views
│   │   ├── HubPage.tsx       # Main overview dashboard
│   │   ├── FloorplanPage.tsx # CAD linework & 3D render viewer
│   │   ├── SimulationPage.tsx# Interactive 3D weather stress test
│   │   ├── PhysicsPage.tsx   # Thermal performance & climate analytics
│   │   ├── BomPage.tsx       # Cost breakdown & shopping list
│   │   ├── CataloguePage.tsx # Material catalog & insulation ratings
│   │   ├── AIAssistPage.tsx  # Natural language AI shelter assistant
│   │   ├── PreferencesPage.tsx# Shelter builder & location parameters
│   │   ├── HistoryPage.tsx   # Saved blueprints archive
│   │   ├── LoginPage.tsx     # Firebase secure authentication
│   │   └── LandingPage.tsx   # Product landing showcase
│   ├── App.tsx               # Lean root router & global state provider
│   ├── main.tsx              # React DOM entry point
│   └── index.css             # Glassmorphism & organic design tokens
│
├── public/                   # Public static assets & 3D models
│   ├── models/               # Optimized GLB models (Emergency, Community, Residence)
│   └── images/               # High-resolution architectural perspectives
│
├── docs/                     # Technical specifications & hackathon deliverables
│   └── architecture/         # Prompts & system architecture documentation
│
├── prototypes/               # Experimental sub-apps & 3D component explorations
├── scripts/                  # DevOps, model regeneration & test scripts
├── .env.example              # Frontend environment template
├── .gitignore                # Enterprise-grade git ignore rules
├── package.json              # NPM dependencies & scripts
├── vite.config.ts            # Vite build configuration
└── README.md                 # Complete project documentation
```

---

## 🚀 5. Quickstart & Installation Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.10 or higher
- **Git**

### Step 1: Clone Repository
```bash
git clone https://github.com/your-username/thermoshelter.git
cd thermoshelter
```

### Step 2: Configure Environment Variables

**Frontend (`.env`)**:
```bash
cp .env.example .env
```
*(Optionally set your Firebase credentials or use guest mode directly).*

**Backend (`backend/.env`)**:
```bash
cp backend/.env.example backend/.env
```
*(Add your Google Gemini API key or Groq API key for AI generation).*

---

### Step 3: Start the Backend Service
```bash
cd backend
python -m venv venv

# Windows:
.\venv\Scripts\activate
# Linux / macOS:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
*Backend API docs will be live at `http://127.0.0.1:8000/docs`.*

---

### Step 4: Start the Frontend Application
In a separate terminal:
```bash
npm install
npm run dev
```
*Frontend will be running live at `http://localhost:5173`.*

---

## 📋 6. National Building Code (NBC 2016) Compliance Matrix

| Indian Standard | Scope | Requirement | ThermoShelter Engineering Solution |
| :--- | :--- | :--- | :--- |
| **NBC 2016 Part 8** | Building Services & Bioclimatic Design | Minimum natural ventilation & daylighting | $1:50$ orientation with cross-ventilation window apertures and South-facing solar gain glazing. |
| **IS 3792:1978** | Thermal Insulation of Buildings | Wall $R$-values $\ge 2.2\text{ m}^2\text{K/W}$ for cold zones | 230mm CSEB / Rammed earth with wood wool or PIR insulation achieving $R \ge 2.6 - 3.5$. |
| **IS 875 (Part 3)** | Wind Loads on Buildings | Wind resistance up to $39 - 50\text{ m/s}$ | Aerodynamic roof pitch with reinforced rafter anchoring. |
| **IS 1893 (Part 1)** | Earthquake Resistant Design | Seismic Zone IV/V ductility | Lightweight modular sandwich panels for emergency relief; reinforced masonry bond beams for permanent shelters. |

---

## 👥 7. Team Celestialz & Acknowledgements

Developed with passion by **Team Celestialz** for the **Smart India Hackathon (SIH)**.

- **Frontend & UX Architecture**: React 19, Tailwind CSS, Three.js, Lucide Icons, Framer Motion
- **Backend & Physics Modeling**: FastAPI, Pydantic, NumPy, SciPy
- **Weather Telemetry**: Open-Meteo Global Historical & Forecast API
- **AI Synthesis**: Google Gemini 2.5 / 1.5 Flash, Groq Llama-3.3, NVIDIA NIM

---

<div align="center">
  <sub>ThermoShelter by Celestialz • Built for resilience, humanity, and sustainability.</sub>
</div>
