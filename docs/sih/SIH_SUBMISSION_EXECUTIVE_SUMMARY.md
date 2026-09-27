<div align="center">
  <img src="../../public/images/thermoshelter_header_logo.png" alt="ThermoShelter by Celestialz" width="500"/>
  <br/>
  <h1>Smart India Hackathon (SIH 2026) — Executive Submission Dossier</h1>
  <p><strong>Problem Statement ID:</strong> SIH26051 &nbsp;|&nbsp; <strong>Team:</strong> Celestialz</p>
  <p><strong>Project:</strong> ThermoShelter — Physics-Grounded Generative AI Architecture for Extreme Climate & Disaster Relief Shelters</p>
</div>

---

## 1. Executive Summary

Extreme weather disasters and high-altitude geographical conditions displace hundreds of thousands of people across India every year. Conventional emergency shelters rely on uninsulated tin sheeting, nylon tents, and generic prefabricated sheds that fail catastrophically:
- In sub-zero Himalayan winters (**Leh/Ladakh, -20°C**), internal hypothermia is rampant.
- In severe dry desert conditions (**Rajasthan, +48°C**), internal temperatures trigger heatstroke and dehydration.
- In post-disaster flood and earthquake zones, supply chains are severed, and unbuildable designs waste precious golden-hour resources.

**ThermoShelter by Celestialz** is an end-to-end generative AI and thermo-physics architectural copilot that automates the generation of site-adapted, climate-resilient, buildable shelters in seconds.

Unlike generic text-to-image models that generate unbuildable concepts, ThermoShelter:
1. Validates all designs against the **National Building Code of India (NBC 2016)** and **IS 3792 (Thermal Comfort)**.
2. Solves transient thermal thermodynamics using a 48-hour **Euler ODE heat transfer equation** linked to real-time **Open-Meteo climate telemetry**.
3. Calculates multi-layer conductive wall assemblies using **Fourier's 1D Heat Conduction law**.
4. Generates interactive **1:50 vector CAD blueprints**, itemized **Bill of Materials (BOM/BOQ)** with regional logistics freight factors, and interactive **Three.js 3D volumetric models**.

---

## 2. Key Innovation & Value Proposition

| Dimension | Conventional Emergency Shelter | Generic Generative AI (Midjourney/DALL-E) | **ThermoShelter by Celestialz** |
|:---|:---|:---|:---|
| **Thermal Comfort** | Hypothermia / Heatstroke risk | Completely ignored | **Predictive 48h thermal ODE (+18°C lift in extreme cold)** |
| **Buildability** | Manual civil engineering delays | Purely fictional pixels | **1:50 Vector CAD with dimensions & zoning** |
| **Material Supply** | Generic, single-material reliance | No BOM or quantities | **Location-aware Bill of Materials with local vendor links** |
| **NBC Compliance** | Verified post-design (slow) | Non-compliant | **Built-in engineering gates & Indian standard validations** |
| **Deployment Time** | 2–6 weeks of engineering planning | Minutes (unbuildable) | **< 15 seconds (fully engineered & ready to erect)** |

---

## 3. Core Technical Modules

### A. Physics-Grounded Reasoning Engine
- **Transient Heat Transfer ODE**:
  $$\frac{dT_{in}}{dt} = \frac{1}{C_{thermal}} \left[ \sum U_i A_i (T_{out}(t) - T_{in}) + Q_{solar}(t) + Q_{internal} \right]$$
  Tracks internal thermal inertia over 48 hours to prevent freezing without excessive active heating.
- **Fourier Wall Assembly Conduction**:
  $$q = \frac{T_{in} - T_{out}}{\sum \frac{d_j}{k_j}}$$
  Calculates thermal gradient across each envelope layer (rammed earth, sheep wool insulation, cedar cladding, air gaps).

### B. Interactive Vector Floorplan Engine
- Generates 1:50 architectural sheets with SVG rendering.
- Includes dynamic room zoning (living, sleeping, thermal airlock vestibule, washroom), true solar compass rose, and structural wall thicknesses.
- Provides interactive room toggling, pan/zoom canvas, and 1-click professional PDF blueprint export.

### C. Logistics-Aware Bill of Materials (BOM/BOQ)
- Automatically computes material quantities, units, and regional CPWD / local market rates.
- Integrates extreme-terrain freight multipliers (e.g., Zojila Pass mountain transit factor: 1.45x) to eliminate budget shock during humanitarian crises.

### D. Multi-Provider AI Architecture
- **Multi-LLM Fallback Orchestration**: Google Gemini 2.5 Flash, Groq LLaMA 3.3 70B, NVIDIA NIM, and deterministic local rules.
- **Deterministic Offline Mode**: If internet access is completely lost in disaster zones, the embedded rule-based bioclimatic synthesizer operates 100% offline.

---

## 4. NBC 2016 & IS Code Compliance Matrix

| Indian Standard | Requirement | ThermoShelter Implementation | Status |
|:---|:---|:---|:---:|
| **NBC 2016 Part 8 (Sec 1)** | Minimum Habitable Room Area $\ge 9.5 \text{ m}^2$ | Automated geometry generator enforces $\ge 12.0 \text{ m}^2$ | **COMPLIANT** |
| **NBC 2016 Part 8 (Sec 1)** | Minimum Ceiling Height $\ge 2.75 \text{ m}$ | Floor-to-ceiling elevation fixed at $2.80 \text{ m} - 3.20 \text{ m}$ | **COMPLIANT** |
| **IS 3792 / NBC Part 8** | Thermal Transmittance $U_{wall} \le 0.44 \text{ W/m}^2\text{K}$ | Insulated rammed earth / composite assemblies yield $0.22 - 0.38 \text{ W/m}^2\text{K}$ | **COMPLIANT** |
| **NBC 2016 Part 4** | Fire Safety & Non-toxic Sheeting | Mineral wool & fire-retardant structural framing prioritization | **COMPLIANT** |
| **NBC 2016 Part 6** | Seismic Zone IV & V Lateral Stability | Shear wall distribution & symmetrical envelope configurations | **COMPLIANT** |

---

## 5. Deployment & Quickstart

```bash
# 1. Clone repository
git clone https://github.com/Festus12lo/SIH26051_Celestialz.git
cd SIH26051_Celestialz

# 2. Setup backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000

# 3. Setup frontend
npm install
npm run dev
```

---

## 6. Team Celestialz
- Developed for **Smart India Hackathon 2026**
- Problem Statement: **SIH26051**
- Open Source under MIT License.
