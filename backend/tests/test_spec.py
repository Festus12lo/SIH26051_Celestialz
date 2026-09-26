import traceback
from spec_generator import generate_building_spec

try:
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    print(generate_building_spec(4, 'Leh', 34.0, 77.0, 10000, 'residential', -10.0))
except Exception as e:
    traceback.print_exc()
