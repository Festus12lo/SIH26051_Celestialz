"""
ThermoShelter — Design Report & Comparison Module
Produces structured output for the final shelter design recommendation,
including design alternatives, comparison tables, time-series data,
heat-flow analysis, solar analysis, and evidence-based explanations.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional


@dataclass
class ThermalTimeSeries:
    """Hourly temperature and energy data for visualization."""
    hours: List[int]
    outdoor_temp_C: List[float]
    indoor_temp_C: List[float]
    solar_gain_W: List[float]
    wall_heat_flow_W: List[float]
    roof_heat_flow_W: List[float]
    floor_heat_flow_W: List[float]
    ventilation_heat_flow_W: List[float]

    @classmethod
    def from_hourly_results(cls, hourly: List[Dict[str, Any]]) -> "ThermalTimeSeries":
        """Extract time-series arrays from raw hourly simulation records."""
        if not hourly:
            return cls([], [], [], [], [], [], [], [])
        return cls(
            hours=list(range(len(hourly))),
            outdoor_temp_C=[r.get("outdoor_temperature_C", 0.0) for r in hourly],
            indoor_temp_C=[r.get("indoor_temperature_C", 0.0) for r in hourly],
            solar_gain_W=[r.get("solar_gain_W", 0.0) for r in hourly],
            wall_heat_flow_W=[r.get("wall_heat_flow_W", 0.0) for r in hourly],
            roof_heat_flow_W=[r.get("roof_heat_flow_W", 0.0) for r in hourly],
            floor_heat_flow_W=[r.get("floor_heat_flow_W", 0.0) for r in hourly],
            ventilation_heat_flow_W=[r.get("ventilation_heat_flow_W", 0.0) for r in hourly],
        )


    def to_dict(self) -> Dict[str, Any]:
        return {
            "hours": self.hours,
            "outdoor_temp_C": self.outdoor_temp_C,
            "indoor_temp_C": self.indoor_temp_C,
            "solar_gain_W": self.solar_gain_W,
            "wall_heat_flow_W": self.wall_heat_flow_W,
            "roof_heat_flow_W": self.roof_heat_flow_W,
            "floor_heat_flow_W": self.floor_heat_flow_W,
            "ventilation_heat_flow_W": self.ventilation_heat_flow_W,
        }


@dataclass
class HeatFlowAnalysis:
    """Component-level heat loss/gain breakdown from physics simulation."""
    wall_loss_kWh: float
    roof_loss_kWh: float
    floor_loss_kWh: float
    ventilation_loss_kWh: float
    total_conductive_loss_kWh: float
    total_solar_gain_kWh: float
    dominant_loss_component: str      # "walls", "roof", "floor", "ventilation"
    interpretation: str               # Human-readable sentence

    def to_dict(self) -> Dict[str, Any]:
        return {
            "wall_loss_kWh": self.wall_loss_kWh,
            "roof_loss_kWh": self.roof_loss_kWh,
            "floor_loss_kWh": self.floor_loss_kWh,
            "ventilation_loss_kWh": self.ventilation_loss_kWh,
            "total_conductive_loss_kWh": self.total_conductive_loss_kWh,
            "total_solar_gain_kWh": self.total_solar_gain_kWh,
            "dominant_loss_component": self.dominant_loss_component,
            "interpretation": self.interpretation,
        }

    @classmethod
    def from_hourly_results(cls, hourly: List[Dict[str, Any]], total_solar_kWh: float) -> "HeatFlowAnalysis":
        """Compute heat-flow analysis from raw hourly simulation data."""
        if not hourly:
            return cls(0, 0, 0, 0, 0, 0, "unknown", "No simulation data available.")

        wall_kWh = sum(abs(r.get("wall_heat_flow_W", 0.0)) for r in hourly) / 1000.0
        roof_kWh = sum(abs(r.get("roof_heat_flow_W", 0.0)) for r in hourly) / 1000.0
        floor_kWh = sum(abs(r.get("floor_heat_flow_W", 0.0)) for r in hourly) / 1000.0
        vent_kWh = sum(abs(r.get("ventilation_heat_flow_W", 0.0)) for r in hourly) / 1000.0
        total_cond = wall_kWh + roof_kWh + floor_kWh

        components = {"walls": wall_kWh, "roof": roof_kWh, "floor": floor_kWh, "ventilation": vent_kWh}
        dominant = max(components, key=components.get)
        pct = (components[dominant] / (total_cond + vent_kWh) * 100) if (total_cond + vent_kWh) > 0 else 0

        interpretation = (
            f"The {dominant} contribute the largest share of heat loss "
            f"({components[dominant]:.1f} kWh, {pct:.0f}% of total). "
            f"Total conductive envelope loss: {total_cond:.1f} kWh. "
            f"Total solar gain captured: {total_solar_kWh:.1f} kWh."
        )

        return cls(
            wall_loss_kWh=round(wall_kWh, 2),
            roof_loss_kWh=round(roof_kWh, 2),
            floor_loss_kWh=round(floor_kWh, 2),
            ventilation_loss_kWh=round(vent_kWh, 2),
            total_conductive_loss_kWh=round(total_cond, 2),
            total_solar_gain_kWh=round(total_solar_kWh, 2),
            dominant_loss_component=dominant,
            interpretation=interpretation
        )


@dataclass
class SolarAnalysis:
    """Solar gain analysis from physics simulation."""
    total_solar_gain_kWh: float
    orientation_deg: float
    orientation_label: str             # "South", "East", etc.
    south_window_area_m2: float
    total_window_area_m2: float
    interpretation: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_solar_gain_kWh": self.total_solar_gain_kWh,
            "orientation_deg": self.orientation_deg,
            "orientation_label": self.orientation_label,
            "south_window_area_m2": self.south_window_area_m2,
            "total_window_area_m2": self.total_window_area_m2,
            "interpretation": self.interpretation,
        }

    @classmethod
    def from_design_and_performance(cls, design, performance) -> "SolarAnalysis":
        """Build solar analysis from design and simulation results."""
        azimuth = design.orientation_azimuth_deg
        labels = {0.0: "North", 90.0: "East", 180.0: "South", 270.0: "West",
                  135.0: "South-East", 225.0: "South-West"}
        label = labels.get(azimuth, f"{azimuth} deg")

        solar = performance.total_solar_gain_kWh.value
        south_win = design.south_window_area_m2
        total_win = design.total_opening_area_m2

        interp = (
            f"{label} orientation (azimuth {azimuth} deg) captures {solar:.1f} kWh of solar energy. "
            f"South-facing windows: {south_win:.1f} m2. "
            f"Total fenestration area: {total_win:.1f} m2."
        )

        return cls(
            total_solar_gain_kWh=round(solar, 2),
            orientation_deg=azimuth,
            orientation_label=label,
            south_window_area_m2=round(south_win, 2),
            total_window_area_m2=round(total_win, 2),
            interpretation=interp
        )


@dataclass
class DesignAlternative:
    """One design alternative with its full evaluation results."""
    rank: int
    label: str                         # e.g. "[Recommended]", "Alternative 1"
    design_id: str
    geometry_summary: str
    orientation_deg: float
    wall_material: str
    roof_material: str
    avg_indoor_temp_C: float
    min_indoor_temp_C: float
    max_indoor_temp_C: float
    solar_gain_kWh: float
    heat_loss_kWh: float
    score: float
    verdict: str                       # "OPTIMAL", "ACCEPTABLE", etc.
    is_compliant: bool
    explanation: str                    # Why this design ranks where it does
    archetype_id: str = "OPTIMAL_PASSIVE"
    # Full objects for detailed access
    design: Any = None
    performance: Any = None
    validation: Any = None
    time_series: Optional[ThermalTimeSeries] = None
    heat_flow: Optional[HeatFlowAnalysis] = None
    solar_analysis: Optional[SolarAnalysis] = None
    comfort_report: Optional[Any] = None
    multi_objective: Optional[Any] = None

    def to_dict(self) -> Dict[str, Any]:
        data = {
            "rank": self.rank,
            "label": self.label,
            "archetype_id": self.archetype_id,
            "design_id": self.design_id,
            "geometry_summary": self.geometry_summary,
            "orientation_deg": self.orientation_deg,
            "wall_material": self.wall_material,
            "roof_material": self.roof_material,
            "avg_indoor_temp_C": self.avg_indoor_temp_C,
            "min_indoor_temp_C": self.min_indoor_temp_C,
            "max_indoor_temp_C": self.max_indoor_temp_C,
            "solar_gain_kWh": self.solar_gain_kWh,
            "heat_loss_kWh": self.heat_loss_kWh,
            "score": self.score,
            "verdict": self.verdict,
            "is_compliant": self.is_compliant,
            "explanation": self.explanation,
            "time_series": self.time_series.to_dict() if self.time_series else None,
            "heat_flow": self.heat_flow.to_dict() if self.heat_flow else None,
            "solar_analysis": self.solar_analysis.to_dict() if self.solar_analysis else None,
            "comfort": self.comfort_report.to_dict() if self.comfort_report and hasattr(self.comfort_report, "to_dict") else None,
            "multi_objective": self.multi_objective.to_dict() if self.multi_objective and hasattr(self.multi_objective, "to_dict") else None,
            "design_state": self.design.to_dict() if self.design and hasattr(self.design, "to_dict") else None,
            "validation": self.validation.to_dict() if self.validation and hasattr(self.validation, "to_dict") else None,
        }

        # Enrich with Blueprint, FloorPlan, Material Intelligence, and Grounded Explanation
        if self.design:
            try:
                from .blueprint import BlueprintExporter
                data["blueprint"] = BlueprintExporter.export_blueprint(self.design, self.performance, self.validation) if self.performance and self.validation else None
                data["floor_plan"] = BlueprintExporter.export_floor_plan(self.design)
            except Exception:
                pass

            try:
                from ..procurement.material_service import MaterialIntelligenceService
                mat_service = MaterialIntelligenceService()
                mat_data = mat_service.get_design_materials_breakdown(self.design)
                data["materials"] = mat_data
            except Exception:
                mat_data = None

            try:
                from ..llm.explanation_engine import LLMExplanationEngine
                llm_engine = LLMExplanationEngine()
                cost_dict = mat_data.get("cost_estimation") if mat_data else None
                if self.performance and self.validation and self.comfort_report and self.multi_objective:
                    exp = llm_engine.generate_explanation(
                        design=self.design,
                        performance=self.performance,
                        validation=self.validation,
                        comfort=self.comfort_report,
                        mcda=self.multi_objective,
                        estimated_cost=cost_dict
                    )
                    data["llm_explanation"] = exp.to_dict()
            except Exception:
                pass

        return data


@dataclass
class DesignComparisonTable:
    """Side-by-side comparison of design alternatives."""
    alternatives: List[DesignAlternative]

    def to_table(self) -> List[Dict[str, Any]]:
        """Generate comparison table as list of dicts."""
        rows = []
        for alt in self.alternatives:
            comfort_pct = alt.comfort_report.comfort_hours_percent if alt.comfort_report else 0.0
            tbi = alt.comfort_report.thermal_buffer_index if alt.comfort_report else 0.0
            rows.append({
                "Design": alt.label,
                "Archetype": alt.archetype_id,
                "Geometry": alt.geometry_summary,
                "Orientation": f"{alt.orientation_deg} deg",
                "Wall": alt.wall_material,
                "Roof": alt.roof_material,
                "Avg Indoor (C)": alt.avg_indoor_temp_C,
                "Comfort Hours (%)": f"{comfort_pct:.0f}%",
                "Thermal Buffer Index": f"{tbi:.2f}",
                "Solar Gain kWh": alt.solar_gain_kWh,
                "Heat Loss kWh": alt.heat_loss_kWh,
                "Score": alt.score,
                "Compliance": "PASS" if alt.is_compliant else "FAIL",
                "Verdict": alt.verdict,
            })
        return rows


@dataclass
class ShelterDesignReport:
    """
    Complete end-to-end shelter design report.
    This is the final output the user sees.
    """
    # User request context
    location: str
    occupants: int
    purpose: str
    thermal_objective: str

    # Recommended design
    recommended: DesignAlternative

    # All alternatives (including recommended at index 0)
    alternatives: List[DesignAlternative]
    comparison_table: DesignComparisonTable

    # Material comparison for recommended design
    material_comparison: Any = None     # MaterialComparisonResult

    # Blueprint data
    blueprint: Optional[Dict[str, Any]] = None
    floor_plan: Optional[Dict[str, Any]] = None

    # Pipeline metadata
    total_candidates_generated: int = 0
    candidates_after_screening: int = 0
    candidates_after_physics: int = 0
    recommendation_explanation: str = ""

    def to_dict(self) -> Dict[str, Any]:
        """Convert full report to JSON-serializable dictionary."""
        return {
            "location": self.location,
            "occupants": self.occupants,
            "purpose": self.purpose,
            "thermal_objective": self.thermal_objective,
            "recommended": self.recommended.to_dict(),
            "alternatives": [alt.to_dict() for alt in self.alternatives],
            "comparison_table": self.comparison_table.to_table(),
            "material_comparison": self.material_comparison.to_dict() if self.material_comparison and hasattr(self.material_comparison, "to_dict") else (self.material_comparison.to_comparison_table() if self.material_comparison else None),
            "blueprint": self.blueprint,
            "floor_plan": self.floor_plan,
            "total_candidates_generated": self.total_candidates_generated,
            "candidates_after_screening": self.candidates_after_screening,
            "candidates_after_physics": self.candidates_after_physics,
            "recommendation_explanation": self.recommendation_explanation,
            "summary_text": self.format_summary(),
        }

    def format_summary(self) -> str:
        """Generate human-readable text summary of the recommendation."""
        rec = self.recommended
        lines = [
            "=" * 60,
            "    RECOMMENDED PASSIVE SHELTER DESIGN",
            "=" * 60,
            "",
            f"  Location:           {self.location}",
            f"  Occupants:          {self.occupants}",
            f"  Purpose:            {self.purpose}",
            f"  Thermal Objective:  {self.thermal_objective}",
            "",
            "  -- ARCHITECTURAL DESIGN --",
            f"  {rec.geometry_summary}",
            f"  Orientation:        {rec.orientation_deg} deg ({rec.solar_analysis.orientation_label if rec.solar_analysis else ''})",
            f"  Wall System:        {rec.wall_material}",
            f"  Roof System:        {rec.roof_material}",
            "",
            "  -- THERMAL PERFORMANCE --",
            f"  Average Indoor:     {rec.avg_indoor_temp_C:.1f} C",
            f"  Minimum Indoor:     {rec.min_indoor_temp_C:.1f} C",
            f"  Maximum Indoor:     {rec.max_indoor_temp_C:.1f} C",
            f"  Solar Gain:         {rec.solar_gain_kWh:.1f} kWh",
            f"  Conductive Loss:    {rec.heat_loss_kWh:.1f} kWh",
            "",
            "  -- ENGINEERING STATUS --",
            f"  Compliance:         {'Compliant' if rec.is_compliant else 'Non-compliant'}",
            f"  Design Score:       {rec.score:.1f} / 100",
            f"  Verdict:            {rec.verdict}",
            "",
            "  -- WHY THIS DESIGN? --",
            f"  {rec.explanation}",
            "",
        ]

        if rec.heat_flow:
            lines += [
                "  -- HEAT FLOW ANALYSIS --",
                f"  {rec.heat_flow.interpretation}",
                f"    Walls:        {rec.heat_flow.wall_loss_kWh:.1f} kWh",
                f"    Roof:         {rec.heat_flow.roof_loss_kWh:.1f} kWh",
                f"    Floor:        {rec.heat_flow.floor_loss_kWh:.1f} kWh",
                f"    Ventilation:  {rec.heat_flow.ventilation_loss_kWh:.1f} kWh",
                "",
            ]

        if rec.solar_analysis:
            lines += [
                "  -- SOLAR ANALYSIS --",
                f"  {rec.solar_analysis.interpretation}",
                "",
            ]

        # Alternatives
        lines += [
            "  -- ALTERNATIVE DESIGNS --",
        ]
        for alt in self.alternatives:
            if alt.rank == 1:
                continue  # Skip recommended
            lines.append(
                f"  {alt.label}: {alt.geometry_summary} | {alt.orientation_deg} deg | "
                f"{alt.wall_material} | Indoor: {alt.avg_indoor_temp_C:.1f} C | "
                f"Score: {alt.score:.1f} | {alt.verdict}"
            )

        lines += [
            "",
            "  -- PIPELINE SUMMARY --",
            f"  Candidates Generated:   {self.total_candidates_generated}",
            f"  After ML Screening:     {self.candidates_after_screening}",
            f"  After Physics Sim:      {self.candidates_after_physics}",
            f"  Final Alternatives:     {len(self.alternatives)}",
            "",
            self.recommendation_explanation,
            "=" * 60,
        ]

        return "\n".join(lines)
