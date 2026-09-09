"""
ThermoShelter — Procurement & Supply Chain Engine
Handles real-time (simulated for MVP) scraping of material suppliers,
stock tracking, and USD to INR currency conversion.
"""

import random
import requests
from typing import Dict, List, Optional
from pydantic import BaseModel

class Supplier(BaseModel):
    name: str
    url: str
    base_price_usd: float

class ProcurementResult(BaseModel):
    material_id: str
    suppliers: List[Dict[str, str]]  # name, url, stock_status, price_inr
    average_price_inr: float
    cheapest_supplier: Dict[str, str]

class ProcurementEngine:
    # Fixed fallback rate if API fails
    FALLBACK_USD_TO_INR = 83.50
    
    def __init__(self):
        self._exchange_rate = self.FALLBACK_USD_TO_INR
        self._fetch_exchange_rate()

    def _fetch_exchange_rate(self):
        """Fetch real-time USD to INR exchange rate."""
        try:
            # Using Frankfurter open API for currency rates
            res = requests.get("https://api.frankfurter.app/latest?from=USD&to=INR", timeout=2)
            if res.status_code == 200:
                self._exchange_rate = res.json()["rates"]["INR"]
        except Exception:
            self._exchange_rate = self.FALLBACK_USD_TO_INR

    def get_exchange_rate(self) -> float:
        return self._exchange_rate

    # Database mapping material IDs to 3 real-world supplier sites
    SUPPLIER_DATABASE: Dict[str, List[Supplier]] = {
        "MAT-SIP-MILITARY": [
            Supplier(name="Tata BlueScope Steel", url="https://tatabluescopesteel.com/products/insulated-panels/", base_price_usd=45.0),
            Supplier(name="IndiaMART - Military SIP", url="https://dir.indiamart.com/search.mp?ss=structural+insulated+panels", base_price_usd=42.0),
            Supplier(name="Everest Industries", url="https://www.everestboards.com/products/rapicon-walls", base_price_usd=48.0)
        ],
        "MAT-AEROGEL-TEXTILE": [
            Supplier(name="Aspen Aerogels", url="https://www.aerogel.com/products/cryogel-z/", base_price_usd=120.0),
            Supplier(name="Alibaba - Aerogel Fabric", url="https://www.alibaba.com/trade/search?fsb=y&IndexArea=product_en&CatId=&SearchText=aerogel+blanket", base_price_usd=90.0),
            Supplier(name="IndiaMART - Aerogel Insulation", url="https://dir.indiamart.com/search.mp?ss=aerogel+insulation+blanket", base_price_usd=105.0)
        ],
        "MAT-PCM-BOARD": [
            Supplier(name="Pluss Advanced Technologies", url="https://www.pluss.co.in/phase-change-materials/", base_price_usd=60.0),
            Supplier(name="IndiaMART - PCM Boards", url="https://dir.indiamart.com/search.mp?ss=phase+change+material", base_price_usd=55.0),
            Supplier(name="Croda - Thermasorb", url="https://www.croda.com/en-gb/smart-materials", base_price_usd=65.0)
        ],
        "MAT-RADIANT-FOIL": [
            Supplier(name="Aerolam Insulations", url="https://www.aerolam.com/reflective-insulation/", base_price_usd=12.0),
            Supplier(name="IndiaMART - Radiant Barrier", url="https://dir.indiamart.com/search.mp?ss=radiant+barrier+foil", base_price_usd=8.5),
            Supplier(name="Supreme Petrochem (INSUreflector)", url="https://www.supremepetrochem.com/insulation-products/", base_price_usd=10.0)
        ],
        "MAT-LGSF-PORTAL": [
            Supplier(name="Stratus Steel", url="https://www.stratus-steel.com/", base_price_usd=35.0),
            Supplier(name="IndiaMART - LGSF Manufacturer", url="https://dir.indiamart.com/search.mp?ss=light+gauge+steel+framing", base_price_usd=30.0),
            Supplier(name="Nippon Steel India", url="https://www.nipponsteel.com/en/", base_price_usd=38.0)
        ],
        "MAT-PTFE-MEMBRANE": [
            Supplier(name="Taiyo Membrane", url="https://www.taiyomembrane.com/", base_price_usd=85.0),
            Supplier(name="IndiaMART - Tensile Fabric", url="https://dir.indiamart.com/search.mp?ss=ptfe+tensile+membrane", base_price_usd=70.0),
            Supplier(name="Mehler Texnologies", url="https://www.mehler-texnologies.com/en/", base_price_usd=95.0)
        ],
        "MAT-RAMMED-INSULATED": [
            Supplier(name="Local Earth Masonry", url="https://en.wikipedia.org/wiki/Rammed_earth", base_price_usd=15.0), # Earth is local
            Supplier(name="Owens Corning XPS India", url="https://www.owenscorning.com/en-us/insulation", base_price_usd=25.0),
            Supplier(name="IndiaMART - Rammed Earth Contractors", url="https://dir.indiamart.com/search.mp?ss=rammed+earth+construction", base_price_usd=20.0)
        ],
        "MAT-HEMPCRETE": [
            Supplier(name="Boheco (Bombay Hemp Company)", url="https://boheco.org/", base_price_usd=40.0),
            Supplier(name="IndiaMART - Hempcrete Blocks", url="https://dir.indiamart.com/search.mp?ss=hempcrete", base_price_usd=35.0),
            Supplier(name="GoHemp", url="https://gohemp.in/", base_price_usd=38.0)
        ]
    }

    # Default fallback for unmapped standard materials
    DEFAULT_SUPPLIERS = [
        Supplier(name="IndiaMART - Wholesale Building Materials", url="https://dir.indiamart.com/", base_price_usd=20.0),
        Supplier(name="UltraTech Building Solutions", url="https://www.ultratechcement.com/", base_price_usd=22.0),
        Supplier(name="TradeIndia", url="https://www.tradeindia.com/", base_price_usd=19.0)
    ]

    def check_stock_and_price(self, material_id: str) -> ProcurementResult:
        """
        Simulates real-time network scraping of suppliers to get live stock and exact pricing.
        Converts USD to INR.
        """
        suppliers = self.SUPPLIER_DATABASE.get(material_id, self.DEFAULT_SUPPLIERS)
        
        live_results = []
        total_inr = 0.0
        cheapest_supplier = None
        lowest_price = float('inf')

        for sup in suppliers:
            # Simulate real-time stock check and network jitter
            stock_status = random.choices(
                ["In Stock", "Low Stock (Ships 2 days)", "Pre-Order (1 week)"],
                weights=[0.7, 0.2, 0.1],
                k=1
            )[0]

            # Price fluctuation (+/- 5%) based on simulated live market demand
            fluctuation = random.uniform(0.95, 1.05)
            live_price_usd = sup.base_price_usd * fluctuation
            live_price_inr = live_price_usd * self._exchange_rate
            
            # Round to nearest 10 rupees
            live_price_inr = round(live_price_inr / 10) * 10

            result = {
                "supplier_name": sup.name,
                "url": sup.url,
                "stock_status": stock_status,
                "price_inr": f"₹{live_price_inr:,.2f}"
            }
            live_results.append(result)
            total_inr += live_price_inr

            if live_price_inr < lowest_price:
                lowest_price = live_price_inr
                cheapest_supplier = result

        avg_price = total_inr / len(suppliers)

        return ProcurementResult(
            material_id=material_id,
            suppliers=live_results,
            average_price_inr=avg_price,
            cheapest_supplier=cheapest_supplier
        )
