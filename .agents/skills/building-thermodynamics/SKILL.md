---
name: building-thermodynamics
description: Use this skill when simulating or calculating building heat transfer, thermal mass, solar heat gain, or occupant heat loads.
---

# Building Thermodynamics & Physics Formulas

This skill provides a comprehensive, mathematically sound approach to modeling the transient thermal performance of a building or shelter. Use these formulas instead of naive approximations (like simply summing R-values of parallel components).

## 1. Conduction & U-Values (Heat Loss/Gain through Envelopes)
Heat does not travel through walls and windows in "series" (where R-values sum). It travels through them in **parallel**. Therefore, you must use Area-Weighted U-values.

**Formulas:**
- $U = \frac{1}{R}$ (where $U$ is Thermal Transmittance in $W / (m^2 \cdot K)$, and $R$ is Thermal Resistance in $(m^2 \cdot K) / W$)
- **Total Heat Transfer Rate via Conduction ($Q_{cond}$):**
  $Q_{cond} = \sum (U_i \times A_i) \times (T_{out} - T_{in})$
  where $i$ represents each component (e.g., walls, roof, windows), and $A$ is the surface area.

## 2. Solar Heat Gain (SHGC)
Solar radiation entering through glazing (windows) is a massive contributor to building heat. Do not ignore it.

**Formula:**
- $Q_{solar} = A_{window} \times SHGC \times I_{solar} \times SC$
  - $A_{window}$: Window Area ($m^2$)
  - $SHGC$: Solar Heat Gain Coefficient (0 to 1, indicates fraction of solar energy transmitted).
  - $I_{solar}$: Incident solar irradiance (e.g., Direct Normal Irradiance + Diffuse Radiation in $W/m^2$).
  - $SC$: Shading Coefficient (Assume 1.0 if no external shading exists).

## 3. Internal Heat Gains (ASHRAE Standards)
Occupants and equipment generate heat. In an emergency shelter, occupant body heat is highly relevant.

**Formula:**
- $Q_{internal} = N_{occupants} \times q_{person}$
  - $q_{person}$: Sensible heat gain per person. According to ASHRAE, a seated/resting person emits roughly **100 Watts** of sensible heat.

## 4. Transient Thermal Model (Lumped Capacitance)
To calculate how temperature shifts over time (e.g., hourly), use the Lumped Capacitance method. This relies on the building's Thermal Mass ($C_{th}$).

**Thermal Capacitance ($C_{th}$):**
- $C_{th} = \sum (\rho_i \times V_i \times c_{p,i})$
  - $\rho$: Density of the material ($kg/m^3$)
  - $V$: Volume of the material ($m^3$)
  - $c_p$: Specific heat capacity of the material ($J / (kg \cdot K)$). For approximations: Wood ~1600, Concrete ~1000, Steel ~500, EPS Foam ~1400.

**Euler Integration (Hour-by-Hour Temp Update):**
The rate of change of internal energy equals the net heat transfer:
- $C_{th} \frac{dT_{in}}{dt} = Q_{cond} + Q_{solar} + Q_{internal}$

For a discrete time step $\Delta t$ (e.g., 3600 seconds for 1 hour):
- $\Delta T_{in} = \frac{(Q_{cond} + Q_{solar} + Q_{internal}) \times \Delta t}{C_{th}}$
- $T_{in}(t+1) = T_{in}(t) + \Delta T_{in}$

## Rule of Thumb for Hackathons
If precise dimensions or specific heat capacities ($c_p$) are missing from a database, assume:
- **Surface Area ($A$)**: 30 $m^2$ total (e.g., 5x5m floor plan, 2.5m height = 50m2 walls - windows).
- **Window Area**: 4 $m^2$.
- **$c_p$**: Default to 1000 $J / (kg \cdot K)$ if unknown.
- **SHGC**: 0.7 for single glazing, 0.5 for double glazing.
