"""
ThermoShelter — Procurement Adapter
Abstracts supplier and pricing data from the scientific engineering core.
Provides explicit provenance for estimated costs versus observed market prices.
Supports multi-supplier price comparison and purchase verification.
"""

from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Any
from pathlib import Path
import csv
import os
import datetime

@dataclass
class ProcurementRecord:
    material_id: str
    supplier_name: str
    product_name: str
    price_per_unit: float
    currency: str
    price_unit: str  # e.g. 'm3', 'm2', 'unit', 'kg'
    availability_status: str
    product_url: str
    image_url: str
    source_id: str
    confidence: str
    retrieval_timestamp: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class EstimatedCost:
    total_cost: float
    currency: str
    is_observed_price: bool
    breakdown: Dict[str, float]
    provenance_notes: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

class ProcurementAdapter:
    """
    Manages supplier, pricing, and material provenance.
    Strictly isolates commercial data from thermal physics equations.
    """
    def __init__(self, registry_path: Optional[str] = None):
        if registry_path is None:
            root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
            self.registry_path = os.path.join(root_dir, "data", "canonical", "materials", "material_registry.csv")
        else:
            self.registry_path = registry_path
            
        self.records: Dict[str, List[ProcurementRecord]] = {}
        self._load_registry()

    def _load_registry(self):
        if not os.path.exists(self.registry_path):
            return
            
        try:
            with open(self.registry_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    mat_id = row['material_id']
                    record = ProcurementRecord(
                        material_id=mat_id,
                        supplier_name=row.get('supplier_name', 'UNKNOWN'),
                        product_name=row.get('product_name', 'Generic Product'),
                        price_per_unit=float(row.get('price_per_unit', 0.0)),
                        currency=row.get('currency', 'INR'),
                        price_unit=row.get('price_unit', 'unit'),
                        availability_status=row.get('availability_status', 'UNKNOWN'),
                        product_url=row.get('product_url', 'PURCHASE_URL_NOT_AVAILABLE'),
                        image_url=row.get('image_url', 'IMAGE_NOT_AVAILABLE'),
                        source_id=row.get('source_id', 'SRC-UNKNOWN'),
                        confidence=row.get('confidence', 'Low'),
                        retrieval_timestamp=row.get('retrieval_timestamp', datetime.datetime.now().isoformat())
                    )
                    if mat_id not in self.records:
                        self.records[mat_id] = []
                    self.records[mat_id].append(record)
        except Exception as e:
            print(f"[ProcurementAdapter] Error loading registry: {e}")

    def get_suppliers_for_material(self, material_id: str) -> List[ProcurementRecord]:
        """Returns all known suppliers for a specific material ID."""
        return self.records.get(material_id, [])
        
    def get_lowest_price(self, material_id: str) -> Optional[ProcurementRecord]:
        """Returns the cheapest supplier record for a material."""
        records = self.get_suppliers_for_material(material_id)
        if not records:
            return None
        return min(records, key=lambda x: x.price_per_unit)

    def get_supplier_comparison(self, material_id: str) -> Dict[str, Any]:
        """
        Provides multi-supplier price comparison, range, and provenance analytics.
        """
        records = self.get_suppliers_for_material(material_id)
        if not records:
            return {
                "material_id": material_id,
                "suppliers_count": 0,
                "has_observed_prices": False,
                "price_range_min": None,
                "price_range_max": None,
                "price_unit": None,
                "currency": "INR",
                "lowest_supplier": None,
                "highest_supplier": None,
                "suppliers": [],
                "provenance": "UNAVAILABLE"
            }

        prices = [r.price_per_unit for r in records if r.price_per_unit > 0]
        min_p = min(prices) if prices else 0.0
        max_p = max(prices) if prices else 0.0
        lowest_rec = min(records, key=lambda x: x.price_per_unit)
        highest_rec = max(records, key=lambda x: x.price_per_unit)

        return {
            "material_id": material_id,
            "suppliers_count": len(records),
            "has_observed_prices": True,
            "price_range_min": min_p,
            "price_range_max": max_p,
            "price_unit": records[0].price_unit,
            "currency": records[0].currency,
            "lowest_supplier": lowest_rec.to_dict(),
            "highest_supplier": highest_rec.to_dict(),
            "suppliers": [r.to_dict() for r in records],
            "provenance": "OBSERVED_PRICE",
            "last_updated": records[0].retrieval_timestamp
        }

    def estimate_envelope_cost(self, 
                               wall_material_id: str, wall_area_m2: float, wall_thickness_m: float,
                               roof_material_id: str, roof_area_m2: float, roof_thickness_m: float) -> EstimatedCost:
        """
        Calculates an estimated cost for the core envelope based on market prices.
        If a market price isn't available, relies on an estimation heuristic and explicitly flags it.
        """
        breakdown = {}
        provenance_notes = []
        is_observed = True
        total = 0.0

        # Estimate Wall
        wall_rec = self.get_lowest_price(wall_material_id)
        if wall_rec and wall_rec.price_per_unit > 0:
            vol = wall_area_m2 * wall_thickness_m if wall_rec.price_unit == 'm3' else wall_area_m2
            cost = vol * wall_rec.price_per_unit
            breakdown['wall'] = round(cost, 2)
            total += cost
            provenance_notes.append(f"Wall cost based on observed price from {wall_rec.supplier_name} ({wall_rec.price_per_unit} {wall_rec.currency}/{wall_rec.price_unit}).")
        else:
            is_observed = False
            breakdown['wall'] = round(wall_area_m2 * 2000.0, 2)  # Synthetic fallback heuristic (₹2000/m2)
            total += breakdown['wall']
            provenance_notes.append(f"Wall cost uses SYNTHETIC_ESTIMATE (no observed market price).")

        # Estimate Roof
        roof_rec = self.get_lowest_price(roof_material_id)
        if roof_rec and roof_rec.price_per_unit > 0:
            vol = roof_area_m2 * roof_thickness_m if roof_rec.price_unit == 'm3' else roof_area_m2
            cost = vol * roof_rec.price_per_unit
            breakdown['roof'] = round(cost, 2)
            total += cost
            provenance_notes.append(f"Roof cost based on observed price from {roof_rec.supplier_name} ({roof_rec.price_per_unit} {roof_rec.currency}/{roof_rec.price_unit}).")
        else:
            is_observed = False
            breakdown['roof'] = round(roof_area_m2 * 2500.0, 2)  # Synthetic fallback heuristic (₹2500/m2)
            total += breakdown['roof']
            provenance_notes.append(f"Roof cost uses SYNTHETIC_ESTIMATE (no observed market price).")

        return EstimatedCost(
            total_cost=round(total, 2),
            currency=wall_rec.currency if wall_rec else "INR",
            is_observed_price=is_observed,
            breakdown=breakdown,
            provenance_notes=provenance_notes
        )
