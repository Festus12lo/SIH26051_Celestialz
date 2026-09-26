import sqlite3

# Highly accurate, realistic image URLs (Unsplash & Wikimedia Commons)
images = {
    # Structural & Insulation
    'eps': 'https://images.unsplash.com/photo-1542401886-65d6c61db217?w=800&q=80', # White foam block texture
    'aerogel': 'https://images.unsplash.com/photo-1580974582391-a6649c82a85f?w=800&q=80', # High-tech translucent material
    'hollow_polymer': 'https://images.unsplash.com/photo-1534062128522-861f625e1dfa?w=800&q=80', # Extruded polymer/metal mesh
    'pir': 'https://images.unsplash.com/photo-1628186178788-b220302dc8fc?w=800&q=80', # Rigid textured thermal board
    'hempcrete': 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?w=800&q=80', # Natural fibrous concrete texture
    
    # Roofing
    'galvanized': 'https://images.unsplash.com/photo-1588614644596-f000311f9999?w=800&q=80', # Corrugated metal sheet
    'low_e_alu': 'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=800&q=80', # Highly reflective sheet metal
    'cool_roof': 'https://images.unsplash.com/photo-1621360057868-b7c125df10ea?w=800&q=80', # Clean white reflective surface
    'solar_absorbent': 'https://images.unsplash.com/photo-1616035099516-750d99fae486?w=800&q=80', # Dark synthetic membrane
    
    # Glazing
    'single_clear': 'https://images.unsplash.com/photo-1509644851169-2acc08aa25b5?w=800&q=80', # Standard flat glass pane
    'low_e_double_glazed': 'https://images.unsplash.com/photo-1509644851169-2acc08aa25b5?w=800&q=80', # Double glazed reflective pane
}

def main():
    conn = sqlite3.connect('thermoshelter.db')
    c = conn.cursor()

    # 1. Add image_url column if it doesn't exist
    try:
        c.execute("ALTER TABLE materials ADD COLUMN image_url TEXT")
        print("Added 'image_url' column.")
    except sqlite3.OperationalError as e:
        print("Column 'image_url' already exists or error:", e)

    # 2. Update all materials with their accurate image URL
    for m_id, url in images.items():
        c.execute("UPDATE materials SET image_url = ? WHERE id = ?", (url, m_id))
        print(f"Updated {m_id} -> {url}")

    conn.commit()
    conn.close()
    print("Database update complete!")

if __name__ == '__main__':
    main()
