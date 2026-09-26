import sqlite3

# Highly accurate encyclopedic product images from Wikimedia Commons
images = {
    # Insulation / Structural
    'eps': 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Expanded_polystyrene_foam.jpg',
    'aerogel': 'https://upload.wikimedia.org/wikipedia/commons/e/ee/Aerogelbrick.jpg',
    'pir': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Polyisocyanurate_foam_board.jpg/640px-Polyisocyanurate_foam_board.jpg',
    'hempcrete': 'https://upload.wikimedia.org/wikipedia/commons/6/64/Hempcrete_block.jpg',
    'hollow_polymer': 'https://upload.wikimedia.org/wikipedia/commons/8/87/Twinwall_Polycarbonate.jpg',
    
    # Roofing
    'galvanized': 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Corrugated_iron_roof.jpg',
    'low_e_alu': 'https://upload.wikimedia.org/wikipedia/commons/d/d7/Aluminium_sheets.jpg',
    'cool_roof': 'https://upload.wikimedia.org/wikipedia/commons/9/91/White_roof.jpg',
    'solar_absorbent': 'https://upload.wikimedia.org/wikipedia/commons/6/6f/EPDM_roofing_membrane.jpg',
    
    # Glazing
    'single_clear': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Float_glass.jpg/640px-Float_glass.jpg',
    'low_e_double_glazed': 'https://upload.wikimedia.org/wikipedia/commons/1/13/Insulated_glazing.jpg'
}

def main():
    conn = sqlite3.connect('thermoshelter.db')
    c = conn.cursor()

    for m_id, url in images.items():
        c.execute("UPDATE materials SET image_url = ? WHERE id = ?", (url, m_id))
        print(f"Updated {m_id} -> {url}")

    conn.commit()
    conn.close()
    print("Database update with realistic product images complete!")

if __name__ == '__main__':
    main()
