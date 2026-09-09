import json
import sqlite3
import os

def init_db():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(base_dir, "thermoshelter.db")
    json_path = os.path.join(base_dir, "..", "data", "materials_catalogue.json")
    
    # Connect to SQLite
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
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
            PRIMARY KEY (id, category)
        )
    ''')
    
    # Clear existing data just in case
    cursor.execute('DELETE FROM materials')
    
    json_paths = [
        os.path.join(base_dir, "..", "data", "materials_catalogue.json"),
        os.path.join(base_dir, "materials.json")
    ]
    
    for json_path in json_paths:
        if not os.path.exists(json_path):
            continue
            
        with open(json_path, 'r') as f:
            data = json.load(f)
            
        # Insert data
        for group, items in data.items():
            for item in items:
                r_val = item.get('r_value_per_inch') or item.get('r_value')
                
                # Map type to categories required by spec_generator
                categories_to_insert = []
                mat_type = item.get('type')
                
                if mat_type == 'wall':
                    categories_to_insert.extend(['structural', 'insulation'])
                elif mat_type == 'roof':
                    categories_to_insert.append('roofing')
                elif mat_type == 'window' or group == 'glazing':
                    categories_to_insert.append('glazing')
                else:
                    categories_to_insert.append(group) # fallback
                    
                for category in categories_to_insert:
                    cursor.execute('''
                        INSERT OR IGNORE INTO materials (id, category, name, r_value, u_value, density_kg_m3, specific_heat_j_kg_k, shgc, cost_per_m2_inr)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        item['id'],
                        category,
                        item['name'],
                        r_val,
                        item.get('u_value'),
                        item.get('density_kg_m3'),
                        item.get('specific_heat_j_kg_k'),
                        item.get('shgc'),
                        item.get('cost_per_m2_inr')
                    ))
            
    conn.commit()
    conn.close()
    print("Database initialized successfully at thermoshelter.db")

if __name__ == "__main__":
    init_db()

