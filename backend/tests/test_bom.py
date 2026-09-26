import asyncio
import sys
sys.path.insert(0, './backend')
from blueprint_llm import generate_blueprint

async def main():
    bp = await generate_blueprint(
        occupancy=5, 
        location='Leh', 
        budget=300000, 
        lat=34.15, 
        lon=77.57, 
        climate_concerns=['extreme cold'], 
        building_type='emergency'
    )
    bd = bp.get('budget', {}).get('breakdown', {})
    print('Foundation:', bd.get('foundation_inr', 'NOT_FOUND'))
    print('Contingency:', bd.get('contingency_buffer_inr', 'NOT_FOUND'))
    print('Total:', bp.get('budget', {}).get('total_estimated_inr', 'NOT_FOUND'))

asyncio.run(main())
