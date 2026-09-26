import json
import psycopg2
import os
from dotenv import load_dotenv

base_dir = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.join(base_dir, '..', '.env')
load_dotenv(dotenv_path)


def init_db():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    database_url = os.environ.get("DATABASE_URL")
    
    # Connect to PostgreSQL
    conn = psycopg2.connect(database_url)
    cursor = conn.cursor()
    
    # Create materials table
    # Create materials table
    cursor.execute('DROP TABLE IF EXISTS materials')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS materials (
            id TEXT,
            category TEXT NOT NULL,
            name TEXT NOT NULL,
            r_value REAL,
            u_value REAL,
            density_kg_m3 REAL,
            specific_heat_j_kg_k REAL,
            shgc REAL,
            cost_per_m2_inr REAL,
            conductivity_w_m_k REAL,
            embodied_carbon_kg_co2_kg REAL,
            thermal_mass_rating TEXT,
            local_regions TEXT,
            description TEXT,
            image_url TEXT,
            PRIMARY KEY (id, category)
        )
    ''')
    
    # Clear existing data just in case
    cursor.execute('DELETE FROM materials')
    
    json_paths = [
        os.path.join(base_dir, "materials.json"),
        os.path.join(base_dir, "..", "data", "materials_catalogue.json")
    ]
    
    for json_path in json_paths:
        if not os.path.exists(json_path):
            continue
            
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # Insert data
        for group, items in data.items():
            for item in items:
                r_val = item.get('r_value_per_inch') or item.get('r_value')
                
                # Map type to categories required by spec_generator
                categories_to_insert = []
                mat_type = item.get('type')
                
                if group in ('insulation', 'structural', 'roofing', 'glazing'):
                    categories_to_insert.append(group)
                elif mat_type == 'wall':
                    categories_to_insert.extend(['structural', 'insulation'])
                elif mat_type == 'roof':
                    categories_to_insert.append('roofing')
                elif mat_type == 'window' or group == 'glazing':
                    categories_to_insert.append('glazing')
                else:
                    categories_to_insert.append(group) # fallback
                    
                for category in categories_to_insert:
                    cursor.execute('''
                        INSERT INTO materials (
                            id, category, name, r_value, u_value, density_kg_m3,
                            specific_heat_j_kg_k, shgc, cost_per_m2_inr,
                            conductivity_w_m_k, embodied_carbon_kg_co2_kg,
                            thermal_mass_rating, local_regions, description, image_url
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id, category) DO UPDATE SET
                            r_value = EXCLUDED.r_value,
                            u_value = EXCLUDED.u_value,
                            density_kg_m3 = EXCLUDED.density_kg_m3,
                            specific_heat_j_kg_k = EXCLUDED.specific_heat_j_kg_k,
                            cost_per_m2_inr = EXCLUDED.cost_per_m2_inr,
                            conductivity_w_m_k = COALESCE(EXCLUDED.conductivity_w_m_k, materials.conductivity_w_m_k),
                            embodied_carbon_kg_co2_kg = COALESCE(EXCLUDED.embodied_carbon_kg_co2_kg, materials.embodied_carbon_kg_co2_kg),
                            thermal_mass_rating = COALESCE(EXCLUDED.thermal_mass_rating, materials.thermal_mass_rating),
                            local_regions = COALESCE(EXCLUDED.local_regions, materials.local_regions),
                            description = COALESCE(EXCLUDED.description, materials.description),
                            image_url = COALESCE(EXCLUDED.image_url, materials.image_url)
                    ''', (
                        item['id'],
                        category,
                        item['name'],
                        r_val,
                        item.get('u_value'),
                        item.get('density_kg_m3'),
                        item.get('specific_heat_j_kg_k'),
                        item.get('shgc'),
                        item.get('cost_per_m2_inr'),
                        item.get('conductivity_w_m_k'),
                        item.get('embodied_carbon_kg_co2_kg'),
                        item.get('thermal_mass_rating'),
                        item.get('local_regions'),
                        item.get('desc') or item.get('description'),
                        item.get('image_url')
                    ))
            
    conn.commit()
    
    # ─────────────────────────────────────────────────────────────
    # CLIMATE REGIONS TABLE (NBC 2016 Zones + Architecture Metadata)
    # ─────────────────────────────────────────────────────────────
    cursor.execute('DROP TABLE IF EXISTS climate_regions')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS climate_regions (
            id SERIAL PRIMARY KEY,
            city TEXT NOT NULL,
            state TEXT NOT NULL,
            lat REAL NOT NULL,
            lon REAL NOT NULL,
            altitude_m INTEGER DEFAULT 0,
            nbc_zone TEXT NOT NULL,
            avg_winter_temp_c REAL,
            avg_summer_temp_c REAL,
            annual_rainfall_mm INTEGER,
            humidity_class TEXT,
            seismic_zone TEXT,
            wind_speed_basic_ms REAL,
            snow_zone TEXT DEFAULT 'zone_i',
            vernacular_architecture TEXT,
            typical_wall_material TEXT,
            typical_roof_material TEXT,
            color_palette TEXT,
            landscape_description TEXT,
            vegetation TEXT,
            UNIQUE(city, state)
        )
    ''')

    # Seed climate regions — 50+ Indian cities across all 6 NBC zones
    climate_data = [
        # ── EXTREME COLD ──
        ('Leh', 'Ladakh', 34.15, 77.58, 3500, 'extreme_cold', -10.0, 25.0, 102, 'arid', 'IV', 39.0, 'zone_v_heavy',
         'Ladakhi vernacular: thick stone/mud walls, flat or low-slope roof, small recessed windows, whitewashed interiors, timber frames',
         'stone_rubble', 'corrugated_metal', 'earth_tones_ochre',
         'Snow-covered Himalayan peaks, barren rocky high-altitude desert, crystal-clear sky', 'sparse_alpine'),
        ('Kargil', 'Ladakh', 34.55, 76.13, 2676, 'extreme_cold', -12.0, 28.0, 230, 'arid', 'IV', 39.0, 'zone_v_heavy',
         'Central Asian influenced stone construction, flat roofs, thick mud-plastered walls',
         'stone_rubble', 'corrugated_metal', 'earth_tones_brown',
         'Dramatic mountain valleys, barren cliffs, Suru river gorge', 'sparse_alpine'),
        ('Tawang', 'Arunachal Pradesh', 27.59, 91.86, 3048, 'extreme_cold', -8.0, 20.0, 1800, 'humid', 'V', 44.0, 'zone_iv',
         'Monpa vernacular: thick stone walls, wooden balconies, steep slate roofs, Buddhist monastery influence',
         'stone_rubble', 'slate_tile', 'grey_brown_green',
         'Misty cloud-forest mountains, Buddhist monastery architecture, alpine meadows', 'dense_montane_forest'),
        ('Dras', 'Ladakh', 34.43, 75.76, 3230, 'extreme_cold', -15.0, 22.0, 510, 'arid', 'IV', 39.0, 'zone_v_heavy',
         'Extreme cold outpost: massive stone walls, minimal openings, heavy timber roof structure',
         'stone_rubble', 'corrugated_metal', 'grey_stone',
         'Second coldest inhabited place on Earth, barren mountain pass, frozen river', 'barren_alpine'),

        # ── COLD ──
        ('Shimla', 'Himachal Pradesh', 31.10, 77.17, 2276, 'cold', 2.0, 25.0, 1575, 'humid', 'IV', 39.0, 'zone_iv',
         'Colonial hill-station: timber-frame with stone base, steep gable roofs, dormer windows, verandahs',
         'timber_frame', 'corrugated_metal', 'green_brown_colonial',
         'Pine-forested Himalayan hillside, terraced slopes, misty valleys', 'dense_coniferous'),
        ('Manali', 'Himachal Pradesh', 32.24, 77.19, 2050, 'cold', -2.0, 28.0, 1360, 'humid', 'IV', 39.0, 'zone_iv',
         'Kullu vernacular: stone base, timber upper floors, steep slate roofs, carved wood balconies',
         'stone_rubble', 'slate_tile', 'grey_brown_wood',
         'Snow-capped peaks, deodar forests, rushing rivers, Beas valley', 'dense_mixed_forest'),
        ('Darjeeling', 'West Bengal', 27.04, 88.26, 2042, 'cold', 3.0, 20.0, 3092, 'very_humid', 'IV', 47.0, 'zone_iii',
         'Colonial-Nepali hybrid: corrugated metal roofs, stone/brick walls, narrow multi-story',
         'brick', 'corrugated_metal', 'red_brick_green',
         'Tea plantation hillsides, misty Kanchenjunga views, colonial architecture', 'tea_plantation_forest'),
        ('Gangtok', 'Sikkim', 27.33, 88.62, 1650, 'cold', 4.0, 22.0, 3494, 'very_humid', 'IV', 47.0, 'zone_iii',
         'Sikkimese: bamboo and timber frame, steep metal roofs, stilted construction on slopes',
         'timber_frame', 'corrugated_metal', 'green_wood_metal',
         'Steep forested Himalayan slopes, Buddhist monasteries, rhododendron forests', 'dense_subtropical'),
        ('Srinagar', 'Jammu & Kashmir', 34.08, 74.80, 1585, 'cold', -2.0, 30.0, 710, 'humid', 'V', 39.0, 'zone_iv',
         'Kashmiri vernacular: Taq construction (timber-laced brick), steep sloped roofs, carved walnut wood windows',
         'brick_timber', 'corrugated_metal', 'brown_walnut_brick',
         'Dal Lake, Mughal gardens, chinar trees, snow-covered Pir Panjal range', 'temperate_deciduous'),
        ('Auli', 'Uttarakhand', 30.53, 79.57, 2519, 'cold', -5.0, 18.0, 1200, 'humid', 'IV', 39.0, 'zone_iv',
         'Garhwali mountain: stone and timber, steep slate roofs, south-facing orientation',
         'stone_rubble', 'slate_tile', 'grey_stone_wood',
         'Alpine meadows, oak and conifer forests, Nanda Devi views', 'alpine_meadow'),
        ('Mussoorie', 'Uttarakhand', 30.45, 78.07, 2005, 'cold', 1.0, 24.0, 2050, 'humid', 'IV', 44.0, 'zone_iii',
         'Colonial hill station: stone base with timber upper, pitched metal roofs, bay windows',
         'stone_brick', 'corrugated_metal', 'colonial_grey_green',
         'Forested Shivalik hills, misty mountain views, colonial-era architecture', 'dense_mixed_forest'),

        # ── COMPOSITE ──
        ('Delhi', 'Delhi', 28.61, 77.21, 216, 'composite', 5.0, 43.0, 797, 'semi_arid', 'IV', 47.0, 'zone_i',
         'Mughal-modern hybrid: brick construction, flat roofs, courtyards, jali screens for ventilation',
         'brick', 'rcc_flat', 'red_brick_sandstone',
         'Flat Indo-Gangetic plain, dusty urban, Yamuna riverfront', 'deciduous_scrub'),
        ('Lucknow', 'Uttar Pradesh', 26.85, 80.95, 123, 'composite', 7.0, 42.0, 990, 'humid', 'III', 47.0, 'zone_i',
         'Awadhi/Mughal: arched doorways, thick brick walls, flat roofs, inner courtyards',
         'brick', 'rcc_flat', 'cream_sandstone',
         'Flat Gangetic plain, gardens, historical Nawabi architecture', 'deciduous_urban'),
        ('Nagpur', 'Maharashtra', 21.15, 79.09, 310, 'composite', 12.0, 46.0, 1136, 'semi_arid', 'II', 44.0, 'zone_i',
         'Central Indian: thick brick/stone walls, flat concrete roofs, deep verandahs for shade',
         'brick', 'rcc_flat', 'orange_brown_brick',
         'Central Deccan plateau, orange orchards, dry deciduous forest', 'dry_deciduous'),
        ('Bhopal', 'Madhya Pradesh', 23.26, 77.41, 527, 'composite', 8.0, 43.0, 1146, 'semi_arid', 'II', 44.0, 'zone_i',
         'Indo-Islamic: thick stone/brick walls, domed roofs, courtyards with water features',
         'stone_brick', 'rcc_flat', 'sandstone_cream',
         'Vindhyan plateau, lakes, mixed deciduous woodland', 'dry_deciduous'),
        ('Patna', 'Bihar', 25.60, 85.10, 53, 'composite', 8.0, 40.0, 1100, 'humid', 'IV', 47.0, 'zone_i',
         'Gangetic: brick walls, tiled or flat roofs, raised plinth for flooding, verandahs',
         'brick', 'rcc_flat', 'red_brick_grey',
         'Gangetic floodplain, rivers, dense agricultural land', 'floodplain_deciduous'),
        ('Chandigarh', 'Punjab', 30.73, 76.78, 321, 'composite', 4.0, 40.0, 1100, 'semi_arid', 'IV', 47.0, 'zone_i',
         'Modernist Le Corbusier: concrete frame, brise-soleil, open plan, geometric forms',
         'rcc', 'rcc_flat', 'concrete_grey',
         'Shivalik foothills transition, planned city grid, Sukhna Lake', 'deciduous_scrub'),
        ('Allahabad', 'Uttar Pradesh', 25.43, 81.85, 98, 'composite', 7.0, 44.0, 1027, 'humid', 'II', 47.0, 'zone_i',
         'Gangetic traditional: thick brick walls, flat roofs, inner courtyards, verandahs',
         'brick', 'rcc_flat', 'red_brick_cream',
         'Confluence of Ganga and Yamuna, flat river plain, pilgrimage city', 'floodplain_deciduous'),
        ('Varanasi', 'Uttar Pradesh', 25.32, 83.01, 81, 'composite', 8.0, 43.0, 1110, 'humid', 'III', 47.0, 'zone_i',
         'Ancient Gangetic: narrow lanes, thick masonry, tiered ghats, flat roofs with parapets',
         'brick', 'rcc_flat', 'sandstone_red_cream',
         'Sacred Ganga ghats, ancient city fabric, dense urban', 'floodplain_urban'),

        # ── HOT-DRY ──
        ('Jaipur', 'Rajasthan', 26.91, 75.79, 431, 'hot_dry', 10.0, 45.0, 600, 'arid', 'II', 47.0, 'zone_i',
         'Rajasthani: sandstone block, thick walls, jharokha windows, minimal openings, inner courtyard',
         'sandstone', 'rcc_flat', 'pink_sandstone_ochre',
         'Aravalli hills, dry scrubland, Thar desert fringe, pink city architecture', 'thorn_scrub'),
        ('Jodhpur', 'Rajasthan', 26.24, 73.02, 231, 'hot_dry', 12.0, 47.0, 360, 'arid', 'II', 47.0, 'zone_i',
         'Blue City fortress: thick limestone/sandstone, blue-washed walls, minimal windows, wind-catchers',
         'sandstone', 'rcc_flat', 'blue_sandstone',
         'Thar desert, golden sand dunes, Mehrangarh Fort landscape', 'desert_sparse'),
        ('Ahmedabad', 'Gujarat', 23.02, 72.57, 53, 'hot_dry', 12.0, 43.0, 782, 'arid', 'III', 39.0, 'zone_i',
         'Pol house vernacular: narrow streets, shared walls, wind-catchers, carved wood facades, inner courtyards',
         'brick', 'rcc_flat', 'sandstone_wood_brown',
         'Gujarat plain, Sabarmati river, arid scrubland, textile city', 'thorn_scrub'),
        ('Jaisalmer', 'Rajasthan', 26.92, 70.91, 225, 'hot_dry', 8.0, 48.0, 209, 'arid', 'II', 47.0, 'zone_i',
         'Desert fortress: golden sandstone, massive thick walls, carved havelis, minimal openings, flat roofs',
         'sandstone', 'sandstone_flat', 'golden_sandstone',
         'Thar desert dunes, golden sand, medieval fortress city', 'desert_barren'),
        ('Bikaner', 'Rajasthan', 28.02, 73.31, 234, 'hot_dry', 6.0, 46.0, 277, 'arid', 'II', 47.0, 'zone_i',
         'Red sandstone havelis, thick walls, jharokha projections, carved stone screens',
         'sandstone', 'rcc_flat', 'red_sandstone',
         'Thar desert, camel country, red sandstone architecture', 'desert_sparse'),
        ('Kutch', 'Gujarat', 23.73, 69.86, 15, 'hot_dry', 12.0, 44.0, 340, 'arid', 'III', 44.0, 'zone_i',
         'Kutchi bhunga: circular mud huts, thick cob walls, conical thatched roofs, mirror-work interiors',
         'mud_cob', 'thatch', 'white_mirror_mud',
         'White salt desert (Rann), sparse thorn scrub, flat horizon', 'salt_desert'),

        # ── WARM-HUMID ──
        ('Mumbai', 'Maharashtra', 19.08, 72.88, 14, 'warm_humid', 20.0, 35.0, 2422, 'very_humid', 'III', 44.0, 'zone_i',
         'Coastal urban: reinforced concrete, ventilated corridors, raised plinth, large windows with louvers',
         'rcc', 'rcc_flat', 'concrete_grey_teal',
         'Arabian Sea coastline, monsoon clouds, tropical urban', 'coastal_tropical'),
        ('Chennai', 'Tamil Nadu', 13.08, 80.27, 6, 'warm_humid', 22.0, 40.0, 1395, 'humid', 'III', 50.0, 'zone_i',
         'Dravidian: thick masonry, wide verandahs, tiled sloped roofs, courtyard layout',
         'brick', 'mangalore_tile', 'white_terracotta_red',
         'Bay of Bengal coast, flat terrain, palm groves, temple architecture', 'coastal_palm'),
        ('Kochi', 'Kerala', 9.93, 76.27, 0, 'warm_humid', 24.0, 33.0, 3005, 'very_humid', 'III', 39.0, 'zone_i',
         'Kerala traditional: laterite walls, steep tiled roof with deep overhangs, wooden fenestration, raised courtyard (nadumuttam)',
         'laterite', 'mangalore_tile', 'terracotta_green_wood',
         'Backwater lagoons, coconut palms, lush tropical greenery', 'dense_tropical'),
        ('Kolkata', 'West Bengal', 22.57, 88.36, 11, 'warm_humid', 13.0, 37.0, 1582, 'very_humid', 'III', 50.0, 'zone_i',
         'Colonial-Bengali: brick with plaster, high ceilings, verandahs, tiled sloped roofs, jalousie windows',
         'brick', 'mangalore_tile', 'cream_yellow_colonial',
         'Hooghly river delta, flat terrain, colonial-era urban, tropical', 'alluvial_tropical'),
        ('Goa', 'Goa', 15.50, 73.83, 0, 'warm_humid', 22.0, 34.0, 2932, 'very_humid', 'III', 39.0, 'zone_i',
         'Indo-Portuguese: laterite stone, tiled sloped roofs, wide balcaos (verandahs), bright colors',
         'laterite', 'mangalore_tile', 'bright_ochre_white',
         'Arabian Sea beaches, coconut palms, Portuguese colonial churches', 'coastal_tropical'),
        ('Thiruvananthapuram', 'Kerala', 8.52, 76.94, 10, 'warm_humid', 24.0, 33.0, 1712, 'very_humid', 'III', 39.0, 'zone_i',
         'Kerala Nalukettu: laterite, teak wood, steep tile roof, central courtyard, ornate wood carvings',
         'laterite', 'mangalore_tile', 'terracotta_teak_brown',
         'Tropical coastline, Western Ghats backdrop, dense palm cover', 'dense_tropical'),
        ('Visakhapatnam', 'Andhra Pradesh', 17.69, 83.22, 45, 'warm_humid', 18.0, 38.0, 1118, 'humid', 'II', 50.0, 'zone_i',
         'Coastal Andhra: brick/concrete, sloped roofs, large openings for sea breeze',
         'brick', 'rcc_flat', 'white_blue_coastal',
         'Eastern Ghats meeting Bay of Bengal, port city, rocky coastline', 'coastal_scrub'),
        ('Mangalore', 'Karnataka', 12.87, 74.84, 22, 'warm_humid', 22.0, 35.0, 3439, 'very_humid', 'III', 39.0, 'zone_i',
         'Tulu vernacular: laterite stone, iconic Mangalore clay tile roof, open courtyards, wooden pillars',
         'laterite', 'mangalore_tile', 'terracotta_laterite_red',
         'Western coast, Netravathi river, coconut and areca palm plantations', 'coastal_tropical'),
        ('Bhubaneswar', 'Odisha', 20.30, 85.82, 45, 'warm_humid', 14.0, 40.0, 1542, 'humid', 'II', 50.0, 'zone_i',
         'Odishan: laterite/sandstone, temple-inspired detailing, sloped roofs, verandahs',
         'laterite', 'rcc_flat', 'sandstone_grey',
         'Eastern coastal plain, temple city, Chilika Lake region, cyclone-prone', 'deciduous_coastal'),

        # ── TEMPERATE ──
        ('Bangalore', 'Karnataka', 12.97, 77.60, 920, 'temperate', 15.0, 34.0, 970, 'semi_arid', 'II', 33.0, 'zone_i',
         'Garden city modern: brick/concrete, flat/low-slope roofs, large windows, cross ventilation',
         'brick', 'rcc_flat', 'grey_green_modern',
         'Deccan plateau, garden city, moderate climate year-round, IT parks', 'deciduous_garden'),
        ('Pune', 'Maharashtra', 18.52, 73.86, 560, 'temperate', 12.0, 38.0, 722, 'semi_arid', 'III', 39.0, 'zone_i',
         'Maratha-modern: stone/brick base, ventilated upper floors, Mangalore tile roofs',
         'stone_brick', 'mangalore_tile', 'grey_red_tile',
         'Western Ghats foothills, hill forts, moderate Deccan plateau', 'deciduous_scrub'),
        ('Hyderabad', 'Telangana', 17.39, 78.49, 542, 'temperate', 14.0, 40.0, 812, 'semi_arid', 'II', 44.0, 'zone_i',
         'Deccani: granite/brick, flat roofs, arched openings, Charminar-style detailing',
         'granite_brick', 'rcc_flat', 'grey_granite_cream',
         'Deccan plateau, rocky terrain, Hussain Sagar lake, Golconda fort landscape', 'dry_deciduous'),
        ('Mysore', 'Karnataka', 12.30, 76.65, 770, 'temperate', 16.0, 34.0, 798, 'semi_arid', 'II', 33.0, 'zone_i',
         'Indo-Saracenic: ornate plaster facades, clay tile roofs, arched windows, palace-influenced',
         'brick', 'mangalore_tile', 'cream_gold_red',
         'Chamundi hills, palace city, sandalwood forests, moderate plateau', 'deciduous_garden'),
        ('Coorg', 'Karnataka', 12.42, 75.74, 1170, 'temperate', 14.0, 28.0, 3000, 'humid', 'II', 33.0, 'zone_i',
         'Kodava ainmane: stone/mud walls, steep tiled roofs, wide eaves, central hall (kayyale)',
         'stone_mud', 'mangalore_tile', 'laterite_green_wood',
         'Western Ghats hills, coffee and spice plantations, mist-covered valleys', 'coffee_plantation'),
        ('Ooty', 'Tamil Nadu', 11.41, 76.69, 2240, 'temperate', 5.0, 20.0, 1250, 'humid', 'II', 33.0, 'zone_iii',
         'Colonial hill station: stone cottages, steep pitched roofs, English garden style, fireplaces',
         'stone_brick', 'corrugated_metal', 'colonial_stone_green',
         'Nilgiri hills, tea and eucalyptus plantations, misty blue mountains', 'shola_grassland'),

        # ── Additional strategic cities ──
        ('Guwahati', 'Assam', 26.14, 91.74, 55, 'warm_humid', 10.0, 33.0, 1722, 'very_humid', 'V', 50.0, 'zone_i',
         'Assamese: bamboo frame with ikra (reed) infill, raised on stilts, steep thatch/metal roof',
         'bamboo_ikra', 'corrugated_metal', 'green_bamboo_thatch',
         'Brahmaputra river valley, tea gardens, dense tropical, earthquake-prone', 'riverine_tropical'),
        ('Imphal', 'Manipur', 24.81, 93.95, 786, 'temperate', 4.0, 28.0, 1320, 'humid', 'V', 44.0, 'zone_ii',
         'Traditional Manipuri: bamboo-thatch, raised floor, steep roof, open verandah',
         'bamboo', 'thatch_metal', 'green_bamboo',
         'Imphal valley, surrounding hills, Loktak Lake, dense vegetation', 'valley_tropical'),
        ('Dehradun', 'Uttarakhand', 30.32, 78.03, 640, 'composite', 4.0, 36.0, 2073, 'humid', 'IV', 47.0, 'zone_ii',
         'Doon valley style: brick/stone with timber, sloped roofs, colonial influence',
         'brick_stone', 'corrugated_metal', 'red_brick_green',
         'Doon valley between Shivalik and Himalayan foothills, sal forests, rivers', 'deciduous_subtropical'),
        ('Jammu', 'Jammu & Kashmir', 32.73, 74.87, 327, 'composite', 5.0, 42.0, 1115, 'humid', 'IV', 39.0, 'zone_ii',
         'Dogra style: brick/stone walls, sloped roofs, verandahs, temple-inspired detailing',
         'brick_stone', 'corrugated_metal', 'red_brick_stone',
         'Shivalik foothills, Tawi river, transition zone between plains and mountains', 'subtropical_scrub'),
        ('Ranchi', 'Jharkhand', 23.34, 85.31, 651, 'composite', 7.0, 38.0, 1430, 'humid', 'II', 47.0, 'zone_i',
         'Chotanagpur plateau: brick/stone, sloped tile/metal roofs, verandahs, moderate construction',
         'brick_stone', 'corrugated_metal', 'red_laterite_green',
         'Chotanagpur plateau, waterfalls, sal forests, tribal region', 'deciduous_plateau'),
        ('Raipur', 'Chhattisgarh', 21.25, 81.63, 298, 'composite', 10.0, 44.0, 1290, 'humid', 'II', 44.0, 'zone_i',
         'Central Indian: thick brick walls, flat concrete roofs, verandahs',
         'brick', 'rcc_flat', 'red_brown_brick',
         'Central Indian plain, Mahanadi river, dry deciduous forest', 'dry_deciduous'),
        ('Amritsar', 'Punjab', 31.63, 74.87, 234, 'composite', 3.0, 42.0, 680, 'semi_arid', 'IV', 47.0, 'zone_i',
         'Punjabi haveli: thick brick, flat roofs, large courtyards, ornate facades',
         'brick', 'rcc_flat', 'red_brick_cream',
         'Punjab plain, wheat fields, Golden Temple city, flat horizon', 'agricultural_plain'),
        ('Indore', 'Madhya Pradesh', 22.72, 75.86, 553, 'composite', 10.0, 42.0, 947, 'semi_arid', 'II', 44.0, 'zone_i',
         'Malwa plateau: stone/brick, flat roofs, jali work, inner courts',
         'stone_brick', 'rcc_flat', 'sandstone_brown',
         'Malwa plateau, Vindhya range, mixed scrubland, Holkar heritage', 'dry_deciduous'),
        ('Coimbatore', 'Tamil Nadu', 11.02, 76.96, 411, 'temperate', 18.0, 36.0, 700, 'semi_arid', 'II', 39.0, 'zone_i',
         'Tamil plain: brick/concrete, flat roofs, wide verandahs, minimal insulation',
         'brick', 'rcc_flat', 'white_grey_modern',
         'Western Ghats foothills, textile city, Noyyal river', 'dry_deciduous'),
        ('Madurai', 'Tamil Nadu', 9.92, 78.12, 101, 'warm_humid', 22.0, 39.0, 850, 'humid', 'II', 39.0, 'zone_i',
         'Dravidian temple city: thick masonry, tiled roofs, colonnaded verandahs, gopuram-inspired',
         'brick', 'mangalore_tile', 'terracotta_white',
         'Southern Tamil plain, Vaigai river, Meenakshi temple city', 'scrub_tropical'),
        ('Udaipur', 'Rajasthan', 24.58, 73.68, 598, 'hot_dry', 10.0, 40.0, 637, 'semi_arid', 'II', 44.0, 'zone_i',
         'Mewari: white-washed walls, sandstone accents, courtyards, lake-facing orientation',
         'sandstone', 'rcc_flat', 'white_sandstone_blue',
         'Aravalli hills, lakes, white city of palaces', 'thorn_deciduous'),
        ('Shillong', 'Meghalaya', 25.57, 91.88, 1496, 'temperate', 4.0, 23.0, 2290, 'very_humid', 'V', 44.0, 'zone_ii',
         'Khasi vernacular: timber frame, steep metal roofs, stilted, stone base',
         'timber_frame', 'corrugated_metal', 'green_wood_stone',
         'Khasi hills, pine forests, wettest region on earth, living root bridges', 'dense_subtropical'),
    ]

    for row in climate_data:
        cursor.execute('''
            INSERT INTO climate_regions (city, state, lat, lon, altitude_m, nbc_zone,
                avg_winter_temp_c, avg_summer_temp_c, annual_rainfall_mm, humidity_class,
                seismic_zone, wind_speed_basic_ms, snow_zone,
                vernacular_architecture, typical_wall_material, typical_roof_material,
                color_palette, landscape_description, vegetation)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (city, state) DO NOTHING
        ''', row)

    # ─────────────────────────────────────────────────────────────
    # PROMPT STYLE RULES (for Floor Plan Prompt Engine)
    # ─────────────────────────────────────────────────────────────
    cursor.execute('DROP TABLE IF EXISTS prompt_style_rules')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS prompt_style_rules (
            id SERIAL PRIMARY KEY,
            nbc_zone TEXT NOT NULL,
            building_type TEXT NOT NULL,
            style_2d TEXT NOT NULL,
            style_3d TEXT NOT NULL,
            negative_prompt TEXT,
            environment_desc TEXT,
            priority INTEGER DEFAULT 1,
            UNIQUE(nbc_zone, building_type)
        )
    ''')

    prompt_styles = [
        # Extreme Cold
        ('extreme_cold', 'emergency',
         'Utilitarian relief shelter blueprint, top-down orthographic, black ink on white, minimal detail, modular panel walls shown as thin lines, no foundation, dimension markers in meters, room labels in sans-serif, north arrow',
         'Basic modular emergency shelter on snow-covered barren Himalayan terrain, corrugated panels, UNHCR-style, no landscaping, utilitarian temporary structure',
         'luxury, mansion, modern glass, fantasy, cartoon, greenery, trees, garden',
         'Snow-covered barren mountain pass, high-altitude desert'),
        ('extreme_cold', 'residential',
         'Professional architectural blueprint, top-down orthographic CAD, black ink linework on white grid, hatched wall sections showing stone+insulation layers, architectural dimension lines in meters, room labels in capitals, door swing arcs, window parallel lines, north arrow, scale 1:100',
         'Isometric cutaway 3D rendering of a thick-walled Ladakhi stone shelter, partially removed roof showing interior layout, photorealistic stone/timber textures, warm interior lighting, traditional whitewashed walls',
         'luxury, modern glass, skyscraper, fantasy, cartoon, tropical',
         'Snow-covered Himalayan peaks, barren rocky high-altitude desert, clear blue sky'),
        ('extreme_cold', 'institutional',
         'Professional institutional blueprint, top-down orthographic, multiple rooms with wide corridors, fire exits marked, accessible ramps shown, hatched thick walls, dimension lines, scale 1:200',
         'Large community shelter building in snowy Himalayan setting, multiple wings, robust stone construction, institutional scale',
         'luxury, mansion, single family, cozy, intimate',
         'Snow-covered mountain valley, institutional compound'),

        # Cold
        ('cold', 'emergency',
         'Simple relief shelter plan, orthographic top-down, thin modular walls, no foundation detail, basic room division, dimension markers',
         'Deployable emergency shelter in misty hill-station forest setting, modular panels, temporary structure on hillside',
         'luxury, mansion, modern glass, fantasy, permanent',
         'Misty pine-forested hillside, mountain backdrop'),
        ('cold', 'residential',
         'Professional blueprint, orthographic CAD, hatched timber-frame and stone wall sections, steep roof shown in dashed lines, dormer windows marked, dimension lines, scale 1:100',
         'Isometric cutaway of a timber-frame hill cottage with steep gable roof, stone base, wooden balconies, partially removed roof showing interior, warm fireplace glow',
         'desert, tropical, flat roof, modern glass, skyscraper',
         'Pine-forested mountain hillside, misty valleys, terraced slopes'),
        ('cold', 'institutional',
         'Institutional blueprint, orthographic, wide corridors, multiple fire exits, steep roof outline, hatched walls, scale 1:200',
         'Multi-wing community center in mountain setting, steep metal roofs, stone construction, institutional scale',
         'luxury, single family, tropical',
         'Mountain town setting, forested hills'),

        # Composite
        ('composite', 'emergency',
         'Utilitarian shelter plan, orthographic, modular walls, flat roof, single large entrance, basic layout, dimension markers',
         'Emergency shelter on flat dusty plain near urban area, modular panels, flat roof, temporary deployment',
         'luxury, mansion, garden, landscaping, permanent',
         'Flat Indo-Gangetic plain, dusty terrain, urban fringe'),
        ('composite', 'residential',
         'Professional blueprint, orthographic CAD, brick wall sections hatched, courtyard shown, jali screens marked, flat roof outline, dimension lines, scale 1:100',
         'Isometric cutaway of brick house with inner courtyard, flat roof with parapet, partially removed showing room layout, jali screen details, shaded verandah',
         'snow, mountain, tropical forest, steep roof',
         'Flat urban-suburban terrain, dusty, scattered trees'),
        ('composite', 'institutional',
         'Institutional blueprint, orthographic, large halls, courtyards, wide corridors, flat roof, multiple entrances, scale 1:200',
         'Community center with courtyard layout, brick construction, flat roofs, shaded corridors',
         'luxury, mountain, snow, tropical',
         'Urban institutional compound, flat terrain'),

        # Hot-Dry
        ('hot_dry', 'emergency',
         'Desert relief shelter plan, orthographic, thick-walled compact layout, minimal openings, flat roof, dimension markers',
         'Emergency shelter in arid desert setting, thick walls, minimal windows, flat roof with shade screen',
         'glass, transparent, large windows, lush garden, snow',
         'Arid desert scrubland, thorn bushes, sandy terrain'),
        ('hot_dry', 'residential',
         'Professional blueprint, orthographic CAD, thick sandstone wall sections hatched, inner courtyard prominent, jharokha windows marked, minimal north/west openings, wind-catcher shown, flat roof, scale 1:100',
         'Isometric cutaway of a sandstone desert house with thick walls, inner courtyard with shade, jharokha windows, flat white roof, minimal openings on west face',
         'glass walls, snow, lush tropical, steep roof, modern',
         'Arid Thar desert or Aravalli scrubland, golden sand, clear harsh sun'),
        ('hot_dry', 'institutional',
         'Institutional blueprint, orthographic, large courtyard plan, thick walls, wind-catchers, covered corridors, scale 1:200',
         'Large community center with massive courtyard, thick sandstone walls, covered walkways, wind-catchers',
         'glass, modern, snow, tropical',
         'Desert institutional compound, sandstone architecture'),

        # Warm-Humid
        ('warm_humid', 'emergency',
         'Tropical relief shelter plan, orthographic, raised plinth shown, maximum ventilation openings, sloped roof outline, dimension markers',
         'Emergency shelter on tropical coastal terrain, raised floor, large ventilation openings, sloped metal roof, palm trees',
         'thick walls, desert, snow, closed, windowless',
         'Tropical coastline, palm trees, monsoon clouds'),
        ('warm_humid', 'residential',
         'Professional blueprint, orthographic CAD, laterite/brick walls, large window openings for cross-ventilation, steep tiled roof shown in dashed outline with deep overhangs, raised plinth level marked, courtyard, scale 1:100',
         'Isometric cutaway of a Kerala/coastal house with steep Mangalore tile roof, deep overhangs, laterite walls, open courtyard, wooden fenestration, partially removed roof showing airy interior',
         'desert, snow, thick insulation, minimal windows, flat roof',
         'Lush tropical coastline, coconut palms, backwaters, monsoon sky'),
        ('warm_humid', 'institutional',
         'Institutional blueprint, orthographic, open-plan halls, maximum cross-ventilation, steep roof, raised floor, wide corridors, scale 1:200',
         'Large community hall with steep tiled roof, open sides for ventilation, raised on plinth, tropical setting',
         'desert, snow, enclosed, minimal windows',
         'Tropical institutional campus, palm trees, lush greenery'),

        # Temperate
        ('temperate', 'emergency',
         'Simple shelter plan, orthographic, moderate walls, standard openings, low-slope roof, dimension markers',
         'Emergency shelter on moderate plateau, standard panels, low-slope roof, garden-city setting',
         'extreme, desert, snow, luxury, fantasy',
         'Moderate plateau terrain, scattered trees, garden city'),
        ('temperate', 'residential',
         'Professional blueprint, orthographic CAD, brick walls hatched, large windows for natural ventilation, low-slope or flat roof, verandah shown, scale 1:100',
         'Isometric cutaway of a modern brick house with large windows, low-slope roof, open verandah, garden setting, partially removed roof showing bright airy interior',
         'desert, snow, extreme cold, fortress, heavy walls',
         'Moderate Deccan plateau, garden city, scattered trees, comfortable climate'),
        ('temperate', 'institutional',
         'Institutional blueprint, orthographic, open-plan halls, natural ventilation corridors, moderate walls, large windows, scale 1:200',
         'Campus-style community center, modern brick, large windows, garden setting, moderate climate design',
         'desert, snow, extreme, heavy fortress',
         'Garden-city institutional campus, moderate plateau'),
    ]

    for row in prompt_styles:
        cursor.execute('''
            INSERT INTO prompt_style_rules (nbc_zone, building_type, style_2d, style_3d, negative_prompt, environment_desc)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (nbc_zone, building_type) DO NOTHING
        ''', row)

    # ─────────────────────────────────────────────────────────────
    # MATERIAL VISUAL RULES (for image prompt rendering)
    # ─────────────────────────────────────────────────────────────
    cursor.execute('DROP TABLE IF EXISTS material_visual_rules')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS material_visual_rules (
            material_id TEXT PRIMARY KEY,
            category TEXT NOT NULL,
            visual_texture TEXT,
            section_hatch TEXT,
            color_hint TEXT
        )
    ''')

    mat_visuals = [
        ('rammed_earth', 'structural', 'rough rammed earth, warm ochre horizontal layers', 'dense_horizontal_lines', '#9C8B7A'),
        ('aac_blocks', 'structural', 'smooth light grey autoclaved aerated concrete blocks', 'dotted_grid', '#D4D4D4'),
        ('cse_blocks', 'structural', 'compressed stabilized earth blocks, warm brown', 'diagonal_lines', '#8B7355'),
        ('timber_frame', 'structural', 'exposed timber frame with visible wood grain', 'cross_hatch', '#A0785A'),
        ('stone_rubble', 'structural', 'rough-cut stone rubble masonry, irregular pattern', 'random_stone', '#7A7A6E'),
        ('brick', 'structural', 'fired clay brick, regular bond pattern', 'brick_bond', '#B5503D'),
        ('sandstone', 'structural', 'carved sandstone blocks, warm golden', 'fine_diagonal', '#DAC9A6'),
        ('laterite', 'structural', 'laterite stone blocks, reddish-brown', 'coarse_diagonal', '#A05030'),
        ('xps_insulation', 'insulation', 'blue XPS foam board', 'sparse_dots', '#4A90D9'),
        ('eps', 'insulation', 'white expanded polystyrene', 'sparse_dots', '#F0F0F0'),
        ('mineral_wool', 'insulation', 'yellow mineral wool batts', 'wavy_lines', '#E8D44D'),
        ('hempcrete', 'insulation', 'light green hempcrete blocks', 'organic_dots', '#B5C99A'),
        ('single_clear', 'glazing', 'single clear glass pane', 'single_line', '#C0E8FF'),
        ('double_clear', 'glazing', 'double clear glass panes with air gap', 'double_line', '#A0D8EF'),
        ('low_e_double_glazed', 'glazing', 'low-E coated double glazed unit, slight blue tint', 'double_line_coated', '#8EC8E0'),
    ]

    for row in mat_visuals:
        cursor.execute('''
            INSERT INTO material_visual_rules (material_id, category, visual_texture, section_hatch, color_hint)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (material_id) DO NOTHING
        ''', row)

    conn.commit()
    conn.close()
    print("Database initialized successfully at PostgreSQL (materials + climate_regions + prompt_rules)")

if __name__ == "__main__":
    init_db()
